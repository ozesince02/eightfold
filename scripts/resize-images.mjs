// Shrinks the downloaded originals in public/img into web-sized JPEGs.
import sharp from 'sharp';
import { readdir, rename, stat } from 'node:fs/promises';
import path from 'node:path';

const dir = 'public/img';
for (const f of await readdir(dir)) {
  if (!f.endsWith('.jpg') || f.endsWith('.web.jpg')) continue;
  const src = path.join(dir, f);
  const out = path.join(dir, f.replace(/\.jpg$/, '.web.jpg'));
  await sharp(src).resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 78, mozjpeg: true }).toFile(out);
  await rename(out, src);
  console.log(f, Math.round((await stat(src)).size / 1024) + ' KB');
}
