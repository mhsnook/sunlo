import type { cloudflareBindingProvider } from '@flue/runtime/cloudflare/workers-ai'

// Flue reads a Claude model's metadata (images, context window, cost) from
// pi-ai's AI Gateway catalog, which names it with Anthropic's own id,
// `anthropic/claude-opus-5-5`. The Workers AI binding names the same model
// `anthropic/claude-opus-5.5`, and refuses the other spelling.
const ANTHROPIC_VERSION = /^(anthropic\/claude-[a-z]+-\d+)-(\d+)$/

export const bindingModelId = (id: string) =>
	id.replace(ANTHROPIC_VERSION, '$1.$2')

type BindingProvider = ReturnType<typeof cloudflareBindingProvider>

// pi-ai's Anthropic catalog sets these on the model, and its AI Gateway
// catalog, which Flue's binding provider reads, does not. Without
// `supportsMidConvoEffort`, pi-ai sends no `block_binding`, so after an
// instruction or tool change every run fails on the old thinking blocks.
const BINDING_COMPAT: Record<string, Record<string, unknown>> = {
	'anthropic/claude-opus-5-5': {
		supportsMidConvoEffort: true,
		supportsMidConvoSystemMessages: true,
		supportsMidConvoToolChanges: true,
		forceAdaptiveThinking: true,
		supportsTemperature: false,
	},
}

const patchCompat = <M extends { id: string; compat?: object }>(
	models: ReadonlyArray<M>
) =>
	models.map((model) => {
		const compat = BINDING_COMPAT[model.id]
		return compat ? { ...model, compat: { ...model.compat, ...compat } } : model
	})

// A spread, not createProvider: the copy keeps Flue's dynamic-model symbol,
// which lets ids outside the catalog still resolve.
export const withBindingCompat = (
	provider: BindingProvider
): BindingProvider => ({
	...provider,
	getModels: () => patchCompat(provider.getModels()),
	getAllModels: () =>
		patchCompat(provider.getAllModels?.() ?? provider.getModels()),
})
