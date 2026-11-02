// Flue reads a Claude model's metadata (images, context window, cost) from
// pi-ai's AI Gateway catalog, which names it with Anthropic's own id,
// `anthropic/claude-opus-5-5`. The Workers AI binding names the same model
// `anthropic/claude-opus-5.5`, and refuses the other spelling.
const ANTHROPIC_VERSION = /^(anthropic\/claude-[a-z]+-\d+)-(\d+)$/

export const bindingModelId = (id: string) =>
	id.replace(ANTHROPIC_VERSION, '$1.$2')
