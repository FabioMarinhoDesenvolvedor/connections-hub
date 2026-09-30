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
await fs.mkdir(path.join(publicPath, 'images'), { recursive: true });
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

const mockupDir = path.join(reference, 'MOCKUP');
const images = [
  ['ESCRITÓRIO CONNECTIONS 2.png', 'brand-office', 1920],
  ['TIME COM UNIFORME.png', 'brand-people', 1920],
  ['ÍCONE EM TECNOLOGIA.png', 'brand-technology', 1600],
];
const sizes = {};
for (const [file, name, width] of images) {
  const source = await find(mockupDir, n => n === file);
  const meta = await sharp(source).metadata();
  const w = Math.min(width, meta.width);
  sizes[name] = [w, Math.round(meta.height * w / meta.width)];
  await sharp(source).resize({ width: w }).webp({ quality: 84 }).toFile(path.join(publicPath, 'images', `${name}.webp`));
  await sharp(source).resize({ width: w }).avif({ quality: 58, effort: 5 }).toFile(path.join(publicPath, 'images', `${name}.avif`));
  await sharp(source).resize({ width: 760 }).webp({ quality: 80 }).toFile(path.join(publicPath, 'images', `${name}-small.webp`));
  await sharp(source).resize({ width: 760 }).avif({ quality: 56, effort: 5 }).toFile(path.join(publicPath, 'images', `${name}-small.avif`));
}
await sharp(await find(mockupDir, n => n === 'ESCRITÓRIO CONNECTIONS.png')).resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 85 }).toFile(path.join(publicPath, 'images/social.jpg'));
// The favicon is the intact official symbol, converted to a standard raster size.
await sharp(path.join(publicPath, 'brand/symbol-navy.svg')).resize(64, 64).png().toFile(path.join(publicPath, 'favicon.png'));
console.log('Official SVGs copied unchanged; responsive derivatives prepared.', JSON.stringify(sizes));
