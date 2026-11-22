import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const FETCH_ALLOWLIST = [
  'src/core/ai/byok.ts',
  'src/core/weather.ts',
  'src/core/brandShards.ts',
  'src/core/brandIndex.ts',
  'src/features/settings/Gallery.tsx',
  'src/app/useSettings.ts',
]

// Existing src/core/ files that still touch platform/ or storage/.
// New files under src/core/ must stay pure; shrink this list over time and never grow it.
const CORE_IO_RATCHET_ALLOWLIST = [
  'src/core/ai/byok.ts',
  'src/core/backup-v2.ts',
  'src/core/brandShards.ts',
  'src/core/favicon.ts',
  'src/core/faviconExtras.ts',
  'src/core/faviconMigrate.ts',
  'src/core/faviconQuality.ts',
  'src/core/themes/library.ts',
  'src/core/weather.ts',
]

// Existing settings modules that still import helpers from src/app/.
// New modules in lower layers must not import from src/app/; shrink this list over time.
const APP_IMPORT_RATCHET_ALLOWLIST = [
  'src/features/settings/BackupSection.tsx',
  'src/features/settings/FontUpload.tsx',
  'src/features/settings/MyThemes.tsx',
  'src/features/settings/SyncSection.tsx',
  'src/features/settings/WallpaperContrast.tsx',
  'src/features/settings/themeApi.ts',
]

// Reviewed contract/guard tests that legitimately inspect files on disk (CSS layers, manifest
// disclosures, generated AI docs, bundle import graphs, design token discipline).
// New unit tests under src/ should test runtime behavior instead of reading source files.
const TEST_FS_ALLOWLIST = [
  'src/core/ai/docs.test.ts',
  'src/core/ai/public-docs.test.ts',
  'src/core/css/api.test.ts',
  'src/core/schema/defaults.test.ts',
  'src/core/themes/staticImports.test.ts',
  'src/i18n/index.test.ts',
  'src/i18n/localized-copy.test.ts',
  'src/platform/manifestPermissions.test.ts',
  'src/styles/colors.test.js',
  'src/styles/guard.test.ts',
]

const CORE_FORBIDDEN_LAYERS = [
  {
    group: [
      '**/app',
      '**/app/**',
      '**/features',
      '**/features/**',
      '**/widgets',
      '**/widgets/**',
      '**/store',
      '**/store/**',
      '**/ui',
      '**/ui/**',
      '**/presets',
      '**/presets/**',
    ],
    message: 'src/core/ must not depend on UI, store, or app layers. Move orchestration to src/app/ or src/features/.',
  },
]

const CORE_FORBIDDEN_IO = [
  {
    group: ['**/platform', '**/platform/**', '**/storage', '**/storage/**'],
    message:
      'New src/core/ modules must stay pure (no platform/ or storage/ imports). Pass adapters in as parameters or place IO in src/storage/ or src/platform/.',
  },
]

export default tseslint.config(
  {
    ignores: [
      '.artifacts/**',
      'dist/**',
      'dist-firefox/**',
      'dist-web/**',
      'docs/**',
      'evals/**',
      'licenses/**',
      'node_modules/**',
      'playwright-report/**',
      'public/**',
      'store/**',
      'test-results/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,mjs,mts}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      'preserve-caught-error': 'off',
      '@typescript-eslint/no-unused-expressions': ['error', { allowShortCircuit: true, allowTernary: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-expect-error': 'allow-with-description',
          minimumDescriptionLength: 8,
        },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  // Product code guardrails (non-test src/**)
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/**/*.test.{ts,tsx}', 'src/**/*.check.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'MemberExpression[object.type="CallExpression"][object.callee.name="extensionApi"][property.name=/^(storage|bookmarks)$/]',
          message:
            'Use extensionStorage() or extensionBookmarks() from src/platform/extension.ts instead of extensionApi().storage/.bookmarks so store static scans see literal chrome.storage / chrome.bookmarks.',
        },
      ],
    },
  },
  // Zero-telemetry / explicit-network boundary: forbid direct fetch() outside reviewed modules
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/**/*.test.{ts,tsx}', ...FETCH_ALLOWLIST],
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'fetch',
          message:
            'Direct fetch() is restricted to reviewed network/asset modules to uphold zero-telemetry privacy. Route through an existing client or document the host in privacy disclosures and eslint.config.mjs.',
        },
      ],
    },
  },
  // src/core/ layer boundaries: never import UI/store/app
  {
    files: ['src/core/**/*.{ts,tsx}'],
    ignores: ['src/core/**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: CORE_FORBIDDEN_LAYERS }],
    },
  },
  // src/core/ purity ratchet: forbid new platform/ or storage/ imports outside the shrinking legacy list
  {
    files: ['src/core/**/*.{ts,tsx}'],
    ignores: ['src/core/**/*.test.{ts,tsx}', ...CORE_IO_RATCHET_ALLOWLIST],
    rules: {
      'no-restricted-imports': ['error', { patterns: [...CORE_FORBIDDEN_LAYERS, ...CORE_FORBIDDEN_IO] }],
    },
  },
  // Non-app layers must not import back into src/app/
  {
    files: ['src/{features,widgets,ui,storage,store,platform}/**/*.{ts,tsx}'],
    ignores: ['src/**/*.test.{ts,tsx}', ...APP_IMPORT_RATCHET_ALLOWLIST],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/app', '**/app/**'],
              message:
                'Lower layers must not import from src/app/. Pass callbacks or state down from src/app/ instead.',
            },
          ],
        },
      ],
    },
  },
  // Browser-injected extension globals inside Playwright probe scripts
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        chrome: 'readonly',
        browser: 'readonly',
      },
    },
  },
  // Prevent new change-detector tests from reading source files directly via fs
  {
    files: ['src/**/*.test.{ts,tsx,js}'],
    ignores: TEST_FS_ALLOWLIST,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'node:fs',
              message:
                'Avoid reading source files in unit tests (change detectors). Assert runtime behavior instead, or document a reviewed contract check in TEST_FS_ALLOWLIST in eslint.config.mjs.',
            },
            {
              name: 'fs',
              message:
                'Avoid reading source files in unit tests (change detectors). Assert runtime behavior instead, or document a reviewed contract check in TEST_FS_ALLOWLIST in eslint.config.mjs.',
            },
            {
              name: 'node:fs/promises',
              message:
                'Avoid reading source files in unit tests (change detectors). Assert runtime behavior instead, or document a reviewed contract check in TEST_FS_ALLOWLIST in eslint.config.mjs.',
            },
            {
              name: 'fs/promises',
              message:
                'Avoid reading source files in unit tests (change detectors). Assert runtime behavior instead, or document a reviewed contract check in TEST_FS_ALLOWLIST in eslint.config.mjs.',
            },
          ],
        },
      ],
    },
  },
  // Tests and scripts may use relaxed any rules where fixtures/Playwright mocks require it
  {
    files: ['**/*.test.{ts,tsx,js}', 'e2e/**/*.ts', 'scripts/**/*.{ts,mts,mjs}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
)
