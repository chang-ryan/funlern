import antfu from '@antfu/eslint-config'
import drizzle from 'eslint-plugin-drizzle'

export default antfu({
  react: true,
  nextjs: true,
  ignores: ['supabase/**', 'AGENTS.md', 'CLAUDE.md'],
}, {
  rules: {
    // Next.js inlines NEXT_PUBLIC_* only via the global `process.env`.
    'node/prefer-global/process': ['error', 'always'],
  },
}, {
  // Drizzle's own rules: no accidental whole-table update or delete.
  plugins: { drizzle },
  rules: {
    'drizzle/enforce-delete-with-where': ['error', { drizzleObjectName: ['db', 'tx'] }],
    'drizzle/enforce-update-with-where': ['error', { drizzleObjectName: ['db', 'tx'] }],
  },
})
