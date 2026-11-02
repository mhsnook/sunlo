import { cloudflareBindingProvider } from '@flue/runtime/cloudflare/workers-ai'
import { describe, expect, it } from 'vitest'
import { bindingModelId, withBindingCompat } from './models'

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

describe('withBindingCompat', () => {
	type Call = {
		id: string
		inputs: Record<string, unknown>
		options?: Record<string, unknown>
	}

	const providerWithCalls = () => {
		const calls: Array<Call> = []
		const provider = withBindingCompat(
			cloudflareBindingProvider({
				binding: {
					run: (id, inputs, options) => {
						calls.push({ id, inputs, options })
						return Promise.resolve(new Response('{}', { status: 500 }))
					},
				},
				cacheRetention: 'short',
			})
		)
		return { calls, provider }
	}

	const send = async (modelId: string) => {
		const { calls, provider } = providerWithCalls()
		const model = provider.getModels().find((entry) => entry.id === modelId)
		if (!model) throw new Error(`No ${modelId} in the catalog`)
		await provider
			.stream(
				model,
				{
					messages: [{ role: 'user', content: 'Hi', timestamp: 0 }],
				} as unknown as Parameters<typeof provider.stream>[1],
				{ reasoning: 'high' }
			)
			.result()
		expect(calls).toHaveLength(1)
		return calls[0]
	}

	it('asks Anthropic to drop thinking blocks from an older prefix', async () => {
		const call = await send('anthropic/claude-opus-5-5')
		const headers = call.options?.extraHeaders as Record<string, string>
		expect(headers['anthropic-beta'].split(',')).toContain(
			'thinking-binding-controls-2026-08-01'
		)
		expect(call.inputs.thinking).toMatchObject({
			type: 'adaptive',
			block_binding: { prefix_mismatch_behavior: 'drop_block' },
		})
		expect(call.inputs).not.toHaveProperty('temperature')
	})

	it('still resolves model ids outside the catalog', () => {
		const { provider } = providerWithCalls()
		expect(
			(provider as unknown as Record<symbol, unknown>)[
				Symbol.for('flue.dynamicModelTemplate')
			]
		).toBeDefined()
	})

	it('leaves other Claude models as the catalog has them', async () => {
		const call = await send('anthropic/claude-opus-5')
		const headers = (call.options?.extraHeaders ?? {}) as Record<string, string>
		expect(headers['anthropic-beta'] ?? '').not.toContain(
			'thinking-binding-controls'
		)
		expect(call.inputs.thinking).not.toHaveProperty('block_binding')
	})
})
