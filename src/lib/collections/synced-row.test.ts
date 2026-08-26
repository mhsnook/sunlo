import { describe, it, expect, vi } from 'vitest'
import { QueryClient } from '@tanstack/query-core'
import { createCollection } from '@tanstack/db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import { writeSyncedRow, writeSyncedRows, rowMatches } from './synced-row'

type Row = { id: string; name: string; flags?: Record<string, boolean> }

const makeCollection = (rows: Array<Row> = []) =>
	createCollection(
		queryCollectionOptions({
			id: `synced-row-test-${Math.random()}`,
			queryKey: ['synced-row-test', Math.random()],
			queryFn: () => Promise.resolve(rows),
			getKey: (item: Row) => item.id,
			queryClient: new QueryClient(),
			startSync: false,
		})
	)

describe('writeSyncedRow', () => {
	it('drops the write when nothing has loaded the collection', () => {
		const collection = makeCollection()
		// The raw write is what it protects against.
		expect(() =>
			collection.utils.writeUpsert({ id: 'a', name: 'Anya' })
		).toThrow()
		expect(() =>
			writeSyncedRow(collection, { id: 'a', name: 'Anya' })
		).not.toThrow()
		expect(collection.size).toBe(0)
	})

	it('writes a new or changed row, and skips one we already hold', async () => {
		const collection = makeCollection([{ id: 'a', name: 'Anya' }])
		await collection.preload()

		const upsert = vi.spyOn(collection.utils, 'writeUpsert')
		writeSyncedRow(collection, { id: 'a', name: 'Anya' })
		expect(upsert).not.toHaveBeenCalled()

		writeSyncedRow(collection, { id: 'a', name: 'Anya Petrov' })
		expect(collection.get('a')?.name).toBe('Anya Petrov')

		writeSyncedRow(collection, { id: 'b', name: 'Bo' })
		expect(collection.get('b')?.name).toBe('Bo')
	})

	it('compares a jsonb column by value, not by reference', async () => {
		const collection = makeCollection([
			{ id: 'a', name: 'Anya', flags: { beta: true } },
		])
		await collection.preload()

		const upsert = vi.spyOn(collection.utils, 'writeUpsert')
		writeSyncedRow(collection, { id: 'a', name: 'Anya', flags: { beta: true } })
		expect(upsert).not.toHaveBeenCalled()

		writeSyncedRow(collection, {
			id: 'a',
			name: 'Anya',
			flags: { beta: false },
		})
		expect(collection.get('a')?.flags).toEqual({ beta: false })
	})
})

describe('writeSyncedRows', () => {
	it('commits many rows once, and skips the ones that have not changed', async () => {
		const collection = makeCollection([{ id: 'a', name: 'Anya' }])
		await collection.preload()

		const batch = vi.spyOn(collection.utils, 'writeBatch')
		writeSyncedRows(collection, [
			{ id: 'a', name: 'Anya' },
			{ id: 'b', name: 'Bo' },
			{ id: 'c', name: 'Cy' },
		])
		expect(batch).toHaveBeenCalledTimes(1)
		expect(collection.get('b')?.name).toBe('Bo')
		expect(collection.get('c')?.name).toBe('Cy')

		// One changed row does not need a batch, and no changed row does not
		// need a write at all.
		batch.mockClear()
		const upsert = vi.spyOn(collection.utils, 'writeUpsert')
		writeSyncedRows(collection, [
			{ id: 'a', name: 'Anya' },
			{ id: 'b', name: 'Bo Zhang' },
		])
		expect(batch).not.toHaveBeenCalled()
		expect(upsert).toHaveBeenCalledTimes(1)
		expect(collection.get('b')?.name).toBe('Bo Zhang')

		upsert.mockClear()
		writeSyncedRows(collection, [{ id: 'a', name: 'Anya' }])
		expect(upsert).not.toHaveBeenCalled()
	})

	it('drops the batch when nothing has loaded the collection', () => {
		const collection = makeCollection()
		// writeBatch opens its own sync context, so it throws on its own.
		expect(() =>
			collection.utils.writeBatch(() => {
				collection.utils.writeUpsert({ id: 'a', name: 'Anya' })
			})
		).toThrow()
		expect(() =>
			writeSyncedRows(collection, [
				{ id: 'a', name: 'Anya' },
				{ id: 'b', name: 'Bo' },
			])
		).not.toThrow()
		expect(collection.size).toBe(0)
	})
})

describe('rowMatches', () => {
	it('passes when every submitted field comes back unchanged', () => {
		expect(
			rowMatches({ status: 'active' }, { id: 'a', status: 'active' })
		).toBe(true)
	})

	it('fails when the server stored a different value, or dropped the field', () => {
		expect(rowMatches({ status: 'active' }, { status: 'skipped' })).toBe(false)
		expect(rowMatches({ status: 'active' }, { id: 'a' })).toBe(false)
	})

	it('passes when there is no row to compare', () => {
		expect(rowMatches({ deleted: true }, undefined)).toBe(true)
	})

	it('ignores the timestamps the server sets', () => {
		expect(
			rowMatches(
				{ created_at: '2026-01-01', updated_at: '2026-01-01' },
				{ created_at: '2026-08-26', updated_at: '2026-08-26' }
			)
		).toBe(true)
	})

	it('compares an array in order', () => {
		expect(rowMatches({ manifest: ['a', 'b'] }, { manifest: ['a', 'b'] })).toBe(
			true
		)
		expect(rowMatches({ manifest: ['a', 'b'] }, { manifest: ['b', 'a'] })).toBe(
			false
		)
	})

	it('compares an object whatever key order it comes back in', () => {
		expect(
			rowMatches(
				{ flags: { intro_seen: true, beta: false } },
				{ flags: { beta: false, intro_seen: true } }
			)
		).toBe(true)
		expect(rowMatches({ flags: { beta: false } }, { flags: {} })).toBe(false)
	})

	it('does not treat null as an object', () => {
		expect(rowMatches({ stability: null }, { stability: null })).toBe(true)
		expect(rowMatches({ stability: null }, { stability: 3 })).toBe(false)
	})
})
