import { briefDue } from '../worker/crew/weekly'
import { deliver, roomFor } from './crew'

export { CrewRoom } from '../worker/crew/room'

export default {
	// wrangler.jsonc `triggers.crons`: "0 * * * *". product-1's daily run is
	// at 07:00 UTC; command-1's brief is at Sunday 04:00 in the admin's time
	// zone. Every hour, the room prunes its GitHub list (and fills it once,
	// from the API) and prunes old paintings and SVG renderings.
	async scheduled(controller) {
		const now = new Date(controller.scheduledTime)
		const room = await roomFor()
		const attributes = { scheduledAt: now.toISOString() }
		if (now.getUTCHours() === 7) {
			await deliver(
				'product-1',
				'schedule',
				'Your daily run. Check what happened since your last run, and post if something matters for the plan.',
				attributes
			)
		}
		if (briefDue(now, await room.weekly())) {
			await deliver(
				'command-1',
				'weekly.brief',
				"Write this week's brief with write_brief. The weekly meeting with the admin is due once the brief is in the Command room.",
				attributes
			)
		}
		await room
			.tendGithubLog()
			.catch((error: unknown) =>
				console.error('Could not fill the GitHub list', error)
			)
		await room.pruneImages()
	},
} satisfies ExportedHandler<Env>
