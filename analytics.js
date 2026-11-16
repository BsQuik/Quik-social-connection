/* BsQuik · consenso ai cookie + statistiche anonime su Supabase.
   Nessuna libreria esterna. Senza il tuo consenso NON parte nessuna richiesta di statistiche
   e non viene salvato nessun identificativo. */
(function () {
  'use strict';
  var C = window.BSQUIK || {};
  var script = document.currentScript;
  var baseUrl = script ? new URL('.', script.src) : new URL('.', location.href);
  var okConfig = /^https:\/\/[a-z0-9]{8,}\.supabase\.co$/.test((C.SUPABASE_URL || '').replace(/\/$/, ''));
  var ENDPOINT = okConfig ? C.SUPABASE_URL.replace(/\/$/, '') + '/functions/v1/track' : null;
  var KEY = 'bsquik-consent', VID = 'bsquik-vid', PV = 'bsquik-pv', DAY = 864e5;
  var gpc = navigator.globalPrivacyControl === true || navigator.doNotTrack === '1';

  function ls(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v);
    } catch (e) { return null; }
  }
  function readConsent() {
    try {
      var c = JSON.parse(ls(KEY) || 'null');
      if (!c) return null;
      var max = c.a ? 365 * DAY : 182 * DAY;           /* sì: 12 mesi, no: non richiesto prima di 6 mesi */
      return Date.now() - c.t > max ? null : c;
    } catch (e) { return null; }
  }
  function allowed() { var c = readConsent(); return !!(c && c.a); }

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var b = crypto.getRandomValues(new Uint8Array(16)); b[6] = b[6] & 15 | 64; b[8] = b[8] & 63 | 128;
    var h = Array.prototype.map.call(b, function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
    return h.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
  }
  function visitor() {
    try {
      var v = JSON.parse(ls(VID) || 'null');
      if (!v || Date.now() - v.t > 365 * DAY) { v = { id: uuid(), t: Date.now() }; ls(VID, JSON.stringify(v)); }
      return v.id;
    } catch (e) { return null; }
  }
  function pageName() { return location.pathname.indexOf('/classico/') > -1 ? 'classico' : 'nuovo'; }

  function send(p) {
    if (!ENDPOINT || !allowed()) return;
    p.page = pageName(); p.visitor = visitor(); p.lang = (navigator.language || '').slice(0, 10);
    try {
      fetch(ENDPOINT, { method: 'POST', body: JSON.stringify(p), keepalive: true, credentials: 'omit', mode: 'cors',
        headers: { 'content-type': 'text/plain;charset=UTF-8' } }).catch(function () {});
    } catch (e) {}
  }
  function view() {
    try { if (sessionStorage.getItem(PV)) return; sessionStorage.setItem(PV, '1'); } catch (e) {}
    send({ kind: 'view' });
  }

  /* da che link si tratta? Solo nomi di una lista fissa, il resto non viene registrato */
  var HOSTS = [['youtube.com', 'youtube'], ['youtu.be', 'youtube'], ['twitch.tv', 'twitch'], ['tiktok.com', 'tiktok'],
    ['discord.com', 'discord'], ['discord.gg', 'discord'], ['whatsapp.com', 'whatsapp'], ['reddit.com', 'reddit'],
    ['instagram.com', 'instagram']];
  function nameFor(raw) {
    var x; try { x = new URL(raw, location.href); } catch (e) { return null; }
    if (!/^https?:$/.test(x.protocol)) return null;
    var host = x.hostname.replace(/^www\./, '');
    if (x.origin === location.origin) {
      var root = baseUrl.pathname, p = x.pathname.replace(/index\.html$/, '');
      if (p === root + 'classico/') return 'classic';
      if (p === root) return 'newsite';
      if (/^\/website(\/|$)/.test(p)) return 'website';
      return null;
    }
    if (/sub_confirmation/.test(x.search)) return 'subscribe';
    for (var i = 0; i < HOSTS.length; i++) {
      if (host === HOSTS[i][0] || host.slice(-HOSTS[i][0].length - 1) === '.' + HOSTS[i][0]) return HOSTS[i][1];
    }
    return null;
  }
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('a[href],[data-url],#sh,#share') : null;
    if (!t) return;
    var n = (t.id === 'sh' || t.id === 'share') ? 'share' : nameFor(t.getAttribute('data-url') || t.getAttribute('href') || '');
    if (n) send({ kind: 'click', link: n });
  }, true);

  /* ---------- banner cookie ---------- */
  var box = null;
  function css() {
    if (document.getElementById('bq-css')) return;
    var s = document.createElement('style'); s.id = 'bq-css';
    s.textContent = '.bq{position:fixed;left:12px;right:12px;bottom:max(12px,env(safe-area-inset-bottom));max-width:560px;margin:0 auto;z-index:99999;' +
      'background:#1C1917;color:#F2ECE6;border:1px solid #4A423C;border-radius:16px;padding:18px 18px 16px;box-shadow:0 20px 60px rgba(0,0,0,.5);' +
      'font:400 15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}.bq *{box-sizing:border-box}.bq p{margin:0 0 10px}.bq b{font-size:17px}' +
      '.bq a{color:#FFB4A8}.bq button{font:inherit;cursor:pointer}.bq .x{position:absolute;top:8px;right:8px;width:44px;height:44px;border:0;border-radius:10px;background:none;color:#F2ECE6;font-size:26px;line-height:1}' +
      '.bq .r{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.bq .r button{flex:1 1 110px;min-height:46px;padding:0 14px;border-radius:10px;font-weight:700}' +
      '.bq .y,.bq .n{background:#F2ECE6;color:#1C1917;border:2px solid #F2ECE6}.bq .c{background:none;color:#F2ECE6;border:2px solid #6A6058}' +
      '.bq .pn{margin-top:12px;border-top:1px solid #3A332E;padding-top:12px}.bq label{display:flex;gap:10px;align-items:flex-start;min-height:44px;align-items:center}.bq input{width:20px;height:20px;flex:none}' +
      '.bq button:focus-visible,.bq a:focus-visible,.bq input:focus-visible{outline:3px solid #FF8472;outline-offset:2px}';
    document.head.appendChild(s);
  }
  function close() { if (box) { box.remove(); box = null; } }
  function choose(a) {
    ls(KEY, JSON.stringify({ a: a ? 1 : 0, t: Date.now() }));
    if (!a) { ls(VID, null); try { sessionStorage.removeItem(PV); } catch (e) {} }
    close();
    if (a) view();
  }
  function show(openPanel) {
    if (box) return;
    css();
    var c = readConsent();
    box = document.createElement('div'); box.className = 'bq'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Preferenze cookie');
    box.innerHTML = '<button class="x" type="button" aria-label="Chiudi e continua senza accettare">&times;</button>' +
      '<p><b>Cookie e statistiche</b></p>' +
      '<p>Il sito usa solo strumenti tecnici necessari. Con il tuo consenso conto in modo anonimo visite e click sui link. ' +
      'Puoi cambiare idea quando vuoi. <a href="' + new URL('cookie.html', baseUrl).href + '">Cookie policy</a></p>' +
      '<div class="r"><button class="y" type="button">Accetta</button><button class="n" type="button">Rifiuta</button><button class="c" type="button">Personalizza</button></div>' +
      '<div class="pn" hidden><label><input type="checkbox" checked disabled> Necessari (sempre attivi)</label>' +
      '<label><input type="checkbox" id="bq-st"> Statistiche anonime</label>' +
      '<div class="r"><button class="y" type="button" data-save>Salva scelte</button></div></div>';
    document.body.appendChild(box);
    var pn = box.querySelector('.pn'), st = box.querySelector('#bq-st');
    st.checked = !!(c && c.a);
    box.querySelector('.x').onclick = function () { choose(false); };
    box.querySelector('.y').onclick = function () { choose(true); };
    box.querySelector('.n').onclick = function () { choose(false); };
    box.querySelector('.c').onclick = function () { pn.hidden = !pn.hidden; };
    box.querySelector('[data-save]').onclick = function () { choose(st.checked); };
    if (openPanel) pn.hidden = false;
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-cookie-settings]') : null;
    if (t) { e.preventDefault(); show(true); }
  });
  window.BsquikConsent = { open: function () { show(true); } };

  function start() {
    if (readConsent()) { if (allowed()) view(); }
    else if (!gpc) show(false);          /* con "Do Not Track"/GPC attivo: nessuna richiesta, nessuna statistica */
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
