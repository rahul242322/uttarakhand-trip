// Downloads ~2000px versions of the chosen hero photos from Wikimedia Commons.
const fs = require('fs');
const c = JSON.parse(fs.readFileSync('data/candidates.json', 'utf8'));
const HERO = [['ranikhet', 0]];
const UA = { 'User-Agent': 'uttarakhand-trip-site/1.0 (personal project)' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const out = [];
  for (const [id, i] of HERO) {
    const title = c[id][i].title;
    const u = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|size&iiurlwidth=3200&titles=' + encodeURIComponent('File:' + title);
    let info;
    for (let t = 0; t < 5 && !info; t++) {
      const txt = await (await fetch(u, { headers: UA })).text();
      try { info = Object.values(JSON.parse(txt).query.pages)[0].imageinfo[0]; } catch (e) { await sleep(15000); }
    }
    const url = info.thumburl || info.url;
    let ok = false;
    for (let t = 0; t < 4 && !ok; t++) {
      const r = await fetch(url, { headers: UA });
      if (r.ok) { fs.writeFileSync(`images/hero-${id}.jpg`, Buffer.from(await r.arrayBuffer())); ok = true; } else await sleep(8000);
    }
    console.log(id, title.slice(0, 40), info.width + 'x' + info.height, ok ? 'saved ' + Math.round(fs.statSync(`images/hero-${id}.jpg`).size / 1024) + ' KB' : 'FAILED');
    out.push({ id, f: `images/hero-${id}.jpg` });
    await sleep(2500);
  }
})();
