import { describe, expect, it } from 'vitest'
import { bindingModelId, crewProvider, withAnthropicCompat } from './models'

describe('bindingModelId', () => {
	it("writes a Claude version the way Cloudflare's binding names it", () => {
		expect(bindingModelId('anthropic/claude-opus-5-5')).toBe(
			'anthropic/claude-opus-5.5'
		)
		expect(bindingModelId('anthropic/claude-haiku-4-5')).toBe(
			'anthropic/claude-haiku-4.5'
		)
		expect(bindingModelId('anthropic/claude-fable-5-1')).toBe(
			'anthropic/claude-fable-5.1'
		)
	})

	it('leaves every other id as it is', () => {
		for (const id of [
			'anthropic/claude-opus-5',
			'anthropic/claude-opus-5.5',
			'@cf/moonshotai/kimi-k2.7-code',
			'@cf/deepseek-ai/deepseek-v4-pro-0813',
			'black-forest-labs/flux-3-image-klein',
			'openai/gpt-5-5',
		]) {
			expect(bindingModelId(id)).toBe(id)
		}
	})
})

describe('withAnthropicCompat', () => {
	it("adds the Anthropic catalog's flags to claude-opus-5-5", () => {
		const model = withAnthropicCompat({
			id: 'anthropic/claude-opus-5-5',
			compat: { sendSessionAffinityHeaders: true },
		})
		expect(model.compat).toEqual({
			sendSessionAffinityHeaders: true,
			supportsMidConvoEffort: true,
			supportsMidConvoSystemMessages: true,
			supportsMidConvoToolChanges: true,
			forceAdaptiveThinking: true,
			supportsTemperature: false,
		})
	})

	it('leaves every other model as it is', () => {
		const model = { id: 'anthropic/claude-haiku-4-5', compat: {} }
		expect(withAnthropicCompat(model)).toBe(model)
	})
})

type Run = {
	id: string
	inputs: Record<string, unknown>
	options?: Record<string, unknown>
}

// A binding that records each call and answers with a one-word stream.
function fakeBinding(runs: Array<Run>) {
	const events = [
		{
			type: 'message_start',
			message: {
				id: 'msg_1',
				type: 'message',
				role: 'assistant',
				model: 'claude-opus-5-5',
				content: [],
				stop_reason: null,
				usage: { input_tokens: 1, output_tokens: 0 },
			},
		},
		{
			type: 'content_block_start',
			index: 0,
			content_block: { type: 'text', text: '' },
		},
		{
			type: 'content_block_delta',
			index: 0,
			delta: { type: 'text_delta', text: 'Hi' },
		},
		{ type: 'content_block_stop', index: 0 },
		{
			type: 'message_delta',
			delta: { stop_reason: 'end_turn' },
			usage: { output_tokens: 1 },
		},
		{ type: 'message_stop' },
	]
	const sse = events
		.map((event) => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`)
		.join('')
	return {
		run: (
			id: string,
			inputs: Record<string, unknown>,
			options?: Record<string, unknown>
		) => {
			runs.push({ id, inputs, options })
			return Promise.resolve(
				new Response(sse, { headers: { 'content-type': 'text/event-stream' } })
			)
		},
	}
}

describe('crewProvider', () => {
	it('asks Anthropic to drop thinking blocks bound to another prefix', async () => {
		const runs: Array<Run> = []
		const provider = crewProvider(fakeBinding(runs), 'sunlo-admin')
		const model = provider
			.getModels()
			.find((entry) => entry.id === 'anthropic/claude-opus-5-5')
		expect(model).toBeDefined()
		const context = {
			messages: [
				{ role: 'system', content: 'You are Keiko.' },
				{ role: 'user', content: 'Hello', timestamp: 1 },
				{
					role: 'assistant',
					content: [
						{
							type: 'thinking',
							thinking: 'A greeting.',
							thinkingSignature: 'sig-from-an-older-prefix',
						},
						{ type: 'text', text: 'Hello.' },
					],
					api: 'anthropic-messages',
					provider: 'cloudflare',
					model: 'anthropic/claude-opus-5-5',
					usage: {
						input: 0,
						output: 0,
						cacheRead: 0,
						cacheWrite: 0,
						totalTokens: 0,
						cost: {
							input: 0,
							output: 0,
							cacheRead: 0,
							cacheWrite: 0,
							total: 0,
						},
					},
					stopReason: 'stop',
					timestamp: 2,
				},
				{ role: 'user', content: 'Again', timestamp: 3 },
			],
		}
		const stream = provider.stream(
			model!,
			context as unknown as Parameters<typeof provider.stream>[1],
			{ reasoning: 'medium' }
		)
		const result = await stream.result()
		expect(result.errorMessage).toBeUndefined()

		expect(runs).toHaveLength(1)
		const [run] = runs
		expect(run.id).toBe('anthropic/claude-opus-5.5')
		expect(run.inputs.thinking).toMatchObject({
			type: 'adaptive',
			block_binding: { prefix_mismatch_behavior: 'drop_block' },
		})
		expect(run.inputs).not.toHaveProperty('betas')
		const headers = run.options?.extraHeaders as Record<string, string>
		expect(headers['anthropic-beta'].split(',')).toContain(
			'thinking-binding-controls-2026-08-01'
		)
		expect(run.options?.gateway).toEqual({ id: 'sunlo-admin' })
	})

	it("keeps Flue's fallback for model ids outside the catalogs", () => {
		const provider = crewProvider(fakeBinding([]), 'sunlo-admin')
		expect(
			Object.getOwnPropertySymbols(provider).map((key) => key.description)
		).toContain('flue.dynamicModelTemplate')
	})
})
