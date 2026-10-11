import antfu from '@antfu/eslint-config'

export default antfu({
  react: true,
  nextjs: true,
  ignores: ['lib/db/migrations/**', 'supabase/**', 'AGENTS.md', 'CLAUDE.md'],
}, {
  rules: {
    // Next.js inlines NEXT_PUBLIC_* only via the global `process.env`.
    'node/prefer-global/process': ['error', 'always'],
  },
})
