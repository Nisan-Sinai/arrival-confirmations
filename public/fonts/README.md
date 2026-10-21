# Self-hosted site fonts

These are the site's existing Assistant and Frank Ruhl Libre families, bundled
locally to avoid build-time requests to Google Fonts. Google sometimes returns
valid extensionless font URLs which trigger [Next.js issue #99114](https://github.com/vercel/next.js/issues/99114).
An unchanged source tree can therefore pass one build and fail another.

`RootDocument.tsx` uses `next/font/local`, the same CSS variables and `swap`
display, and an explicit variable-weight range of 400–700. The complete Hebrew
alphabet and printable Latin/ASCII are present in both fonts. No glyphs were
subsetted or redesigned. `OFL.txt` retains the copyright notices and license.

The source is the official [Google Fonts repository](https://github.com/google/fonts/tree/45e3d5269e4a17d823f6d84470bc084dc5ae46f6).
`provenance.json` records the immutable upstream commit, original TTF checksums,
WOFF2 conversion tools and output checksums. Only WOFF2 outputs are shipped;
the combined font payload is 122,260 bytes. Conversion changes the container
format, not the typefaces; the obsolete Assistant DSIG signature metadata is
not retained by the standard FontTools conversion.

Reproduce the reviewed conversion from the checksum-verified upstream TTFs
with FontTools 4.55.3 and Brotli 1.2.0:

```sh
python -m fontTools.ttLib.woff2 compress --no-glyf-transform assistant-variable.ttf -o assistant-variable.woff2
python -m fontTools.ttLib.woff2 compress --no-glyf-transform frank-ruhl-libre-variable.ttf -o frank-ruhl-libre-variable.woff2
```

The explicit `--no-glyf-transform` preserves the original glyph-table bytes
instead of applying the default WOFF2 glyph preprocessing. The reviewed
decompressed layout, variation, metrics and character-map tables match upstream;
only the unused Assistant DSIG placeholder metadata is removed.

To update a font, review its source and license, reproduce the conversion,
update the provenance, and run `pnpm test:local-fonts`, production builds,
browser/accessibility tests and the existing Lighthouse budgets. Do not restore
network font fetching or disable a failing build to hide this upstream bug.
