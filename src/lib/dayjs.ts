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

export { ago, inLastWeek, formatInterval }
