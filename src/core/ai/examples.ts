import { PACK_KIND, PACK_VERSION, type AiPack } from './pack'

/** Example packs shown to AI assistants (prompt pack and docs/ai/examples). Both must analyze with no problems or warnings. */
export const EXAMPLES: { id: string; pack: AiPack }[] = [
  {
    id: 'paper-colors-only',
    pack: {
      kind: PACK_KIND,
      packVersion: PACK_VERSION,
      meta: { name: 'Paper', description: 'Warm paper tones with a serif clock. Colours and shape only, no CSS.' },
      theme: {
        mode: 'light',
        colorLight: { bg: '#f3ecdf', surface: '#faf5ea', text: '#2f2a24', accent: '#9a4a28' },
        font: { display: 'cormorant', ui: 'system' },
        radius: 6,
        shadow: 12,
      },
      background: { type: 'theme', dim: 0 },
    },
  },
  {
    id: 'midnight-terminal-with-css',
    pack: {
      kind: PACK_KIND,
      packVersion: PACK_VERSION,
      cssApiVersion: 1,
      meta: { name: 'Midnight terminal', description: 'Cool dark gradient, condensed tech type, a quiet accent glow on hover.', notes: 'No image needed.' },
      theme: {
        mode: 'dark',
        color: { bg: '#0e1116', surface: '#161b22', text: '#e6edf3', accent: '#7ee0c3' },
        font: { display: 'barlow-condensed', ui: 'system' },
        radius: 4,
        shadow: 30,
        glass: 0,
        density: 'comfortable',
        iconShape: 'rounded',
      },
      background: { type: 'gradient', gradient: { angle: 160, stops: ['#10141b', '#0a0d12'] }, dim: 0 },
      css: [
        '.mnt-clock {',
        '  letter-spacing: -0.02em;',
        '  text-transform: uppercase;',
        '}',
        '.mnt-date {',
        '  letter-spacing: 0.18em;',
        '  text-transform: uppercase;',
        '  color: var(--mnt-text-muted);',
        '}',
        '.mnt-link-name {',
        '  font-size: var(--mnt-text-sm);',
        '  letter-spacing: 0.04em;',
        '}',
        '.mnt-link:hover .mnt-link-icon {',
        '  box-shadow: 0 0 0 2px var(--mnt-accent);',
        '}',
        '@media (prefers-reduced-motion: no-preference) {',
        '  .mnt-link-icon {',
        '    transition: box-shadow var(--mnt-dur-base) var(--mnt-ease);',
        '  }',
        '}',
      ].join('\n'),
    },
  },
]
