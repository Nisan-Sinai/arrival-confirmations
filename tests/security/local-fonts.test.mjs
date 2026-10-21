import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('../../', import.meta.url);

test('document uses self-hosted fonts without build-time Google requests', () => {
  const document = readFileSync(new URL('features/layout/RootDocument.tsx', root), 'utf8');
  assert.ok(document.includes("from 'next/font/local'"));
  assert.ok(!document.includes('next/font/google'));
  for (const variable of ['--font-assistant', '--font-frank-ruhl']) {
    assert.ok(document.includes(variable));
  }
  for (const path of ['assistant-variable.woff2', 'frank-ruhl-libre-variable.woff2']) {
    assert.ok(document.includes(`../../public/fonts/${path}`));
  }
});

test('bundled fonts retain the reviewed binary hashes and OFL copyright notices', () => {
  const provenance = JSON.parse(
    readFileSync(new URL('public/fonts/provenance.json', root), 'utf8'),
  );
  assert.equal(provenance.upstreamCommit, '45e3d5269e4a17d823f6d84470bc084dc5ae46f6');
  assert.equal(provenance.fonts.length, 2);
  for (const font of provenance.fonts) {
    assert.match(font.file, /^(assistant|frank-ruhl-libre)-variable\.woff2$/);
    const data = readFileSync(new URL(`public/fonts/${font.file}`, root));
    assert.equal(data.subarray(0, 4).toString(), 'wOF2');
    assert.equal(createHash('sha256').update(data).digest('hex'), font.sha256);
    assert.ok(data.length > 10_000 && data.length < 200_000);
  }
  const license = readFileSync(new URL('public/fonts/OFL.txt', root), 'utf8');
  for (const text of [
    'SIL OPEN FONT LICENSE Version 1.1',
    'Assistant Project Authors',
    'Frank Ruhl Libre Project Authors',
  ]) {
    assert.ok(license.includes(text));
  }
});
