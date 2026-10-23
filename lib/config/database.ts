/** Remote database connections always verify TLS; the local Supabase stack is plain TCP. */
export function databaseOptions(connectionString: string) {
  const url = new URL(connectionString)
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  return {
    prepare: false,
    ssl: local ? false as const : 'verify-full' as const,
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
  }
}
