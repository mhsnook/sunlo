import { dispatch } from '@flue/runtime'
import { TEAM } from '../worker/crew/room'
import { Product } from './agents/product'
import { roomFor } from './crew'

export { CrewRoom } from '../worker/crew/room'

export default {
	// wrangler.jsonc `triggers.crons`: "0 7 * * *", Product's daily run.
	async scheduled(controller, env) {
		await (await roomFor(env)).markWorking('product')
		await dispatch(Product, {
			id: TEAM,
			message: {
				kind: 'signal',
				type: 'schedule',
				tagName: 'schedule',
				body: 'Your daily run. Check what happened since your last run, and post if something matters for the plan.',
				attributes: {
					cron: controller.cron,
					scheduledAt: new Date(controller.scheduledTime).toISOString(),
				},
			},
		})
	},
} satisfies ExportedHandler<Env>
