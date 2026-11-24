(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const button = $('alignmentLoad');
  const tableBody = $('alignmentTable')?.querySelector('tbody');
  if (!button || !tableBody) return;
  const api = String(window.FOXEL_OPTIONS_API_BASE || '').replace(/\/$/, '');
  const status = $('alignmentStatus');
  const metadata = $('alignmentMetadata');
  const money = (value) => typeof value === 'number' && Number.isFinite(value) ? '$' + value.toFixed(2) : 'Not available';
  const num = (value, digits = 1) => typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : 'Not available';
  const asText = (value) => value == null || value === '' ? 'Not available' : String(value);
  const cell = (row, value) => { const td = row.insertCell(); td.textContent = asText(value); return td; };
  function clear(message) {
    tableBody.replaceChildren();
    const row = tableBody.insertRow();
    const td = row.insertCell(); td.colSpan = 10; td.textContent = message;
  }
  async function loadAlignment() {
    const ticker = $('ticker')?.value || '';
    const signalId = Number($('signal')?.value);
    const expiration = $('chainExpiry')?.value || '';
    const side = $('chainSide')?.value || 'all';
    const price = Number($('alignmentReference').value);
    const observed = $('alignmentObservedUtc').value;
    if (!api) { status.textContent = 'Backend address missing from options-hunter/config.js.'; return; }
    if (!Number.isSafeInteger(signalId) || signalId < 1 || !ticker || !/^\d{4}-\d{2}-\d{2}$/.test(expiration)) {
      status.textContent = 'Choose a recorded signal and a listed expiration first.'; return;
    }
    if (!Number.isFinite(price) || price <= 0 || !$('alignmentReference').value.trim()) {
      status.textContent = 'Enter a positive, recently observed stock price.'; return;
    }
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(observed)) {
      status.textContent = 'Enter the actual UTC date and time when you observed that price.'; return;
    }
    const iso = observed + (observed.length === 16 ? ':00Z' : 'Z');
    const stamp = Date.parse(iso);
    const age = Date.now() - stamp;
    if (!Number.isFinite(stamp) || age > 300000 || age < -30000) {
      status.textContent = 'The price observation must be from the past five minutes (UTC), not in the future.'; return;
    }
    const requestSignal = signalId;
    const requestTicker = ticker;
    const params = new URLSearchParams({signal_id: String(signalId), expiration, side, reference_price: String(price), reference_asof_utc: iso});
    button.disabled = true;
    status.textContent = 'Aligning selected signal to listed contracts…';
    metadata.textContent = '';
    clear('Loading…');
    try {
      const response = await fetch(api + '/api/options-hunter/aligned-chain?' + params.toString(), { credentials: 'omit', headers: {Accept: 'application/json'} });
      let payload = {}; try {payload = await response.json();} catch (_) { /* handled below */ }
      if (!response.ok) throw new Error(typeof payload.detail === 'string' ? payload.detail : 'HTTP ' + response.status);
      if (Number($('signal')?.value) !== requestSignal || $('ticker')?.value !== requestTicker || $('chainExpiry')?.value !== expiration || $('chainSide')?.value !== side) {
        clear('Signal changed while loading; run alignment again.'); status.textContent = 'Selection changed. No result displayed.'; return;
      }
      if (payload.signal?.id !== requestSignal || payload.symbol !== requestTicker) {
        throw new Error('Backend signal/ticker mismatch. Refusing to display contracts.');
      }
      const contracts = Array.isArray(payload.contracts) ? payload.contracts : [];
      clear(contracts.length ? '' : 'No aligned contracts returned.');
      if (contracts.length) tableBody.replaceChildren();
      for (const option of contracts) {
        const row = tableBody.insertRow();
        cell(row, (option.type || '').toUpperCase() + ' · ' + (option.symbol || ''));
        cell(row, money(option.strike));
        cell(row, num(option.strike_distance_pct_signed) + '%');
        cell(row, asText(option.expiration));
        cell(row, asText(option.estimated_weekday_sessions_to_expiry));
        cell(row, money(option.gross_sell_premium_100));
        cell(row, money(option.gross_buy_cost_100));
        const iv = option.implied_volatility == null ? 'IV n/a' : 'IV ' + num(option.implied_volatility * 100) + '%';
        const delta = option.delta == null ? 'Delta n/a' : 'Delta ' + num(option.delta, 3);
        cell(row, iv + ' · ' + delta);
        cell(row, 'Not estimated');
        cell(row, (option.quote_quality_flags || []).join(', ') || 'No flags');
      }
      const sig = payload.signal || {};
      metadata.textContent = [
        'Verified signal: ' + asText(sig.strategy) + ' · ' + asText(sig.strategy_version) + ' · ' + asText(sig.direction),
        'Signal ID ' + asText(sig.id),
        'Price source: client-supplied, unverified (' + asText(payload.reference?.asof_utc) + ')',
        'Weekday horizon: approximate; exchange holidays not included',
        'Quote feed: indicative; probability: not estimated'
      ].join(' | ');
      status.textContent = contracts.length + ' aligned contracts' + (payload.partial ? ' · INCOMPLETE chain / pagination limit' : '') + '. Data does not establish a profitable trade.';
    } catch (error) {
      clear('Unable to load aligned contracts.');
      status.textContent = 'Alignment error: ' + error.message;
    } finally {
      button.disabled = false;
    }
  }
  button.addEventListener('click', loadAlignment);
  $('ticker')?.addEventListener('change', () => { clear('Ticker changed — run alignment again.'); metadata.textContent = ''; });
  $('signal')?.addEventListener('change', () => { clear('Signal changed — run alignment again.'); metadata.textContent = ''; });
  $('chainExpiry')?.addEventListener('change', () => { clear('Expiration changed — run alignment again.'); metadata.textContent = ''; });
})();
