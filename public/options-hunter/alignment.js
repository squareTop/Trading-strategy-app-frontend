(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const button = $('alignmentLoad');
  const tableBody = $('alignmentTable')?.querySelector('tbody');
  if (!button || !tableBody) return;

  const api = String(window.FOXEL_OPTIONS_API_BASE || '').replace(/\/$/, '');
  const status = $('alignmentStatus');
  const metadata = $('alignmentMetadata');
  const money = value => typeof value === 'number' && Number.isFinite(value) ? '$' + value.toFixed(2) : 'Not available';
  const num = (value, digits = 1) => typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : 'Not available';
  const asText = value => value == null || value === '' ? 'Not available' : String(value);
  const cell = (row, value) => { const td = row.insertCell(); td.textContent = asText(value); return td; };

  function clear(message) {
    tableBody.replaceChildren();
    const row = tableBody.insertRow();
    const td = row.insertCell();
    td.colSpan = 10;
    td.textContent = message;
  }

  // The v0.1–v0.6 HTML contains an archived snapshot, NOT the staging database.
  // Never present one of these records as a database-verified live signal.
  function selectedArchivedSignal() {
    const selected = $('signal')?.value;
    const ticker = $('ticker')?.value;
    if (typeof DATA === 'undefined' || !Array.isArray(DATA.signals)) return null;
    const record = DATA.signals.find(s => String(s.id) === String(selected) && s.ticker === ticker);
    if (!record) return null;
    const id = Number(record.id);
    const strategy = String(record.selected_strategy || '').trim();
    const version = String(record.strategy_version || record.ruleset_version || '').trim();
    const direction = String(record.direction || '').toLowerCase().trim();
    const signalDate = String(record.signal_date || '').trim();
    if (!Number.isSafeInteger(id) || id <= 0 || !strategy || !/^(long|short)$/.test(direction) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(signalDate) || !/^[A-Z][A-Z0-9.\-]{0,19}$/.test(ticker || '')) return null;
    return { id, ticker, strategy, strategy_version: version, direction, signal_date: signalDate };
  }

  async function loadAlignment() {
    const signal = selectedArchivedSignal();
    const expiration = $('chainExpiry')?.value || '';
    const side = $('chainSide')?.value || 'all';
    const priceText = $('alignmentReference')?.value.trim() || '';
    const price = Number(priceText);
    const observed = ($('alignmentObservedUtc')?.value || '').trim();
    if (!api) { status.textContent = 'Backend address missing from options-hunter/config.js.'; return; }
    if (!signal) { status.textContent = 'Choose a valid archived signal for this ticker.'; return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expiration)) { status.textContent = 'Choose a listed expiration first.'; return; }
    if (!['all', 'put', 'call'].includes(side)) { status.textContent = 'Choose an option type.'; return; }
    if (!priceText || !Number.isFinite(price) || price <= 0) {
      status.textContent = 'Enter a positive, recently observed stock price.'; return;
    }
    // Plain UTC input avoids browser-specific datetime-local parsing and timezone conversion.
    const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(?:\s*(?:UTC|Z))?$/i.exec(observed);
    if (!match) {
      status.textContent = 'Enter UTC as YYYY-MM-DD HH:MM, or use the current UTC time button after checking the price.'; return;
    }
    const iso = `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6] || '00'}Z`;
    const stamp = Date.parse(iso);
    const age = Date.now() - stamp;
    if (!Number.isFinite(stamp) || age > 300000 || age < -30000) {
      status.textContent = 'The price observation must be from the past five minutes (UTC), not in the future.'; return;
    }
    const requestKey = [signal.id, signal.ticker, expiration, side].join('|');
    const params = new URLSearchParams({
      signal_id: String(signal.id), ticker: signal.ticker,
      strategy: signal.strategy, strategy_version: signal.strategy_version,
      direction: signal.direction, signal_date: signal.signal_date,
      expiration, side, reference_price: String(price), reference_asof_utc: iso
    });
    button.disabled = true;
    status.textContent = 'Aligning archived signal to listed contracts…';
    metadata.textContent = '';
    clear('Loading…');
    try {
      const response = await fetch(api + '/api/options-hunter/aligned-preview-chain?' + params.toString(), {
        credentials: 'omit', headers: { Accept: 'application/json' }
      });
      let payload = {};
      try { payload = await response.json(); } catch (_) { /* error below */ }
      if (!response.ok) {
        const detail = typeof payload.detail === 'string' ? payload.detail :
          Array.isArray(payload.detail) ? payload.detail.map(x => x.msg || 'Invalid input').join('; ') : 'HTTP ' + response.status;
        throw new Error(detail);
      }
      const current = selectedArchivedSignal();
      if (!current || [current.id, current.ticker, $('chainExpiry')?.value, $('chainSide')?.value].join('|') !== requestKey) {
        clear('Selection changed while loading; run alignment again.');
        status.textContent = 'Selection changed. No result displayed.'; return;
      }
      const resultSignal = payload.signal || {};
      if (payload.symbol !== signal.ticker || Number(resultSignal.id) !== signal.id ||
          resultSignal.ticker !== signal.ticker || resultSignal.strategy !== signal.strategy ||
          resultSignal.direction !== signal.direction || resultSignal.signal_date !== signal.signal_date ||
          resultSignal.database_verified !== false ||
          payload.signal_validation !== 'ARCHIVED_PREVIEW_ONLY_NOT_DATABASE_VERIFIED') {
        throw new Error('Unexpected response identity or verification status; refusing to display it.');
      }
      const contracts = Array.isArray(payload.contracts) ? payload.contracts : [];
      clear(contracts.length ? '' : 'No aligned contracts returned.');
      if (contracts.length) tableBody.replaceChildren();
      for (const option of contracts) {
        const row = tableBody.insertRow();
        cell(row, (option.type || '').toUpperCase() + ' · ' + (option.symbol || ''));
        cell(row, money(option.strike));
        cell(row, num(option.strike_distance_pct_signed) + '%');
        cell(row, option.expiration);
        cell(row, option.estimated_weekday_sessions_to_expiry);
        cell(row, money(option.gross_sell_premium_100));
        cell(row, money(option.gross_buy_cost_100));
        const iv = option.implied_volatility == null ? 'IV unavailable' : 'IV ' + num(option.implied_volatility * 100) + '%';
        const delta = option.delta == null ? 'Delta unavailable' : 'Delta ' + num(option.delta, 3);
        cell(row, iv + ' · ' + delta);
        cell(row, 'Not estimated');
        cell(row, (option.quote_quality_flags || []).join(', ') || 'No flags');
      }
      metadata.textContent = [
        'HISTORICAL PREVIEW — NOT DATABASE VERIFIED',
        signal.strategy + ' · ' + (signal.strategy_version || 'version unrecorded') + ' · ' + signal.direction,
        'Archived signal ID ' + signal.id + ' · ' + signal.signal_date,
        'Stock price: manually entered and unverified (' + asText(payload.reference?.asof_utc) + ')',
        'Alpaca quotes: indicative, non-executable',
        'Probability: not estimated'
      ].join(' | ');
      status.textContent = contracts.length + ' contracts aligned to ARCHIVED preview metadata' +
        (payload.partial ? ' · INCOMPLETE chain / pagination limit' : '') +
        '. This does not verify a live signal or establish a profitable trade.';
    } catch (error) {
      clear('Unable to load aligned contracts.');
      status.textContent = 'Alignment error: ' + error.message;
    } finally {
      button.disabled = false;
    }
  }
  $('alignmentUseNow')?.addEventListener('click', () => {
    if (!($('alignmentReference')?.value || '').trim()) {
      status.textContent = 'First enter a stock price you just observed, then set its UTC time.';
      return;
    }
    const now = new Date();
    $('alignmentObservedUtc').value = now.toISOString().slice(0, 19).replace('T', ' ') + ' UTC';
    status.textContent = 'Current UTC time entered. Confirm the stock price was actually observed just now; otherwise refresh the quote.';
  });
  button.addEventListener('click', loadAlignment);
  for (const id of ['ticker', 'signal', 'chainExpiry', 'chainSide']) {
    $(id)?.addEventListener('change', () => {
      clear('Selection changed — run alignment again.');
      metadata.textContent = '';
    });
  }
})();
