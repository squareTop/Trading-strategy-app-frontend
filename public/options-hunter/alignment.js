(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const button = $('alignmentLoad');
  const status = $('alignmentStatus');
  const metadata = $('alignmentMetadata');
  if (!button || !status || !metadata) return;
  const api = String(window.FOXEL_OPTIONS_API_BASE || '').replace(/\/$/, '');
  const clear = (message) => {
    metadata.textContent = '';
    status.textContent = message;
    window.dispatchEvent(new CustomEvent('foxel:alignment-clear'));
  };
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
    const priceText = ($('chainReference')?.value || '').trim();
    const price = Number(priceText);
    const observed = ($('alignmentObservedUtc')?.value || '').trim();
    if (!api) { clear('Backend address missing from options-hunter/config.js.'); return; }
    if (!signal) { clear('Choose a recorded signal for this ticker. You can browse contracts without selecting one.'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expiration)) { clear('Choose a listed expiration first.'); return; }
    if (!['all', 'put', 'call'].includes(side)) { clear('Choose a valid option type.'); return; }
    if (!priceText || !Number.isFinite(price) || price <= 0) { clear('Enter a positive stock price you just observed.'); return; }
    const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(?:\s*(?:UTC|Z))?$/i.exec(observed);
    if (!match) { clear('Enter the observation time as YYYY-MM-DD HH:MM UTC.'); return; }
    const iso = `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6] || '00'}Z`;
    const stamp = Date.parse(iso);
    const age = Date.now() - stamp;
    if (!Number.isFinite(stamp) || age > 300000 || age < -30000) {
      clear('The price observation must be from the past five minutes (UTC), not in the future.'); return;
    }
    const requestKey = [signal.id, signal.ticker, expiration, side, priceText, iso].join('|');
    const params = new URLSearchParams({
      signal_id: String(signal.id), ticker: signal.ticker,
      strategy: signal.strategy, strategy_version: signal.strategy_version,
      direction: signal.direction, signal_date: signal.signal_date,
      expiration, side, reference_price: String(price), reference_asof_utc: iso
    });
    button.disabled = true;
    clear('Matching archived signal to listed contracts…');
    try {
      const response = await fetch(api + '/api/options-hunter/aligned-preview-chain?' + params, {
        credentials: 'omit', headers: { Accept: 'application/json' }
      });
      let payload = {};
      try { payload = await response.json(); } catch (_) { /* explain HTTP status below */ }
      if (!response.ok) {
        const detail = typeof payload.detail === 'string' ? payload.detail :
          Array.isArray(payload.detail) ? payload.detail.map(x => x.msg || 'Invalid input').join('; ') : 'HTTP ' + response.status;
        throw new Error(detail);
      }
      const current = selectedArchivedSignal();
      const currentKey = [current?.id, current?.ticker, $('chainExpiry')?.value, $('chainSide')?.value,
        ($('chainReference')?.value || '').trim(), iso].join('|');
      if (requestKey !== currentKey || ($('alignmentObservedUtc')?.value || '').trim() !== observed) {
        clear('Selection or price changed while loading. Run signal analysis again.'); return;
      }
      const resultSignal = payload.signal || {};
      if (payload.symbol !== signal.ticker || Number(resultSignal.id) !== signal.id ||
          resultSignal.ticker !== signal.ticker || resultSignal.strategy !== signal.strategy ||
          resultSignal.direction !== signal.direction || resultSignal.signal_date !== signal.signal_date ||
          resultSignal.database_verified !== false ||
          payload.signal_validation !== 'ARCHIVED_PREVIEW_ONLY_NOT_DATABASE_VERIFIED') {
        throw new Error('Response identity or archival status mismatch; refusing to use it.');
      }
      const contracts = Array.isArray(payload.contracts) ? payload.contracts : [];
      // One table: the live-chain renderer decorates its existing rows by exact contract symbol.
      window.dispatchEvent(new CustomEvent('foxel:alignment', {
        detail: { ticker: signal.ticker, expiration, side, reference_price: price,
          signal, contracts: contracts.map(c => ({ symbol: c.symbol, expiration: c.expiration, type: c.type })) }
      }));
      metadata.textContent = 'HISTORICAL PREVIEW — NOT DATABASE VERIFIED · ' + signal.strategy +
        ' · ' + (signal.strategy_version || 'version unrecorded') + ' · ' + signal.direction +
        ' · Signal ' + signal.id + ' (' + signal.signal_date + ')' +
        ' · Stock price manually entered, unverified · Probability not estimated.';
      status.textContent = contracts.length + ' contracts linked to the archived signal. ' +
        'Matching rows are marked in the single table below.' +
        (payload.partial ? ' Chain incomplete: some contracts may be missing.' : '') +
        ' This is not a live signal verification or trading recommendation.';
    } catch (error) {
      clear('Signal analysis error: ' + error.message);
    } finally {
      button.disabled = false;
    }
  }
  button.addEventListener('click', loadAlignment);
  $('alignmentUseNow')?.addEventListener('click', () => {
    if (!($('chainReference')?.value || '').trim()) {
      clear('First enter a stock price you just observed, then set its UTC time.'); return;
    }
    const now = new Date();
    $('alignmentObservedUtc').value = now.toISOString().slice(0, 19).replace('T', ' ') + ' UTC';
    clear('UTC time inserted. Only proceed if the stock price was observed just now.');
  });
  for (const id of ['ticker', 'signal', 'chainExpiry', 'chainSide']) {
    $(id)?.addEventListener('change', () => clear('Selection changed. Run signal analysis to annotate the contracts.'));
  }
  $('chainReference')?.addEventListener('input', () => clear('Stock price changed. Run signal analysis again.'));
  $('chainReload')?.addEventListener('click', () => clear('Chain reloaded. Run signal analysis again.'));
})();
