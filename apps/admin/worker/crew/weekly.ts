import type { WeeklyType } from '../../shared/crew'

// The brief is due in the hour that is Sunday 04:00 in the admin's time
// zone, once a week. Cloudflare crons run in UTC, so an hourly cron asks this
// instead of naming the hour, and daylight saving needs no handling here.
export function briefDue(now: Date, weekly: WeeklyType) {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: weekly.timezone,
		weekday: 'short',
		hour: 'numeric',
		hourCycle: 'h23',
	}).formatToParts(now)
	const weekday = parts.find((part) => part.type === 'weekday')?.value
	const hour = Number(parts.find((part) => part.type === 'hour')?.value)
	if (weekday !== 'Sun' || hour !== 4) return false
	return (
		!weekly.briefAt ||
		now.getTime() - Date.parse(weekly.briefAt) > 24 * 3_600_000
	)
}
