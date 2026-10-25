// Builds routes.js: real road geometry + distance for each day, via the public OSRM demo server.
const fs = require('fs');
const C = {
  delhi: [28.667, 77.228], nainital: [29.3919, 79.4542], kainchi: [29.409, 79.516], almora: [29.5971, 79.6591],
  jageshwar: [29.6389, 79.8572], ranikhet: [29.6434, 79.4322], haridwar: [29.9457, 78.1642], rishikesh: [30.0869, 78.2676],
  mussoorie: [30.4598, 78.0644], dhanaulti: [30.4167, 78.2667]
};
const DAYS = {
  2: ['delhi', 'nainital'],
  3: ['nainital', 'kainchi', 'almora'],
  4: ['almora', 'jageshwar', 'almora'],
  5: ['almora', 'ranikhet', 'nainital'],
  6: ['nainital', 'haridwar'],
  7: ['haridwar', 'rishikesh', 'mussoorie'],
  8: ['mussoorie', 'dhanaulti', 'mussoorie'],
  9: ['mussoorie', 'rishikesh', 'haridwar']
};
function dp(pts, tol) {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  let maxD = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = dist(pts[i], a, b);
    if (d > maxD) { maxD = d; idx = i; }
  }
  if (maxD <= tol) return [a, b];
  return dp(pts.slice(0, idx + 1), tol).slice(0, -1).concat(dp(pts.slice(idx), tol));
}
function dist(p, a, b) {
  const x = p[1], y = p[0], x1 = a[1], y1 = a[0], x2 = b[1], y2 = b[0];
  const dx = x2 - x1, dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(x - x1, y - y1);
  let t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}
(async () => {
  const out = {};
  for (const [day, ids] of Object.entries(DAYS)) {
    const mirror = ids.length === 3 && ids[0] === ids[2];   // out-and-back: route one way, then mirror it
    const use = mirror ? ids.slice(0, 2) : ids;
    const coords = use.map(id => C[id][1] + ',' + C[id][0]).join(';');
    const url = 'https://router.project-osrm.org/route/v1/driving/' + coords + '?overview=full&geometries=geojson&steps=false';
    const r = await (await fetch(url)).json();
    if (r.code !== 'Ok') throw new Error(day + ': ' + r.code);
    const rt = r.routes[0];
    let pts = rt.geometry.coordinates.map(c => [c[1], c[0]]);
    if (mirror) pts = pts.concat(pts.slice().reverse().slice(1));
    const before = pts.length;
    pts = dp(pts, 0.0006).map(p => [Math.round(p[0] * 1e4) / 1e4, Math.round(p[1] * 1e4) / 1e4]);
    const k = mirror ? 2 : 1;
    out[day] = { km: Math.round(k * rt.distance / 1000), mins: Math.round(k * rt.duration / 60), pts };
    console.log('day', +day + 1, ids.join('>'), Math.round(k * rt.distance / 1000) + ' km', Math.round(k * rt.duration / 60) + ' min', before + '->' + pts.length + ' pts');
    await new Promise(res => setTimeout(res, 1200));
  }
  fs.writeFileSync('routes.js', 'var ROUTES = ' + JSON.stringify(out) + ';\nvar PLACES_LL = ' + JSON.stringify(C) + ';\n');
  console.log('wrote routes.js', fs.statSync('routes.js').size, 'bytes');
})();
