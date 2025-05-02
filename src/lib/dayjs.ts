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
		m: '1 minute',
		mm: '%d minutes',
		h: '1 hour',
		hh: '%d hours',
		d: '1 day',
		dd: '%d days',
		M: '1 month',
		MM: '%d months',
		y: '1 year',
		yy: '%d years',
	},
})

const ago = (dbstring: string | null) => dayjs(dbstring).fromNow()

const inLastWeek = (dbstring: string) =>
	dayjs(dbstring).isAfter(dayjs().subtract(7, 'days'))

export { ago, inLastWeek }
