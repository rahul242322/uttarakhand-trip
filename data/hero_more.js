const fs = require('fs');
const c = JSON.parse(fs.readFileSync('data/candidates.json', 'utf8'));
const MORE = [['nainital', 7, 'nainital-night'], ['kainchi', 0, 'kainchi'], ['almora', 4, 'almora'], ['mussoorie', 1, 'mussoorie'], ['rishikesh', 1, 'rishikesh']];
const UA = { 'User-Agent': 'uttarakhand-trip-site/1.0 (personal project)' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  for (const [id, i, name] of MORE) {
    const title = c[id][i].title;
    const u = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|size&iiurlwidth=1920&titles=' + encodeURIComponent('File:' + title);
    let info;
    for (let t = 0; t < 5 && !info; t++) { try { info = Object.values(JSON.parse(await (await fetch(u, { headers: UA })).text()).query.pages)[0].imageinfo[0]; } catch (e) { await sleep(15000); } }
    let ok = false;
    for (let t = 0; t < 4 && !ok; t++) {
      const r = await fetch(info.thumburl || info.url, { headers: UA });
      if (r.ok) { fs.writeFileSync(`images/hero-${name}.jpg`, Buffer.from(await r.arrayBuffer())); ok = true; } else await sleep(8000);
    }
    console.log(name, info.width + 'x' + info.height, ok ? Math.round(fs.statSync(`images/hero-${name}.jpg`).size / 1024) + ' KB' : 'FAILED');
    await sleep(2500);
  }
})();
