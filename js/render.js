/* =====================================================================
   RENDER — cenários, obstáculos, ciclistas, partículas e textos
   ===================================================================== */
'use strict';
const MSG = {
  comporta: ['{n} ficou pra trás da comporta!', 'A comporta fechou na cara de {n}!'],
  bigorna: ['Uma bigorna caiu na cabeça de {n}!'],
  rampa: ['{n} não subiu a rampa a tempo!'],
  cacto: ['{n} furou o pneu num cacto!'],
  mina: ['{n} achou a mina terrestre!'],
  tornado: ['{n} foi levado pelo redemoinho!'],
  pinca: ['{n} virou panqueca!'],
  sinal: ['{n} respeitou o sinal vermelho... e ficou.'],
  bueiro: ['{n} caiu no bueiro!'],
  balao: ['{n} pegou o balão e foi embora voando!'],
  ovni: ['{n} foi abduzido!'],
  gelo: ['{n} escorregou e virou picolé!'],
  lava: ['{n} caiu na lava!'],
  final: ['{n} ficou a um pneu da vitória!']
};
const CAUSA_CURTA = { comporta: 'comporta', bigorna: 'bigorna', rampa: 'rampa', cacto: 'cacto', mina: 'mina', tornado: 'redemoinho', pinca: 'esmagado', sinal: 'sinal vermelho', bueiro: 'bueiro', balao: 'balão', ovni: 'abduzido', gelo: 'picolé', lava: 'lava', final: 'comporta final' };

class Render {
  constructor(canvas, corredores, faces) {
    this.cv = canvas; this.ctx = canvas.getContext('2d');
    this.cor = corredores; this.faces = faces;
    this.parts = []; this.caps = []; this.zoom = 1; this.fx = W / 2; this.fy = H / 2; this.tilt = 0; this.camY = 0;
    this.snow = []; for (let i = 0; i < 90; i++) this.snow.push({ x: Math.random() * W, y: Math.random() * H, s: 1 + Math.random() * 3, v: 40 + Math.random() * 80 });
    this.embers = []; for (let i = 0; i < 50; i++) this.embers.push({ x: Math.random() * W, y: Math.random() * H, s: 1 + Math.random() * 3, v: 30 + Math.random() * 70, p: Math.random() * 6 });
    this.time = 0; this.lastZoneShown = -1; this.sfx = () => { };
    this.makeTiles();
  }

  /* ---------------- texturas ---------------- */
  tile(size, fn) { const c = document.createElement('canvas'); c.width = c.height = size; fn(c.getContext('2d'), size); return this.ctx.createPattern(c, 'repeat'); }
  makeTiles() {
    const T = this.tiles = {};
    const brick = (base, light, dark) => (x, s) => {
      x.fillStyle = base; x.fillRect(0, 0, s, s);
      x.fillStyle = dark; x.fillRect(0, s / 2 - 3, s, 3); x.fillRect(0, s - 3, s, 3);
      x.fillRect(s / 2 - 3, 0, 3, s / 2); x.fillRect(0, s / 2, 3, s / 2); x.fillRect(s - 3, s / 2, 3, s / 2);
      x.fillStyle = light; x.fillRect(0, 0, s, 2); x.fillRect(0, s / 2, s, 2);
    };
    T.planicie = {
      ground: this.tile(64, (x, s) => {
        x.fillStyle = '#c84c0c'; x.fillRect(0, 0, s, s);
        x.fillStyle = '#fcbcb0'; x.fillRect(0, 0, s, 3); x.fillRect(0, 0, 3, s); x.fillRect(32, 32, 3, 32); x.fillRect(32, 32, 32, 3);
        x.fillStyle = '#000'; x.fillRect(29, 0, 3, 29); x.fillRect(0, 29, 29, 3); x.fillRect(61, 32, 3, 32); x.fillRect(32, 61, 32, 3);
        x.fillRect(10, 12, 12, 2); x.fillRect(44, 48, 10, 2); x.fillRect(44, 8, 2, 12);
      }),
      block: this.tile(48, brick('#c84c0c', '#fcbcb0', '#000'))
    };
    T.deserto = {
      ground: this.tile(64, (x, s) => {
        x.fillStyle = '#e8b465'; x.fillRect(0, 0, s, s);
        x.fillStyle = '#c98f3f'; for (let i = 0; i < 18; i++) x.fillRect((i * 37) % s, (i * 23) % s, 4, 3);
        x.fillStyle = '#f6d08e'; for (let i = 0; i < 10; i++) x.fillRect((i * 53 + 11) % s, (i * 29 + 7) % s, 5, 2);
      }),
      block: this.tile(48, brick('#d79a4c', '#f3c987', '#8a5a22'))
    };
    T.cidade = {
      ground: this.tile(64, (x, s) => {
        x.fillStyle = '#3b3b45'; x.fillRect(0, 0, s, s);
        x.fillStyle = '#4a4a56'; for (let i = 0; i < 26; i++) x.fillRect((i * 41) % s, (i * 17) % s, 3, 3);
        x.fillStyle = '#2c2c34'; for (let i = 0; i < 14; i++) x.fillRect((i * 29 + 5) % s, (i * 47 + 9) % s, 3, 2);
      }),
      block: this.tile(48, (x, s) => {
        x.fillStyle = '#a3a9b3'; x.fillRect(0, 0, s, s); x.fillStyle = '#6f757f'; x.fillRect(0, s - 4, s, 4); x.fillRect(s - 4, 0, 4, s);
        x.fillStyle = '#c9ced6'; x.fillRect(0, 0, s, 3); x.fillRect(0, 0, 3, s); x.fillStyle = '#8b919b'; x.fillRect(14, 20, 8, 3);
      })
    };
    T.gelo = {
      ground: this.tile(64, (x, s) => {
        x.fillStyle = '#a8def7'; x.fillRect(0, 0, s, s);
        x.strokeStyle = '#e9f8ff'; x.lineWidth = 3; x.beginPath(); x.moveTo(6, 54); x.lineTo(26, 34); x.moveTo(36, 60); x.lineTo(58, 38); x.stroke();
        x.strokeStyle = '#6fb6dc'; x.lineWidth = 2; x.strokeRect(1, 1, s - 2, s - 2);
      }),
      block: this.tile(48, (x, s) => {
        x.fillStyle = '#bfeaff'; x.fillRect(0, 0, s, s); x.fillStyle = '#ffffff'; x.fillRect(4, 4, 18, 4); x.fillRect(4, 4, 4, 14);
        x.fillStyle = '#7cc1e6'; x.fillRect(0, s - 4, s, 4); x.fillRect(s - 4, 0, 4, s);
      })
    };
    T.castelo = {
      ground: this.tile(64, brick('#6c6b77', '#9796a3', '#33323b')),
      block: this.tile(48, brick('#4a4554', '#6c6578', '#1f1c25'))
    };
  }
  pat(z, kind, ox, oy) { const p = this.tiles[ZONAS[z].id][kind]; p.setTransform(new DOMMatrix().translate(ox, oy)); return p; }

  /* ---------------- eventos da simulação → efeitos ---------------- */
  consume(sim, list) {
    for (const e of list) {
      switch (e.k) {
        case 'kill': {
          const nome = this.cor[e.i].nome; const arr = MSG[e.causa] || ['{n} foi eliminado!'];
          this.caps.push({ type: 'kill', i: e.i, txt: arr[Math.floor(Math.random() * arr.length)].replace('{n}', nome.toUpperCase()), t: 0, dur: 3.6, final: e.causa === 'final' });
          this.sfx('kill');
          this.burst(e.x, e.y - 40, 18, ['#fff', '#ff4d4d', '#ffd23f'], 520, 'spark');
          break;
        }
        case 'bonk': this.text('BONK!', e.x, e.y - 20, '#fff', 34); this.stars(e.x, e.y); this.sfx('bonk'); break;
        case 'land': this.dust(e.x, e.y, 6); break;
        case 'hop': this.dust(e.x, e.y, 8); this.text('POW', e.x, e.y - 50, '#ffe14d', 28); this.sfx('hop'); break;
        case 'boing': this.text('BOING!', e.x, e.y - 90, '#7dff6a', 40); this.sfx('boing'); break;
        case 'flip': this.text('?!', e.x, e.y - 40, '#fff', 34); break;
        case 'slam': this.dust(e.x, e.y, 26); this.text('CRASH!', e.x, e.y - 160, '#ffd23f', 64); this.sfx('slam'); break;
        case 'boom': this.boom(e.x, e.y); this.text('BOOOM!', e.x, e.y - 200, '#ff8a1f', 86); this.sfx('boom'); break;
        case 'txt': this.text(e.txt, e.x, e.y, e.c || '#fff', 46); if (e.txt === 'PSSSSS') this.sfx('psss'); if (e.txt === 'PLAFT!') this.sfx('slam'); break;
        case 'pop': this.text('PEGOU!', e.x, e.y, '#ff5a5a', 40); break;
        case 'crumble': this.debris(e.x, e.y); this.sfx('slam'); break;
        case 'splash': this.burst(e.x, e.y, 30, ['#ffdb3a', '#ff7a1a', '#ff3a1a'], 800, 'lava'); this.text('TSSSS', e.x, e.y - 160, '#ffb03a', 54); this.sfx('psss'); break;
        case 'snow': this.burst(e.x, e.y, 60, ['#fff', '#e6f6ff', '#bfe6ff'], 900, 'snowp'); this.text('UFA!', e.x + 100, e.y - 140, '#fff', 64); this.sfx('slam'); break;
        case 'cap': this.caps.push({ type: 'cap', txt: e.txt, t: 0, dur: 1.8, who: e.who }); this.sfx(e.txt === 'QUASE!' ? 'quase' : 'whoosh'); break;
        case 'zona': this.pendingZone = e.z; break;
        case 'mush': this.burst(e.x, e.y, 16, ['#fff', '#ffe14d', '#7dff6a'], 420, 'spark'); this.sfx('mush'); break;
        case 'win': this.caps.push({ type: 'win', i: e.i, t: 0, dur: 99 }); this.confetti = 6; this.sfx('win'); break;
      }
    }
  }
  text(txt, x, y, c, s) { this.parts.push({ type: 'txt', txt, x, y, vx: 0, vy: -60, life: 1.1, max: 1.1, c, s, rot: (Math.random() - 0.5) * 0.3 }); }
  dust(x, y, n) { for (let i = 0; i < n; i++) this.parts.push({ type: 'dust', x: x + (Math.random() - 0.5) * 40, y, vx: (Math.random() - 0.5) * 300, vy: -Math.random() * 200, life: 0.7, max: 0.7, s: 8 + Math.random() * 14, c: 'rgba(255,255,255,.75)' }); }
  stars(x, y) { for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; this.parts.push({ type: 'star', x, y, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160 - 80, life: 0.9, max: 0.9, s: 13, c: '#ffe14d', rot: 0 }); } }
  burst(x, y, n, cols, sp, type) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = sp * (0.3 + Math.random() * 0.7); this.parts.push({ type, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - sp * 0.3, life: 1.2, max: 1.2, s: 5 + Math.random() * 9, c: cols[i % cols.length], g: 1400 }); } }
  boom(x, y) { this.burst(x, y, 40, ['#fff7b0', '#ffb13a', '#ff5a1a', '#555'], 900, 'spark'); for (let i = 0; i < 14; i++) this.parts.push({ type: 'smoke', x: x + (Math.random() - 0.5) * 120, y: y - Math.random() * 120, vx: (Math.random() - 0.5) * 120, vy: -60 - Math.random() * 120, life: 1.8, max: 1.8, s: 40 + Math.random() * 40, c: '#444' }); }
  debris(x, y) { for (let i = 0; i < 14; i++) this.parts.push({ type: 'rock', x: x + (Math.random() - 0.5) * 220, y: y + 10, vx: (Math.random() - 0.5) * 200, vy: -200 - Math.random() * 300, life: 1.6, max: 1.6, s: 16 + Math.random() * 18, c: '#6c6b77', g: 2000, rot: Math.random() * 6 }); }

  /* ---------------- desenho principal ---------------- */
  draw(sim, ui, dtReal) {
    const ctx = this.ctx; this.time += dtReal;
    const S = sim;
    // câmera
    const nV = S.order.length, few = ui.racing && nV > 0 && nV <= 3 && !S.finished;
    let PC = W / 2; if (nV) { PC = 0; for (const i of S.order) PC += S.racers[i].tx; PC /= nV; }
    const zT = S.focus ? 1.32 : few ? 1.14 : 1; this.zoom = lerp(this.zoom, zT, 1 - Math.pow(0.04, dtReal || 0.016));
    const ftx = S.focus ? clamp(S.focus.x, 300, W - 300) : few ? clamp(PC, 520, W - 520) : W / 2, fty = S.focus ? clamp(S.focus.y, 220, H - 220) : few ? 560 : H / 2;
    this.fx = lerp(this.fx, ftx, 1 - Math.pow(0.02, dtReal || 0.016)); this.fy = lerp(this.fy, fty, 1 - Math.pow(0.02, dtReal || 0.016));
    const sl = S.slopeAt(S.camX + W / 2);
    this.tilt = lerp(this.tilt, Math.atan(sl) * 0.9, 1 - Math.pow(0.1, dtReal));
    this.camY = lerp(this.camY, S.baseAt(S.camX + W / 2) * 0.6, 1 - Math.pow(0.05, dtReal));
    const k = clamp((this.zoom - 1) / 0.14, 0, 1);
    const cx = lerp(W / 2, this.fx, k), cy = lerp(H / 2, clamp(this.fy - 130, 300, 450), k);
    const over = 1 + Math.abs(this.tilt) * 1.5;
    const sh = S.shake > 0 ? S.shake * 18 : 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W / 2 + (Math.random() - 0.5) * sh, H / 2 + (Math.random() - 0.5) * sh);
    ctx.scale(this.zoom * over, this.zoom * over); ctx.rotate(this.tilt);
    ctx.translate(-cx, -cy - this.camY);

    this.drawBackground(S);
    this.drawCeiling(S);
    // vítimas que caem em buracos (atrás do chão)
    this.drawPits(S);
    this.drawGround(S);
    this.drawBumps(S);
    for (const o of S.obs) { const f = this['o_' + o.type]; if (f && !this.front(o)) f.call(this, ctx, S, o); }
    // mortos
    for (const r of S.racers) if (!r.alive && r.dead && !r.dead.gone && !r.dead.behind) this.drawDead(S, r);
    // vivos (de trás para frente)
    const ord = S.order.slice().reverse();
    for (const i of ord) this.drawAlive(S, S.racers[i], ui);
    for (const o of S.obs) { const f = this['o_' + o.type]; if (f && this.front(o)) f.call(this, ctx, S, o); }
    if (S.order.length <= 3 && S.T > 3) {
      const tg = S.order.map(i => S.racers[i]).sort((p, q) => p.pts[2].x - q.pts[2].x); let lastX = -1e9, lift = 0;
      for (const r of tg) { lift = r.pts[2].x - lastX < 230 ? lift + 50 : 0; lastX = r.pts[2].x; this.nameTag(S, r, lift); }
    }
    this.updParts(dtReal); this.drawParts();
    if (this.confetti > 0) { this.confetti -= dtReal; for (let i = 0; i < 6; i++) this.parts.push({ type: 'conf', x: Math.random() * W, y: -20, vx: (Math.random() - 0.5) * 200, vy: 200 + Math.random() * 200, life: 3, max: 3, s: 10, c: ['#ff4d4d', '#ffd23f', '#3dd6ff', '#7dff6a', '#ff6fd8'][i % 5], rot: Math.random() * 6, g: 200 }); }
    ctx.restore();

    this.drawWeather(S, dtReal);
    this.drawHUD(S, ui);
    this.drawCaps(S, ui, dtReal);
  }
  front(o) { return o.type === 'gate' || o.type === 'anvil' || o.type === 'ufo' || o.type === 'crusher' || o.type === 'fireball' || o.type === 'avalanche' || o.type === 'tornado' || o.type === 'balloon' || o.type === 'mush' || o.type === 'roll' || o.type === 'wind'; }

  zoneAt(S, wx) { let z = 0; for (const b of S.zoneBounds) if (wx >= b.wx) z = b.z; return z; }

  /* ---------------- fundos (parallax) ---------------- */
  drawBackground(S) {
    const ctx = this.ctx, c = S.camX + W / 2;
    let cur = S.zoneBounds[0];
    for (const b of S.zoneBounds) if (c >= b.wx) cur = b;
    const prevZ = cur.z > 0 ? cur.z - 1 : -1;
    const a = prevZ >= 0 ? clamp((c - cur.wx) / 800, 0, 1) : 1;
    if (a < 1) this.bg(prevZ, S, 1);
    this.bg(cur.z, S, a);
  }
  rep(cam, f, sp, cb, extra = 400) {
    const off = cam * f; const k0 = Math.floor((off - extra) / sp), k1 = Math.ceil((off + W + extra) / sp);
    for (let k = k0; k <= k1; k++) cb(k * sp - off, k);
  }
  bg(z, S, alpha) {
    const ctx = this.ctx; ctx.save(); ctx.globalAlpha = alpha;
    const cam = S.camX, id = ZONAS[z].id, X0 = -500, Y0 = -500, WW = W + 1000, HH = H + 1000;
    const grad = (c1, c2) => { const g = ctx.createLinearGradient(0, -100, 0, GY); g.addColorStop(0, c1); g.addColorStop(1, c2); return g; };
    if (id === 'planicie') {
      ctx.fillStyle = '#5c94fc'; ctx.fillRect(X0, Y0, WW, HH);
      this.rep(cam, 0.12, 640, (x, k) => this.cloud(x + hsh(k) * 200, 150 + hsh(k + 9) * 110, 0.9 + hsh(k + 3) * 0.6));
      this.rep(cam, 0.3, 900, (x, k) => this.hill(x + hsh(k * 3) * 300, GY + 6, 170 + hsh(k) * 120, 110 + hsh(k + 5) * 120, '#00a800'));
      this.rep(cam, 0.55, 700, (x, k) => { if (hsh(k + 77) < 0.65) this.bush(x + hsh(k * 7) * 260, GY + 4, 1 + Math.floor(hsh(k + 2) * 3)); });
    } else if (id === 'deserto') {
      ctx.fillStyle = grad('#ffb25a', '#ffe7a8'); ctx.fillRect(X0, Y0, WW, HH);
      ctx.fillStyle = 'rgba(255,240,170,.5)'; ctx.beginPath(); ctx.arc(820 - cam * 0.01 % 50, 250, 120, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff3b8'; ctx.beginPath(); ctx.arc(820 - cam * 0.01 % 50, 250, 82, 0, 7); ctx.fill();
      this.rep(cam, 0.1, 1100, (x, k) => { const h = 200 + hsh(k) * 160, w = h * 1.3, px = x + hsh(k + 4) * 400; ctx.fillStyle = '#d98f45'; ctx.beginPath(); ctx.moveTo(px - w / 2, GY + 10); ctx.lineTo(px, GY + 10 - h); ctx.lineTo(px + w / 2, GY + 10); ctx.fill(); ctx.fillStyle = '#b8722f'; ctx.beginPath(); ctx.moveTo(px, GY + 10 - h); ctx.lineTo(px + w / 2, GY + 10); ctx.lineTo(px + w * 0.12, GY + 10); ctx.fill(); });
      ctx.fillStyle = '#f2c376';
      ctx.beginPath(); ctx.moveTo(X0, GY + 20); for (let x = X0; x <= W + 500; x += 20) ctx.lineTo(x, GY - 70 + Math.sin((x + cam * 0.3) / 160) * 30 + Math.sin((x + cam * 0.3) / 57) * 8); ctx.lineTo(W + 500, GY + 20); ctx.fill();
      this.rep(cam, 0.6, 520, (x, k) => { if (hsh(k + 13) < 0.6) this.cactusDeco(x + hsh(k * 5) * 200, GY + 4, 0.7 + hsh(k) * 0.5); });
    } else if (id === 'cidade') {
      ctx.fillStyle = grad('#2a1e5c', '#ff8f7a'); ctx.fillRect(X0, Y0, WW, HH);
      this.rep(cam, 0.08, 150, (x, k) => this.building(x, GY + 10, 120 + hsh(k) * 40, 200 + hsh(k + 3) * 260, '#3b2e73', '#ffd36b', k, 0.35));
      this.rep(cam, 0.28, 260, (x, k) => {
        if (k % 7 === 3) this.billboard(x + 40, GY - 260);
        else this.building(x + hsh(k) * 50, GY + 10, 170 + hsh(k + 8) * 50, 150 + hsh(k + 1) * 250, '#24194f', '#ffe08a', k + 100, 0.55);
      });
      this.rep(cam, 0.75, 420, (x, k) => this.lamp(x, GY + 4));
    } else if (id === 'gelo') {
      ctx.fillStyle = grad('#7cc8ff', '#eaf8ff'); ctx.fillRect(X0, Y0, WW, HH);
      this.rep(cam, 0.06, 700, (x, k) => this.mountain(x + hsh(k) * 300, GY + 10, 420 + hsh(k + 2) * 260, 330 + hsh(k + 4) * 180, '#8fa6c9'));
      this.rep(cam, 0.18, 520, (x, k) => this.mountain(x + hsh(k + 30) * 200, GY + 10, 300 + hsh(k + 32) * 200, 200 + hsh(k + 34) * 120, '#6680ad'));
      this.rep(cam, 0.5, 210, (x, k) => { if (hsh(k + 41) < 0.7) this.pine(x + hsh(k) * 80, GY + 6, 0.7 + hsh(k + 6) * 0.6); });
    } else {
      ctx.fillStyle = grad('#120203', '#4a0d0a'); ctx.fillRect(X0, Y0, WW, HH);
      this.rep(cam, 0.15, 64, (x, k) => { ctx.fillStyle = (k % 2) ? '#2a1414' : '#251111'; ctx.fillRect(x, -400, 62, GY + 400); ctx.fillStyle = '#1a0b0b'; for (let y = -400 + ((k % 2) * 30); y < GY; y += 60) ctx.fillRect(x, y, 64, 4); });
      this.rep(cam, 0.15, 640, (x, k) => this.castleWindow(x + 200, 260));
      this.rep(cam, 0.4, 560, (x, k) => this.pillar(x, GY + 10, k));
      const g = ctx.createLinearGradient(0, GY - 160, 0, GY + 40); g.addColorStop(0, 'rgba(255,80,0,0)'); g.addColorStop(1, 'rgba(255,120,20,.55)');
      ctx.fillStyle = g; ctx.fillRect(X0, GY - 160, WW, 220);
    }
    ctx.restore();
  }
  cloud(x, y, s) {
    const c = this.ctx, B = [[0, 0, 26], [28, -16, 32], [62, -6, 28], [92, 4, 22], [44, 10, 26]];
    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = '#000'; for (const [a, b, r] of B) { c.beginPath(); c.arc(a, b, r + 4, 0, 7); c.fill(); }
    c.fillStyle = '#fff'; for (const [a, b, r] of B) { c.beginPath(); c.arc(a, b, r, 0, 7); c.fill(); }
    c.fillStyle = '#9ad6ff'; c.beginPath(); c.ellipse(46, 22, 52, 9, 0, 0, Math.PI); c.fill();
    c.restore();
  }
  hill(x, y, w, h, col) {
    const c = this.ctx; c.fillStyle = col; c.strokeStyle = '#000'; c.lineWidth = 5;
    c.beginPath(); c.moveTo(x - w, y); c.quadraticCurveTo(x - w * 0.55, y - h * 1.15, x, y - h); c.quadraticCurveTo(x + w * 0.55, y - h * 1.15, x + w, y); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#005800'; for (const [a, b] of [[-0.25, 0.55], [0.12, 0.7], [0.3, 0.45]]) { c.beginPath(); c.ellipse(x + w * a, y - h * b, 7, 15, 0, 0, 7); c.fill(); }
  }
  bush(x, y, n) {
    const c = this.ctx; c.fillStyle = '#86d42a'; c.strokeStyle = '#000'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(x - 40, y);
    for (let i = 0; i < n + 1; i++) c.arc(x + i * 56, y - 20, 34, Math.PI, 0);
    c.lineTo(x + n * 56 + 40, y); c.closePath(); c.fill(); c.stroke();
  }
  cactusDeco(x, y, s) {
    const c = this.ctx; c.save(); c.translate(x, y); c.scale(s, s); c.fillStyle = '#3f9a3f'; c.strokeStyle = '#1f5a1f'; c.lineWidth = 5; c.lineJoin = 'round';
    const rr = (a, b, w, h) => { c.beginPath(); c.roundRect(a, b, w, h, w / 2); c.fill(); c.stroke(); };
    rr(-14, -130, 28, 130); rr(-46, -90, 22, 50); rr(-46, -56, 40, 20); rr(24, -110, 22, 60); rr(8, -66, 38, 20);
    c.restore();
  }
  building(x, y, w, h, col, win, k, lit) {
    const c = this.ctx; c.fillStyle = col; c.fillRect(x, y - h, w - 10, h);
    c.fillStyle = win;
    let ri = 0;
    for (let yy = y - h + 18; yy < y - 30; yy += 34, ri++) { let ci = 0; for (let xx = x + 14; xx < x + w - 30; xx += 28, ci++) if (hsh(k * 31 + ci * 7.13 + ri * 1.71) < lit) c.fillRect(xx, yy, 12, 16); }
  }
  billboard(x, y) {
    const c = this.ctx; c.fillStyle = '#222'; c.fillRect(x + 50, y + 120, 12, 160); c.fillRect(x + 150, y + 120, 12, 160);
    c.fillStyle = '#19c6e6'; c.strokeStyle = '#fff'; c.lineWidth = 6; c.fillRect(x, y, 220, 125); c.strokeRect(x, y, 220, 125);
    this.hexa(x + 60, y + 62, 38);
    c.fillStyle = '#fff'; c.font = '28px "Lilita One", sans-serif'; c.textAlign = 'left'; c.fillText('VAI!', x + 112, y + 74);
  }
  hexa(x, y, r) {
    const c = this.ctx; c.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } c.closePath();
    c.fillStyle = '#fff'; c.fill(); c.strokeStyle = '#000'; c.lineWidth = r * 0.12; c.stroke();
  }
  lamp(x, y) {
    const c = this.ctx; c.fillStyle = '#1b1530'; c.fillRect(x - 5, y - 230, 10, 230); c.fillRect(x - 5, y - 230, 48, 9);
    c.fillStyle = 'rgba(255,230,140,.25)'; c.beginPath(); c.moveTo(x + 32, y - 220); c.lineTo(x - 30, y); c.lineTo(x + 100, y); c.fill();
    c.fillStyle = '#ffe58a'; c.beginPath(); c.arc(x + 38, y - 216, 9, 0, 7); c.fill();
  }
  mountain(x, y, w, h, col) {
    const c = this.ctx; c.fillStyle = col; c.beginPath(); c.moveTo(x - w / 2, y); c.lineTo(x, y - h); c.lineTo(x + w / 2, y); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x - w * 0.14, y - h * 0.72); c.lineTo(x, y - h); c.lineTo(x + w * 0.14, y - h * 0.72); c.lineTo(x + w * 0.06, y - h * 0.66); c.lineTo(x, y - h * 0.74); c.lineTo(x - w * 0.07, y - h * 0.65); c.fill();
  }
  pine(x, y, s) {
    const c = this.ctx; c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = '#5a3a1e'; c.fillRect(-8, -30, 16, 30);
    for (let i = 0; i < 3; i++) { const yy = -30 - i * 50, w = 70 - i * 16; c.fillStyle = '#1d5c3c'; c.beginPath(); c.moveTo(-w, yy); c.lineTo(0, yy - 80); c.lineTo(w, yy); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(-w * 0.45, yy - 44); c.lineTo(0, yy - 80); c.lineTo(w * 0.45, yy - 44); c.lineTo(0, yy - 52); c.fill(); }
    c.restore();
  }
  castleWindow(x, y) {
    const c = this.ctx; c.fillStyle = '#0d0505'; c.beginPath(); c.moveTo(x - 50, y + 140); c.lineTo(x - 50, y); c.arc(x, y, 50, Math.PI, 0); c.lineTo(x + 50, y + 140); c.fill();
    const g = c.createRadialGradient(x, y + 60, 10, x, y + 60, 90); g.addColorStop(0, 'rgba(255,140,40,.8)'); g.addColorStop(1, 'rgba(255,60,0,0)'); c.fillStyle = g; c.fillRect(x - 46, y - 46, 92, 182);
    c.fillStyle = '#2a1414'; c.fillRect(x - 3, y - 50, 6, 190); c.fillRect(x - 50, y + 50, 100, 6);
  }
  pillar(x, y, k) {
    const c = this.ctx; c.fillStyle = '#1a0a0a'; c.fillRect(x - 40, -300, 80, y + 300); c.fillStyle = '#2c1414'; c.fillRect(x - 40, -300, 12, y + 300);
    const fy = 330, fl = Math.sin(this.time * 14 + k) * 6;
    c.fillStyle = '#3b2a2a'; c.fillRect(x - 10, fy, 20, 40);
    c.fillStyle = '#ff7a1a'; c.beginPath(); c.ellipse(x, fy - 12, 14, 26 + fl, 0, 0, 7); c.fill();
    c.fillStyle = '#ffe14d'; c.beginPath(); c.ellipse(x, fy - 6, 7, 14 + fl * 0.5, 0, 0, 7); c.fill();
    const g = c.createRadialGradient(x, fy - 10, 5, x, fy - 10, 120); g.addColorStop(0, 'rgba(255,150,50,.35)'); g.addColorStop(1, 'rgba(255,100,0,0)'); c.fillStyle = g; c.fillRect(x - 120, fy - 130, 240, 240);
  }

  /* ---------------- teto flutuante ---------------- */
  drawCeiling(S) {
    const c = this.ctx, s = 52, y = CY - s;
    const k0 = Math.floor((S.camX - 500) / s), k1 = Math.ceil((S.camX + W + 500) / s);
    for (let k = k0; k <= k1; k++) {
      const wx = k * s, x = wx - S.camX, z = this.zoneAt(S, wx), id = ZONAS[z].id;
      c.fillStyle = this.pat(z, 'block', -S.camX, y); c.fillRect(x, y, s, s);
      if (id === 'planicie' && ((k % 11) + 11) % 11 === 5) {
        c.fillStyle = '#f8a81c'; c.fillRect(x, y, s, s); c.fillStyle = '#ffd77a'; c.fillRect(x, y, s, 4); c.fillRect(x, y, 4, s);
        c.fillStyle = '#b05a00'; c.fillRect(x, y + s - 4, s, 4); c.fillRect(x + s - 4, y, 4, s);
        for (const [a, b] of [[6, 6], [s - 10, 6], [6, s - 10], [s - 10, s - 10]]) { c.fillStyle = '#000'; c.fillRect(x + a, y + b, 4, 4); }
        this.hexa(x + s / 2, y + s / 2, 13);
      }
      if (id === 'gelo') { c.fillStyle = '#d8f4ff'; c.beginPath(); const ic = 8 + hsh(k) * 22; c.moveTo(x + 10, CY); c.lineTo(x + 20, CY + ic); c.lineTo(x + 30, CY); c.moveTo(x + 32, CY); c.lineTo(x + 40, CY + ic * 0.6); c.lineTo(x + 48, CY); c.fill(); }
      if (id === 'cidade') { c.strokeStyle = '#c0392b'; c.lineWidth = 5; c.beginPath(); c.moveTo(x, y + 6); c.lineTo(x + s, y + s - 6); c.moveTo(x + s, y + 6); c.lineTo(x, y + s - 6); c.stroke(); c.fillStyle = '#a93226'; c.fillRect(x, y, s, 8); c.fillRect(x, y + s - 8, s, 8); }
      if (id === 'castelo' && ((k % 13) + 13) % 13 === 3) { c.strokeStyle = '#2b2730'; c.lineWidth = 6; for (let j = 0; j < 4; j++) { c.beginPath(); c.ellipse(x + s / 2, CY + 10 + j * 18, 6, 10, 0, 0, 7); c.stroke(); } }
    }
    c.strokeStyle = '#000'; c.lineWidth = 4; c.beginPath(); c.moveTo(-600, CY); c.lineTo(W + 600, CY); c.moveTo(-600, y); c.lineTo(W + 600, y); c.stroke();
  }

  /* ---------------- chão ---------------- */
  drawGround(S) {
    const c = this.ctx;
    const segs = []; const xa = -600, xb = W + 600;
    for (let i = 0; i < S.zoneBounds.length; i++) {
      const a = Math.max(xa, S.zoneBounds[i].wx - S.camX), b = Math.min(xb, (i + 1 < S.zoneBounds.length ? S.zoneBounds[i + 1].wx : 1e12) - S.camX);
      if (b > a) segs.push({ a, b, z: S.zoneBounds[i].z });
    }
    const holes = [];
    for (const o of S.obs) { if (o.type === 'manhole' && o.open) holes.push([o.wx - S.camX - 55, o.wx - S.camX + 55]); if (o.type === 'lava' && o.crumble) holes.push([o.hx - S.camX - o.hw / 2, o.hx - S.camX + o.hw / 2]); }
    for (const sg of segs) {
      const id = ZONAS[sg.z].id;
      c.beginPath(); c.moveTo(sg.a, H + 600);
      for (let x = sg.a; x <= sg.b; x += 10) c.lineTo(x, GY + S.baseAt(x + S.camX));
      c.lineTo(sg.b, GY + S.baseAt(sg.b + S.camX)); c.lineTo(sg.b, H + 600); c.closePath();
      c.save(); c.clip();
      c.fillStyle = this.pat(sg.z, 'ground', -S.camX, GY); c.fillRect(sg.a, -200, sg.b - sg.a, H + 900);
      // decoração do topo
      c.lineWidth = 1;
      const top = x => GY + S.baseAt(x + S.camX);
      if (id === 'cidade') { for (let x = Math.floor(sg.a / 10) * 10; x < sg.b; x += 10) { c.fillStyle = '#9a9aa5'; c.fillRect(x, top(x), 10, 22); c.fillStyle = '#c8c8d0'; c.fillRect(x, top(x), 10, 4); if (((x + S.camX) % 200 + 200) % 200 < 90) { c.fillStyle = '#ffd34d'; c.fillRect(x, top(x) + 60, 10, 6); } } }
      else if (id === 'gelo') { c.fillStyle = '#fff'; for (let x = Math.floor(sg.a / 10) * 10; x < sg.b; x += 10) c.fillRect(x, top(x), 10, 14 + Math.sin((x + S.camX) / 30) * 5); }
      else if (id === 'deserto') { c.fillStyle = '#f7d79a'; for (let x = Math.floor(sg.a / 10) * 10; x < sg.b; x += 10) c.fillRect(x, top(x), 10, 7); }
      else if (id === 'castelo') { c.fillStyle = '#2b2a33'; for (let x = Math.floor(sg.a / 10) * 10; x < sg.b; x += 10) c.fillRect(x, top(x), 10, 8); }
      c.restore();
      c.strokeStyle = '#000'; c.lineWidth = 4; c.beginPath();
      for (let x = sg.a; x <= sg.b; x += 10) { const y = GY + S.baseAt(x + S.camX); x === sg.a ? c.moveTo(x, y) : c.lineTo(x, y); }
      c.stroke();
    }
    // buracos (bueiro / ponte quebrada)
    for (const o of S.obs) {
      if (o.type === 'manhole' && o.open) this.manholeHole(S, o);
      if (o.type === 'lava' && o.crumble) this.lavaPit(S, o);
    }
  }
  drawPits(S) {
    // vítimas que estão dentro de buracos: desenhadas antes do chão, depois o buraco recorta
    this._pitVictims = S.racers.filter(r => !r.alive && r.dead && !r.dead.gone && r.dead.behind);
  }
  manholeHole(S, o) {
    const c = this.ctx, x = o.wx - S.camX, y = GY + S.baseAt(o.wx);
    c.fillStyle = '#050505'; c.beginPath(); c.ellipse(x, y + 4, 60, 16, 0, 0, 7); c.fill();
    c.fillRect(x - 60, y + 4, 120, H);
    for (const r of this._pitVictims || []) if (r.dead.tipo === 'bueiro') { c.save(); c.beginPath(); c.rect(x - 60, -800, 120, y + 800 + H); c.clip(); this.drawDead(S, r); c.restore(); }
    c.fillStyle = '#050505'; c.fillRect(x - 70, y + 14, 140, 400);
    // tampa em pé
    c.save(); c.translate(x + 82, y - 34); c.fillStyle = '#5a5a62'; c.strokeStyle = '#111'; c.lineWidth = 4; c.beginPath(); c.ellipse(0, 0, 14, 44, 0.15, 0, 7); c.fill(); c.stroke(); c.restore();
  }
  lavaPit(S, o) {
    const c = this.ctx, x0 = o.hx - S.camX - o.hw / 2, y = GY;
    c.fillStyle = '#120404'; c.fillRect(x0, y - 2, o.hw, H);
    for (const r of this._pitVictims || []) if (r.dead.tipo === 'lava') { c.save(); c.beginPath(); c.rect(x0, -800, o.hw, 800 + y + 120); c.clip(); this.drawDead(S, r); c.restore(); }
    const g = c.createLinearGradient(0, y + 90, 0, H); g.addColorStop(0, '#ffdd3a'); g.addColorStop(0.3, '#ff7a1a'); g.addColorStop(1, '#b3200a');
    c.fillStyle = g; c.beginPath(); c.moveTo(x0, H + 50);
    for (let xx = x0; xx <= x0 + o.hw; xx += 8) c.lineTo(xx, y + 100 + Math.sin(xx / 18 + this.time * 5) * 6);
    c.lineTo(x0 + o.hw, H + 50); c.fill();
    c.strokeStyle = '#000'; c.lineWidth = 4; c.strokeRect(x0, y - 2, o.hw, H);
  }
  drawBumps(S) {
    const c = this.ctx;
    for (const b of S.bumps) {
      const x = b.wx - S.camX; if (x > W + 600 || x + b.w < -600) continue;
      const z = this.zoneAt(S, b.wx), base = GY + S.baseAt(b.wx + b.w / 2);
      if (b.type === 'pad') { this.pad(x, GY + S.baseAt(b.wx), b.w); continue; }
      c.beginPath();
      if (b.type === 'trap') { c.moveTo(x, base + 4); c.lineTo(x + b.s, base - b.h); c.lineTo(x + b.w - b.s, base - b.h); c.lineTo(x + b.w, base + 4); }
      else { c.rect(x, base - b.h, b.w, b.h + 6); }
      c.closePath();
      c.fillStyle = this.pat(z, 'block', -S.camX, GY); c.fill();
      c.strokeStyle = '#000'; c.lineWidth = 4; c.stroke();
    }
  }
  pad(x, y, w) {
    const c = this.ctx;
    c.strokeStyle = '#333'; c.lineWidth = 6; c.beginPath();
    for (let i = 0; i <= 6; i++) c.lineTo(x + w * 0.2 + (i % 2) * w * 0.6, y - 2 - i * 3);
    c.stroke();
    c.fillStyle = '#ffd400'; c.strokeStyle = '#000'; c.lineWidth = 4; c.beginPath(); c.roundRect(x, y - 26, w, 12, 4); c.fill(); c.stroke();
    c.save(); c.beginPath(); c.rect(x, y - 26, w, 12); c.clip(); c.fillStyle = '#111'; for (let i = -2; i < w / 14; i++) { c.beginPath(); c.moveTo(x + i * 28, y - 14); c.lineTo(x + i * 28 + 12, y - 26); c.lineTo(x + i * 28 + 24, y - 26); c.lineTo(x + i * 28 + 12, y - 14); c.fill(); } c.restore();
    c.fillStyle = '#ff3b3b'; c.beginPath(); c.moveTo(x + w / 2 - 14, y - 36); c.lineTo(x + w / 2, y - 52); c.lineTo(x + w / 2 + 14, y - 36); c.fill();
  }

  /* ---------------- obstáculos ---------------- */
  hazard(x, y, w, h) {
    const c = this.ctx; c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
    c.fillStyle = '#ffd400'; c.fillRect(x, y, w, h); c.fillStyle = '#111';
    for (let i = -h; i < w + h; i += 36) { c.beginPath(); c.moveTo(x + i, y + h); c.lineTo(x + i + 18, y + h); c.lineTo(x + i + 18 + h, y); c.lineTo(x + i + h, y); c.fill(); }
    c.restore(); c.strokeStyle = '#000'; c.lineWidth = 4; c.strokeRect(x, y, w, h);
  }
  metal(x, y, w, h) {
    const c = this.ctx; const g = c.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, '#5d6268'); g.addColorStop(0.15, '#b8bec5'); g.addColorStop(0.5, '#8a9097'); g.addColorStop(0.85, '#c4c9cf'); g.addColorStop(1, '#4b4f55');
    c.fillStyle = g; c.fillRect(x, y, w, h);
    c.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < 6; i++) c.fillRect(x + 12 + i * (w - 24) / 6, y, 3, h);
    c.strokeStyle = '#000'; c.lineWidth = 4; c.strokeRect(x, y, w, h);
  }
  o_gate(ctx, S, o) {
    const x = o.wx - S.camX, b = o.bottom;
    this.metal(x, -600, o.w, b - 44 + 600);
    this.hazard(x, b - 46, o.w, 46);
    if (o.final) { ctx.fillStyle = '#ff3b3b'; ctx.font = '40px "Lilita One", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('FINAL', x + o.w / 2, b - 70); }
  }
  o_ramp(ctx, S, o) {
    const se = o.wx - S.camX, x0 = se - o.len, gy = GY + S.baseAt(o.wx);
    ctx.beginPath(); ctx.moveTo(x0, GY + S.baseAt(x0 + S.camX) + 4); ctx.lineTo(se, gy - o.h); ctx.lineTo(se, gy + 4); ctx.closePath();
    const g = ctx.createLinearGradient(x0, 0, se, 0); g.addColorStop(0, '#6d737a'); g.addColorStop(1, '#a9afb6'); ctx.fillStyle = g; ctx.fill();
    ctx.save(); ctx.clip(); ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 3; for (let i = 0; i < o.len; i += 40) { ctx.beginPath(); ctx.moveTo(x0 + i, gy); ctx.lineTo(x0 + i, gy - o.h); ctx.stroke(); } ctx.restore();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 5; ctx.stroke();
    // faixa na borda
    ctx.save(); ctx.lineWidth = 14; ctx.setLineDash([22, 22]); ctx.strokeStyle = '#ffd400'; ctx.beginPath(); ctx.moveTo(x0, GY + S.baseAt(x0 + S.camX)); ctx.lineTo(se, gy - o.h); ctx.stroke();
    ctx.lineDashOffset = 22; ctx.strokeStyle = '#111'; ctx.stroke(); ctx.restore();
  }
  o_pinch(ctx, S, o) {
    const cx = o.wx - S.camX, R = o.R; if (R < 10) return;
    for (const [y, a0, a1] of [[CY, 0, Math.PI], [GY, Math.PI, Math.PI * 2]]) {
      const g = ctx.createRadialGradient(cx - R * 0.3, y, R * 0.1, cx, y, R); g.addColorStop(0, '#c9ced6'); g.addColorStop(1, '#5d6268');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx - R, y); ctx.arc(cx, y, R, a0, a1); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.lineWidth = 12; ctx.setLineDash([20, 20]); ctx.strokeStyle = '#ffd400'; ctx.beginPath(); ctx.arc(cx, y, R - 6, a0, a1); ctx.stroke(); ctx.lineDashOffset = 20; ctx.strokeStyle = '#111'; ctx.stroke(); ctx.restore();
      ctx.strokeStyle = '#000'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, y, R, a0, a1); ctx.stroke();
      ctx.fillStyle = '#333'; for (let i = 1; i < 6; i++) { const a = a0 + (a1 - a0) * i / 6; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * R * 0.7, y + Math.sin(a) * R * 0.7, 5, 0, 7); ctx.fill(); }
    }
  }
  o_cactus(ctx, S, o) {
    const x = o.wx - S.camX, y = GY + S.baseAt(o.wx);
    ctx.save(); ctx.translate(x, y + 4); ctx.fillStyle = '#2fa53a'; ctx.strokeStyle = '#000'; ctx.lineWidth = 5;
    const rr = (a, b, w, h) => { ctx.beginPath(); ctx.roundRect(a, b, w, h, w / 2); ctx.fill(); ctx.stroke(); };
    rr(-26, -92, 52, 92); rr(-58, -70, 26, 46); rr(26, -80, 26, 50);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
    for (let i = 0; i < 16; i++) { const a = hsh(i) * 6.28, px = (hsh(i + 3) - 0.5) * 40, py = -10 - hsh(i + 7) * 76; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a) * 12, py + Math.sin(a) * 12); ctx.stroke(); }
    ctx.fillStyle = '#ff5fa2'; ctx.beginPath(); ctx.arc(0, -94, 9, 0, 7); ctx.fill();
    ctx.restore();
  }
  o_mine(ctx, S, o) {
    const x = o.wx - S.camX, y = GY + S.baseAt(o.wx);
    if (o.boom) { ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.ellipse(x, y + 4, 70, 14, 0, 0, 7); ctx.fill(); return; }
    ctx.fillStyle = '#3a3f37'; ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(x, y, 40, 22, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    const blink = (Math.sin(this.time * (8 + Math.max(0, (W - x) / 80))) > 0);
    ctx.fillStyle = blink ? '#ff2020' : '#5a0000'; ctx.beginPath(); ctx.arc(x, y - 22, 8, 0, 7); ctx.fill(); ctx.stroke();
    if (blink) { ctx.fillStyle = 'rgba(255,40,40,.35)'; ctx.beginPath(); ctx.arc(x, y - 22, 26, 0, 7); ctx.fill(); }
    if (x < W && Math.floor(this.time * 3) !== this._lastBip) { this._lastBip = Math.floor(this.time * 3); this.text('PI', x + 20, y - 60, '#ff4040', 32); this.sfx('bip'); }
  }
  o_tornado(ctx, S, o) {
    const x = o.wx - S.camX, y = GY + S.baseAt(o.wx);
    ctx.save(); ctx.lineWidth = 9; ctx.lineCap = 'round';
    for (let i = 0; i < 16; i++) {
      const yy = y - i * 30, w = 26 + i * 11, ph = this.time * 9 + i * 0.6;
      ctx.strokeStyle = i % 2 ? 'rgba(201,160,99,.85)' : 'rgba(232,200,140,.85)';
      ctx.beginPath(); ctx.ellipse(x + Math.sin(ph * 0.5 + i * 0.3) * 18, yy, w, 10, 0, ph % 6.28, ph % 6.28 + 4.4); ctx.stroke();
    }
    ctx.fillStyle = '#7a5a2a'; for (let i = 0; i < 5; i++) { const a = this.time * 6 + i * 1.3; ctx.fillRect(x + Math.cos(a) * (60 + i * 20), y - 80 - i * 70 + Math.sin(a * 2) * 10, 10, 10); }
    ctx.restore();
  }
  o_light(ctx, S, o) {
    const x = o.wx - S.camX, y = GY + S.baseAt(o.wx);
    ctx.fillStyle = '#2b2b2b'; ctx.fillRect(x - 6, y - 330, 12, 330);
    ctx.fillStyle = '#1a1a1a'; ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(x - 34, y - 470, 68, 160, 12); ctx.fill(); ctx.stroke();
    const cols = [['#3a0000', '#ff2a2a'], ['#3a3000', '#ffd400'], ['#003a10', '#2aff5a']];
    for (let i = 0; i < 3; i++) { const on = (o.state === 2 && i === 0) || (o.state === 1 && i === 1) || (o.state === 0 && i === 2); ctx.fillStyle = on ? cols[i][1] : cols[i][0]; ctx.beginPath(); ctx.arc(x, y - 440 + i * 50, 18, 0, 7); ctx.fill(); if (on) { ctx.fillStyle = cols[i][1].replace(')', ''); ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.arc(x, y - 440 + i * 50, 38, 0, 7); ctx.fill(); ctx.globalAlpha = 1; } }
  }
  o_manhole(ctx, S, o) {
    if (o.open) return;
    const x = o.wx - S.camX, y = GY + S.baseAt(o.wx);
    ctx.fillStyle = '#4a4a52'; ctx.strokeStyle = '#111'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(x, y + 4, 58, 14, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = 3; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * 18, y - 6); ctx.lineTo(x + i * 18, y + 14); ctx.stroke(); }
  }
  o_balloon(ctx, S, o) {
    let bx, by, sx2, sy2;
    if (o.taken && o.vic != null) { const d = S.racers[o.vic].dead; bx = d.wx - S.camX + 30; by = d.y - 290; sx2 = d.wx - S.camX + 34 + Math.cos(d.a - 1.2) * 0; sy2 = d.y - 140; }
    else { bx = o.bwx - S.camX; by = o.by + Math.sin(o.t * 2) * 14; sx2 = bx + Math.sin(o.t * 3) * 10; sy2 = by + 190; }
    ctx.strokeStyle = '#eee'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx, by + 62); ctx.quadraticCurveTo(bx - 20, (by + sy2) / 2 + 40, sx2, sy2); ctx.stroke();
    ctx.fillStyle = '#ff2d2d'; ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(bx, by, 48, 60, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx - 8, by + 70); ctx.lineTo(bx, by + 58); ctx.lineTo(bx + 8, by + 70); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(bx - 18, by - 22, 9, 18, 0.4, 0, 7); ctx.fill();
  }
  o_ufo(ctx, S, o) {
    const x = o.sx, y = o.y;
    if (o.phase === 1 || o.phase === 2) {
      const g = ctx.createLinearGradient(0, y, 0, GY); g.addColorStop(0, 'rgba(160,255,120,.65)'); g.addColorStop(1, 'rgba(160,255,120,.12)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 40, y + 20); ctx.lineTo(x + 40, y + 20); ctx.lineTo(x + 130, GY + 10); ctx.lineTo(x - 130, GY + 10); ctx.fill();
    }
    ctx.fillStyle = '#9ff1ff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(x, y - 16, 46, 36, 0, Math.PI, 0); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#9aa3ad'; ctx.beginPath(); ctx.ellipse(x, y, 120, 30, 0, 0, 7); ctx.fill(); ctx.stroke();
    for (let i = 0; i < 6; i++) { ctx.fillStyle = (Math.floor(this.time * 8) + i) % 2 ? '#ffe14d' : '#ff4d4d'; ctx.beginPath(); ctx.arc(x - 90 + i * 36, y + 4, 8, 0, 7); ctx.fill(); }
  }
  o_anvil(ctx, S, o) {
    const x = o.sx, gy = GY + S.baseAt(S.camX + x);
    if (o.phase < 2) {
      const p = clamp(o.t / 1.6, 0, 1);
      ctx.fillStyle = `rgba(0,0,0,${0.15 + p * 0.35})`; ctx.beginPath(); ctx.ellipse(x, gy + 2, 30 + p * 50, 8 + p * 6, 0, 0, 7); ctx.fill();
      if (o.phase === 0 && Math.floor(this.time * 4) % 2) { ctx.fillStyle = '#ff3030'; ctx.font = '56px "Lilita One", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('!', x, gy - 240); }
    }
    if (o.y < -150) return;
    ctx.save(); ctx.translate(x, o.y);
    ctx.fillStyle = '#26272c'; ctx.strokeStyle = '#000'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-80, -40); ctx.lineTo(60, -40); ctx.quadraticCurveTo(110, -38, 120, -20); ctx.lineTo(40, -14); ctx.lineTo(28, 14); ctx.lineTo(50, 46); ctx.lineTo(-56, 46); ctx.lineTo(-34, 14); ctx.lineTo(-40, -14); ctx.lineTo(-80, -22); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#5c5e66'; ctx.fillRect(-74, -36, 130, 6);
    ctx.fillStyle = '#fff'; ctx.font = '22px "Lilita One", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('1 TON', -2, 36);
    ctx.restore();
  }
  o_ice(ctx, S, o) {
    const x = o.wx - S.camX, y = GY + S.baseAt(o.wx);
    ctx.fillStyle = 'rgba(190,240,255,.9)'; ctx.strokeStyle = '#5fb3dd'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x + o.w / 2, y + 2, o.w / 2, 12, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillRect(x + 40, y - 3, 40, 4); ctx.fillRect(x + 120, y, 30, 3);
    if (Math.floor(this.time * 3) % 2) { ctx.fillStyle = '#fff'; this.sparkle(x + 60 + (Math.floor(this.time * 3) % 3) * 40, y - 14); }
  }
  sparkle(x, y) { const c = this.ctx; c.beginPath(); c.moveTo(x, y - 12); c.lineTo(x + 3, y - 3); c.lineTo(x + 12, y); c.lineTo(x + 3, y + 3); c.lineTo(x, y + 12); c.lineTo(x - 3, y + 3); c.lineTo(x - 12, y); c.lineTo(x - 3, y - 3); c.fill(); }
  o_lava(ctx, S, o) {
    if (o.crumble) return;
    const x = o.wx - S.camX, y = GY;
    ctx.strokeStyle = 'rgba(255,120,30,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 80, y + 4); ctx.lineTo(x - 40, y + 30); ctx.lineTo(x, y + 12); ctx.lineTo(x + 50, y + 40); ctx.lineTo(x + 90, y + 6); ctx.stroke();
  }
  o_avalanche(ctx, S, o) {
    const x = o.sx, R = o.R, y = GY - R;
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#7fb8dc'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#b8dcf2'; ctx.lineWidth = 6; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(0, 0, R * (0.3 + i * 0.15), i, i + 2); ctx.stroke(); }
    ctx.restore();
    if (Math.random() < 0.6) this.parts.push({ type: 'snowp', x: x - R * 0.5, y: GY - 10, vx: -200 - Math.random() * 200, vy: -200 - Math.random() * 200, life: 0.8, max: 0.8, s: 6 + Math.random() * 8, c: '#fff', g: 1200 });
  }
  o_fireball(ctx, S, o) {
    for (const b of o.balls) {
      if (!b.on || b.done) continue;
      const fl = Math.sin(this.time * 30) * 4;
      ctx.fillStyle = 'rgba(255,90,0,.35)'; ctx.beginPath(); ctx.arc(b.sx, b.y, 46 + fl, 0, 7); ctx.fill();
      ctx.fillStyle = '#ff6a1a'; ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(b.sx, b.y, 30, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffe14d'; ctx.beginPath(); ctx.arc(b.sx - 6, b.y - 6, 14, 0, 7); ctx.fill();
      this.parts.push({ type: 'lava', x: b.sx, y: b.y, vx: (Math.random() - 0.5) * 80, vy: -b.vy * 0.1, life: 0.4, max: 0.4, s: 8 + Math.random() * 8, c: '#ff9a2a', g: 0 });
    }
  }
  o_crusher(ctx, S, o) {
    const x = o.wx - S.camX, y = o.y, w = o.w;
    ctx.strokeStyle = '#2b2730'; ctx.lineWidth = 7; for (let yy = CY - 40; yy < y; yy += 20) { ctx.beginPath(); ctx.ellipse(x + w / 2, yy, 6, 10, 0, 0, 7); ctx.stroke(); }
    const sh = o.phase === 0 ? Math.sin(this.time * 70) * 4 : 0;
    ctx.save(); ctx.translate(x + sh, y);
    ctx.fillStyle = '#6f6c78'; ctx.strokeStyle = '#000'; ctx.lineWidth = 5; ctx.fillRect(0, 0, w, 130); ctx.strokeRect(0, 0, w, 130);
    ctx.fillStyle = '#8d8a96'; ctx.fillRect(6, 6, w - 12, 14);
    ctx.strokeStyle = '#3a3842'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(20, 30); ctx.lineTo(44, 60); ctx.lineTo(34, 90); ctx.moveTo(100, 40); ctx.lineTo(84, 74); ctx.stroke();
    ctx.fillStyle = '#c9c9d2'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(i * w / 5, 130); ctx.lineTo(i * w / 5 + w / 10, 150); ctx.lineTo((i + 1) * w / 5, 130); ctx.fill(); ctx.stroke(); }
    ctx.restore();
  }
  o_oil(ctx, S, o) {
    const x = o.wx - S.camX, y = GY + S.baseAt(o.wx);
    ctx.fillStyle = '#121218'; ctx.beginPath(); ctx.ellipse(x + o.w / 2, y + 3, o.w / 2, 11, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(120,90,255,.35)'; ctx.beginPath(); ctx.ellipse(x + o.w * 0.4, y + 1, o.w * 0.18, 4, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(80,220,255,.3)'; ctx.beginPath(); ctx.ellipse(x + o.w * 0.65, y + 4, o.w * 0.12, 3, 0, 0, 7); ctx.fill();
  }
  o_banana(ctx, S, o) {
    if (o.taken) return;
    const x = o.wx - S.camX, y = GY + S.baseAt(o.wx);
    ctx.save(); ctx.translate(x, y - 8); ctx.fillStyle = '#ffd92e'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
    for (const a of [-0.9, 0, 0.9]) { ctx.save(); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0, -14, 7, 16, 0, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore(); }
    ctx.fillStyle = '#6b4a1a'; ctx.fillRect(-4, -6, 8, 8); ctx.restore();
  }
  o_mush(ctx, S, o) {
    if (o.taken) return;
    const x = o.wx - S.camX, y = o.y + Math.sin(o.t * 3) * 22;
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.arc(x, y, 46 + Math.sin(this.time * 6) * 4, 0, 7); ctx.fill();
    ctx.fillStyle = '#f6e6c8'; ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(x - 14, y - 2, 28, 26, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#16c6d9'; ctx.beginPath(); ctx.arc(x, y, 30, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; for (const [a, b, r] of [[-14, -12, 7], [8, -18, 6], [18, -6, 4]]) { ctx.beginPath(); ctx.arc(x + a, y + b, r, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#000'; ctx.fillRect(x - 6, y + 6, 3, 8); ctx.fillRect(x + 4, y + 6, 3, 8);
  }
  o_roll(ctx, S, o) {
    const x = o.sx, R = o.R, y = GY + S.baseAt(S.camX + x) - R, id = ZONAS[o.z].id;
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot); ctx.lineWidth = 4; ctx.strokeStyle = '#000';
    if (id === 'deserto') { ctx.strokeStyle = '#8a5a22'; ctx.lineWidth = 3; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(Math.sin(i * 2.1) * 6, Math.cos(i * 1.7) * 6, R * (0.5 + (i % 3) * 0.2), i, i + 3.6); ctx.stroke(); } }
    else if (id === 'gelo') { ctx.fillStyle = '#fff'; ctx.strokeStyle = '#7fb8dc'; ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fill(); ctx.stroke(); ctx.strokeStyle = '#cfe8f7'; ctx.beginPath(); ctx.arc(0, 0, R * 0.55, 0, 3); ctx.stroke(); }
    else if (id === 'cidade') { ctx.fillStyle = '#1b1b1f'; ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#8c8c96'; ctx.beginPath(); ctx.arc(0, 0, R * 0.45, 0, 7); ctx.fill(); ctx.fillStyle = '#1b1b1f'; for (let i = 0; i < 5; i++) { const a = i * 1.256; ctx.beginPath(); ctx.arc(Math.cos(a) * R * 0.25, Math.sin(a) * R * 0.25, 3, 0, 7); ctx.fill(); } }
    else if (id === 'castelo') { ctx.fillStyle = '#e9e4d6'; ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-R * 0.35, -R * 0.15, R * 0.22, 0, 7); ctx.arc(R * 0.35, -R * 0.15, R * 0.22, 0, 7); ctx.fill(); ctx.fillRect(-R * 0.3, R * 0.35, R * 0.6, 4); }
    else { ctx.fillStyle = '#a0612b'; ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fill(); ctx.stroke(); ctx.strokeStyle = '#5b3412'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-R, -R * 0.4); ctx.lineTo(R, -R * 0.4); ctx.moveTo(-R, R * 0.4); ctx.lineTo(R, R * 0.4); ctx.stroke(); }
    ctx.restore();
  }
  o_wind(ctx, S, o) {
    const a = clamp(Math.min(o.t, o.dur - o.t), 0, 1);
    ctx.save(); ctx.globalAlpha = 0.55 * a; ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (let i = 0; i < 18; i++) { const y = CY + 40 + hsh(i) * (GY - CY - 80), sp = 900 + hsh(i + 5) * 700, x = W + 200 - ((this.time * sp + hsh(i + 9) * 3000) % (W + 600)); ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 60, y - 10, x + 160 + hsh(i + 2) * 120, y); ctx.stroke(); }
    ctx.restore();
  }
  o_domino() { }
  o_finish(ctx, S, o) {
    const x = o.wx - S.camX, y = GY + S.baseAt(o.wx), top = CY + 40;
    for (const px of [x - 20, x + 200]) { ctx.fillStyle = '#ddd'; ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.fillRect(px - 10, top, 20, y - top); ctx.strokeRect(px - 10, top, 20, y - top); }
    for (let i = 0; i < 12; i++) for (let j = 0; j < 3; j++) { ctx.fillStyle = (i + j) % 2 ? '#111' : '#fff'; ctx.fillRect(x - 30 + i * 20, top + j * 20, 20, 20); }
    ctx.strokeStyle = '#000'; ctx.strokeRect(x - 30, top, 240, 60);
    ctx.fillStyle = '#ffd23f'; ctx.font = '40px "Lilita One", sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 8; ctx.strokeText('CHEGADA', x + 90, top + 110); ctx.fillText('CHEGADA', x + 90, top + 110);
    for (let i = 0; i < 8; i++) for (let j = 0; j < 2; j++) { ctx.fillStyle = (i + j) % 2 ? '#111' : '#fff'; ctx.fillRect(x + i * 12 - 4, y - 2 + j * 0, 12, 6); }
  }

  /* ---------------- ciclistas ---------------- */
  drawAlive(S, r, ui) {
    const P = r.pts, ctx = this.ctx;
    const x = (P[0].x + P[1].x) / 2, y = (P[0].y + P[1].y) / 2;
    ctx.save(); ctx.translate(x, y); ctx.rotate(r.ang);
    drawCiclista(ctx, { cor: this.cor[r.i].cor, face: this.faces[r.i], pedal: r.pedal, wheelRot: r.wheelRot, dmg: r.dmg });
    ctx.restore();
    if (r.dmg > 0.8 && Math.random() < 0.03) this.parts.push({ type: 'smoke', x: x - 40, y: y - 10, vx: -160, vy: -60, life: 0.8, max: 0.8, s: 10, c: 'rgba(90,90,90,.7)' });
  }
  drawDead(S, r) {
    const d = r.dead, ctx = this.ctx, x = d.wx - S.camX;
    ctx.save(); ctx.translate(x, d.y); ctx.rotate(d.a); ctx.scale(d.sx, d.sy);
    drawCiclista(ctx, { cor: this.cor[r.i].cor, face: this.faces[r.i], pedal: 1.2, wheelRot: r.wheelRot, dmg: r.dmg, flat: d.flat, foot: d.foot, burnt: d.burnt });
    if (d.tipo === 'congelado' && d.ice > 0) {
      ctx.globalAlpha = 0.65 * d.ice; ctx.fillStyle = '#bfefff'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.roundRect(-95, -165, 190, 205, 14); ctx.fill(); ctx.stroke();
      ctx.globalAlpha = 0.9 * d.ice; ctx.fillStyle = '#fff'; ctx.fillRect(-80, -150, 50, 8); ctx.fillRect(-80, -150, 8, 50);
    }
    ctx.restore();
    if (d.tipo === 'parou' && d.t < 6) {
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(x - 20, d.y - 250, 150, 54, 12); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#111'; ctx.font = '26px "Lilita One", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('esperando...', x + 55, d.y - 214);
    }
  }
  nameTag(S, r, lift = 0) {
    const ctx = this.ctx, h = { x: r.pts[2].x, y: r.pts[2].y - lift };
    const nome = this.cor[r.i].nome;
    ctx.font = '30px "Lilita One", sans-serif'; ctx.textAlign = 'center';
    const w = ctx.measureText(nome).width + 26;
    ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.beginPath(); ctx.roundRect(h.x - w / 2, h.y - 100, w, 42, 10); ctx.fill();
    ctx.fillStyle = this.cor[r.i].cor; ctx.fillRect(h.x - w / 2, h.y - 62, w, 4);
    ctx.fillStyle = '#fff'; ctx.fillText(nome, h.x, h.y - 69);
  }

  /* ---------------- partículas ---------------- */
  updParts(dt) {
    for (const p of this.parts) { p.life -= dt; p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.type === 'dust' || p.type === 'smoke') { p.vx *= 0.94; p.s += dt * 30; } if (p.rot != null && p.type !== 'txt') p.rot += dt * 4; }
    this.parts = this.parts.filter(p => p.life > 0);
    if (this.parts.length > 900) this.parts.splice(0, this.parts.length - 900);
  }
  drawParts() {
    const c = this.ctx;
    for (const p of this.parts) {
      const a = clamp(p.life / p.max, 0, 1);
      c.globalAlpha = p.type === 'txt' ? Math.min(1, a * 2) : a;
      if (p.type === 'txt') {
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot); const sc = 1 + (1 - a) * 0.25; c.scale(sc, sc);
        c.font = `${p.s}px "Lilita One", sans-serif`; c.textAlign = 'center'; c.lineJoin = 'round';
        c.strokeStyle = '#000'; c.lineWidth = p.s * 0.22; c.strokeText(p.txt, 0, 0); c.fillStyle = p.c; c.fillText(p.txt, 0, 0); c.restore();
      } else if (p.type === 'star') { c.fillStyle = p.c; c.save(); c.translate(p.x, p.y); c.rotate(p.rot); this.sparkle(0, 0); c.restore(); }
      else if (p.type === 'conf' || p.type === 'rock') { c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = p.c; c.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.66); if (p.type === 'rock') { c.strokeStyle = '#000'; c.lineWidth = 3; c.strokeRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.66); } c.restore(); }
      else { c.fillStyle = p.c; c.beginPath(); c.arc(p.x, p.y, p.s, 0, 7); c.fill(); }
    }
    c.globalAlpha = 1;
  }
  drawWeather(S, dt) {
    const c = this.ctx, id = ZONAS[this.zoneAt(S, S.camX + W / 2)].id;
    c.setTransform(1, 0, 0, 1, 0, 0);
    if (id === 'gelo') { c.fillStyle = 'rgba(255,255,255,.9)'; for (const f of this.snow) { f.y += f.v * dt; f.x -= (S.speed * 0.25 + 30) * dt; if (f.y > H) f.y = -10; if (f.x < 0) f.x += W; c.beginPath(); c.arc(f.x, f.y, f.s, 0, 7); c.fill(); } }
    if (id === 'castelo') { for (const f of this.embers) { f.y -= f.v * dt; f.x -= S.speed * 0.3 * dt; f.p += dt * 3; if (f.y < 0) { f.y = H; f.x = Math.random() * W; } if (f.x < 0) f.x += W; c.fillStyle = `rgba(255,${120 + Math.sin(f.p) * 60 | 0},30,.8)`; c.fillRect(f.x, f.y, f.s, f.s); } }
    if (id === 'deserto') { c.fillStyle = 'rgba(255,220,150,.08)'; c.fillRect(0, 0, W, H); }
  }

  /* ---------------- HUD e textos de tela ---------------- */
  outlined(txt, x, y, size, fill, stroke = '#000', font = 'Lilita One', lw) {
    const c = this.ctx; c.font = `${size}px "${font}", sans-serif`; c.textAlign = 'center'; c.lineJoin = 'round';
    c.strokeStyle = stroke; c.lineWidth = lw || size * 0.18; c.strokeText(txt, x, y); c.fillStyle = fill; c.fillText(txt, x, y);
  }
  drawHUD(S, ui) {
    return; // (removido a pedido: sem caixa de zona/tempo)
    const c = this.ctx; c.setTransform(1, 0, 0, 1, 0, 0);
    if (!ui.racing) return;
    const z = ZONAS[this.zoneAt(S, S.camX + W / 2)];
    c.fillStyle = 'rgba(0,0,0,.55)'; c.beginPath(); c.roundRect(20, 18, 430, 96, 14); c.fill();
    c.font = '18px "Press Start 2P", monospace'; c.textAlign = 'left'; c.fillStyle = '#ffd23f';
    c.fillText(`ZONA ${ZONAS.indexOf(z) + 1}/5`, 38, 52);
    c.fillStyle = '#fff'; c.fillText(z.nome, 38, 86);
    const sec = Math.max(0, S.T - 3), mm = Math.floor(sec / 60), ss = Math.floor(sec % 60);
    c.textAlign = 'right'; c.fillStyle = '#fff'; c.fillText(`${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`, 432, 52);
    c.fillStyle = '#7dff6a'; c.fillText(`${S.order.length}/${S.n}`, 432, 86);
  }
  drawCaps(S, ui, dt) {
    const c = this.ctx; c.setTransform(1, 0, 0, 1, 0, 0);
    // título antes da corrida
    if (!ui.racing) {
      const b = Math.sin(this.time * 2.2) * 6;
      this.outlined('QUEM VAI SOBREVIVER?', 700, 250 + b, 96, '#fff', '#000');
      this.outlined(ui.sub || '', 700, 316, 34, '#ffd23f', '#000');
      return;
    }
    // contagem
    if (S.T < 3.6) {
      const n = Math.ceil(3 - S.T); const txt = n > 0 ? String(n) : 'VAI!';
      const f = S.T % 1; const sc = 1 + (1 - f) * 0.5;
      c.save(); c.translate(760, 360); c.scale(sc, sc); this.outlined(txt, 0, 0, 190, n > 0 ? '#fff' : '#7dff6a'); c.restore();
      if (this._lastCount !== n) { this._lastCount = n; this.sfx(n > 0 ? 'count' : 'go'); }
    }
    // título de zona
    if (this.pendingZone != null) { this.caps.push({ type: 'zona', z: this.pendingZone, t: 0, dur: 3.2 }); this.pendingZone = null; this.sfx('zona'); }
    let ky = 0;
    for (const cp of this.caps) {
      cp.t += dt;
      const a = clamp(Math.min(cp.t / 0.25, (cp.dur - cp.t) / 0.4), 0, 1);
      c.globalAlpha = a;
      if (cp.type === 'zona') {
        const z = ZONAS[cp.z]; const sl = (1 - clamp(cp.t / 0.35, 0, 1)) * -300;
        c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(0 + sl, 340, 1300, 150);
        c.font = '30px "Press Start 2P", monospace'; c.textAlign = 'center'; c.fillStyle = '#ffd23f'; c.fillText(`ZONA ${cp.z + 1}`, 650 + sl, 392);
        this.outlined(z.nome, 650 + sl, 466, 74, '#fff');
      } else if (cp.type === 'kill') {
        const y = 150 + ky * 120; ky++;
        const sl = (1 - clamp(cp.t / 0.3, 0, 1)) * -700;
        const w = cp.final ? 1260 : 1080, x = 70 + sl;
        c.fillStyle = cp.final ? 'rgba(120,0,0,.88)' : 'rgba(0,0,0,.78)'; c.strokeStyle = '#ff3b3b'; c.lineWidth = 6;
        c.beginPath(); c.roundRect(x, y, w, 104, 52); c.fill(); c.stroke();
        c.save(); c.beginPath(); c.arc(x + 52, y + 52, 44, 0, 7); c.clip(); c.filter = 'grayscale(1)'; c.fillStyle = '#333'; c.fillRect(x, y, 104, 104); c.drawImage(this.minis[cp.i], x + 6, y + 6, 92, 92); c.restore();
        c.strokeStyle = '#ff3b3b'; c.lineWidth = 8; c.beginPath(); c.moveTo(x + 22, y + 22); c.lineTo(x + 82, y + 82); c.moveTo(x + 82, y + 22); c.lineTo(x + 22, y + 82); c.stroke();
        c.textAlign = 'left'; c.font = '22px "Press Start 2P", monospace'; c.fillStyle = '#ff5a5a'; c.fillText('ELIMINADO', x + 120, y + 40);
        c.font = (cp.txt.length > 40 ? '34px' : '40px') + ' "Lilita One", sans-serif'; c.fillStyle = '#fff'; c.fillText(cp.txt, x + 120, y + 86);
      } else if (cp.type === 'cap') {
        const sc = 1 + Math.sin(cp.t * 20) * 0.04 * (cp.t < 0.4 ? 1 : 0);
        c.save(); c.translate(760, 420); c.scale(sc, sc); c.rotate(-0.05); this.outlined(cp.txt, 0, 0, 90, cp.txt === 'QUASE!' ? '#ffd23f' : '#7dff6a'); c.restore();
      } else if (cp.type === 'win') {
        const sc = Math.min(1, cp.t * 3);
        c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(0, 150, 1360 * sc, 140);
        c.save(); c.translate(680, 255); c.scale(sc, sc);
        const nm = `${this.cor[cp.i].nome.toUpperCase()} VENCEU!`;
        this.outlined(nm, 0, 0, nm.length > 18 ? 84 : 104, '#ffd23f');
        c.restore();
      }
      c.globalAlpha = 1;
    }
    this.caps = this.caps.filter(cp => cp.t < cp.dur);
  }
}
