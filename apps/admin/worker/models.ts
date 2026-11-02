import {
	cloudflareBindingProvider,
	type CloudflareAIBinding,
} from '@flue/runtime/cloudflare/workers-ai'

// Flue reads a Claude model's metadata (images, context window, cost) from
// pi-ai's AI Gateway catalog, which names it with Anthropic's own id,
// `anthropic/claude-opus-5-5`. The Workers AI binding names the same model
// `anthropic/claude-opus-5.5`, and refuses the other spelling.
const ANTHROPIC_VERSION = /^(anthropic\/claude-[a-z]+-\d+)-(\d+)$/

export const bindingModelId = (id: string) =>
	id.replace(ANTHROPIC_VERSION, '$1.$2')

// The flags pi-ai's Anthropic catalog sets for the model and its AI Gateway
// catalog leaves out. Without `supportsMidConvoEffort`, pi-ai sends no
// `block_binding`, and every run after a change to the agent's instructions
// or tools fails on the thinking blocks already in its conversation.
const ANTHROPIC_COMPAT: Partial<Record<string, Record<string, unknown>>> = {
	'anthropic/claude-opus-5-5': {
		supportsMidConvoEffort: true,
		supportsMidConvoSystemMessages: true,
		supportsMidConvoToolChanges: true,
		forceAdaptiveThinking: true,
		supportsTemperature: false,
	},
}

export function withAnthropicCompat<M extends { id: string; compat?: object }>(
	model: M
): M {
	const compat = ANTHROPIC_COMPAT[model.id]
	return compat
		? Object.assign({}, model, { compat: { ...model.compat, ...compat } })
		: model
}

// The Workers AI provider every crew agent runs on, in place of the one
// @flue/vite registers. Without the id rewrite, the binding refuses every
// Claude call. Without `cacheRetention`, a Claude step pays full price for
// the whole conversation every time.
export function crewProvider(ai: CloudflareAIBinding, gatewayId: string) {
	const provider = cloudflareBindingProvider({
		binding: {
			run: (id, inputs, options) => ai.run(bindingModelId(id), inputs, options),
		},
		cacheRetention: 'short',
		gateway: { id: gatewayId },
	})
	// A spread, not createProvider: the spread keeps the symbol-keyed
	// template that lets Flue resolve model ids outside the catalogs.
	return {
		...provider,
		getModels: () => provider.getModels().map(withAnthropicCompat),
		getAllModels: () =>
			(provider.getAllModels?.() ?? provider.getModels()).map(
				withAnthropicCompat
			),
	}
}
