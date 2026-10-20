// What the new-plan form asks. Client-safe: the form and the draft action share it.

export const LEVELS = ['new', 'some', 'comfortable'] as const
export const SERIOUSNESS = ['casual', 'steady', 'serious'] as const

export interface WizardInput {
  what: string
  why: string
  level: (typeof LEVELS)[number]
  seriousness: (typeof SERIOUSNESS)[number]
  /** YYYY-MM-DD; only asked when serious. */
  deadline?: string
}
