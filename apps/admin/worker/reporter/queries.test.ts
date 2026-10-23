import type { Sql } from 'postgres'
import { describe, expect, it, vi } from 'vitest'
import { MAX_ROWS, QueryRejectedError, runReadOnlyQuery } from './queries'

function fakeSql(rows: Array<unknown>) {
	const settings: Array<string> = []
	const unsafe = vi.fn(() => Promise.resolve(rows))
	const tx = Object.assign(
		(strings: TemplateStringsArray) => {
			settings.push(strings.join(''))
			return Promise.resolve([])
		},
		{ unsafe }
	)
	const begin = vi.fn((run: (t: typeof tx) => Promise<unknown>) => run(tx))
	return { sql: { begin } as unknown as Sql, unsafe, begin, settings }
}

describe('runReadOnlyQuery', () => {
	it('rejects more than one statement without touching the database', async () => {
		const { sql, begin } = fakeSql([])
		await expect(runReadOnlyQuery(sql, 'select 1; select 2')).rejects.toThrow(
			QueryRejectedError
		)
		expect(begin).not.toHaveBeenCalled()
	})

	it('drops a trailing semicolon, sets a timeout, and caps the rows', async () => {
		const { sql, unsafe, settings } = fakeSql([{ n: 1 }])
		const text = await runReadOnlyQuery(sql, '  select 1 as n;  ')
		expect(settings).toEqual(["set local statement_timeout = '8s'"])
		expect(unsafe).toHaveBeenCalledWith(
			`select * from (select 1 as n) as result limit ${MAX_ROWS + 1}`
		)
		expect(JSON.parse(text)).toEqual({
			rows: [{ n: 1 }],
			row_count: 1,
			truncated: false,
		})
	})

	it('says when it cut rows off', async () => {
		const rows = Array.from({ length: MAX_ROWS + 1 }, (_, n) => ({ n }))
		const { sql } = fakeSql(rows)
		const result = JSON.parse(await runReadOnlyQuery(sql, 'select n')) as {
			row_count: number
			truncated: boolean
		}
		expect(result.row_count).toBe(MAX_ROWS)
		expect(result.truncated).toBe(true)
	})
})
