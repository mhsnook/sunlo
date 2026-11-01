import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanModelOutput } from './coach'

const getClaims = vi.fn()
vi.mock('@supabase/supabase-js', () => ({
	createClient: () => ({ auth: { getClaims } }),
}))

const { default: app } = await import('./api')

const BODY = {
	lang: 'kan',
	translationLang: 'eng',
	learnerName: 'Priya',
	messages: [{ role: 'user', content: [{ type: 'text', text: 'tea please' }] }],
}

type RunFn = (model: string, input: Record<string, unknown>) => Promise<unknown>

function makeEnv(overrides: { limitOk?: boolean; output?: unknown } = {}) {
	const run = vi.fn<RunFn>().mockResolvedValue(
		overrides.output ?? {
			content: [
				{ type: 'text', text: 'Let me look.' },
				{
					type: 'tool_use',
					id: 'toolu_1',
					name: 'search_library',
					input: { query: 'tea' },
				},
			],
			stop_reason: 'tool_use',
		}
	)
	const env = {
		COACH_MODEL: 'anthropic/claude-sonnet-5.5',
		SUPABASE_URL: 'http://supabase.test',
		SUPABASE_ANON_KEY: 'anon',
		AI: { run },
		COACH_LIMITER: {
			limit: vi.fn().mockResolvedValue({ success: overrides.limitOk ?? true }),
		},
	}
	return { env: env as unknown as Env, run }
}

function post(env: Env, body: unknown = BODY) {
	return app.request(
		'/api/coach',
		{
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: 'Bearer user-token',
			},
			body: JSON.stringify(body),
		},
		env
	)
}

beforeEach(() => {
	getClaims.mockReset()
	getClaims.mockResolvedValue({
		data: { claims: { role: 'authenticated', sub: 'user-1' } },
		error: null,
	})
})

describe('POST /api/coach', () => {
	it('sends the conversation with the system prompt and every tool', async () => {
		const { env, run } = makeEnv()
		const res = await post(env)
		expect(res.status).toBe(200)
		expect(await res.json()).toEqual({
			content: [
				{ type: 'text', text: 'Let me look.' },
				{
					type: 'tool_use',
					id: 'toolu_1',
					name: 'search_library',
					input: { query: 'tea' },
				},
			],
			stop_reason: 'tool_use',
		})

		const [model, input] = run.mock.calls[0]
		expect(model).toBe('anthropic/claude-sonnet-5.5')
		expect(input.system).toContain('Priya')
		expect(input.system).toContain('Kannada')
		const tools = input.tools as Array<{ name: string; input_schema: object }>
		expect(tools.map((t) => t.name)).toContain('add_to_deck')
		expect(tools.every((t) => !('$schema' in t.input_schema))).toBe(true)
		const messages = input.messages as Array<{
			content: Array<Record<string, unknown>>
		}>
		expect(messages.at(-1)?.content.at(-1)?.cache_control).toEqual({
			type: 'ephemeral',
		})
	})

	it('answers 429 when the learner is over the limit', async () => {
		const { env, run } = makeEnv({ limitOk: false })
		const res = await post(env)
		expect(res.status).toBe(429)
		expect(run).not.toHaveBeenCalled()
	})

	it('answers 400 for a conversation that does not match the protocol', async () => {
		const { env, run } = makeEnv()
		const res = await post(env, { ...BODY, messages: [] })
		expect(res.status).toBe(400)
		expect(run).not.toHaveBeenCalled()
	})

	it('answers 502 when the model call fails', async () => {
		const { env, run } = makeEnv()
		run.mockRejectedValueOnce(new Error('upstream'))
		const res = await post(env)
		expect(res.status).toBe(502)
	})
})

describe('cleanModelOutput', () => {
	it('keeps text and tool calls and drops other blocks', () => {
		expect(
			cleanModelOutput({
				content: [
					{ type: 'thinking', thinking: 'hmm', signature: 'x' },
					{ type: 'text', text: 'Hello' },
				],
				stop_reason: 'end_turn',
			})
		).toEqual({
			content: [{ type: 'text', text: 'Hello' }],
			stop_reason: 'end_turn',
		})
	})

	it('accepts an empty reply', () => {
		expect(cleanModelOutput({ content: [], stop_reason: 'end_turn' })).toEqual({
			content: [],
			stop_reason: 'end_turn',
		})
	})
})
