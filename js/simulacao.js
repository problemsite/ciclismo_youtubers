/* =====================================================================
   SIMULAÇÃO — determinística (mesma semente = mesma corrida nos 2 PCs)
   Tudo roda em "ticks" de 1/60 s de tempo real. O roteiro (EVENTOS) define
   quem cai em cada armadilha; a física só deixa tudo bem "goofy".
   ===================================================================== */
'use strict';
const W = 1920, H = 756, GY = 640, CY = 92, GRAV = 2600;
const WHEEL_R = 30, HEAD_R = 22, WB = 46;
const LOCAL = [{ x: -WB, y: 0 }, { x: WB, y: 0 }, { x: 28, y: -112 }];
const RADII = [WHEEL_R, WHEEL_R, HEAD_R];
const PAIRS = [[0, 1], [0, 2], [1, 2]].map(([a, b]) => ({ a, b, d: Math.hypot(LOCAL[a].x - LOCAL[b].x, LOCAL[a].y - LOCAL[b].y) }));

const ZONAS = [
  { id: 'planicie', nome: 'PLANÍCIE', t: 0 },
  { id: 'deserto', nome: 'DESERTO', t: 146 },
  { id: 'cidade', nome: 'CIDADE', t: 286 },
  { id: 'gelo', nome: 'MONTANHAS DE GELO', t: 426 },
  { id: 'castelo', nome: 'CASTELO DE LAVA', t: 562 }
];

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const angN = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

function bumpH(b, u) {
  if (u < 0 || u > b.w) return 0;
  if (b.type === 'trap') { if (u < b.s) return b.h * u / b.s; if (u > b.w - b.s) return b.h * (b.w - u) / b.s; return b.h; }
  return b.h;
}

/* quanto tempo antes do horário do evento o objeto nasce fora da tela */
const LEAD = { oil: 3, banana: 3, mush: 3, pad: 3, gate: 3.2, finalgate: 3.2, ramp: 3.4, pinch: 3.4, cactus: 3, mine: 3, tornado: 2.6, light: 3, manhole: 3, balloon: 3, ice: 3, lava: 3, hill: 3, valley: 3, finish: 3 };

class Sim {
  constructor(seed, n, win, vice, late = []) {
    this.seed = seed; this.rs = (seed >>> 0) || 1; this.n = n; this.win = win; this.vice = vice;
    this.T = 0; this.ticks = 0; this.camX = 0; this.speed = 0; this.out = [];
    this.slowTicks = 0; this.timeScale = 1; this.focus = null; this.shake = 0;
    this.bumps = []; this.obs = []; this.terrain = []; this.excl = []; this.nextBump = W + 200; this.nextAtk = 9; this.windT = 0;
    this.zone = 0; this.zoneBounds = [{ wx: -1e9, z: 0 }];
    this.gapRule = null; this.lock = null; this.kills = 0; this.finished = false; this.over = false; this.overTimer = 0;
    const R = () => this.rng();
    late = late.filter(i => i >= 0 && i !== win && i !== vice);
    const others = [...Array(n).keys()].filter(i => i !== win && i !== vice && !late.includes(i));
    for (let i = others.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [others[i], others[j]] = [others[j], others[i]]; }
    this.victims = others.concat(late);
    const ord = [...Array(n).keys()];
    for (let i = ord.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [ord[i], ord[j]] = [ord[j], ord[i]]; }
    this.order = ord;
    this.racers = [];
    for (let i = 0; i < n; i++) {
      this.racers.push({
        i, alive: true, pts: LOCAL.map(() => ({ x: 0, y: 0, vx: 0, vy: 0, ox: 0, oy: 0 })),
        tx: 0, goof: 0.75 + R() * 0.75, dmg: 0, wheelRot: R() * 6, pedal: R() * 6, ang: 0,
        headDown: 0, padCool: 0, kickCool: 0, bonkCool: 0, dead: null, place: 0, onGround: true,
        v: 0, ritmo: 0.8 + R() * 0.5, f1: 0.12 + R() * 0.25, f2: 0.31 + R() * 0.4, p1: R() * 6.3, p2: R() * 6.3,
        atkT: 0, tiredT: 0, stunT: 0, boostT: 0, contactCool: 3 + R() * 6
      });
    }
    this.events = this.buildScript();
    this.computeFormation();
    for (const r of this.racers) { r.tx = this.fx[r.i]; this.placeRacer(r, r.tx); }
  }

  rng() { const a = this.rs = (this.rs + 0x6D2B79F5) | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }

  /* ---------------- ROTEIRO ---------------- */
  buildScript() {
    const v = this.victims; let k = 0; const take = m => v.slice(k, k += m);
    const E = [];
    const add = (t, type, o = {}) => E.push(Object.assign({ t, type }, o));
    // ZONA 1 — PLANÍCIE
    add(26, 'pad');
    add(45, 'gate', { v: take(1), pos: 'rear', gap: 320 });
    add(63, 'pad');
    add(85, 'anvil', { v: take(1) });
    add(100, 'hill', { depth: -150, len: 2600 });
    add(126, 'ramp', { v: take(2), pos: 'rear', gap: 330 });
    // ZONA 2 — DESERTO
    add(160, 'pad');
    add(172, 'cactus', { v: take(1) });
    add(190, 'valley', { depth: 170, len: 2800 });
    add(206, 'mine', { v: take(1), pos: 'front', gap: 230 });
    add(224, 'pad');
    add(241, 'tornado', { v: take(1) });
    add(258, 'pad');
    add(276, 'pinch', { v: take(1), pos: 'rear', gap: 360 });
    // ZONA 3 — CIDADE
    add(298, 'pad');
    add(313, 'light', { v: take(1) });
    add(328, 'valley', { depth: 150, len: 2400 });
    add(346, 'manhole', { v: take(1), pos: 'rear', gap: 140 });
    add(364, 'pad');
    add(381, 'balloon', { v: take(1) });
    add(399, 'pad');
    add(416, 'ufo', { v: take(1) });
    // ZONA 4 — GELO
    add(440, 'pad');
    add(452, 'hill', { depth: -170, len: 3400 });
    add(472, 'ice', { v: take(1) });
    add(494, 'pad');
    add(522, 'avalanche', { alvo: [this.vice], pos: 'rear', gap: 0 });
    add(546, 'pad');
    // ZONA 5 — CASTELO (final)
    add(574, 'fireball');
    add(584, 'pad');
    add(601, 'lava', { v: take(1), pos: 'rear', gap: 160 });
    add(612, 'swap', { first: 'vice' });
    add(621, 'crusher');
    add(632, 'fireball');
    add(640, 'pad');
    add(648, 'swap', { first: 'win' });
    add(655, 'crusher');
    add(662, 'fireball');
    add(668, 'swap', { first: 'vice' });
    add(675, 'pad');
    add(681, 'swap', { first: 'win' });
    add(692, 'finalgate', { v: [this.vice], pos: 'rear', gap: 330 });
    add(699, 'finish');
    // bagunças pequenas (não matam ninguém, só embaralham o pelotão)
    const main = E.slice(), POOL = [
      ['oil', 'banana', 'mush', 'roll', 'domino'], ['roll', 'banana', 'wind', 'mush', 'domino'],
      ['oil', 'roll', 'banana', 'mush', 'domino'], ['oil', 'wind', 'roll', 'mush', 'domino'], ['roll', 'mush', 'domino', 'banana']];
    let t = 10;
    while (t < 684) {
      t += 8 + this.rng() * 6;
      if (main.some(e => t > e.t - ((e.v || e.alvo) && e.pos ? 11 : 4) && t < e.t + 4)) continue;
      let z = 0; for (let q = 0; q < ZONAS.length; q++) if (t >= ZONAS[q].t) z = q;
      const pool = POOL[z]; add(t, pool[Math.floor(this.rng() * pool.length)]);
    }
    E.sort((a, b) => a.t - b.t);
    return E;
  }

  /* ---------------- terreno ---------------- */
  baseAt(wx) {
    let y = 0;
    for (const t of this.terrain) { const u = (wx - t.wx) / t.len; if (u > 0 && u < 1) y += t.depth * (1 - Math.cos(2 * Math.PI * u)) / 2; }
    return y;
  }
  slopeAt(wx) { return (this.baseAt(wx + 30) - this.baseAt(wx - 30)) / 60; }
  groundAt(sx) {
    const wx = sx + this.camX, base = GY + this.baseAt(wx);
    let y = base, pad = false;
    for (const b of this.bumps) {
      if (wx < b.wx || wx > b.wx + b.w) continue;
      const g = base - bumpH(b, wx - b.wx);
      if (g < y) { y = g; pad = b.type === 'pad'; }
    }
    for (const o of this.obs) { const f = OBS[o.type].ground; if (f) { const g = f(this, o, sx); if (g != null && g < y) { y = g; pad = false; } } }
    return { y, pad };
  }
  groundSpan(x, half) {
    const a = this.groundAt(x - half), b = this.groundAt(x), c = this.groundAt(x + half);
    let y = Math.min(a.y, b.y, c.y);
    return { y, pad: a.pad || b.pad || c.pad };
  }
  ceilAt(sx) {
    let c = CY;
    for (const o of this.obs) { const f = OBS[o.type].ceil; if (f) { const v = f(this, o, sx); if (v != null && v > c) c = v; } }
    return c;
  }
  excluded(wx, m) { for (const e of this.excl) if (wx + m > e.a && wx - m < e.b) return true; return false; }
  exclude(a, b) { this.excl.push({ a, b }); this.bumps = this.bumps.filter(bp => bp.wx + bp.w < a || bp.wx > b); }

  placeRacer(r, x) {
    const gy = GY - WHEEL_R;
    r.pts.forEach((p, k) => { p.x = x + LOCAL[k].x; p.y = gy + LOCAL[k].y; p.vx = p.vy = 0; });
  }

  /* ---------------- formação (posição de cada um na tela) ---------------- */
  computeFormation() {
    const n = this.order.length; this.fx = {};
    const sp = n > 1 ? 1420 / (n - 1) : 0; let x = 1000 + sp * (n - 1) / 2;
    for (let k = 0; k < n; k++) { this.fx[this.order[k]] = x; x -= sp; }
  }
  split() {
    const g = this.gapRule, A = this.order.map(i => this.racers[i]);
    const V = g ? A.filter(r => g.v.includes(r.i)) : [], O = g ? A.filter(r => !g.v.includes(r.i)) : A;
    return { A, V, O };
  }
  gapX() {
    const g = this.gapRule; if (!g) return W / 2;
    const { V, O } = this.split();
    if (!V.length || !O.length) return V.length ? V[0].tx + (g.pos === 'rear' ? 120 : -120) : W / 2;
    if (g.pos === 'rear') return (Math.max(...V.map(r => r.tx)) + Math.min(...O.map(r => r.tx))) / 2;
    return (Math.min(...V.map(r => r.tx)) + Math.max(...O.map(r => r.tx))) / 2;
  }

  /* ---------------- pelotão: ritmo próprio, ataques, vácuo ---------------- */
  packStep(dt) {
    const S = this, { A, V, O } = this.split(), n = A.length, g = this.gapRule;
    if (!n || this.T < 3.2 || dt <= 0) return;
    const ramp = clamp((this.T - 3.2) / 4, 0, 1);
    let C = 0; for (const r of A) C += r.tx; C /= n;
    const aim = g && V.length ? (g.pos === 'rear' ? 1080 : 880) : 980;
    const few = n <= 3;
    if (this.T > this.nextAtk) {
      this.nextAtk = this.T + (2.5 + this.rng() * 4.5) * (n < 6 ? 1.6 : 1);
      const r = A[Math.floor(this.rng() * n)];
      if (r && r.atkT <= 0 && r.tiredT <= 0 && !V.includes(r) && !this.finished) r.atkT = 1.6 + this.rng() * 1.8;
    }
    let minO = 1e9, maxO = -1e9, minV = 1e9, maxV = -1e9;
    for (const r of O) { minO = Math.min(minO, r.tx); maxO = Math.max(maxO, r.tx); }
    for (const r of V) { minV = Math.min(minV, r.tx); maxV = Math.max(maxV, r.tx); }
    const drift = (aim - C) * 0.7;
    for (const r of A) {
      let vt;
      if (V.includes(r) && O.length) {
        const goal = g.pos === 'rear' ? minO - g.size - 70 : maxO + g.size + 70;
        vt = clamp((goal - r.tx) * 2.2, -330, 330) + (r.stunT > 0 ? -80 : 0);
      } else {
        const f = Math.sin(this.T * r.f1 + r.p1) * 0.6 + Math.sin(this.T * r.f2 + r.p2) * 0.4;
        vt = f * (few ? 40 : 95) * r.ritmo;
        if (r.atkT > 0) vt += few ? 120 : 175; else if (r.tiredT > 0) vt -= 55;
        if (r.boostT > 0) vt += 230;
        if (r.stunT > 0) vt -= 250;
        vt -= r.dmg * 30;
        for (const q of A) { const d = q.tx - r.tx; if (q !== r && d > 35 && d < 170) { vt += 32; break; } }
        for (const q of A) { const d = r.tx - q.tx; if (q !== r && Math.abs(d) < 24) vt += (d >= 0 ? 1 : -1) * (24 - Math.abs(d)) * 3; }
        vt -= (r.tx - C) * (few ? 0.16 : 0.075);
        if (this.windT > 0) vt -= 80 * r.goof;
        if (g && V.length) {
          if (g.pos === 'rear') { const fl = maxV + g.size + 40; if (r.tx < fl) vt += (fl - r.tx) * 5; }
          else { const cl = minV - g.size - 40; if (r.tx > cl) vt -= (r.tx - cl) * 5; }
        }
      }
      vt += drift;
      if (r.tx > 1640) vt -= (r.tx - 1640) * 5;
      if (r.tx < 230) vt += (230 - r.tx) * 5;
      vt *= ramp;
      r.v += (vt - r.v) * Math.min(1, dt * 2.2);
      r.tx += r.v * dt;
      if (r.atkT > 0) { r.atkT -= dt; if (r.atkT <= 0) r.tiredT = 2 + this.rng() * 1.5; } else if (r.tiredT > 0) r.tiredT -= dt;
      if (r.stunT > 0) r.stunT -= dt;
      if (r.boostT > 0) r.boostT -= dt;
    }
    // contato entre bicicletas (bem raro)
    for (const r of A) {
      r.contactCool -= dt;
      if (r.contactCool > 0 || !r.onGround || V.includes(r)) continue;
      for (const q of A) {
        if (q === r) continue; const d = S.rx(q) - S.rx(r);
        if (d > 20 && d < 62 && q.onGround) {
          if (this.rng() < dt * 0.05) { this.kick(r, 620, -3.5); r.stunT = Math.max(r.stunT, 0.4); r.contactCool = 8; this.out.push({ k: 'txt', txt: 'TOC', x: S.rx(r) + 40, y: r.pts[1].y - 40, c: '#fff' }); }
          break;
        }
      }
    }
    if (this.windT > 0) this.windT -= dt;
  }

  /* ---------------- passo principal ---------------- */
  tick() {
    const realDt = 1 / 60;
    if (this.slowTicks > 0) { this.slowTicks--; this.timeScale = lerp(this.timeScale, 0.26, 0.18); }
    else this.timeScale = lerp(this.timeScale, 1, 0.07);
    const dt = realDt * this.timeScale;
    this.ticks++; this.T += dt;
    this.shake = Math.max(0, this.shake - realDt);

    // velocidade
    let v;
    if (this.T < 3) v = 0;
    else v = 380 + 200 * smooth((this.T - 3) / 3) + 330 * clamp((this.T - 6) / 680, 0, 1);
    v *= clamp(1 + this.slopeAt(this.camX + W / 2) * 1.8, 0.6, 1.5);
    if (this.finished) v = 0;
    this.speed += (v - this.speed) * Math.min(1, dt * (this.finished ? 0.8 : 2));
    this.camX += this.speed * dt;

    // zonas
    let z = 0; for (let k = 0; k < ZONAS.length; k++) if (this.T >= ZONAS[k].t) z = k;
    if (z > this.zone) { this.zone = z; this.zoneBounds.push({ wx: this.camX + W + 150, z }); this.out.push({ k: 'zona', z }); }

    // roteiro
    for (const e of this.events) {
      if ((e.v || e.alvo) && e.pos && !e._prep && this.T >= e.t - 9) { e._prep = true; this.prepare(e); }
      if (!e._spawn && this.T >= e.t - (LEAD[e.type] || 0)) { e._spawn = true; this.spawn(e); }
    }

    this.genBumps();
    for (const o of this.obs) OBS[o.type].update(this, o, dt);
    this.obs = this.obs.filter(o => !o.gone);
    this.terrain = this.terrain.filter(t => t.wx + t.len > this.camX - 600);
    this.excl = this.excl.filter(e => e.b > this.camX - 600);

    this.order = this.racers.filter(r => r.alive).sort((a, b) => b.tx - a.tx || a.i - b.i).map(r => r.i);
    this.packStep(dt);
    for (const r of this.racers) { if (r.alive) this.stepRacer(r, dt); else this.stepDead(r, dt); }

    if (this.focus) { this.focus.t -= realDt; if (this.focus.t <= 0) this.focus = null; }
    if (this.finished) { this.overTimer += realDt; if (this.overTimer > 7.5) this.over = true; }
  }

  genBumps() {
    while (this.nextBump < this.camX + W + 260) {
      const wx = this.nextBump, R = () => this.rng();
      const r1 = R(), r2 = R(), r3 = R(), r4 = R();
      if (this.T > 3.5 && !this.excluded(wx, 260)) {
        let b;
        if (r1 < 0.42) b = { type: 'sq', wx, w: 60 + r2 * 90, h: 14 + r3 * 24 };
        else if (r1 < 0.8) b = { type: 'trap', wx, w: 150 + r2 * 130, h: 20 + r3 * 28, s: 40 + r4 * 30 };
        else b = { type: 'sq', wx, w: 40 + r2 * 30, h: 34 + r3 * 18 };
        b.var = Math.floor(r4 * 1000);
        this.bumps.push(b);
      }
      this.nextBump += 560 + R() * 800 - Math.min(200, this.T * 0.3);
    }
    this.bumps = this.bumps.filter(b => b.wx + b.w > this.camX - 300);
  }

  prepare(e) {
    const list = (e.alvo || e.v).filter(i => this.racers[i].alive);
    this.gapRule = { pos: e.pos, v: list, size: e.gap || 0, ev: e };
    this.lock = e;
  }
  endEvent(e) { if (this.gapRule && this.gapRule.ev === e) this.gapRule = null; if (this.lock === e) this.lock = null; }
  R(i) { return this.racers[i]; }
  rx(r) { return (r.pts[0].x + r.pts[1].x) / 2; }

  spawn(e) {
    const S = this, wx0 = S.camX + W + 300, t = e.type;
    const vic = e.v ? S.racers[e.v[0]] : null;
    switch (t) {
      case 'pad': S.exclude(wx0 - 260, wx0 + 420); S.bumps.push({ type: 'pad', wx: wx0, w: 150, h: 22 }); break;
      case 'hill': case 'valley': S.terrain.push({ wx: wx0 - 100, len: e.len, depth: e.depth }); break;
      case 'gate': case 'finalgate':
        S.exclude(wx0 - 320, wx0 + 520);
        S.obs.push({ type: 'gate', e, wx: wx0, w: 140, bottom: CY, gapX: S.gapX(), closed: false, final: t === 'finalgate' }); break;
      case 'ramp':
        S.exclude(wx0 - 260, wx0 + 600 + 420);
        S.obs.push({ type: 'ramp', e, wx: wx0 + 600, len: 600, h: 0, gapX: S.gapX(), closed: false }); break;
      case 'pinch':
        S.exclude(wx0 - 100, wx0 + 800);
        S.obs.push({ type: 'pinch', e, wx: wx0 + 300, R: 0, gapX: S.racers[e.v[0]].tx, closed: false }); break;
      case 'cactus': S.exclude(wx0 - 260, wx0 + 300); S.obs.push({ type: 'cactus', e, wx: wx0, hit: false }); break;
      case 'mine': S.exclude(wx0 - 260, wx0 + 300); S.obs.push({ type: 'mine', e, wx: wx0, boom: false }); break;
      case 'tornado': S.exclude(wx0 - 200, wx0 + 400); S.obs.push({ type: 'tornado', e, wx: wx0 + 100, hit: {}, t: 0 }); break;
      case 'light': S.exclude(wx0 - 200, wx0 + 260); S.obs.push({ type: 'light', e, wx: wx0, state: 0 }); break;
      case 'manhole': S.exclude(wx0 - 260, wx0 + 300); S.obs.push({ type: 'manhole', e, wx: wx0, open: false, done: false }); break;
      case 'balloon':
        S.exclude(wx0 - 260, wx0 + 700); S.bumps.push({ type: 'pad', wx: wx0, w: 150, h: 22 });
        S.obs.push({ type: 'balloon', e, wx: wx0, bwx: wx0 + 330, by: CY + 150, t: 0, taken: false }); break;
      case 'ufo': S.obs.push({ type: 'ufo', e, sx: vic ? S.rx(vic) : W / 2, y: -220, t: 0, phase: 0 }); break;
      case 'anvil': S.obs.push({ type: 'anvil', e, sx: vic ? S.rx(vic) : W / 2, y: -200, vy: 0, t: 0, phase: 0 }); break;
      case 'ice': S.exclude(wx0 - 260, wx0 + 400); S.obs.push({ type: 'ice', e, wx: wx0, w: 230, hit: {} }); break;
      case 'lava': S.exclude(wx0 - 260, wx0 + 500); S.obs.push({ type: 'lava', e, wx: wx0, crumble: false }); break;
      case 'avalanche': S.obs.push({ type: 'avalanche', e, sx: -320, R: 40, t: 0, rot: 0, phase: 0 }); break;
      case 'fireball': {
        const balls = [];
        const alive = S.order.map(i => S.racers[i]);
        for (let k = 0; k < 4; k++) {
          const r = alive[Math.floor(S.rng() * alive.length)];
          const bx = (r ? S.rx(r) : W / 2) + (S.rng() - 0.5) * 300;
          balls.push({ sx: bx, y: GY + 60, vy: -(1500 + S.rng() * 350), vx: (S.rng() - 0.5) * 160, d: k * 0.45, on: false, done: false, warned: false });
        }
        S.obs.push({ type: 'fireball', e, balls, t: 0 }); break;
      }
      case 'crusher': {
        const rear = S.racers[S.order[S.order.length - 1]];
        S.obs.push({ type: 'crusher', e, wx: S.camX + S.rx(rear) - 250, w: 130, y: CY, phase: 0, t: 0 }); break;
      }
      case 'swap': {
        const id = e.first === 'vice' ? S.vice : S.win;
        const other = id === S.vice ? S.win : S.vice;
        if (S.racers[id].alive) { S.racers[id].atkT = 3.5; S.racers[id].tiredT = 0; if (S.racers[other].alive) { S.racers[other].tiredT = 3; S.racers[other].atkT = 0; } }
        break;
      }
      case 'oil': S.exclude(wx0 - 150, wx0 + 380); S.obs.push({ type: 'oil', e, wx: wx0, w: 230, hit: {} }); break;
      case 'banana': S.exclude(wx0 - 150, wx0 + 200); S.obs.push({ type: 'banana', e, wx: wx0, taken: false }); break;
      case 'mush': S.obs.push({ type: 'mush', e, wx: wx0, y: GY - 215, t: 0, taken: false }); break;
      case 'roll': S.obs.push({ type: 'roll', e, sx: W + 160, R: 30 + S.rng() * 16, rot: 0, hit: {}, z: S.zone }); break;
      case 'wind': S.windT = 4.5; S.obs.push({ type: 'wind', e, t: 0, dur: 4.5 }); S.out.push({ k: 'txt', txt: 'VUUUSH', x: 1300, y: 330, c: '#e8f6ff' }); break;
      case 'domino': {
        const ord = S.order; if (ord.length < 4) break;
        const k0 = 1 + Math.floor(S.rng() * Math.max(1, ord.length - 3)); const chain = [ord[k0]];
        for (let q = k0 + 1; q < ord.length; q++) { if (S.racers[chain[chain.length - 1]].tx - S.racers[ord[q]].tx < 150) chain.push(ord[q]); else break; }
        S.obs.push({ type: 'domino', e, chain: chain.slice(0, 5), idx: 0, t: 0 }); break;
      }
      case 'finish': S.exclude(wx0 - 200, wx0 + 3000); S.obs.push({ type: 'finish', e, wx: wx0 + 200, done: false }); break;
    }
  }

  kill(r, causa, tipo, opts = {}, slow = 100) {
    if (!r.alive) return;
    r.alive = false; this.order = this.order.filter(i => i !== r.i);
    this.kills++; r.place = this.n - this.kills + 1;
    const P = r.pts, mx = (P[0].x + P[1].x) / 2, my = (P[0].y + P[1].y) / 2;
    r.dead = Object.assign({ tipo, t: 0, wx: mx + this.camX, y: my, a: r.ang, vx: this.speed, vy: 0, va: 0, sx: 1, sy: 1, g: 1, behind: false, gone: false }, opts);
    r.causa = causa;
    this.out.push({ k: 'kill', i: r.i, causa, x: mx, y: my });
    this.slowTicks = Math.max(this.slowTicks, slow);
    this.focus = { x: mx, y: my - 50, t: slow / 60 + 0.4, i: r.i };
  }

  addSpin(r, w) {
    let cx = 0, cy = 0; for (const p of r.pts) { cx += p.x; cy += p.y; } cx /= 3; cy /= 3;
    for (const p of r.pts) { p.vx += -w * (p.y - cy); p.vy += w * (p.x - cx); }
  }
  kick(r, vy, spin) { for (const p of r.pts) p.vy = Math.min(p.vy, 0) - vy; if (spin) this.addSpin(r, spin); }

  stepRacer(r, dt) {
    if (dt <= 0) return;
    const P = r.pts, S = this;
    let cx = 0, cvx = 0; for (const p of P) { cx += p.x; cvx += p.vx; } cx /= 3; cvx /= 3;
    const ax = (r.tx - cx) * 7 - (cvx - r.v) * 4.5;
    for (const p of P) { p.ox = p.x; p.oy = p.y; p.vy += GRAV * dt; p.vx += ax * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    for (let it = 0; it < 4; it++) for (const c of PAIRS) {
      const a = P[c.a], b = P[c.b]; const dx = b.x - a.x, dy = b.y - a.y; const d = Math.hypot(dx, dy) || 1; const k = (d - c.d) / d * 0.5;
      a.x += dx * k; a.y += dy * k; b.x -= dx * k; b.y -= dy * k;
    }
    for (const p of P) { p.vx = (p.x - p.ox) / dt; p.vy = (p.y - p.oy) / dt; }
    const pen = [0, 0, 0]; let pad = false, grounded = false, headG = false;
    for (let k = 0; k < 3; k++) {
      const p = P[k], rad = RADII[k];
      const c = S.ceilAt(p.x);
      if (p.y - rad < c) {
        const hitV = p.vy; p.y = c + rad;
        if (p.vy < 0) p.vy = Math.abs(p.vy) * 0.35 + 120;
        if (k === 2 && hitV < -380 && r.bonkCool <= 0) { r.bonkCool = 0.5; r.stunT = Math.max(r.stunT, 0.3); r.dmg = Math.min(1, r.dmg + 0.022); S.out.push({ k: 'bonk', x: p.x, y: p.y - rad, i: r.i }); }
      }
      const g = S.groundSpan(p.x, k < 2 ? rad * 0.55 : rad * 0.4);
      const gp = p.y + rad - g.y;
      if (gp > 0) {
        const vin = p.vy;
        p.y -= gp; pen[k] = gp;
        if (p.vy > 0) p.vy = 0;
        if (k < 2) { grounded = true; if (g.pad) pad = true; if (vin > 1150) { r.stunT = Math.max(r.stunT, 0.25); r.dmg = Math.min(1, r.dmg + 0.007); S.out.push({ k: 'land', x: p.x, y: g.y }); } }
        else { headG = true; if (vin > 420 && r.bonkCool <= 0) { r.bonkCool = 0.5; r.stunT = Math.max(r.stunT, 0.6); r.dmg = Math.min(1, r.dmg + 0.03); S.out.push({ k: 'bonk', x: p.x, y: p.y, i: r.i }); } }
      }
    }
    // degraus e quinas: chutes para cima (física goofy)
    for (let k = 0; k < 2; k++) {
      if (pen[k] > 0) {
        const pop = Math.min(420, pen[k] / dt * 0.45);
        for (let j = 0; j < 3; j++) P[j].vy = Math.min(P[j].vy, j === k ? -pop : -pop * 0.6);
        if (pen[k] > 12 && r.kickCool <= 0) {
          r.kickCool = 0.25;
          const big = S.rng() < 0.12 ? 1.7 : 1;
          const kick = Math.min(1250, pen[k] * 7 * r.goof * big * (0.75 + 0.5 * S.rng()));
          for (const p of P) p.vy -= kick;
          r.stunT = Math.max(r.stunT, Math.min(0.5, pen[k] * 0.015));
          S.addSpin(r, (k === 1 ? -1 : 0.35) * kick * 0.0014 * (0.4 + S.rng()));
          if (big > 1) S.out.push({ k: 'hop', x: P[k].x, y: P[k].y + WHEEL_R });
        }
      }
    }
    r.kickCool -= dt; r.bonkCool -= dt;
    r.padCool -= dt;
    if (pad && r.padCool <= 0) {
      r.padCool = 0.7;
      const kick = 1650 + S.rng() * 500;
      for (const p of P) p.vy = -kick;
      S.addSpin(r, (S.rng() - 0.5) * 5);
      if (S.rng() < 0.5) r.boostT = 1.4; else r.stunT = Math.max(r.stunT, 0.5);
      S.out.push({ k: 'boing', x: S.rx(r), y: GY });
    }
    r.ang = Math.atan2(P[1].y - P[0].y, P[1].x - P[0].x);
    const an = angN(r.ang);
    // velocidade angular atual
    let mx = 0, my = 0, mvx = 0, mvy = 0; for (const p of P) { mx += p.x; my += p.y; mvx += p.vx; mvy += p.vy; } mx /= 3; my /= 3; mvx /= 3; mvy /= 3;
    let om = 0, den = 0; for (const p of P) { const rx = p.x - mx, ry = p.y - my; om += rx * (p.vy - mvy) - ry * (p.vx - mvx); den += rx * rx + ry * ry; } om /= den || 1;
    if (!grounded && !headG) S.addSpin(r, (-an * 10 - om * 2.6) * dt);
    if (headG || (grounded && Math.abs(an) > 1.3)) {
      r.headDown += dt;
      if (r.headDown > 0.5) { r.headDown = 0; r.stunT = Math.max(r.stunT, 0.9); this.kick(r, 820, -an * 3.2 - om); S.out.push({ k: 'flip', x: S.rx(r), y: P[2].y }); }
    } else r.headDown = Math.max(0, r.headDown - dt);
    r.onGround = grounded;
    const rv = S.speed + cvx;
    r.wheelRot += rv * dt / WHEEL_R;
    r.pedal += (grounded ? rv : rv * 0.4) * dt / 26;
  }

  stepDead(r, dt) {
    const d = r.dead; if (!d || d.gone) return;
    d.t += dt;
    const S = this;
    const f = DEATH[d.tipo]; if (f) f(S, r, d, dt); else S.ragdoll(d, dt, true);
    const sx = d.wx - S.camX;
    if (sx < -520 || sx > W + 900 || d.y < -800 || d.y > H + 500) d.gone = true;
  }
  ragdoll(d, dt, ground) {
    d.vy += GRAV * dt * d.g; d.wx += d.vx * dt; d.y += d.vy * dt; d.a += d.va * dt;
    if (ground) {
      const g = this.groundAt(d.wx - this.camX).y - WHEEL_R * d.sy;
      if (d.y > g) {
        d.y = g; if (d.vy > 0) d.vy *= -0.25; if (Math.abs(d.vy) < 60) d.vy = 0;
        d.vx *= Math.pow(0.08, dt); d.va *= Math.pow(0.05, dt);
        const tgt = Math.abs(angN(d.a)) > 0.7 ? Math.sign(angN(d.a)) * Math.PI / 2 : 0;
        d.a = lerp(d.a, tgt + (d.a - angN(d.a)), 1 - Math.pow(0.02, dt));
      }
    }
  }
}

/* ---------------- mortes (animações depois de eliminado) ---------------- */
const DEATH = {
  bloqueado(S, r, d, dt) {
    if (!d.hit && d.wx > d.wall - 95) { d.hit = true; d.vx = -160; d.vy = -520; d.va = -5; S.out.push({ k: 'bonk', x: d.wall - S.camX - 20, y: d.y - 80, i: r.i }); }
    if (!d.hit) d.vx = S.speed * 1.05 + 60;
    S.ragdoll(d, dt, true);
  },
  rampa(S, r, d, dt) { if (d.t < 0.05) { d.vx = -220; d.va = -3; d.vy = -200; } S.ragdoll(d, dt, true); },
  esmagado(S, r, d, dt) {
    d.vx = 0; d.sy = lerp(d.sy, d.mid ? 0.2 : 0.24, 1 - Math.pow(0.0005, dt)); d.sx = lerp(d.sx, 1.35, 1 - Math.pow(0.001, dt));
    d.a = lerp(d.a, 0, 0.2);
    if (d.mid) { d.y = lerp(d.y, (CY + GY) / 2 + 30, 0.3); }
    else { const g = S.groundAt(d.wx - S.camX).y - WHEEL_R * d.sy; d.y = lerp(d.y, g, 0.4); }
  },
  murcho(S, r, d, dt) {
    if (d.t < 0.05) { d.flat = 'f'; }
    d.vx *= Math.pow(0.15, dt); d.va = d.t < 0.6 ? 2.2 : 0;
    if (d.t > 0.6) d.a = lerp(d.a, 0.35, 0.1);
    S.ragdoll(d, dt, true); d.va = 0;
  },
  explodido(S, r, d, dt) {
    if (d.t < 0.05) { d.vy = -2300; d.vx = S.speed + 520; d.va = 15; d.burnt = true; }
    S.ragdoll(d, dt, false);
  },
  tornado(S, r, d, dt) {
    const o = d.o; d.burnt = false;
    if (o && !o.gone && d.t < 2.2) {
      d.wx = lerp(d.wx, o.wx + Math.sin(d.t * 10) * (40 + d.t * 30), 0.25); d.y -= (180 + d.t * 260) * dt; d.a += 11 * dt;
    } else { if (!d.thrown) { d.thrown = true; d.vy = -1200; d.vx = S.speed + 700; d.va = 9; } S.ragdoll(d, dt, false); }
  },
  parou(S, r, d, dt) { d.vx *= Math.pow(0.0004, dt); d.foot = true; d.a = lerp(d.a, -0.12, 0.1); S.ragdoll(d, dt, true); d.va = 0; },
  bueiro(S, r, d, dt) {
    d.behind = true; d.wx = lerp(d.wx, d.hx, 0.25);
    if (d.t > 0.12) { d.vy += GRAV * 0.8 * dt; d.y += d.vy * dt; d.a += 1.5 * dt; }
  },
  balao(S, r, d, dt) {
    const o = d.o;
    if (!d.float) {
      if (d.t < 0.03) { d.vy = -1550; d.va = 4; }
      d.vx = S.speed; S.ragdoll(d, dt, false);
      if (d.vy > -240 || d.y < CY + 260) { d.float = true; d.vy = -60; if (o) o.taken = true; S.out.push({ k: 'pop', x: d.wx - S.camX, y: d.y - 150 }); }
    } else {
      d.vx = S.speed * 0.55; d.vy = lerp(d.vy, -110, 0.02); d.wx += d.vx * dt; d.y += d.vy * dt; d.a = Math.sin(d.t * 2.2) * 0.3;
    }
  },
  abduzido(S, r, d, dt) {
    const o = d.o;
    if (o && !o.gone) {
      d.wx = lerp(d.wx, S.camX + o.sx, 0.08); d.vx = 0;
      d.y = lerp(d.y, o.y + 70, 0.018 + d.t * 0.02); d.a += 7 * dt;
      if (d.t > 1.0) { d.sx = d.sy = Math.max(0.05, d.sx - dt * 1.4); }
      if (d.sx <= 0.06) d.gone = true;
    } else d.gone = true;
  },
  congelado(S, r, d, dt) {
    if (d.t < 0.05) { d.va = 9; }
    d.vx *= Math.pow(0.35, dt); d.ice = Math.min(1, Math.max(0, (d.t - 0.5) * 2.5));
    if (d.ice > 0) { d.va *= Math.pow(0.0001, dt); }
    d.wx += d.vx * dt; d.a += d.va * dt;
    const g = S.groundAt(d.wx - S.camX).y - WHEEL_R - 6; d.y = lerp(d.y, g, 0.3);
  },
  lava(S, r, d, dt) {
    d.behind = true; d.wx = lerp(d.wx, d.hx, 0.2);
    if (d.t > 0.15) { d.vy += GRAV * 0.7 * dt; d.y += d.vy * dt; d.a += 2 * dt; d.burnt = d.y > GY + 40; }
    if (!d.splash && d.y > GY + 110) { d.splash = true; S.out.push({ k: 'splash', x: d.wx - S.camX, y: GY + 110 }); }
  }
};

/* ---------------- obstáculos ---------------- */
const OBS = {
  gate: {
    update(S, o, dt) {
      if (!o.closed && S.gapRule && S.gapRule.ev === o.e) o.gapX = lerp(o.gapX, S.gapX(), 0.08);
      const sx = o.wx - S.camX, gx = o.gapX, top = W + 300, low = GY - 345;
      if (sx > gx + 260) o.bottom = lerp(CY, low, smooth((top - sx) / (top - (gx + 260))));
      else { const q = clamp((gx + 260 - sx) / 260, 0, 1); o.bottom = lerp(low, GY + S.baseAt(o.wx), q * q); }
      if (!o.closed && sx <= gx) {
        o.closed = true; S.shake = 0.6; S.out.push({ k: 'slam', x: sx + o.w / 2, y: GY });
        for (const i of o.e.v) { const r = S.racers[i]; if (r.alive) S.kill(r, o.final ? 'final' : 'comporta', 'bloqueado', { wall: o.wx }, o.final ? 170 : 100); }
        S.endEvent(o.e);
      }
      if (sx < -500) o.gone = true;
    },
    ceil(S, o, sx) { const x = o.wx - S.camX; return (sx >= x && sx <= x + o.w) ? o.bottom : null; }
  },
  ramp: {
    update(S, o, dt) {
      if (!o.closed && S.gapRule && S.gapRule.ev === o.e) o.gapX = lerp(o.gapX, S.gapX(), 0.08);
      const se = o.wx - S.camX, gx = o.gapX, top = W + 300 + o.len;
      let p;
      if (se > gx + 150) p = 0.5 * smooth((top - se) / (top - (gx + 150)));
      else p = 0.5 + 0.5 * smooth((gx + 150 - se) / 150);
      o.h = p * (GY - CY - 4);
      if (!o.closed && se <= gx) {
        o.closed = true; S.shake = 0.5; S.out.push({ k: 'slam', x: se, y: CY + 10 });
        for (const i of o.e.v) { const r = S.racers[i]; if (r.alive) S.kill(r, 'rampa', 'rampa'); }
        S.endEvent(o.e);
      }
      if (se < -500) o.gone = true;
    },
    ground(S, o, sx) { const se = o.wx - S.camX, x0 = se - o.len; if (sx < x0 || sx > se) return null; return GY + S.baseAt(sx + S.camX) - o.h * (sx - x0) / o.len; }
  },
  pinch: {
    update(S, o, dt) {
      if (!o.closed && S.racers[o.e.v[0]].alive) o.gapX = lerp(o.gapX, S.rx(S.racers[o.e.v[0]]), 0.1);
      const c = o.wx - S.camX, gx = o.gapX, Rm = (GY - CY) / 2 + 6, top = W + 600;
      if (c > gx + 230) o.R = 0.6 * Rm * smooth((top - c) / (top - (gx + 230)));
      else o.R = lerp(0.6 * Rm, Rm, smooth((gx + 230 - c) / 230));
      if (!o.closed && c <= gx) {
        o.closed = true; S.shake = 0.6; S.out.push({ k: 'slam', x: c, y: (CY + GY) / 2 });
        for (const i of o.e.v) { const r = S.racers[i]; if (r.alive) S.kill(r, 'pinca', 'esmagado', { mid: true, wx: o.wx }); }
        S.endEvent(o.e);
      }
      if (c < -500) o.gone = true;
    },
    ground(S, o, sx) { const dx = sx - (o.wx - S.camX); if (Math.abs(dx) >= o.R) return null; return GY - Math.sqrt(o.R * o.R - dx * dx); },
    ceil(S, o, sx) { const dx = sx - (o.wx - S.camX); if (Math.abs(dx) >= o.R) return null; return CY + Math.sqrt(o.R * o.R - dx * dx); }
  },
  cactus: {
    update(S, o) {
      const sx = o.wx - S.camX, v = S.racers[o.e.v[0]];
      if (!o.hit && v.alive && sx <= S.rx(v) + WB + 24) { o.hit = true; S.kill(v, 'cacto', 'murcho'); S.out.push({ k: 'txt', txt: 'PSSSSS', x: sx, y: GY - 120, c: '#7cff7c' }); S.endEvent(o.e); }
      if (sx < -400) o.gone = true;
    },
    ground(S, o, sx) { const dx = Math.abs(sx - (o.wx - S.camX)); if (dx > 34) return null; return GY + S.baseAt(sx + S.camX) - 72 * (1 - dx / 34 * 0.35); }
  },
  mine: {
    update(S, o) {
      const sx = o.wx - S.camX, v = S.racers[o.e.v[0]];
      if (!o.boom && v.alive && sx <= S.rx(v) + 24) {
        o.boom = true; S.shake = 0.9; S.kill(v, 'mina', 'explodido'); S.out.push({ k: 'boom', x: sx, y: GY - 20 }); S.endEvent(o.e);
      }
      if (sx < -400) o.gone = true;
    }
  },
  tornado: {
    update(S, o, dt) {
      o.t += dt; o.wx -= 110 * dt;
      const sx = o.wx - S.camX, v = S.racers[o.e.v[0]];
      for (const i of S.order) {
        const r = S.racers[i]; const x = S.rx(r);
        if (Math.abs(x - sx) < 70 && !o.hit[i]) {
          o.hit[i] = true;
          if (r === v) { S.kill(v, 'tornado', 'tornado', { o }); S.endEvent(o.e); }
          else { S.kick(r, 950 + S.rng() * 300, (S.rng() - 0.5) * 5); S.out.push({ k: 'txt', txt: 'WOOSH', x, y: GY - 230, c: '#ffe2a8' }); }
        }
      }
      if (sx < -500) o.gone = true;
    }
  },
  light: {
    update(S, o) {
      const sx = o.wx - S.camX, v = S.racers[o.e.v[0]];
      if (v.alive) {
        const d = sx - S.rx(v); o.state = d < 230 ? 2 : d < 470 ? 1 : 0;
        if (d <= 90) { S.kill(v, 'sinal', 'parou'); S.endEvent(o.e); }
      }
      if (sx < -400) o.gone = true;
    }
  },
  manhole: {
    update(S, o) {
      const sx = o.wx - S.camX, v = S.racers[o.e.v[0]];
      if (v.alive && !o.open && sx <= S.rx(v) + 190) { o.open = true; S.out.push({ k: 'txt', txt: 'CLUNK', x: sx, y: GY - 60, c: '#ddd' }); }
      if (v.alive && !o.done && sx <= S.rx(v) + 6) { o.done = true; S.kill(v, 'bueiro', 'bueiro', { hx: o.wx }); S.endEvent(o.e); }
      if (sx < -400) o.gone = true;
    }
  },
  balloon: {
    update(S, o, dt) {
      o.t += dt;
      const px = o.wx - S.camX, v = S.racers[o.e.v[0]];
      if (v.alive && px < S.rx(v) - 10 && px + 150 > S.rx(v) - 10) { S.kill(v, 'balao', 'balao', { o }); o.vic = v.i; S.endEvent(o.e); }
      if (o.vic != null) { const d = S.racers[o.vic].dead; if (d && !o.taken) o.bwx = lerp(o.bwx, d.wx + 20, 0.08); }
      if (px < -600 && (o.vic == null || S.racers[o.vic].dead.gone)) o.gone = true;
    }
  },
  ufo: {
    update(S, o, dt) {
      o.t += dt; const v = S.racers[o.e.v[0]];
      if (o.phase === 0) { if (v.alive) o.sx = lerp(o.sx, S.rx(v) + 10, 0.1); o.y = lerp(o.y, CY + 50, 0.05); if (o.t > 1.7) { o.phase = 1; S.out.push({ k: 'txt', txt: 'BZZZZT', x: o.sx, y: o.y + 120, c: '#9fff7a' }); } }
      else if (o.phase === 1) { if (v.alive) o.sx = lerp(o.sx, S.rx(v) + 10, 0.1); if (o.t > 2.1) { o.phase = 2; S.kill(v, 'ovni', 'abduzido', { o }); S.endEvent(o.e); } }
      else if (o.phase === 2) { if (o.t > 3.6) o.phase = 3; }
      else { o.sx += 1700 * dt; o.y -= 420 * dt; if (o.sx > W + 400) o.gone = true; }
    }
  },
  anvil: {
    update(S, o, dt) {
      o.t += dt; const v = S.racers[o.e.v[0]];
      if (o.phase === 0) { if (v.alive) o.sx = lerp(o.sx, S.rx(v) + 14, 0.2); if (o.t > 1.4) { o.phase = 1; o.y = -160; o.vy = 400; } }
      else if (o.phase === 1) {
        if (v.alive) o.sx = lerp(o.sx, S.rx(v) + 14, 0.3);
        o.vy += 5200 * dt; o.y += o.vy * dt;
        const head = v.alive ? v.pts[2].y - 30 : GY - 40;
        if (o.y + 46 >= head) {
          o.phase = 2; o.wx = S.camX + o.sx; S.shake = 0.5;
          if (v.alive) { S.kill(v, 'bigorna', 'esmagado'); S.out.push({ k: 'txt', txt: 'PLAFT!', x: o.sx, y: o.y - 40, c: '#fff' }); }
          S.endEvent(o.e);
        }
      } else {
        o.sx = o.wx - S.camX;
        const d = v.dead; const g = S.groundAt(o.sx).y;
        o.y = lerp(o.y, g - 30 - 46 - (d ? 40 * d.sy : 10), 0.35);
        if (o.sx < -400) o.gone = true;
      }
    }
  },
  ice: {
    update(S, o) {
      const sx = o.wx - S.camX, v = S.racers[o.e.v[0]];
      for (const i of S.order) {
        const r = S.racers[i]; const x = S.rx(r);
        if (!o.hit[i] && x > sx - 10 && x < sx + o.w) {
          o.hit[i] = true;
          if (r === v) { S.kill(v, 'gelo', 'congelado'); S.endEvent(o.e); }
          else { S.kick(r, 420, (S.rng() - 0.5) * 4); S.out.push({ k: 'txt', txt: 'SKRRT', x, y: GY - 170, c: '#c9f2ff' }); }
        }
      }
      if (sx + o.w < -400) o.gone = true;
    }
  },
  lava: {
    update(S, o) {
      const sx = o.wx - S.camX, v = S.racers[o.e.v[0]];
      if (!o.crumble && v.alive && sx <= S.rx(v) + 70) {
        o.crumble = true; o.hx = S.camX + S.rx(v); o.hw = 230; S.shake = 0.4;
        S.kill(v, 'lava', 'lava', { hx: o.hx }); S.out.push({ k: 'crumble', x: o.hx - S.camX, y: GY }); S.endEvent(o.e);
      }
      if (sx < -600) o.gone = true;
    }
  },
  avalanche: {
    update(S, o, dt) {
      o.t += dt; const rear = S.racers[S.order[S.order.length - 1]];
      const rx = rear ? S.rx(rear) : 400;
      o.R = Math.min(115, 40 + o.t * 22);
      if (o.phase === 0) { o.sx = lerp(o.sx, rx - 135 - o.R, 1 - Math.pow(0.35, dt)); if (o.t > 4.5) { o.phase = 1; S.out.push({ k: 'cap', txt: 'QUASE!', who: rear ? rear.i : -1 }); } }
      else if (o.phase === 1) { o.sx = rx - 120 - o.R + Math.sin(o.t * 5) * 18; if (o.t > 7.5) { o.phase = 2; S.out.push({ k: 'snow', x: o.sx, y: GY - o.R }); S.shake = 0.4; } }
      else { o.gone = true; }
      o.rot += (S.speed + 80) * dt / o.R;
    }
  },
  fireball: {
    update(S, o, dt) {
      o.t += dt; let alive = false;
      for (const b of o.balls) {
        if (b.done) continue; alive = true;
        if (o.t < b.d) continue;
        if (!b.on) { b.on = true; S.out.push({ k: 'txt', txt: 'FSSH', x: b.sx, y: GY - 40, c: '#ffb347' }); }
        b.vy += 2100 * dt; b.y += b.vy * dt; b.sx += b.vx * dt;
        if (!b.warned) for (const i of S.order) { const h = S.racers[i].pts[2]; if (Math.hypot(h.x - b.sx, h.y - b.y) < 95) { b.warned = true; S.out.push({ k: 'cap', txt: 'QUASE!', who: i }); break; } }
        if (b.vy > 0 && b.y > GY + 80) b.done = true;
      }
      if (!alive) o.gone = true;
    }
  },
  crusher: {
    update(S, o, dt) {
      o.t += dt; const g = GY + S.baseAt(o.wx);
      if (o.phase === 0) { if (o.t > 0.6) { o.phase = 1; o.vy = 0; } }
      else if (o.phase === 1) { o.vy += 6000 * dt; o.y += o.vy * dt; if (o.y + 150 >= g) { o.y = g - 150; o.phase = 2; o.t = 0; S.shake = 0.6; S.out.push({ k: 'slam', x: o.wx - S.camX + 65, y: g }); S.out.push({ k: 'cap', txt: 'QUASE!', who: S.order[S.order.length - 1] }); } }
      else if (o.phase === 2) { if (o.t > 0.9) o.phase = 3; }
      else { o.y -= 260 * dt; }
      if (o.wx - S.camX < -500) o.gone = true;
    },
    ceil(S, o, sx) { const x = o.wx - S.camX; return (sx >= x && sx <= x + o.w) ? o.y + 150 : null; }
  },
  oil: {
    update(S, o) {
      const sx = o.wx - S.camX;
      for (const i of S.order) {
        const r = S.racers[i], x = S.rx(r);
        if (!o.hit[i] && r.onGround && x > sx && x < sx + o.w) { o.hit[i] = true; S.addSpin(r, (S.rng() - 0.5) * 9); S.kick(r, 260 + S.rng() * 300, 0); r.stunT = Math.max(r.stunT, 0.8); if (S.rng() < 0.4) S.out.push({ k: 'txt', txt: 'SKRRR', x, y: GY - 170, c: '#ddd' }); }
      }
      if (sx + o.w < -400) o.gone = true;
    }
  },
  banana: {
    update(S, o) {
      const sx = o.wx - S.camX;
      if (!o.taken) for (const i of S.order) {
        const r = S.racers[i];
        if (Math.abs(r.pts[1].x - sx) < 26 && r.pts[1].y > GY - 70) { o.taken = true; S.kick(r, 820, -8.5); r.stunT = Math.max(r.stunT, 1.3); r.dmg = Math.min(1, r.dmg + 0.03); S.out.push({ k: 'txt', txt: 'OPA!', x: sx, y: GY - 200, c: '#ffe14d' }); break; }
      }
      if (sx < -400) o.gone = true;
    }
  },
  mush: {
    update(S, o, dt) {
      o.t += dt; const sx = o.wx - S.camX, y = o.y + Math.sin(o.t * 3) * 22;
      if (!o.taken) for (const i of S.order) {
        const h = S.racers[i].pts[2];
        if (Math.hypot(h.x - sx, h.y - y) < 68) { o.taken = true; const r = S.racers[i]; r.boostT = 2.6; r.stunT = 0; r.dmg = Math.max(0, r.dmg - 0.15); S.out.push({ k: 'mush', x: sx, y }); break; }
      }
      if (sx < -300 || o.taken) o.gone = o.taken || sx < -300;
    }
  },
  roll: {
    update(S, o, dt) {
      o.sx -= 260 * dt; o.rot -= (S.speed + 260) * dt / o.R;
      const gy = GY + S.baseAt(S.camX + o.sx);
      for (const i of S.order) {
        const r = S.racers[i]; if (o.hit[i]) continue;
        if (Math.abs(S.rx(r) - o.sx) < o.R + 34) {
          o.hit[i] = true;
          if (Math.max(r.pts[0].y, r.pts[1].y) > gy - o.R * 1.6) { S.kick(r, 900 + S.rng() * 250, (S.rng() - 0.5) * 7); r.stunT = Math.max(r.stunT, 0.7); r.dmg = Math.min(1, r.dmg + 0.02); S.out.push({ k: 'bonk', x: S.rx(r), y: r.pts[2].y - 30, i }); }
        }
      }
      if (o.sx < -300) o.gone = true;
    }
  },
  wind: { update(S, o, dt) { o.t += dt; if (o.t > o.dur) o.gone = true; } },
  domino: {
    update(S, o, dt) {
      o.t += dt;
      while (o.idx < o.chain.length && o.t >= o.idx * 0.22) {
        const r = S.racers[o.chain[o.idx]];
        if (r.alive) { S.kick(r, 560 + S.rng() * 200, -6 - S.rng() * 3); r.stunT = Math.max(r.stunT, 1); if (o.idx === 0) S.out.push({ k: 'txt', txt: 'OPS!', x: S.rx(r), y: r.pts[2].y - 60, c: '#fff' }); }
        o.idx++;
      }
      if (o.idx >= o.chain.length) o.gone = true;
    }
  },
  finish: {
    update(S, o) {
      const sx = o.wx - S.camX, w = S.racers[S.win];
      if (!o.done && w.alive && sx <= S.rx(w) + 30) {
        o.done = true; S.finished = true; S.slowTicks = 150; S.focus = { x: S.rx(w), y: w.pts[2].y + 40, t: 3.5, i: w.i };
        w.place = 1; S.out.push({ k: 'win', i: w.i, x: S.rx(w), y: GY - 200 });
      }
      if (sx < -700) o.gone = true;
    }
  }
};

if (typeof module !== 'undefined') module.exports = { Sim, ZONAS };
