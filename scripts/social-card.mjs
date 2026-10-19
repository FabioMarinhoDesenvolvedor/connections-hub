import path from 'node:path';
import sharp from 'sharp';

/*
  The 1200 × 630 link-preview card, drawn only from official artwork: the navy surface with
  the brand's fine grid and the official light logo (logo-light.svg) at its true proportions.
  No photographs. Run with: npm run social
*/
const W = 1200, H = 630, CELL = 60;
const publicPath = path.resolve('public');
const navy = '#183255', mist = '#CCD6DB', sand = '#E8D8C5';

const grid = [];
for (let x = CELL / 2; x < W; x += CELL) grid.push(`<line x1="${x}" y1="0" x2="${x}" y2="${H}"/>`);
for (let y = (H % CELL) / 2; y < H; y += CELL) grid.push(`<line x1="0" y1="${y}" x2="${W}" y2="${y}"/>`);
const surface = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <radialGradient id="fade" cx="50%" cy="50%" r="62%"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <mask id="m"><rect width="${W}" height="${H}" fill="url(#fade)"/></mask>
  </defs>
  <rect width="${W}" height="${H}" fill="${navy}"/>
  <g stroke="${mist}" stroke-opacity=".09" stroke-width="1" mask="url(#m)">${grid.join('')}</g>
  <circle cx="${W - 150}" cy="${H}" r="118" fill="none" stroke="${sand}" stroke-opacity=".9" stroke-width="22"/>
</svg>`);

const logoWidth = 760;
const logo = await sharp(path.join(publicPath, 'brand/logo-light.svg'), { density: 300 }).resize({ width: logoWidth }).png().toBuffer();
const { height: logoHeight } = await sharp(logo).metadata();

await sharp(surface)
  .composite([{ input: logo, left: Math.round((W - logoWidth) / 2), top: Math.round((H - logoHeight) / 2) - 10 }])
  .jpeg({ quality: 88, mozjpeg: true })
  .toFile(path.join(publicPath, 'images/social.jpg'));
console.log('public/images/social.jpg written from the official logo.');
