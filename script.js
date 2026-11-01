document.addEventListener("DOMContentLoaded", () => {
    const linkBoxes = document.querySelectorAll('.clicca');

    linkBoxes.forEach(box => {
        box.addEventListener('click', () => {
            const url = box.getAttribute('data-url');
            
            if (url) {
            window.open(url, '_blank');
            }
        });
    });
});

/* ===== Aggiunte: counter automatico, ultimo video, condividi ===== */
(() => {
  if (window.__bsquikExtra) return;   // script.js è incluso due volte nell'HTML: eseguo una volta sola
  window.__bsquikExtra = true;

  document.addEventListener("DOMContentLoaded", () => {
    const subsEl = document.getElementById("subs-count");
    const nf = new Intl.NumberFormat("it-IT");
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let shown = Number(subsEl.dataset.fallback) || 0;

    function tween(to) {
      const from = shown;
      if (reduceMotion || from === to) { subsEl.textContent = nf.format(to); shown = to; return; }
      const t0 = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - t0) / 900);
        shown = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3)));
        subsEl.textContent = nf.format(shown);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }

    function showVideo(v) {
      if (!v || !/^[\w-]{6,20}$/.test(v.id || "")) return;
      const box = document.getElementById("latest");
      box.setAttribute("data-url", "https://www.youtube.com/watch?v=" + v.id);
      document.getElementById("latest-img").src = "https://i.ytimg.com/vi/" + v.id + "/hqdefault.jpg";
      document.getElementById("latest-title").textContent = "Ultimo video: " + (v.title || "");
      box.hidden = false;
    }

    async function load() {
      try {
        const res = await fetch("../stats.json?_=" + Date.now(), { cache: "no-store" });
        if (!res.ok) throw new Error(res.status);
        const d = await res.json();
        if (Number.isFinite(d.subscribers)) tween(d.subscribers);
        showVideo(d.latestVideo);
      } catch (_) { /* stats.json assente: resta il numero scritto nell'HTML */ }
    }
    load();
    setInterval(load, 5 * 60 * 1000);

    const toast = document.getElementById("toast");
    let timer;
    const say = (msg) => {
      toast.textContent = msg; toast.classList.add("show");
      clearTimeout(timer); timer = setTimeout(() => toast.classList.remove("show"), 2200);
    };
    document.getElementById("share").addEventListener("click", async () => {
      const data = { title: document.title, url: location.href };
      if (navigator.share) {
        try { await navigator.share(data); return; }
        catch (e) { if (e.name === "AbortError") return; }
      }
      try { await navigator.clipboard.writeText(location.href); say("Link copiato"); }
      catch (_) { say("Copia il link dalla barra degli indirizzi"); }
    });
  });
})();


/* ===== Aggiunta: popup per browser in italiano =====
   Compare solo se la lingua del browser è l'italiano, dopo 2 secondi, e non si ripresenta per 7 giorni
   dopo che l'utente lo chiude o clicca un canale.
   Per provarlo: aggiungi ?lang=it all'indirizzo (ignora anche la memoria dei 7 giorni). ?lang=en lo disattiva. */
(() => {
  if (window.__bsquikItPopup) return;   // script.js è incluso due volte nell'HTML
  window.__bsquikItPopup = true;

  document.addEventListener("DOMContentLoaded", () => {
    const popup = document.getElementById("it-popup");
    if (!popup) return;

    const forced = new URLSearchParams(location.search).get("lang");
    const browserLang = (navigator.languages && navigator.languages[0]) || navigator.language || "";
    const isItalian = forced ? /^it/i.test(forced) : /^it/i.test(browserLang);
    if (!isItalian) return;

    const KEY = "bsquik-it-popup", WEEK = 7 * 24 * 3600 * 1000;
    const store = {
      get() { try { return Number(localStorage.getItem(KEY)) || 0; } catch (_) { return 0; } },
      set() { try { localStorage.setItem(KEY, String(Date.now())); } catch (_) {} }
    };
    if (!forced && Date.now() - store.get() < WEEK) return;

    const closeBtn = document.getElementById("it-popup-close");
    let opener = null;

    /* Se la pagina è più larga dello schermo (succede sul telefono), il popup si centra sull'area visibile */
    function fit() {
      const v = window.visualViewport;
      if (!v) return;
      Object.assign(popup.style, { inset: "auto", left: v.offsetLeft + "px", top: v.offsetTop + "px", width: v.width + "px", height: v.height + "px" });
    }
    if (window.visualViewport) {
      visualViewport.addEventListener("resize", () => { if (!popup.hidden) fit(); });
      visualViewport.addEventListener("scroll", () => { if (!popup.hidden) fit(); });
    }

    function open() {
      opener = document.activeElement;
      popup.hidden = false;
      fit();
      document.body.style.overflow = "hidden";
      requestAnimationFrame(() => popup.classList.add("show"));
      closeBtn.focus();
    }
    function close() {
      store.set();
      popup.classList.remove("show");
      document.body.style.overflow = "";
      setTimeout(() => { popup.hidden = true; }, 250);
      if (opener && opener.focus) opener.focus();
    }

    closeBtn.addEventListener("click", close);
    document.getElementById("it-popup-later").addEventListener("click", close);
    popup.addEventListener("click", (e) => { if (e.target === popup) close(); });
    document.addEventListener("keydown", (e) => {
      if (popup.hidden) return;
      if (e.key === "Escape") close();
      if (e.key === "Tab") {                       // il focus resta dentro il popup
        const f = popup.querySelectorAll("button, [data-popup-url]");
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    popup.querySelectorAll("[data-popup-url]").forEach((el) => {
      el.setAttribute("tabindex", "0");
      el.setAttribute("role", "link");
      const go = () => { window.open(el.getAttribute("data-popup-url"), "_blank", "noopener"); store.set(); };
      el.addEventListener("click", go);
      el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
    });

    setTimeout(open, 2000);
  });
})();
