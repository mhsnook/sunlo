import { describe, expect, it } from 'vitest'
import { blockErrors, hasBlocks } from '../../shared/blocks'

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
})
