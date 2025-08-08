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

const ago = (dbstring: string | null) => dayjs(dbstring).fromNow()

const inLastWeek = (dbstring: string) =>
	dayjs(dbstring).isAfter(dayjs().subtract(7, 'days'))

export { ago, inLastWeek }
