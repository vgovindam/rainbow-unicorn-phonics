(function () {
  'use strict';
  const MAX_EVENTS = 120;
  const events = [];
  function sanitize(value) {
    const copy = {};
    Object.entries(value || {}).forEach(([key, item]) => {
      if (/key|token|secret|passcode|authorization/i.test(key)) return;
      copy[key] = typeof item === 'string' ? item.slice(0, 240) : item;
    });
    return copy;
  }
  function emit(type, detail = {}) {
    const event = { type, detail: sanitize(detail), timestamp: new Date().toISOString() };
    events.push(event);
    if (events.length > MAX_EVENTS) events.shift();
    window.dispatchEvent(new CustomEvent('sakhi:system', { detail: event }));
    const level = /FAILED|FAILURE|UNAVAILABLE/.test(type) ? 'warn' : 'info';
    console[level](`[Sakhi] ${type}`, event.detail);
    return event;
  }
  window.SakhiEvents = { emit, recent: () => events.slice() };
})();
