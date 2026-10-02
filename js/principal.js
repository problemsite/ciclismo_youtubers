/* =====================================================================
   PRINCIPAL — lobby, painel dos rostos, votação, sincronia e loop
   ===================================================================== */
'use strict';
const COR = window.CORREDORES;
const IDX_WIN = Math.max(0, COR.findIndex(c => c.nome.toLowerCase() === CONFIG.vencedor.toLowerCase()));
const IDX_VICE = Math.max(0, COR.findIndex(c => c.nome.toLowerCase() === CONFIG.vice.toLowerCase()));
const IDX_LATE = (CONFIG.resistentes || []).map(n => COR.findIndex(c => c.nome.toLowerCase() === n.toLowerCase())).filter(i => i >= 0);
const novaSim = seed => new Sim(seed, COR.length, IDX_WIN, IDX_VICE, IDX_LATE);
const FIM_TICKS = 760 * 60;
const qs = new URLSearchParams(location.search);
const $ = s => document.querySelector(s);

/* ---------- som (sintetizado, sem arquivos) ---------- */
const SOM = (() => {
  let ac = null, mudo = localStorage.getItem('corrida_mudo') === '1'; const last = {};
  function ok() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } } if (ac && ac.state === 'suspended') ac.resume(); return ac; }
  function tone(f, d, type = 'square', v = 0.15, slide = 0, delay = 0) {
    const a = ac; if (!a) return; const t = a.currentTime + delay;
    const o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + 0.02);
  }
  function noise(d, v, f, delay = 0) {
    const a = ac; if (!a) return; const t = a.currentTime + delay;
    const b = a.createBuffer(1, Math.floor(a.sampleRate * d), a.sampleRate), ch = b.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length);
    const s = a.createBufferSource(); s.buffer = b; const fl = a.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = f;
    const g = a.createGain(); g.gain.value = v; s.connect(fl).connect(g).connect(a.destination); s.start(t);
  }
  const lib = {
    count: () => tone(440, 0.18, 'square', 0.12), go: () => { tone(880, 0.5, 'square', 0.14); tone(1320, 0.5, 'square', 0.06); },
    bonk: () => tone(320, 0.14, 'square', 0.09, -180), hop: () => tone(260, 0.12, 'triangle', 0.1, 260),
    boing: () => tone(180, 0.35, 'sine', 0.22, 620), flip: () => { },
    slam: () => { noise(0.45, 0.5, 700); tone(70, 0.35, 'sawtooth', 0.18, -30); },
    boom: () => { noise(1.1, 0.8, 500); tone(60, 0.8, 'sawtooth', 0.25, -40); },
    kill: () => { tone(520, 0.12, 'square', 0.12); tone(390, 0.12, 'square', 0.12, 0, 0.12); tone(260, 0.35, 'square', 0.12, -60, 0.24); },
    psss: () => noise(0.9, 0.18, 4000), quase: () => { tone(700, 0.08, 'square', 0.1); tone(700, 0.08, 'square', 0.1, 0, 0.12); },
    whoosh: () => noise(0.35, 0.25, 1800), mush: () => [660, 880, 1320].forEach((f, i) => tone(f, 0.1, 'square', 0.08, 0, i * 0.06)), bip: () => tone(1500, 0.06, 'square', 0.06),
    zona: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'square', 0.09, 0, i * 0.1)),
    win: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i === 5 ? 0.8 : 0.18, 'square', 0.12, 0, i * 0.15))
  };
  return {
    ok: () => ok(), get mudo() { return mudo; },
    alternar() { mudo = !mudo; localStorage.setItem('corrida_mudo', mudo ? '1' : '0'); },
    tocar(n) { if (mudo || !ac || !lib[n]) return; const t = performance.now(); if (last[n] && t - last[n] < 70) return; last[n] = t; lib[n](); }
  };
})();

/* ---------- música (chiptune gerado na hora) ---------- */
const MUS = (() => {
  let ac = null, master = null, timer = null, next = 0, step = 0, song = -1, ligada = localStorage.getItem('corrida_musica') !== '0', nbuf = null;
  const F = m => 440 * Math.pow(2, (m - 69) / 12);
  const SONGS = [
    { bpm: 136, prog: [[60, 64, 67], [67, 71, 74], [69, 72, 76], [65, 69, 72]], lead: 'square', dr: 1 },     // planície
    { bpm: 128, prog: [[62, 65, 69], [63, 67, 70], [62, 65, 69], [61, 65, 68]], lead: 'sawtooth', dr: 1 },   // deserto
    { bpm: 142, prog: [[57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62]], lead: 'square', dr: 2 },     // cidade
    { bpm: 126, prog: [[64, 67, 71], [60, 64, 67], [67, 71, 74], [62, 66, 69]], lead: 'triangle', dr: 1 },   // gelo
    { bpm: 156, prog: [[60, 63, 67], [56, 60, 63], [58, 62, 65], [55, 59, 62]], lead: 'square', dr: 2 },     // castelo
    { bpm: 170, prog: [[60, 63, 67], [60, 63, 67], [56, 60, 63], [55, 59, 62]], lead: 'square', dr: 3 },     // duelo final
    { bpm: 104, prog: [[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67]], lead: 'triangle', dr: 0 }    // espera
  ];
  const PAT = [[0, -1, 1, 2, 3, -1, 2, 1, 0, -1, 1, 2, 1, -1, 2, -1], [0, 2, 1, -1, 2, -1, 3, 2, 1, -1, 0, -1, 2, 1, 0, -1], [3, -1, 2, -1, 1, 2, 0, -1, 3, 2, 1, -1, 2, -1, 1, -1], [0, 1, 2, 3, 2, 1, 0, -1, 1, 2, 3, -1, 3, 2, -1, -1]];
  function note(f, t, d, type, v) {
    const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0008, t + d);
    o.connect(g).connect(master); o.start(t); o.stop(t + d + 0.03);
  }
  function hit(t, kind) {
    if (kind === 'k') { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.14); g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.16); o.connect(g).connect(master); o.start(t); o.stop(t + 0.18); return; }
    const s = ac.createBufferSource(); s.buffer = nbuf; const fl = ac.createBiquadFilter(); fl.type = kind === 'h' ? 'highpass' : 'bandpass'; fl.frequency.value = kind === 'h' ? 7000 : 1800;
    const g = ac.createGain(); g.gain.setValueAtTime(kind === 'h' ? 0.25 : 0.55, t); g.gain.exponentialRampToValueAtTime(0.001, t + (kind === 'h' ? 0.04 : 0.13));
    s.connect(fl).connect(g).connect(master); s.start(t); s.stop(t + 0.2);
  }
  function agenda() {
    if (song < 0) return;
    const S = SONGS[song], d = 60 / S.bpm / 4;
    while (next < ac.currentTime + 0.12) {
      const bar = Math.floor(step / 16) % 4, st = step % 16, ch = S.prog[bar], t = next;
      const p = PAT[(Math.floor(step / 64) + bar + song) % 4][st];
      if (p >= 0 && !(song === 6 && st % 2)) { const m = p === 3 ? ch[0] + 12 : ch[p]; note(F(m + 12), t, d * 1.6, S.lead, S.lead === 'square' ? 0.07 : 0.11); }
      if (st % 4 === 0) note(F(ch[0] - 24), t, d * 3, 'triangle', 0.35);
      else if (st % 4 === 2 && S.dr >= 2) note(F(ch[0] - 12), t, d * 1.5, 'triangle', 0.25);
      if (st % 8 === 4 && S.dr) note(F(ch[2]), t, d * 2, 'square', 0.03);
      if (S.dr) {
        if (st === 0 || st === 8 || (S.dr >= 2 && st === 10) || (S.dr === 3 && st % 4 === 0)) hit(t, 'k');
        if (st === 4 || st === 12) hit(t, 's');
        if (st % 2 === 0 || S.dr === 3) hit(t, 'h');
      }
      next += d; step++;
    }
  }
  return {
    get ligada() { return ligada; },
    alternar() { ligada = !ligada; localStorage.setItem('corrida_musica', ligada ? '1' : '0'); },
    tocar(n) {
      if (!ligada || SOM.mudo) n = -1;
      if (n === song) return;
      if (n >= 0 && !ac) {
        ac = SOM.ok(); if (!ac) return;
        master = ac.createGain(); master.gain.value = 0.32; master.connect(ac.destination);
        nbuf = ac.createBuffer(1, ac.sampleRate * 0.3, ac.sampleRate); const c = nbuf.getChannelData(0); for (let i = 0; i < c.length; i++) c[i] = Math.random() * 2 - 1;
        timer = setInterval(agenda, 25);
      }
      if (!ac) return;
      if (song < 0 && n >= 0) { next = ac.currentTime + 0.05; step = 0; }
      else if (n >= 0 && n !== song) step = 0;
      song = n;
    }
  };
})();

/* ---------- estado do app ---------- */
const A = {
  id: sessionStorage.getItem('corrida_id') || (() => { const v = Math.random().toString(36).slice(2, 10); sessionStorage.setItem('corrida_id', v); return v; })(),
  slot: null, solo: false, sala: {}, sim: null, simKey: '', preview: null, startAt: 0,
  vel: parseFloat(qs.get('vel') || '1') || 1, faces: [], minis: [], snaps: new Map(), rank: {}, rankFx: {}, rankAt: 0, fotoDataUrl: '', resultMostrado: false, lastFrame: performance.now()
};

/* ---------- rostos ---------- */
function carregarImg(src) { return new Promise(ok => { if (!src) return ok(null); const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = src; }); }
async function carregarRostos() {
  await Promise.all(COR.map(async (c, i) => {
    const ph = makeFace(i, c.cor);
    const [img, mini] = await Promise.all([carregarImg(c.foto && 'img/rostos/' + c.foto), carregarImg(c.foto && 'img/rostos/mini/' + c.foto)]);
    A.faces[i] = img ? { img, tipo: c.tipo || 'rosto' } : { img: ph, tipo: 'placeholder' };
    A.minis[i] = mini || img || ph;
    c._src = mini ? 'img/rostos/mini/' + c.foto : img ? 'img/rostos/' + c.foto : ph.toDataURL();
  }));
}

/* ---------- painel inferior ---------- */
function montarPainel() {
  const box = $('#rostos'); box.innerHTML = '';
  COR.forEach((c, i) => {
    const d = document.createElement('div'); d.className = 'rosto'; d.dataset.i = i;
    d.innerHTML = `<div class="circ" style="--c:${c.cor}"><img src="${c._src}" alt=""><span class="x">✕</span><span class="coroa">👑</span><span class="pos"></span><span class="seta"></span></div>
      <div class="nome">${c.nome}</div><div class="causa"></div><div class="badges"></div>`;
    d.addEventListener('click', () => votar(i));
    box.appendChild(d);
  });
}
let painelKey = '';
function atualizarPainel() {
  const sim = A.sim; const S = A.sala; const p1 = S.p1, p2 = S.p2;
  const c = relogio(); const nowp = performance.now();
  if (sim && sim.T > 3 && nowp - A.rankAt > 1100) {
    A.rankAt = nowp; const nr = {}; sim.order.forEach((i, k) => nr[i] = k + 1);
    for (const i in nr) if (A.rank[i] && nr[i] !== A.rank[i]) A.rankFx[i] = { d: nr[i] < A.rank[i] ? 'up' : 'down', ate: nowp + 1300 };
    A.rank = nr;
  }
  if (!sim || sim.T <= 3) A.rank = {};
  const fxk = Object.keys(A.rankFx).filter(i => A.rankFx[i].ate > nowp).map(i => i + A.rankFx[i].d).join();
  const key = JSON.stringify([sim ? sim.racers.map(r => r.alive ? 1 : 0) : 0, sim && sim.finished, A.rank, fxk, c && [c.p, c.v], SOM.mudo, MUS.ligada, p1 && [p1.voto, p1.pronto, p1.nome], p2 && [p2.voto, p2.pronto, p2.nome], !!S.partida, A.slot]);
  if (key === painelKey) return; painelKey = key;
  const vivos = sim ? sim.order.length : 16;
  document.querySelectorAll('.rosto').forEach(el => {
    const i = +el.dataset.i, r = sim ? sim.racers[i] : null;
    const morto = r && !r.alive && !(sim.finished && i === sim.win);
    el.classList.toggle('morto', !!morto);
    el.classList.toggle('finalista', !!(sim && r && r.alive && vivos <= 2));
    el.classList.toggle('campeao', !!(sim && sim.finished && i === sim.win));
    el.querySelector('.causa').textContent = morto ? CAUSA_CURTA[r.causa] || '' : '';
    const rk = !morto && A.rank[i] && !(sim && sim.finished) ? A.rank[i] : 0;
    el.querySelector('.pos').textContent = rk ? rk + 'º' : '';
    const fx = A.rankFx[i] && A.rankFx[i].ate > nowp && rk ? A.rankFx[i].d : '';
    const se = el.querySelector('.seta'); se.className = 'seta ' + fx; se.textContent = fx === 'up' ? '▲' : fx === 'down' ? '▼' : '';
    const b = el.querySelector('.badges'); b.innerHTML = '';
    for (const [k, p] of [['p1', p1], ['p2', p2]]) if (p && p.voto === i) { const s = document.createElement('span'); s.className = 'badge ' + k; s.innerHTML = p.foto ? `<img src="${p.foto}">` : (k === 'p1' ? 'J1' : 'J2'); s.title = p.nome; b.appendChild(s); }
    const meu = A.slot && S[A.slot] && S[A.slot].voto === i;
    el.classList.toggle('meuvoto', !!meu);
    el.classList.toggle('clicavel', !!(A.slot && !S.partida));
  });
  // barra
  const chip = (k, p) => p ? `<div class="chip ${k}">${p.foto ? `<img src="${p.foto}">` : '<span class="sem"></span>'}<div><b>${esc(p.nome)}</b><small>${p.voto != null ? 'aposta: ' + esc(COR[p.voto].nome) : 'escolhendo...'}</small></div>${p.pronto && !S.partida ? '<i class="ok">PRONTO</i>' : ''}</div>` : `<div class="chip ${k} vazio"><span class="sem"></span><div><b>${k === 'p1' ? 'Jogador 1' : 'Jogador 2'}</b><small>aguardando...</small></div></div>`;
  let meio = '';
  if (!S.partida) {
    if (!A.slot) meio = '<span class="dica">Assistindo</span>';
    else {
      const eu = S[A.slot] || {};
      if (eu.voto == null) meio = '<span class="dica">Clique no rosto de quem vai vencer</span>';
      else meio = `<button id="btnPronto" class="${eu.pronto ? 'on' : ''}">${eu.pronto ? (A.solo ? '...' : 'ESPERANDO O OUTRO') : 'COMEÇAR'}</button>`;
    }
  } else meio = sim && sim.finished ? '<span class="dica">FIM DE CORRIDA</span>' : c && c.p ? '<span class="dica pausa">PAUSADO</span>' : `<span class="dica">CORRIDA EM ANDAMENTO${c && c.v !== 1 ? ' · ' + c.v + 'x' : ''}</span>`;
  $('#barra').innerHTML = chip('p1', p1) + `<div class="meio">${meio}</div>` + (A.solo ? '<div class="chip vazio solo"><div><b>Modo teste</b><small>sozinho</small></div></div>' : chip('p2', p2)) + `<button id="btnAtalhos" title="atalhos (H)">⌨</button><button id="btnSom" title="som">${SOM.mudo ? '🔇' : '🔊'}</button>`;
  const bp = $('#btnPronto'); if (bp) bp.onclick = pronto;
  $('#btnSom').onclick = () => { SOM.alternar(); painelKey = ''; atualizarPainel(); };
  $('#btnAtalhos').onclick = () => $('#atalhos').classList.toggle('oculto');
}
function esc(s) { return String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

/* ---------- ações ---------- */
async function salvarSala(fn) { if (A.solo) { const v = fn(JSON.parse(JSON.stringify(A.sala))); if (v) { A.sala = v; aoMudarSala(); } } else await NET.transacao(fn); }
function votar(i) {
  SOM.ok();
  if (!A.slot || A.sala.partida) return;
  salvarSala(s => { if (!s[A.slot] || s.partida) return undefined; s[A.slot].voto = i; s[A.slot].pronto = false; return s; });
}
function pronto() {
  SOM.ok();
  salvarSala(s => { if (!s[A.slot] || s.partida || s[A.slot].voto == null) return undefined; s[A.slot].pronto = !s[A.slot].pronto; return s; });
}
function novaPartida() {
  A.resultMostrado = false; $('#resultado').classList.add('oculto');
  salvarSala(s => { delete s.partida; for (const k of ['p1', 'p2']) if (s[k]) { s[k].voto = null; s[k].pronto = false; } return s; });
}
function tentarComecar() {
  const s = A.sala;
  if (s.partida || !s.p1 || !s.p1.pronto) return;
  if (!A.solo && !(s.p2 && s.p2.pronto)) return;
  if (A.slot !== 'p1') return;
  const tParam = A.solo ? parseFloat(qs.get('t') || '0') || 0 : 0;
  const at = (A.solo ? Date.now() : NET.agora()) + 900;
  const partida = { seed: Math.floor(Math.random() * 2e9), at, clock: { base: Math.round(tParam * 60) - 54, anchor: at - 900, v: A.vel, p: false } };
  salvarSala(x => { if (x.partida) return undefined; x.partida = partida; return x; });
}

/* ---------- lobby ---------- */
function montarLobby() {
  const status = () => {
    if (NET.modo !== 'firebase') { $('#modo').textContent = '● Modo local — abra em duas abas para testar os 2 jogadores'; $('#modo').className = 'local'; return; }
    $('#modo').textContent = NET.conectado ? '● Online (Firebase)' : '● Conectando ao Firebase...'; $('#modo').className = NET.conectado ? 'online' : 'local';
  };
  status(); NET.aoConectar = status;
  setTimeout(() => { if (NET.modo === 'firebase' && !NET.conectado) { $('#modo').textContent = '● Firebase não conectou — confira se o Realtime Database foi criado'; $('#modo').className = 'erro'; } }, 8000);
  $('#nome').value = localStorage.getItem('corrida_nome') || '';
  $('#foto').addEventListener('change', ev => {
    const f = ev.target.files[0]; if (!f) return;
    const rd = new FileReader(); rd.onload = () => {
      const im = new Image(); im.onload = () => {
        const c = document.createElement('canvas'); c.width = c.height = 160; const x = c.getContext('2d');
        const s = Math.min(im.width, im.height); x.drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, 160, 160);
        A.fotoDataUrl = c.toDataURL('image/jpeg', 0.82); $('#previa').style.backgroundImage = `url(${A.fotoDataUrl})`; $('#previa').classList.add('tem');
      }; im.src = rd.result;
    }; rd.readAsDataURL(f);
  });
  $('#entrar').onclick = entrar;
  $('#solo').onclick = () => entrarSolo();
  $('#resetar').onclick = async () => { if (confirm('Resetar a sala? Isso tira os dois jogadores e apaga a partida.')) { await NET.set('', null); } };
}
async function entrar() {
  SOM.ok();
  const nome = $('#nome').value.trim() || 'Jogador';
  localStorage.setItem('corrida_nome', nome);
  const eu = { id: A.id, nome: nome.slice(0, 18), foto: A.fotoDataUrl || '', voto: null, pronto: false };
  const res = await NET.transacao(s => {
    for (const k of ['p1', 'p2']) if (s[k] && s[k].id === A.id) { s[k] = Object.assign(s[k], { nome: eu.nome, foto: eu.foto || s[k].foto }); return s; }
    if (!s.p1) { s.p1 = eu; return s; }
    if (!s.p2) { s.p2 = eu; return s; }
    return s;
  });
  A.entrou = true;
  aoMudarSala();
}
function entrarSolo() {
  SOM.ok();
  const nome = $('#nome').value.trim() || 'Teste';
  A.solo = true; A.entrou = true;
  A.sala = { p1: { id: A.id, nome, foto: A.fotoDataUrl || '', voto: null, pronto: false } };
  aoMudarSala();
}

function aoMudarSala() {
  const S = A.sala;
  A.slot = S.p1 && S.p1.id === A.id ? 'p1' : S.p2 && S.p2.id === A.id ? 'p2' : null;
  // lobby
  const lista = ['p1', 'p2'].map(k => S[k] ? `<div class="jog ${k}">${S[k].foto ? `<img src="${S[k].foto}">` : '<span class="sem"></span>'}<b>${esc(S[k].nome)}</b><small>${k === 'p1' ? 'Jogador 1' : 'Jogador 2'}${S[k].id === A.id ? ' (você)' : ''}</small></div>` : `<div class="jog ${k} vazio"><span class="sem"></span><b>—</b><small>${k === 'p1' ? 'Jogador 1' : 'Jogador 2'}</small></div>`).join('');
  $('#lista').innerHTML = A.solo ? '' : lista;
  const cheia = S.p1 && S.p2;
  const naCena = A.solo || (A.slot && cheia) || (A.entrou && !A.slot && cheia) || (!!S.partida && A.entrou);
  $('#lobby').classList.toggle('oculto', !!naCena);
  if (!naCena) {
    $('#status').textContent = A.slot ? `Você é o ${A.slot === 'p1' ? 'Jogador 1' : 'Jogador 2'}. Esperando o outro jogador entrar...` : (cheia ? 'Sala cheia. Clique em entrar para assistir.' : '');
    $('#entrar').textContent = A.slot ? 'ATUALIZAR' : (cheia ? 'ASSISTIR' : 'ENTRAR NA SALA');
  }
  // partida
  if (S.partida) {
    const k = S.partida.seed + ':' + S.partida.at;
    if (k !== A.simKey) { A.simKey = k; A.sim = novaSim(S.partida.seed); A.snaps = new Map([[0, foto(A.sim)]]); A.resultMostrado = false; limparEfeitos(); }
  } else if (A.sim) { A.sim = null; A.simKey = ''; A.resultMostrado = false; $('#resultado').classList.add('oculto'); R.caps = []; }
  painelKey = ''; atualizarPainel();
  tentarComecar();
}

/* ---------- resultado ---------- */
function mostrarResultado() {
  A.resultMostrado = true;
  const S = A.sala, w = COR[IDX_WIN];
  const linha = (k, p) => { if (!p) return ''; const ok = p.voto === IDX_WIN; return `<div class="ap ${ok ? 'certo' : 'errado'}">${p.foto ? `<img src="${p.foto}">` : ''}<b>${esc(p.nome)}</b> apostou em <b>${p.voto != null ? esc(COR[p.voto].nome) : '—'}</b><i>${ok ? 'ACERTOU!' : 'ERROU!'}</i></div>`; };
  $('#resultado').innerHTML = `<div class="card"><div class="trofeu">🏆</div><div class="campeao"><img src="${w._src}"><div><small>VENCEDOR</small><b>${esc(w.nome)}</b></div></div>
    ${linha('p1', S.p1)}${A.solo ? '' : linha('p2', S.p2)}
    ${A.slot ? '<button id="btnNova">NOVA PARTIDA</button>' : ''}</div>`;
  $('#resultado').classList.remove('oculto');
  const b = $('#btnNova'); if (b) b.onclick = novaPartida;
}

/* ---------- relógio sincronizado (pausar / voltar / velocidade) ---------- */
function relogio() { const p = A.sala && A.sala.partida; return p && p.clock; }
function agoraMs() { return A.solo ? Date.now() : NET.agora(); }
function alvoTick() { const c = relogio(); if (!c) return 0; return Math.floor(c.base + (c.p ? 0 : Math.max(0, agoraMs() - c.anchor) / 1000 * 60 * c.v)); }
function mudarRelogio(fn) {
  const c = relogio(); if (!c) return;
  const cur = alvoTick(), nc = fn({ base: cur, anchor: agoraMs(), v: c.v, p: c.p });
  nc.base = Math.max(nc.min ?? 0, Math.min(Math.round(nc.base), FIM_TICKS)); delete nc.min;
  if (A.solo) { A.sala.partida.clock = nc; aoMudarSala(); } else NET.set('partida/clock', nc);
}
const CONTROLES = {
  pausar: () => mudarRelogio(c => ({ ...c, p: !c.p })),
  pular: s => mudarRelogio(c => ({ ...c, base: c.base + s * 60 })),
  vel: v => mudarRelogio(c => ({ ...c, v })),
  inicio: () => mudarRelogio(c => ({ ...c, base: -54, p: false, min: -54 }))
};
const foto = s => structuredClone(Object.assign({}, s));
function limparEfeitos() { if (!R) return; R.parts = []; R.caps = []; R.pendingZone = null; R.confetti = 0; R.focusFix = null; A.resultMostrado = false; $('#resultado').classList.add('oculto'); }
function voltarPara(alvo) {
  let best = 0; for (const k of A.snaps.keys()) if (k <= alvo && k > best) best = k;
  Object.assign(A.sim, structuredClone(A.snaps.get(best)));
  limparEfeitos();
}

/* ---------- loop ---------- */
let R;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - A.lastFrame) / 1000); A.lastFrame = now;
  const sim = A.sim, c = relogio();
  let andou = false;
  if (sim) {
    const alvo = Math.max(0, Math.min(alvoTick(), FIM_TICKS));
    if (alvo < sim.ticks) voltarPara(alvo);
    const salto = alvo - sim.ticks > 120;
    if (salto) limparEfeitos();
    let n = 0;
    while (sim.ticks < alvo && n < 9000) {
      sim.tick(); n++; andou = true;
      if (alvo - sim.ticks < 8) R.consume(sim, sim.out);
      sim.out.length = 0;
      if (sim.ticks % 60 === 0 && !A.snaps.has(sim.ticks)) A.snaps.set(sim.ticks, foto(sim));
      if (sim.over) break;
    }
    if (sim.over && !A.resultMostrado) mostrarResultado();
    if (!sim.over && A.resultMostrado) { A.resultMostrado = false; $('#resultado').classList.add('oculto'); }
  }
  // música
  if (sim) MUS.tocar(c && c.p || sim.finished || sim.T < 2.6 ? -1 : sim.order.length <= 2 && sim.T > 560 ? 5 : sim.zone);
  else MUS.tocar(A.entrou ? 6 : -1);
  const parado = sim && (!andou || (c && c.p));
  const show = sim || A.preview;
  try { R.draw(show, { racing: !!sim, sub: subtitulo() }, parado ? 0 : dt * Math.min(c ? c.v : 1, 2)); } catch (e) { console.error(e); }
  atualizarPainel();
}

/* ---------- atalhos ---------- */
addEventListener('keydown', ev => {
  if (ev.target && /INPUT|TEXTAREA/.test(ev.target.tagName)) return;
  const k = ev.key, temCorrida = !!(A.sim && relogio());
  if (k === 'h' || k === 'H' || k === '?') { $('#atalhos').classList.toggle('oculto'); return; }
  if (k === 'Escape') { $('#atalhos').classList.add('oculto'); return; }
  if (k === 'm' || k === 'M') { MUS.alternar(); painelKey = ''; return; }
  if (k === 's' || k === 'S') { SOM.alternar(); painelKey = ''; return; }
  if (!temCorrida) return;
  if (k === ' ') { ev.preventDefault(); CONTROLES.pausar(); }
  else if (k === 'ArrowLeft') { ev.preventDefault(); CONTROLES.pular(ev.shiftKey ? -15 : -5); }
  else if (k === 'ArrowRight') { ev.preventDefault(); CONTROLES.pular(ev.shiftKey ? 15 : 5); }
  else if (k === ',') CONTROLES.pular(-1);
  else if (k === '.') CONTROLES.pular(1);
  else if (k === '1') CONTROLES.vel(0.5);
  else if (k === '2') CONTROLES.vel(1);
  else if (k === '3') CONTROLES.vel(2);
  else if (k === '4') CONTROLES.vel(4);
  else if (k === 'Home' || k === '0') CONTROLES.inicio();
});

function subtitulo() {
  const S = A.sala; if (!A.entrou) return '';
  if (!A.slot) return 'Os jogadores estão escolhendo...';
  const eu = S[A.slot] || {};
  if (eu.voto == null) return 'Escolham lá embaixo quem vai vencer';
  if (!eu.pronto) return 'Aperte COMEÇAR quando tiver certeza';
  return A.solo ? '' : 'Esperando o outro jogador...';
}

function ajustarTamanho() {
  const app = $('#app'); const w = Math.min(innerWidth, innerHeight * 16 / 9);
  app.style.width = w + 'px'; app.style.height = (w * 9 / 16) + 'px'; app.style.fontSize = (w / 1920 * 16) + 'px';
}

async function iniciar() {
  ajustarTamanho(); addEventListener('resize', ajustarTamanho);
  await carregarRostos();
  try { await document.fonts.load('40px "Lilita One"'); await document.fonts.load('20px "Press Start 2P"'); } catch (e) { }
  R = new Render($('#tela'), COR, A.faces); R.minis = A.minis; R.sfx = n => SOM.tocar(n);
  A.preview = novaSim(20261002);
  montarPainel();
  await NET.init();
  montarLobby();
  NET.ouvir(s => { if (A.solo) return; A.sala = s || {}; if (!A.entrou && [s && s.p1, s && s.p2].some(p => p && p.id === A.id)) A.entrou = true; aoMudarSala(); });
  if (qs.has('solo')) { entrarSolo(); if (qs.has('auto')) { votar(+(qs.get('voto') || 0)); pronto(); } }
  window.A = A;
  aoMudarSala();
  requestAnimationFrame(frame);
}
iniciar();
