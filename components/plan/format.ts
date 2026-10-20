export const UNTITLED_PLAN = 'Untitled plan'

/** Short date for list rows: "Oct 12", with the year only when it isn't this year. */
export function shortDate(date: Date) {
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: sameYear ? undefined : 'numeric' })
}
