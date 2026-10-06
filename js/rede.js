/* =====================================================================
   REDE — sala única no Firebase Realtime Database
   (sem config do Firebase: modo local, sincroniza abas do mesmo navegador)
   ===================================================================== */
'use strict';
const NET = (() => {
  let mode = 'local', root = null, offset = 0, ouvintes = [], estado = {}, conectado = false, aoConectar = () => { };
  const KEY = 'corrida_bike_sala';
  // Firebase único (jogos-github): a config e a pasta vêm da trava do site principal (/trava.js).
  // Sem a trava (arquivo aberto direto do PC), roda em modo local.
  const SITE = 'ciclismo_youtubers';
  const ESCRITA = { sala: true }; // pastas que os jogadores podem gravar
  function carregar(src) { return new Promise((ok, erro) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = erro; document.head.appendChild(s); }); }
  function avisar() { for (const f of ouvintes) f(estado); }
  function lerLocal() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function gravarLocal(v) { localStorage.setItem(KEY, JSON.stringify(v || {})); estado = v || {}; avisar(); }

  async function init() {
    if (window.Trava && window.Trava.ready) {
      try {
        const t = await window.Trava.ready;
        if (!t || !window.firebase || !firebase.apps.length) throw new Error('trava sem Firebase');
        const db = firebase.database(), auth = firebase.auth();
        if (!auth.currentUser) await auth.signInAnonymously();
        // navegador da equipe: garante que a Central saiba quais pastas o jogo grava
        if (window.Trava.admin) {
          try {
            const ref = db.ref('controle/sites/' + SITE);
            const cur = (await ref.once('value')).val();
            if (!cur) await ref.set({ open: false, escrita: ESCRITA, t: firebase.database.ServerValue.TIMESTAMP });
            else if (!cur.escrita || !cur.escrita.sala) await ref.child('escrita/sala').set(true);
          } catch (e) { console.warn('controle', e); }
        }
        root = db.ref((window.DB_ROOT || 'sites/' + SITE) + '/' + (window.CONFIG.caminho || 'sala'));
        db.ref('.info/serverTimeOffset').on('value', s => { offset = s.val() || 0; });
        db.ref('.info/connected').on('value', s => { conectado = !!s.val(); aoConectar(conectado); });
        root.on('value', s => { estado = s.val() || {}; avisar(); }, e => console.warn('sem acesso à sala', e));
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
