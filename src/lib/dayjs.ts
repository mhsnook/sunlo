import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import updateLocale from 'dayjs/plugin/updateLocale'

dayjs.extend(relativeTime)
dayjs.extend(updateLocale)

dayjs.updateLocale('en', {
	relativeTime: {
		future: 'in %s',
		past: '%s ago',
		s: 'a few seconds',
		m: '1 min',
		mm: '%d min',
		h: '1 hr',
		hh: '%d hr',
		d: '1 d',
		dd: '%d d',
		M: '1 mo',
		MM: '%d mo',
		y: '1 yr',
		yy: '%d yr',
	},
})

const ago = (dbstring: string | null) =>
	dbstring ? dayjs(dbstring).fromNow() : null

/**
 * Ultra-compact relative time from a timestamp, e.g. "now", "2m", "5h",
 * "3d", "2w", "4mo", "1y". For tight UI like picker rows where the full
 * "2 min ago" is too long.
 */
const agoShort = (dbstring: string | null): string | null => {
	if (!dbstring) return null
	const mins = Math.max(0, dayjs().diff(dayjs(dbstring), 'minute'))
	if (mins < 1) return 'now'
	if (mins < 60) return `${mins}m`
	const h = Math.round(mins / 60)
	if (h < 24) return `${h}h`
	const d = Math.round(h / 24)
	if (d < 14) return `${d}d`
	const w = Math.round(d / 7)
	if (w < 8) return `${w}w`
	const mo = Math.round(d / 30)
	if (mo < 12) return `${mo}mo`
	return `${Math.round(mo / 12)}y`
}

const fullTimestamp = (dbstring: string) =>
	dayjs(dbstring).format('D MMM YYYY [at] HH:mm')

const inLastWeek = (dbstring: string) =>
	dayjs(dbstring).isAfter(dayjs().subtract(7, 'days'))

/**
 * Format a number of days as a short interval string
 * e.g., 1 -> "1d", 14 -> "2w", 45 -> "1mo", 400 -> "1yr"
 */
const formatInterval = (days: number): string => {
	const rounded = Math.round(days)
	if (rounded < 14) return `${rounded}d`
	if (rounded < 60) return `${Math.round(rounded / 7)}w`
	if (rounded < 365) return `${Math.round(rounded / 30)}mo`
	return `${Math.round(rounded / 365)}yr`
}

export { ago, agoShort, fullTimestamp, inLastWeek, formatInterval }
