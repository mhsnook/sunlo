import { describe, expect, it } from 'vitest'
import { bindingModelId } from './models'

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
