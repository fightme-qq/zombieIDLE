import { readFile, writeFile } from 'node:fs/promises';

const indexUrl = new URL('../dist/index.html', import.meta.url);
const noJekyllUrl = new URL('../dist/.nojekyll', import.meta.url);
const sdkTag = '<script src="/sdk.js"></script>';
const indexHtml = await readFile(indexUrl, 'utf8');

if (!indexHtml.includes(sdkTag)) {
  throw new Error('Expected Yandex SDK tag was not found in dist/index.html');
}

await writeFile(indexUrl, indexHtml.replace(sdkTag, ''), 'utf8');
await writeFile(noJekyllUrl, '', 'utf8');
