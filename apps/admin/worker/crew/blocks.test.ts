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
		const [paragraph] = transform('Over to @Data, then @Riker.').children
		expect(paragraph).toMatchObject({
			type: 'paragraph',
			children: [
				{ type: 'text', value: 'Over to ' },
				{ type: 'strong', children: [{ type: 'text', value: '@Data' }] },
				{ type: 'text', value: ', then ' },
				{ type: 'strong', children: [{ type: 'text', value: '@Riker' }] },
				{ type: 'text', value: '.' },
			],
		})
	})

	it('leaves an email address and code alone', () => {
		const tree = transform('Write to a@b.co about `@Data`.')
		expect(JSON.stringify(tree)).not.toContain('strong')
	})

	it('turns a component block into a figure and keeps its JSON intact', () => {
		const source = '{"items": [{"label": "asked @Data", "value": 1}]}'
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
