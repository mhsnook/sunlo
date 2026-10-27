import { dispatch } from '@flue/runtime'
import { TEAM } from '../worker/crew/room'
import { briefDue } from '../worker/crew/weekly'
import { Product } from './agents/product'
import { Riker } from './agents/riker'
import { roomFor } from './crew'

export { CrewRoom } from '../worker/crew/room'

export default {
	// wrangler.jsonc `triggers.crons`: "0 * * * *". Product's daily run is at
	// 07:00 UTC; Riker's brief is at Sunday 04:00 in the admin's time zone.
	async scheduled(controller, env) {
		const now = new Date(controller.scheduledTime)
		const room = await roomFor(env)
		const attributes = { scheduledAt: now.toISOString() }
		if (now.getUTCHours() === 7) {
			await room.markWorking('product')
			await dispatch(Product, {
				id: TEAM,
				message: {
					kind: 'signal',
					type: 'schedule',
					tagName: 'schedule',
					body: 'Your daily run. Check what happened since your last run, and post if something matters for the plan.',
					attributes,
				},
			})
		}
		if (briefDue(now, await room.weekly())) {
			await room.markWorking('riker')
			await dispatch(Riker, {
				id: TEAM,
				message: {
					kind: 'signal',
					type: 'weekly.brief',
					tagName: 'weekly-brief',
					body: "Write this week's brief with write_brief. The weekly meeting with the admin is due once it is in their stack.",
					attributes,
				},
			})
		}
	},
} satisfies ExportedHandler<Env>
