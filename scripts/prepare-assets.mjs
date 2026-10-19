import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

// Reference filenames contain accents stored as NFD on some file systems, so
// every lookup compares normalized names instead of literal paths.
const reference = path.resolve('Referências');
const publicPath = path.resolve('public');
const find = async (dir, predicate) => {
  const file = (await fs.readdir(dir)).find(name => predicate(name.normalize('NFC')));
  if (!file) throw new Error(`Official asset missing in ${dir}`);
  return path.join(dir, file);
};
await fs.mkdir(path.join(publicPath, 'brand'), { recursive: true });
await fs.mkdir(path.join(publicPath, 'fonts'), { recursive: true });

const svgDir = path.join(reference, 'CONNECTIONS HUB ID VISUAL', 'SVG');
const copies = [
  [name => name.includes('Logo com Ícone Principal'), 'logo.svg'],
  [name => name.includes('Logo com Ícone _2'), 'logo-light.svg'],
  [name => name === 'Connections Hub Logo Horizontal .svg', 'signature-sand.svg'],
  [name => name === 'Connections Hub Ícone _1.svg', 'symbol-navy.svg'],
  [name => name === 'Connections Hub Bolinha _2.svg', 'ring-orange.svg'],
];
for (const [match, target] of copies) await fs.copyFile(await find(svgDir, match), path.join(publicPath, 'brand', target));

const fonts = path.join(reference, 'FONTE_ Satoshi_Complete');
await fs.copyFile(path.join(fonts, 'Fonts/WEB/fonts/Satoshi-Variable.woff2'), path.join(publicPath, 'fonts/Satoshi-Variable.woff2'));
await fs.copyFile(path.join(fonts, 'License/FFL.txt'), path.join(publicPath, 'fonts/LICENSE.txt'));

// No mockup photographs are published: they showed an office and a team the company does
// not have. The social card is drawn from the official vectors by scripts/social-card.mjs.
// The favicon is the intact official symbol, converted to a standard raster size.
await sharp(path.join(publicPath, 'brand/symbol-navy.svg')).resize(64, 64).png().toFile(path.join(publicPath, 'favicon.png'));
console.log('Official SVGs and font copied unchanged; favicon prepared.');
