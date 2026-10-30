import { beforeEach, describe, expect, it } from 'vitest'
import type { RunType } from '../../shared/crew'
import { RunLog, type RunKey, type Sql } from './runs'
import { RUNS_KEPT, type StepChange } from './steps'

type Database = {
	exec(sql: string): void
	prepare(sql: string): {
		all(...values: Array<unknown>): Array<Record<string, unknown>>
	}
}

// The worker's types leave out Node's, so the module name stays a string.
const sqliteModule = 'node:sqlite'
const { DatabaseSync } = (await import(/* @vite-ignore */ sqliteModule)) as {
	DatabaseSync: new (path: string) => Database
}

// The parts of the room's schema that RunLog reads, as in CrewRoom's
// constructor.
const SCHEMA = `
	create table message (
		id text primary key,
		at text not null,
		author text not null,
		place text not null,
		receipt integer not null default 0
	);
	create table run (
		id integer primary key autoincrement,
		agent text not null,
		thread text,
		submission text not null,
		started_at text not null,
		ended_at text,
		outcome text not null,
		message_id text,
		steps text not null default '[]',
		dropped integer not null default 0
	);
`

let db: Database
let pushed: Array<RunType>
let clock: number
let log: RunLog

const at = (second: number) =>
	new Date(Date.UTC(2026, 9, 30, 10, 0, second)).toISOString()
const tick = () => at(clock++)

beforeEach(() => {
	db = new DatabaseSync(':memory:')
	db.exec(SCHEMA)
	pushed = []
	clock = 0
	const sql: Sql = <T>(
		strings: TemplateStringsArray,
		...values: Array<string | number | boolean | null>
	) => db.prepare(strings.join('?')).all(...values) as Array<T>
	log = new RunLog(sql, (run) => pushed.push(run), tick)
})

const main = (submission: string): RunKey => ({
	agent: 'command-2',
	thread: null,
	submission,
})
const inThread = (submission: string, thread = 'root-1'): RunKey => ({
	agent: 'command-2',
	thread,
	submission,
})

const toolStart = (id: string): StepChange => ({
	type: 'tool-start',
	id,
	title: { running: 'Running', done: 'Ran', failed: 'Failed to run' },
	detail: null,
	at: tick(),
})

const post = (id: string, place: string, receipt = 0) =>
	db
		.prepare(
			'insert into message (id, at, author, place, receipt) values (?, ?, ?, ?, ?)'
		)
		.all(id, tick(), 'command-2', place, receipt)

const run = (key: RunKey) =>
	log.list().find((r) => r.steps.length && byKey(r, key))
const byKey = (r: RunType, key: RunKey) =>
	db.prepare('select submission from run where id = ?').all(r.id)[0]
		?.submission === key.submission

describe('RunLog', () => {
	it('closes a side-thread run without closing the main run beside it', () => {
		log.start(main('m'), tick())
		log.step(main('m'), toolStart('m-1'))
		log.start(inThread('t'), tick())
		log.step(inThread('t'), toolStart('t-1'))
		post('reply', 'thread:root-1')
		log.settle(inThread('t'), 'done', 'root-1')

		expect(run(inThread('t'))).toMatchObject({
			outcome: 'done',
			messageId: 'reply',
		})
		expect(run(main('m'))).toMatchObject({ outcome: 'working' })

		post('answer', 'room:command')
		log.settle(main('m'), 'done', null)
		expect(run(main('m'))).toMatchObject({
			outcome: 'done',
			messageId: 'answer',
		})
	})

	it('attaches a main run to its own message, not one from before it began', () => {
		post('earlier', 'room')
		log.start(main('m'), tick())
		log.step(main('m'), toolStart('m-1'))
		post('answer', 'room')
		post('receipt', 'room', 1)
		log.settle(main('m'), 'done', null)
		expect(run(main('m'))?.messageId).toBe('answer')
	})

	it('falls back to the receipt, then to the trigger the run noted', () => {
		log.start(main('a'), tick())
		log.step(main('a'), toolStart('a-1'))
		post('receipt', 'room', 1)
		log.noteTrigger('command-2', 'woke-a')
		log.settle(main('a'), 'done', null)
		expect(run(main('a'))?.messageId).toBe('receipt')

		log.start(main('b'), tick())
		log.step(main('b'), toolStart('b-1'))
		log.noteTrigger('command-2', 'woke-b')
		log.settle(main('b'), 'done', null)
		expect(run(main('b'))?.messageId).toBe('woke-b')
	})

	it('settles only the submission it names', () => {
		log.start(main('a'), tick())
		log.step(main('a'), toolStart('a-1'))
		log.settle(main('other'), 'done', null)
		expect(run(main('a'))?.outcome).toBe('working')
	})

	it('keeps a close that arrives before the first step', () => {
		log.settle(inThread('t'), 'done', 'root-1')
		expect(log.list()).toEqual([])
		log.step(inThread('t'), toolStart('t-1'))
		expect(run(inThread('t'))).toMatchObject({
			outcome: 'done',
			messageId: 'root-1',
			steps: [{ id: 't-1' }],
		})
	})

	it('marks a run whose close was lost as failed when the next one starts', () => {
		log.start(main('lost'), tick())
		log.step(main('lost'), toolStart('lost-1'))
		log.noteTrigger('command-2', 'woke-lost')
		log.start(inThread('t'), tick())
		expect(run(main('lost'))?.outcome).toBe('working')

		pushed = []
		log.start(main('next'), tick())
		expect(run(main('lost'))).toMatchObject({
			outcome: 'failed',
			messageId: 'woke-lost',
		})
		expect(pushed.map((r) => r.outcome)).toEqual(['failed'])

		post('answer', 'room')
		log.step(main('next'), toolStart('next-1'))
		log.settle(main('next'), 'done', null)
		expect(run(main('next'))).toMatchObject({
			outcome: 'done',
			messageId: 'answer',
		})
		expect(run(main('lost'))?.messageId).toBe('woke-lost')
	})

	it('opens a run once, though Flue reports each attempt', () => {
		log.start(main('m'), tick())
		log.step(main('m'), toolStart('m-1'))
		log.start(main('m'), tick())
		expect(run(main('m'))).toMatchObject({
			outcome: 'working',
			steps: [{ id: 'm-1' }],
		})
	})

	it('leaves out runs without steps, and keeps the last RUNS_KEPT with steps', () => {
		for (let n = 0; n < RUNS_KEPT + 2; n++) {
			log.start(main(`s${n}`), tick())
			log.step(main(`s${n}`), toolStart(`s${n}-1`))
			log.settle(main(`s${n}`), 'done', null)
			log.settle(main(`joined${n}`), 'done', null)
		}
		log.start(main('last'), tick())
		const kept = log.list()
		expect(kept).toHaveLength(RUNS_KEPT)
		expect(kept[0].steps[0].id).toBe('s2-1')
		const { count } = db.prepare('select count(*) as count from run').all()[0]
		expect(count).toBeLessThan(2 * RUNS_KEPT + 2)
	})
})
