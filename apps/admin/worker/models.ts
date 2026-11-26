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

// What pi-ai's Anthropic catalog sets for the model and its AI Gateway
// catalog leaves out. Without `supportsMidConvoEffort`, pi-ai sends no
// `block_binding`, and every run after a change to the agent's instructions
// or tools fails on the thinking blocks already in its conversation. Without
// `off: null`, a call with no reasoning level turns thinking off, which
// sends no `block_binding` either.
const ANTHROPIC_CATALOG: Partial<
	Record<
		string,
		{
			compat: Record<string, unknown>
			thinkingLevelMap: Record<string, string | null>
		}
	>
> = {
	'anthropic/claude-opus-5-5': {
		compat: {
			supportsMidConvoEffort: true,
			supportsMidConvoSystemMessages: true,
			supportsMidConvoToolChanges: true,
			forceAdaptiveThinking: true,
			supportsTemperature: false,
		},
		thinkingLevelMap: { off: null, minimal: null },
	},
}

export function withAnthropicCatalog<
	M extends { id: string; compat?: object; thinkingLevelMap?: object },
>(model: M): M {
	const entry = ANTHROPIC_CATALOG[model.id]
	return entry
		? Object.assign({}, model, {
				compat: { ...model.compat, ...entry.compat },
				thinkingLevelMap: {
					...model.thinkingLevelMap,
					...entry.thinkingLevelMap,
				},
			})
		: model
}

type BindingMessage = {
	role?: unknown
	content?: unknown
	output_config?: { effort?: unknown }
}

// pi-ai marks each turn's effort with a system message that has no content.
// The binding refuses one ("system content must contain at least one
// block"), so the markers go and the last one's effort becomes the
// request's own, as it was before `supportsMidConvoEffort`.
export function withoutEffortMarkers(inputs: Record<string, unknown>) {
	if (!Array.isArray(inputs.messages)) return inputs
	const messages = inputs.messages as Array<BindingMessage>
	let effort: unknown
	const kept = messages.filter((message) => {
		const marker =
			message.role === 'system' &&
			Array.isArray(message.content) &&
			message.content.length === 0
		if (marker && message.output_config?.effort !== undefined)
			effort = message.output_config.effort
		return !marker
	})
	if (kept.length === messages.length) return inputs
	return {
		...inputs,
		messages: kept,
		...(effort === undefined
			? {}
			: {
					output_config: {
						...(inputs.output_config as object | undefined),
						effort,
					},
				}),
	}
}

// The Workers AI provider every crew agent runs on, in place of the one
// @flue/vite registers. Without the id rewrite, the binding refuses every
// Claude call. Without `cacheRetention`, a Claude step pays full price for
// the whole conversation every time.
export function crewProvider(ai: CloudflareAIBinding, gatewayId: string) {
	const provider = cloudflareBindingProvider({
		binding: {
			run: (id, inputs, options) =>
				ai.run(bindingModelId(id), withoutEffortMarkers(inputs), options),
		},
		cacheRetention: 'short',
		gateway: { id: gatewayId },
	})
	// A spread, not createProvider: the spread keeps the symbol-keyed
	// template that lets Flue resolve model ids outside the catalogs.
	return {
		...provider,
		getModels: () => provider.getModels().map(withAnthropicCatalog),
		getAllModels: () =>
			(provider.getAllModels?.() ?? provider.getModels()).map(
				withAnthropicCatalog
			),
	}
}
