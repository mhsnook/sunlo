import { describe, it, expect, vi } from 'vitest'
import { QueryClient } from '@tanstack/query-core'
import { createCollection } from '@tanstack/db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import {
	writeSyncedRow,
	writeSyncedRows,
	rowMatches,
	syncedRow,
} from './synced-row'

type Row = {
	id: string
	name: string
	flags?: Record<string, boolean>
	updated_at?: string | null
}

const makeCollection = (
	rows: Array<Row> = [],
	onUpdate?: () => Promise<{ refetch: false }>
) =>
	createCollection(
		queryCollectionOptions({
			id: `synced-row-test-${Math.random()}`,
			queryKey: ['synced-row-test', Math.random()],
			queryFn: () => Promise.resolve(rows),
			getKey: (item: Row) => item.id,
			queryClient: new QueryClient(),
			startSync: false,
			onUpdate,
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

describe('writeSyncedRow with out-of-order frames', () => {
	const first = '2026-11-26T10:00:01.000000+00:00'
	const second = '2026-11-26T10:00:02.000000+00:00'

	it('skips a frame older than the row the ack of a later write left', async () => {
		const collection = makeCollection([
			{ id: 'a', name: 'active', updated_at: '2026-11-26T10:00:00+00:00' },
		])
		await collection.preload()

		writeSyncedRow(collection, { id: 'a', name: 'learned', updated_at: second })
		writeSyncedRow(collection, { id: 'a', name: 'skipped', updated_at: first })
		expect(collection.get('a')).toMatchObject({
			name: 'learned',
			updated_at: second,
		})
	})

	it('writes a row with the same timestamp, or a newer one', async () => {
		const collection = makeCollection([
			{ id: 'a', name: 'Anya', updated_at: first },
		])
		await collection.preload()

		writeSyncedRow(collection, { id: 'a', name: 'Anya P', updated_at: first })
		expect(collection.get('a')?.name).toBe('Anya P')

		writeSyncedRow(collection, { id: 'a', name: 'Anya Q', updated_at: second })
		expect(collection.get('a')?.name).toBe('Anya Q')
	})

	it('orders two writes inside the same millisecond', async () => {
		const collection = makeCollection([
			{
				id: 'a',
				name: 'later',
				updated_at: '2026-11-26T10:00:00.123457+00:00',
			},
		])
		await collection.preload()

		writeSyncedRow(collection, {
			id: 'a',
			name: 'earlier',
			updated_at: '2026-11-26T10:00:00.123456+00:00',
		})
		expect(collection.get('a')?.name).toBe('later')
	})

	it('writes when either row has no timestamp', async () => {
		const collection = makeCollection([
			{ id: 'a', name: 'Anya', updated_at: null },
			{ id: 'b', name: 'Bo', updated_at: second },
		])
		await collection.preload()

		writeSyncedRow(collection, { id: 'a', name: 'Anya P', updated_at: first })
		writeSyncedRow(collection, { id: 'b', name: 'Bo Z' })
		expect(collection.get('a')?.name).toBe('Anya P')
		expect(collection.get('b')?.name).toBe('Bo Z')
	})

	it('writes the ack even when the optimistic row has a later clock', async () => {
		const collection = makeCollection(
			[{ id: 'a', name: 'active', updated_at: first }],
			async () => {
				// A real handler awaits the server, so the optimistic row is
				// in place by the time the ack lands.
				await new Promise((resolve) => setTimeout(resolve, 0))
				expect(collection.get('a')?.updated_at).toBe(clientClock)
				writeSyncedRow(collection, {
					id: 'a',
					name: 'learned',
					updated_at: second,
				})
				return { refetch: false }
			}
		)
		const clientClock = '2026-11-26T10:05:00.000Z'
		await collection.preload()

		const tx = collection.update('a', (draft) => {
			draft.name = 'learned'
			draft.updated_at = clientClock
		})
		await tx.isPersisted.promise
		expect(syncedRow(collection, 'a')).toMatchObject({
			name: 'learned',
			updated_at: second,
		})
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
