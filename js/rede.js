/* =====================================================================
   REDE — sala única no Firebase Realtime Database
   (sem config do Firebase: modo local, sincroniza abas do mesmo navegador)
   ===================================================================== */
'use strict';
const NET = (() => {
  let mode = 'local', root = null, offset = 0, ouvintes = [], estado = {}, conectado = false, aoConectar = () => { };
  const KEY = 'corrida_bike_sala';
  const cfg = window.CONFIG && window.CONFIG.firebase;
  const temFirebase = !!(cfg && cfg.apiKey && cfg.databaseURL && !/COLE|SEU-PROJETO/i.test(cfg.apiKey + cfg.databaseURL));

  function carregar(src) { return new Promise((ok, erro) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = erro; document.head.appendChild(s); }); }
  function avisar() { for (const f of ouvintes) f(estado); }
  function lerLocal() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function gravarLocal(v) { localStorage.setItem(KEY, JSON.stringify(v || {})); estado = v || {}; avisar(); }

  async function init() {
    if (temFirebase) {
      try {
        await carregar('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
        await carregar('https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js');
        firebase.initializeApp(cfg);
        const db = firebase.database();
        root = db.ref(window.CONFIG.caminho || 'corrida-bicicleta/sala');
        db.ref('.info/serverTimeOffset').on('value', s => { offset = s.val() || 0; });
        db.ref('.info/connected').on('value', s => { conectado = !!s.val(); aoConectar(conectado); });
        root.on('value', s => { estado = s.val() || {}; avisar(); });
        mode = 'firebase';
        return mode;
      } catch (e) { console.warn('Firebase falhou, usando modo local', e); }
    }
    mode = 'local';
    estado = lerLocal();
    window.addEventListener('storage', ev => { if (ev.key === KEY) { estado = lerLocal(); avisar(); } });
    setTimeout(avisar, 0);
    return mode;
  }
  const clone = o => JSON.parse(JSON.stringify(o || {}));
  async function transacao(fn) {
    if (mode === 'firebase') {
      const r = await root.transaction(cur => { const v = fn(clone(cur)); return v === undefined ? undefined : v; });
      return r.committed ? r.snapshot.val() : null;
    }
    const v = fn(clone(lerLocal())); if (v === undefined) return null; gravarLocal(v); return v;
  }
  async function set(path, val) {
    if (mode === 'firebase') return path ? root.child(path).set(val ?? null) : root.set(val ?? null);
    const cur = lerLocal();
    if (!path) return gravarLocal(val);
    const parts = path.split('/'); let o = cur;
    for (let i = 0; i < parts.length - 1; i++) { o[parts[i]] = o[parts[i]] || {}; o = o[parts[i]]; }
    if (val == null) delete o[parts[parts.length - 1]]; else o[parts[parts.length - 1]] = val;
    gravarLocal(cur);
  }
  return {
    init, transacao, set,
    ouvir(f) { ouvintes.push(f); },
    agora() { return Date.now() + offset; },
    get modo() { return mode; },
    get conectado() { return conectado; },
    set aoConectar(f) { aoConectar = f; },
    get estado() { return estado; }
  };
})();
