/** Hosts that mean the local Supabase stack, which speaks plain TCP. */
export const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]']

/**
 * True only for a URL that clearly names a local host. Anything else, including a missing or unparseable URL
 * (a multi-host string, say), counts as remote and gets verified TLS: the safe side to fail on.
 */
export function isLocalDatabase(connectionString?: string) {
  try {
    return LOCAL_HOSTS.includes(new URL(connectionString ?? '').hostname)
  }
  catch {
    return false
  }
}

/** Remote database connections always verify TLS; the local Supabase stack is plain TCP. */
export function databaseOptions(connectionString: string | undefined, caCertificate?: string) {
  return {
    prepare: false,
    ssl: isLocalDatabase(connectionString)
      ? false as const
      : {
          rejectUnauthorized: true,
          ...(caCertificate?.trim() ? { ca: caCertificate.replaceAll('\\n', '\n') } : {}),
        },
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
  }
}
