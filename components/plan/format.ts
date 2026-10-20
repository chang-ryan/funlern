export const UNTITLED_PLAN = 'Untitled plan'

/** Short date for list rows: "Oct 12", with the year only when it isn't this year. */
export function shortDate(date: Date) {
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: sameYear ? undefined : 'numeric' })
}

/** Date and time for version history, where several saves can land on one day: "Oct 12, 3:41 PM". */
export function shortDateTime(date: Date) {
  return `${shortDate(date)}, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
}
