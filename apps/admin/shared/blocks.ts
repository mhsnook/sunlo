import { fromMarkdown } from 'mdast-util-from-markdown'
import { visit } from 'unist-util-visit'
import { z } from 'zod'

// Components an agent can put in its markdown, as a fenced block whose
// language names the component and whose body is JSON:
//
//   ```chart
//   { "type": "line", "title": "Signups", "x": "day", ... }
//   ```
//
// The app renders each block with its own components after checking it
// against these schemas. Agents never send markup or code that runs.

const Cell = z.union([z.string(), z.number(), z.null()])

const ChartBlockSchema = z.object({
	type: z.enum(['line', 'bar', 'area']),
	title: z.string().optional(),
	// The key in each row that holds the x value.
	x: z.string(),
	series: z
		.array(z.object({ key: z.string(), label: z.string() }))
		.min(1)
		.max(6),
	rows: z.array(z.record(z.string(), Cell)).max(400),
	stacked: z.boolean().optional(),
	// A line under the chart: the source, or the caveat.
	note: z.string().optional(),
})
export type ChartBlockType = z.infer<typeof ChartBlockSchema>

const StatsBlockSchema = z.object({
	items: z
		.array(
			z.object({
				label: z.string(),
				value: z.union([z.string(), z.number()]),
				// Against the previous period, such as "+12" or "−3%".
				change: z.string().optional(),
				note: z.string().optional(),
			})
		)
		.min(1)
		.max(6),
})
export type StatsBlockType = z.infer<typeof StatsBlockSchema>

const TableBlockSchema = z.object({
	title: z.string().optional(),
	columns: z
		.array(
			z.object({
				key: z.string(),
				label: z.string(),
				align: z.enum(['start', 'end']).optional(),
			})
		)
		.min(1)
		.max(10),
	rows: z.array(z.record(z.string(), Cell)).max(500),
	// Shows a filter box over the table.
	filterable: z.boolean().optional(),
	// The column the table starts sorted by, largest first.
	sortBy: z.string().optional(),
})
export type TableBlockType = z.infer<typeof TableBlockSchema>

export const blockSchemas = {
	chart: ChartBlockSchema,
	stats: StatsBlockSchema,
	table: TableBlockSchema,
} as const
export type BlockKind = keyof typeof blockSchemas

export const isBlockKind = (value: string): value is BlockKind =>
	value in blockSchemas

// The component blocks in a markdown text, found the way the renderer finds
// them: ~~~ fences and longer ``` fences count too.
export function codeBlocks(text: string) {
	const blocks: Array<{ kind: BlockKind; source: string }> = []
	visit(fromMarkdown(text), 'code', (node) => {
		if (node.lang && isBlockKind(node.lang)) {
			blocks.push({ kind: node.lang, source: node.value })
		}
	})
	return blocks
}

export function parseBlock<K extends BlockKind>(
	kind: K,
	source: string
):
	| { ok: true; data: z.infer<(typeof blockSchemas)[K]> }
	| { ok: false; error: string } {
	let json: unknown
	try {
		json = JSON.parse(source)
	} catch {
		return { ok: false, error: `The ${kind} block is not valid JSON.` }
	}
	const result = blockSchemas[kind].safeParse(json)
	if (result.success) {
		return { ok: true, data: result.data as z.infer<(typeof blockSchemas)[K]> }
	}
	return {
		ok: false,
		error: `The ${kind} block does not match its shape: ${result.error.issues
			.slice(0, 3)
			.map((issue) => `${issue.path.join('.') || '(top)'}: ${issue.message}`)
			.join('; ')}`,
	}
}

// Every component block in the text that fails to parse, as messages an
// agent can act on. Fences in other languages are ordinary code.
export const blockErrors = (text: string) =>
	codeBlocks(text).flatMap(({ kind, source }) => {
		const parsed = parseBlock(kind, source)
		return parsed.ok ? [] : [parsed.error]
	})

export const hasBlocks = (text: string) => codeBlocks(text).length > 0

// The opening prose of a markdown text, as plain text of at most `max`
// characters: for a folded card's preview, or for quoting a message.
export function openingLines(body: string, max: number) {
	const paragraph =
		body
			.split(/\n\s*\n/)
			.map((part) => part.trim())
			.find((part) => part && !/^(#|```|~~~|\|)/.test(part)) ?? ''
	const text = paragraph
		.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replace(/[*_`>#]/g, '')
		.replace(/\s+/g, ' ')
		.trim()
	return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

export const BLOCKS_GUIDE = `## Components in your messages

Your messages are markdown, and you can put components in them as fenced blocks whose language is the component and whose body is JSON. The app draws them in its own style. Use one only when it says more than a sentence would.

- chart: {"type": "line" | "bar" | "area", "title"?, "x": "<row key for the x axis>", "series": [{"key", "label"}], "rows": [{...}], "stacked"?: true, "note"?: "<source or caveat>"}
- stats: {"items": [{"label", "value", "change"?: "+12", "note"?}]} for 1 to 6 headline numbers
- table: {"title"?, "columns": [{"key", "label", "align"?: "start" | "end"}], "rows": [{...}], "filterable"?: true, "sortBy"?: "<column key>"} for anything the admin may want to sort or filter
- mermaid: a Mermaid diagram, such as a gantt chart or a flowchart. Its body is Mermaid source, not JSON. Nothing checks it before it is posted, and the app shows one that does not draw as its source.

For example:

\`\`\`stats
{"items": [{"label": "Signups", "value": 35, "change": "+17"}]}
\`\`\`

A chart, stats or table block that does not parse is refused, and the tool tells you what to fix.`
