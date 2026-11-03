## Summary

<!-- Describe the change and its purpose. -->

## Type of change

- [ ] Bug fix
- [ ] Feature
- [ ] Documentation
- [ ] Theme gallery contribution
- [ ] Maintenance

## Verification

- [ ] `npx vitest run`
- [ ] `npx tsc -b --pretty false`
- [ ] `npm run build`
- [ ] Relevant Playwright checks
- [ ] `npx vite-node scripts/gallery-index.ts --check` (when gallery packs or tooling change)

## Theme contribution checklist

- [ ] Pack is original and has a lowercase kebab-case ID.
- [ ] Includes a 1280×800 preview under `docs/gallery/previews/`.
- [ ] Pack and preview image are contributed under the MIT License.
- [ ] Contains no copied product themes, copyrighted images, or external assets.
- [ ] `docs/gallery/index.json` was regenerated when packs changed.
