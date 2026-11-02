# Accessibility audit

The automated audit uses `@axe-core/playwright` against the production build. Run it with:

```bash
npx playwright test e2e/accessibility.spec.ts --workers=1
```

It checks a populated new tab with the Tide (dark) and Paper (light) presets, the fresh onboarding card, edit mode, and each of the ten settings tabs, including the AI workbench. The test fails on moderate, serious, or critical axe violations in these states. The November 2026 audit found no remaining violations in those impact levels after correcting preset names, heading structure, and undo-button contrast.

The automated checks do not establish that every keyboard, screen-reader, zoom, motion, language, or custom-theme combination is usable. Existing Playwright and component tests exercise settings keyboard navigation, focus handling, and editing controls. Users can set arbitrary colors, CSS, wallpapers, and content; those choices can affect contrast and readability and are outside the fixed-preset scan. The Firefox smoke test runs the application in a browser preview and does not replace assistive-technology testing of an installed extension.
