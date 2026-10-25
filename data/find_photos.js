// Finds freely licensed (CC BY / CC BY-SA / CC0 / PD) landscape photos on Wikimedia Commons for each place.
const fs = require('fs');
const Q = {
  delhi: ['India Gate New Delhi', 'Red Fort Delhi'],
  nainital: ['Naini Lake Nainital', 'Nainital Uttarakhand', 'Mall Road Nainital'],
  kainchi: ['Kainchi Dham', 'Neem Karoli Baba Kainchi ashram'],
  almora: ['Almora Uttarakhand', 'Kasar Devi Almora'],
  jageshwar: ['Jageshwar temples', 'Jageshwar Dham Almora'],
  ranikhet: ['Ranikhet Uttarakhand', 'Jhula Devi Temple Ranikhet', 'Chaubatia Ranikhet'],
  haridwar: ['Har Ki Pauri Haridwar', 'Ganga Aarti Haridwar'],
  rishikesh: ['Laxman Jhula Rishikesh', 'Ram Jhula Rishikesh', 'Rishikesh Ganga'],
  mussoorie: ['Mussoorie Uttarakhand', 'Kempty Falls', 'Landour Mussoorie'],
  dhanaulti: ['Dhanaulti', 'Dhanaulti Uttarakhand eco park']
};
const KEY = { delhi: ['india gate', 'red fort', 'delhi'], nainital: ['naini', 'nainital'], kainchi: ['kainchi', 'neem karoli'], almora: ['almora', 'kasar'], jageshwar: ['jageshwar'],
  ranikhet: ['ranikhet', 'jhula', 'chaubatia'], haridwar: ['haridwar', 'har ki pauri', 'har-ki-pauri', 'ganga aarti', 'ganga arti'], rishikesh: ['rishikesh', 'jhula', 'laxman', 'ram jhula'],
  mussoorie: ['mussoorie', 'kempty', 'landour'], dhanaulti: ['dhanaulti'] };
const strip = h => (h || '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
async function search(q) {
  const u = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=20&gsrsearch=' + encodeURIComponent(q + ' filetype:bitmap') +
    '&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=1100&iiextmetadatafilter=LicenseShortName|Artist|ObjectName|ImageDescription';
  let r;
  for (let t = 0; t < 5; t++) {
    const resp = await fetch(u, { headers: { 'User-Agent': 'uttarakhand-trip-site/1.0 (personal project)' } });
    const txt = await resp.text();
    try { r = JSON.parse(txt); break; } catch (e) { console.log('  rate limited, waiting'); await new Promise(res => setTimeout(res, 20000)); }
  }
  if (!r) throw new Error('search failed: ' + q);
  return Object.values((r.query && r.query.pages) || {}).sort((a, b) => a.index - b.index);
}
(async () => {
  const out = {};
  for (const [id, qs] of Object.entries(Q)) {
    const seen = new Set(), cands = [];
    for (const q of qs) {
      for (const p of await search(q)) {
        const ii = p.imageinfo && p.imageinfo[0];
        if (!ii || seen.has(p.title) || ii.mime !== 'image/jpeg') continue;
        seen.add(p.title);
        const lic = strip(ii.extmetadata.LicenseShortName && ii.extmetadata.LicenseShortName.value);
        if (!/^(CC BY|CC0|Public domain|PD)/i.test(lic) || /NC|ND/.test(lic)) continue;
        if (ii.width < 1000 || ii.width < ii.height * 1.15) continue;
        const title = p.title.replace(/^File:/, '');
        const hit = KEY[id].some(k => title.toLowerCase().includes(k) || strip(ii.extmetadata.ImageDescription && ii.extmetadata.ImageDescription.value).toLowerCase().includes(k));
        if (!hit) continue;
        cands.push({ title, thumb: ii.thumburl, page: ii.descriptionurl, w: ii.width, h: ii.height, lic, artist: strip(ii.extmetadata.Artist && ii.extmetadata.Artist.value).slice(0, 80), q });
      }
      await new Promise(r => setTimeout(r, 3000));
    }
    out[id] = cands.slice(0, 8);
    console.log(id, cands.length, 'candidates ->', out[id].length);
  }
  fs.writeFileSync('data/candidates.json', JSON.stringify(out, null, 1));
})();
