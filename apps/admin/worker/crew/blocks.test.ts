import { fromMarkdown } from 'mdast-util-from-markdown'
import { describe, expect, it } from 'vitest'
import { blockErrors, hasBlocks } from '../../shared/blocks'
import { remarkCrew } from '../../src/components/crew/remark-crew'

const fence = (kind: string, body: string) => `\`\`\`${kind}\n${body}\n\`\`\``

describe('blockErrors', () => {
	it('accepts valid blocks of every kind', () => {
		const text = [
			'Signups rose.',
			fence(
				'stats',
				'{"items": [{"label": "Signups", "value": 35, "change": "+17"}]}'
			),
			fence(
				'chart',
				'{"type": "line", "x": "day", "series": [{"key": "n", "label": "Signups"}], "rows": [{"day": "Oct 1", "n": 3}]}'
			),
			fence(
				'table',
				'{"columns": [{"key": "lang", "label": "Language"}], "rows": [{"lang": "hin"}], "filterable": true}'
			),
		].join('\n\n')
		expect(blockErrors(text)).toEqual([])
		expect(hasBlocks(text)).toBe(true)
	})

	it('names a block that is not JSON', () => {
		expect(blockErrors(fence('stats', '{items: [}'))).toEqual([
			'The stats block is not valid JSON.',
		])
	})

	it('names the fields that do not match the shape', () => {
		const [error] = blockErrors(fence('chart', '{"type": "pie", "x": "day"}'))
		expect(error).toMatch(/^The chart block does not match its shape: /)
		expect(error).toContain('type')
		expect(error).toContain('series')
	})

	it('leaves code fences in other languages alone', () => {
		const sql = fence('sql', 'select * from phrase')
		expect(blockErrors(sql)).toEqual([])
		expect(hasBlocks(sql)).toBe(false)
	})

	it('checks a ~~~ fence, which the renderer draws too', () => {
		expect(blockErrors('~~~stats\n{items: [}\n~~~')).toEqual([
			'The stats block is not valid JSON.',
		])
	})
})

const transform = (text: string) => {
	const tree = fromMarkdown(text)
	remarkCrew()(tree)
	return tree
}

describe('remarkCrew', () => {
	it('bolds an @mention in prose', () => {
		const [paragraph] = transform('Over to @product, then @command.').children
		expect(paragraph).toMatchObject({
			type: 'paragraph',
			children: [
				{ type: 'text', value: 'Over to ' },
				{ type: 'strong', children: [{ type: 'text', value: '@product' }] },
				{ type: 'text', value: ', then ' },
				{ type: 'strong', children: [{ type: 'text', value: '@command' }] },
				{ type: 'text', value: '.' },
			],
		})
	})

	it('leaves an email address and code alone', () => {
		const tree = transform('Write to a@b.co about `@product`.')
		expect(JSON.stringify(tree)).not.toContain('strong')
	})

	it('links an issue or pull request number', () => {
		const [paragraph] = transform('Fixed in #854, see #12.').children
		expect(paragraph).toMatchObject({
			type: 'paragraph',
			children: [
				{ type: 'text', value: 'Fixed in ' },
				{
					type: 'link',
					url: 'github:854',
					children: [{ type: 'text', value: '#854' }],
				},
				{ type: 'text', value: ', see ' },
				{ type: 'link', url: 'github:12' },
				{ type: 'text', value: '.' },
			],
		})
	})

	it('leaves a number that is not a reference alone', () => {
		for (const text of [
			'a#854',
			'&#854;',
			'see https://x.dev/#854',
			'#854a',
			'`#854`',
			'[the PR #854](https://example.com)',
		]) {
			expect(JSON.stringify(transform(text)), text).not.toContain('github:')
		}
	})

	it('turns a component block into a figure and keeps its JSON intact', () => {
		const source = '{"items": [{"label": "asked @product", "value": 1}]}'
		const [block] = transform(fence('stats', source)).children
		expect(block).toEqual({
			type: 'crewBlock',
			data: {
				hName: 'figure',
				hProperties: { dataBlock: 'stats', dataSource: source },
			},
		})
	})
})
