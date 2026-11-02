import { setProvider } from '@flue/runtime'
import { cloudflareBindingProvider } from '@flue/runtime/cloudflare/workers-ai'
import { createAgentRouter } from '@flue/runtime/routing'
import { env } from 'cloudflare:workers'
import { Hono } from 'hono'
import { requireUser, type AppEnv } from '../worker/auth'
import { COACH_MOUNT } from '../src/features/coach/protocol'
import { requireOwnConversation } from '../worker/coach-access'
import worker from '../worker/index'
import { Coach } from './agents/coach'
import { mockCoachProvider } from './coach/mock'

setProvider(
	cloudflareBindingProvider({
		binding: env.AI,
		gateway: { id: env.AI_GATEWAY_ID },
	})
)
if (env.COACH_MODEL.startsWith('mock/')) setProvider(mockCoachProvider())

const app = new Hono<AppEnv>()

app.use(`${COACH_MOUNT}/*`, requireUser, requireOwnConversation)
app.route(COACH_MOUNT, createAgentRouter(Coach))

app.route('/', worker)

export default app
