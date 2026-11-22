## Summary

<!-- Describe the change and its purpose. -->

## Type of change

- [ ] Bug fix
- [ ] Feature
- [ ] Documentation
- [ ] Theme gallery contribution
- [ ] Maintenance

## Verification

- [ ] `npm run check` (docs, gallery, ESLint, Vitest + property invariants, `eval:replay`, app + tools typecheck, builds)
- [ ] `npm run verify:ui` (when UI or CSS changed; screenshots inspected)
- [ ] Relevant Playwright checks (`npm run test:e2e`, `npm run test:firefox`, or startup JS budget when applicable)

## Theme contribution checklist

- [ ] Pack is original and has a lowercase kebab-case ID.
- [ ] Includes a 1280×800 preview under `docs/gallery/previews/`.
- [ ] Pack and preview image are contributed under the MIT License.
- [ ] Contains no copied product themes, copyrighted images, or external assets.
- [ ] `docs/gallery/index.json` was regenerated when packs changed.
