export const HOUR = 3_600_000

// What an agent can still make this hour, out of perHour. `made` counts
// what it made after `since`, an ISO time.
export function leftThisHour(
	perHour: number,
	made: (since: string) => number,
	at = Date.now()
) {
	return Math.max(0, perHour - made(new Date(at - HOUR).toISOString()))
}
