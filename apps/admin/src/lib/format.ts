// The stats RPCs return UTC calendar days as 'YYYY-MM-DD'. Formatting them in
// the viewer's time zone would shift every label back a day west of UTC.
const shortDay = new Intl.DateTimeFormat(undefined, {
	month: 'short',
	day: 'numeric',
	timeZone: 'UTC',
})

const longDay = new Intl.DateTimeFormat(undefined, {
	weekday: 'short',
	month: 'short',
	day: 'numeric',
	timeZone: 'UTC',
})

const utcDate = (day: string) => new Date(`${day}T00:00:00Z`)

export const formatShortDay = (day: string) => shortDay.format(utcDate(day))
export const formatLongDay = (day: string) => longDay.format(utcDate(day))

const integer = new Intl.NumberFormat()
export const formatCount = (value: number) => integer.format(value)

export function formatChange(current: number, previous: number) {
	const change = current - previous
	if (change === 0) return 'no change'
	return `${change > 0 ? '+' : '−'}${integer.format(Math.abs(change))}`
}
