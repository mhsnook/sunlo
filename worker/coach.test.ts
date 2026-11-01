import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanModelOutput, toChatMessages } from './coach'

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

type RunFn = (
	model: string,
	input: Record<string, unknown>,
	options?: { gateway?: { id: string } }
) => Promise<unknown>

function makeEnv(overrides: { limitOk?: boolean; output?: unknown } = {}) {
	const run = vi.fn<RunFn>().mockResolvedValue(
		overrides.output ?? {
			choices: [
				{
					message: {
						content: 'Let me look.',
						tool_calls: [
							{
								id: 'call_1',
								type: 'function',
								function: {
									name: 'search_library',
									arguments: '{"query":"tea"}',
								},
							},
						],
					},
					finish_reason: 'tool_calls',
				},
			],
		}
	)
	const env = {
		COACH_MODEL: '@cf/google/gemma-4-26b-a4b-it',
		AI_GATEWAY_ID: 'sunlo-app',
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
					id: 'call_1',
					name: 'search_library',
					input: { query: 'tea' },
				},
			],
			stop_reason: 'tool_calls',
		})

		const [model, input, options] = run.mock.calls[0]
		expect(model).toBe('@cf/google/gemma-4-26b-a4b-it')
		expect(options).toEqual({ gateway: { id: 'sunlo-app' } })
		const messages = input.messages as Array<{ role: string; content: string }>
		expect(messages[0].role).toBe('system')
		expect(messages[0].content).toContain('Priya')
		expect(messages[0].content).toContain('Kannada')
		expect(messages.at(-1)).toEqual({ role: 'user', content: 'tea please' })
		const tools = input.tools as Array<{
			type: string
			function: { name: string; parameters: object }
		}>
		expect(tools.every((t) => t.type === 'function')).toBe(true)
		expect(tools.map((t) => t.function.name)).toContain('add_to_deck')
		expect(tools.every((t) => !('$schema' in t.function.parameters))).toBe(true)
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

describe('toChatMessages', () => {
	it('splits tool results into tool messages after the call', () => {
		expect(
			toChatMessages('sys', [
				{ role: 'user', content: [{ type: 'text', text: 'tea' }] },
				{
					role: 'assistant',
					content: [
						{ type: 'text', text: 'Looking.' },
						{
							type: 'tool_use',
							id: 'c1',
							name: 'search_library',
							input: { query: 'tea' },
						},
					],
				},
				{
					role: 'user',
					content: [
						{ type: 'tool_result', tool_use_id: 'c1', content: '{"n":1}' },
						{ type: 'text', text: 'add them' },
					],
				},
			])
		).toEqual([
			{ role: 'system', content: 'sys' },
			{ role: 'user', content: 'tea' },
			{
				role: 'assistant',
				content: 'Looking.',
				tool_calls: [
					{
						id: 'c1',
						type: 'function',
						function: { name: 'search_library', arguments: '{"query":"tea"}' },
					},
				],
			},
			{ role: 'tool', tool_call_id: 'c1', content: '{"n":1}' },
			{ role: 'user', content: 'add them' },
		])
	})

	it('marks a failed tool result as an error', () => {
		const [, message] = toChatMessages('sys', [
			{
				role: 'user',
				content: [
					{
						type: 'tool_result',
						tool_use_id: 'c1',
						content: 'Bad input',
						is_error: true,
					},
				],
			},
		])
		expect(message).toEqual({
			role: 'tool',
			tool_call_id: 'c1',
			content: 'Error: Bad input',
		})
	})
})

const reply = (message: Record<string, unknown>) => ({
	choices: [{ message, finish_reason: 'stop' }],
})

describe('cleanModelOutput', () => {
	it('keeps the text and drops an empty reply', () => {
		expect(cleanModelOutput(reply({ content: '  Hello ' }))).toEqual({
			content: [{ type: 'text', text: 'Hello' }],
			stop_reason: 'stop',
		})
		expect(cleanModelOutput(reply({ content: null }))).toEqual({
			content: [],
			stop_reason: 'stop',
		})
	})

	it('reads arguments sent as an object, and fills in a missing id', () => {
		const out = cleanModelOutput(
			reply({
				content: null,
				tool_calls: [
					{ function: { name: 'get_deck', arguments: { lang: 'kan' } } },
				],
			})
		)
		const [call] = out.content
		expect(call).toMatchObject({
			type: 'tool_use',
			name: 'get_deck',
			input: { lang: 'kan' },
		})
		expect(call.type === 'tool_use' && call.id).toMatch(/^call_/)
	})

	it('passes broken JSON arguments on as empty input', () => {
		const out = cleanModelOutput(
			reply({
				content: null,
				tool_calls: [
					{ id: 'c1', function: { name: 'get_deck', arguments: '{oops' } },
				],
			})
		)
		expect(out.content).toEqual([
			{ type: 'tool_use', id: 'c1', name: 'get_deck', input: {} },
		])
	})
})
