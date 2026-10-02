/* =====================================================================
   ARTE — ciclista stickman + rostos placeholder
   ===================================================================== */
'use strict';
function hexRgb(hex) {
  let c = hex.replace('#', ''); if (c.length === 3) c = c.split('').map(x => x + x).join('');
  return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
}
function shade(hex, amt) {
  const [r, g, b] = hexRgb(hex);
  const f = amt < 0 ? (v => v * (1 + amt)) : (v => v + (255 - v) * amt);
  return `rgb(${Math.round(f(r))},${Math.round(f(g))},${Math.round(f(b))})`;
}
function hsh(n) { const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); }

/* ---------- rosto placeholder (128x128) ---------- */
const SKINS = ['#f2c9a0', '#e0ac7e', '#c68a5a', '#8d5a3b', '#f7d7b8', '#b47248'];
const HAIRS = ['#2b1b10', '#5a3a1e', '#d9a441', '#151515', '#9c3b1b', '#e8e8e8', '#3d6bff', '#ff4fa3'];
function makeFace(i, cor) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const h = n => hsh((i + 1) * 31 + n * 7);
  const skin = SKINS[Math.floor(h(1) * SKINS.length)], hair = HAIRS[Math.floor(h(2) * HAIRS.length)];
  const hs = Math.floor(h(3) * 5), es = Math.floor(h(4) * 4), ms = Math.floor(h(5) * 4);
  x.lineCap = 'round'; x.lineJoin = 'round';
  // cabelo atrás
  if (hs === 3) { x.fillStyle = hair; x.beginPath(); x.ellipse(64, 72, 58, 56, 0, 0, Math.PI * 2); x.fill(); }
  // cabeça
  x.fillStyle = skin; x.strokeStyle = '#111'; x.lineWidth = 6;
  x.beginPath(); x.arc(64, 68, 50, 0, Math.PI * 2); x.fill(); x.stroke();
  // cabelo / boné
  x.fillStyle = hair;
  if (hs === 0 || hs === 3) { x.beginPath(); x.arc(64, 64, 50, Math.PI * 1.02, Math.PI * 1.98); x.quadraticCurveTo(64, 40, 16, 58); x.fill(); x.stroke(); }
  else if (hs === 1) {
    x.fillStyle = cor; x.beginPath(); x.arc(64, 60, 50, Math.PI, 0); x.closePath(); x.fill(); x.stroke();
    x.beginPath(); x.ellipse(98, 58, 30, 9, 0, 0, Math.PI * 2); x.fill(); x.stroke();
  } else if (hs === 2) {
    x.beginPath(); x.moveTo(16, 60);
    for (let k = 0; k <= 6; k++) { const px = 16 + k * 16; x.lineTo(px - 8, k % 2 ? 14 : 30); x.lineTo(px, 52); }
    x.lineTo(112, 60); x.closePath(); x.fill(); x.stroke();
  } else { x.fillStyle = cor; x.fillRect(18, 38, 92, 13); x.strokeRect(18, 38, 92, 13); }
  // olhos
  x.fillStyle = '#111'; x.strokeStyle = '#111'; x.lineWidth = 5;
  if (es === 0) { x.beginPath(); x.arc(46, 70, 6, 0, 7); x.arc(82, 70, 6, 0, 7); x.fill(); }
  else if (es === 1) { x.beginPath(); x.arc(46, 74, 8, Math.PI * 1.1, Math.PI * 1.9); x.stroke(); x.beginPath(); x.arc(82, 74, 8, Math.PI * 1.1, Math.PI * 1.9); x.stroke(); }
  else if (es === 2) { x.lineWidth = 4; x.fillStyle = 'rgba(255,255,255,.6)'; for (const ex of [44, 84]) { x.beginPath(); x.arc(ex, 70, 13, 0, 7); x.fill(); x.stroke(); } x.beginPath(); x.moveTo(57, 70); x.lineTo(71, 70); x.stroke(); x.fillStyle = '#111'; x.beginPath(); x.arc(46, 71, 4, 0, 7); x.arc(82, 71, 4, 0, 7); x.fill(); }
  else { x.fillStyle = '#fff'; for (const ex of [46, 82]) { x.beginPath(); x.arc(ex, 70, 10, 0, 7); x.fill(); x.stroke(); } x.fillStyle = '#111'; x.beginPath(); x.arc(48, 72, 4.5, 0, 7); x.arc(84, 72, 4.5, 0, 7); x.fill(); }
  // boca
  x.lineWidth = 5;
  if (ms === 0) { x.beginPath(); x.arc(64, 88, 16, Math.PI * 0.15, Math.PI * 0.85); x.stroke(); }
  else if (ms === 1) { x.fillStyle = '#6b1d1d'; x.beginPath(); x.ellipse(64, 98, 12, 10, 0, 0, 7); x.fill(); x.stroke(); }
  else if (ms === 2) { x.beginPath(); x.moveTo(50, 98); x.quadraticCurveTo(70, 104, 82, 92); x.stroke(); }
  else { x.fillStyle = '#fff'; x.beginPath(); x.moveTo(44, 92); x.quadraticCurveTo(64, 116, 84, 92); x.closePath(); x.fill(); x.stroke(); }
  // bochechas
  x.fillStyle = 'rgba(255,90,90,.28)'; x.beginPath(); x.arc(34, 88, 8, 0, 7); x.arc(94, 88, 8, 0, 7); x.fill();
  return c;
}

/* ---------- ciclista (origem = meio entre os eixos das rodas, x para frente) ---------- */
function ikKnee(A, P, l1, l2) {
  const dx = P.x - A.x, dy = P.y - A.y; let d = Math.hypot(dx, dy);
  d = Math.min(d, l1 + l2 - 0.5);
  const a = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const t = Math.atan2(dy, dx) - a;
  return { x: A.x + l1 * Math.cos(t), y: A.y + l1 * Math.sin(t) };
}
function limb(ctx, A, P, l1, l2, color, w) {
  const K = ikKnee(A, P, l1, l2);
  ctx.strokeStyle = color; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(K.x, K.y); ctx.lineTo(P.x, P.y); ctx.stroke();
}
function drawWheel(ctx, x, y, rot, cor, dmg, idx, flat) {
  ctx.save(); ctx.translate(x, y);
  if (flat) { ctx.translate(0, 9); ctx.scale(1.18, 0.62); }
  ctx.rotate(rot);
  if (dmg > 0.35) { const wob = 1 - Math.min(0.22, (dmg - 0.35) * 0.4) * Math.abs(Math.sin(rot)); ctx.scale(wob, 1); }
  const n = 10, miss = Math.floor(dmg * 6);
  // aro
  ctx.strokeStyle = cor; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = cor;
  for (let k = 0; k < n; k++) {
    if ((k * 7 + idx * 3) % n < miss) continue;
    const a = k / n * Math.PI * 2; ctx.beginPath(); ctx.arc(Math.cos(a) * 27, Math.sin(a) * 27, 8.5, 0, Math.PI * 2); ctx.fill();
  }
  // raios
  ctx.strokeStyle = 'rgba(70,70,70,.85)'; ctx.lineWidth = 3;
  for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 20, Math.sin(a) * 20); ctx.stroke(); }
  ctx.fillStyle = '#2b2b2b'; ctx.beginPath(); ctx.arc(0, 0, 7.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
/* st: {pedal, wheelRot, dmg, flat, foot, face, cor, burnt} */
function drawCiclista(ctx, st) {
  const cor = st.burnt ? '#2a2a2a' : st.cor;
  const dark = st.burnt ? '#151515' : shade(st.cor, -0.45);
  const dmg = st.dmg || 0;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const C = { x: -6, y: -4 }, ph = st.pedal;
  const P1 = { x: C.x + 15 * Math.cos(ph), y: C.y + 15 * Math.sin(ph) };
  const P2 = { x: C.x - 15 * Math.cos(ph), y: C.y - 15 * Math.sin(ph) };
  const bend = dmg > 0.55 ? 7 : 0;
  const Hp = { x: -16, y: -60 }, Sh = { x: 12, y: -94 }, Hn = { x: 42, y: -62 + bend * 0.5 }, Hd = { x: 28, y: -112 };
  const S = { x: -18, y: -50 }, B = { x: 30, y: -44 + bend }, Hb = { x: 36, y: -62 + bend * 0.5 };
  // perna de trás
  if (st.foot) limb(ctx, Hp, { x: -40, y: 28 }, 34, 38, dark, 15);
  else limb(ctx, Hp, P2, 34, 36, dark, 15);
  // rodas
  drawWheel(ctx, -WB, 0, st.wheelRot, cor, dmg, 0, st.flat === 'r');
  drawWheel(ctx, WB, 0, st.wheelRot + 0.7, cor, dmg, 1, st.flat === 'f');
  // quadro
  ctx.strokeStyle = '#555'; ctx.lineWidth = 6.5;
  ctx.beginPath();
  ctx.moveTo(-WB, 0); ctx.lineTo(S.x, S.y); ctx.lineTo(C.x, C.y); ctx.lineTo(-WB, 0);
  ctx.moveTo(S.x, S.y); ctx.lineTo(B.x, B.y); ctx.lineTo(C.x, C.y);
  ctx.moveTo(B.x, B.y); ctx.lineTo(WB, 0); ctx.moveTo(B.x, B.y); ctx.lineTo(Hb.x, Hb.y); ctx.lineTo(Hb.x + 10, Hb.y + 2);
  ctx.stroke();
  ctx.strokeStyle = '#333'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(S.x - 9, S.y - 4); ctx.lineTo(S.x + 8, S.y - 4); ctx.stroke();
  // pedivela
  ctx.strokeStyle = '#333'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(P2.x, P2.y); ctx.lineTo(P1.x, P1.y); ctx.stroke();
  // perna da frente
  limb(ctx, Hp, P1, 34, 36, cor, 16);
  // tronco
  ctx.strokeStyle = cor; ctx.lineWidth = 19; ctx.beginPath(); ctx.moveTo(Hp.x, Hp.y); ctx.lineTo(Sh.x, Sh.y); ctx.stroke();
  // braço
  ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(Sh.x, Sh.y); ctx.lineTo(31, -80); ctx.lineTo(Hn.x, Hn.y); ctx.stroke();
  // pescoço + cabeça
  ctx.lineWidth = 13; ctx.beginPath(); ctx.moveTo(Sh.x, Sh.y); ctx.lineTo(Hd.x - 6, Hd.y + 12); ctx.stroke();
  const F = st.face, tipo = F ? F.tipo : 'placeholder';
  if (tipo !== 'rosto') { ctx.fillStyle = cor; ctx.beginPath(); ctx.arc(Hd.x, Hd.y, 22, 0, Math.PI * 2); ctx.fill(); }
  if (F) {
    const im = F.img, ar = im.width / im.height;
    ctx.save();
    if (st.burnt) ctx.filter = 'grayscale(1) brightness(0.35)';
    if (tipo === 'rosto') {            // só do queixo pra cima: queixo no pescoço
      const h = 90, w = h * ar;
      ctx.translate(Hd.x + 2, Hd.y + 26); ctx.rotate(0.12);
      ctx.drawImage(im, -w / 2, -h, w, h);
    } else if (tipo === 'cabelo') {    // com cabelo e pescoço: ancorado na base do pescoço
      const h = 122, w = h * ar;
      ctx.translate(Hd.x - 4, Hd.y + 40); ctx.rotate(0.12);
      ctx.drawImage(im, -w / 2, -h, w, h);
    } else { ctx.translate(Hd.x, Hd.y - 2); ctx.drawImage(im, -38, -38, 76, 76); }
    ctx.restore();
  }
  if (dmg > 0.45) { // curativo
    ctx.save(); ctx.translate(Hd.x + 22, Hd.y - (tipo === 'rosto' ? 44 : tipo === 'cabelo' ? 56 : 22)); ctx.rotate(0.6);
    ctx.fillStyle = '#f3d2a2'; ctx.strokeStyle = '#7a5a2a'; ctx.lineWidth = 2;
    ctx.fillRect(-15, -5, 30, 10); ctx.strokeRect(-15, -5, 30, 10);
    ctx.fillStyle = '#d8b37e'; ctx.fillRect(-5, -5, 10, 10);
    ctx.restore();
  }
}
