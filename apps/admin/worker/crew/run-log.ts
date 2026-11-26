import {
	threadPlace,
	type CrewKey,
	type RunStepType,
	type RunType,
} from '../../shared/crew'
import type { Sql } from './paintings'
import { applyStep, RUNS_KEPT, type StepChange } from './steps'

// One Flue submission of one agent: a run in its main conversation, or in
// the side-thread that starts with `thread`.
export type RunLogKey = {
	agent: CrewKey
	thread: string | null
	submission: string
}

type RunRow = {
	id: number
	agent: CrewKey
	thread: string | null
	submission: string
	started_at: string
	ended_at: string | null
	outcome: RunType['outcome']
	message_id: string | null
	steps: string
	dropped: number
	error: string | null
}

const NO_STEPS = '[]'
const MAX_ERROR = 500

const toRun = (row: RunRow): RunType => ({
	id: row.id,
	agent: row.agent,
	thread: row.thread,
	startedAt: row.started_at,
	endedAt: row.ended_at,
	outcome: row.outcome,
	messageId: row.message_id,
	steps: JSON.parse(row.steps) as Array<RunStepType>,
	dropped: row.dropped,
	error: row.error,
})

// The room's `run` table: each run's steps, and the message it produced.
// A run opens at its submission's first event and closes when the
// submission settles, keyed by the submission, not by the agent's status:
// one agent can run in its main conversation and in a side-thread at once.
export class RunLog {
	constructor(
		private sql: Sql,
		private push: (run: RunType) => void,
		private now = () => new Date().toISOString()
	) {}

	// Runs without steps or an error stay out: a delivery that joined a live
	// run settles as a submission of its own.
	list(): Array<RunType> {
		return this.sql<RunRow>`
			select * from run where steps != ${NO_STEPS} or error is not null
			order by id`.map(toRun)
	}

	start(key: RunLogKey, at: string) {
		if (!this.find(key)) this.open(key, at)
	}

	// A step that arrives after its run closed joins the closed run, so a
	// late event cannot open a run that never ends.
	step(key: RunLogKey, change: StepChange) {
		const row = this.find(key) ?? this.open(key, change.at)
		const next = applyStep(
			{ steps: toRun(row).steps, dropped: row.dropped },
			change
		)
		const steps = JSON.stringify(next.steps)
		this.sql`
			update run set steps = ${steps}, dropped = ${next.dropped}
			where id = ${row.id}`
		this.show({ ...row, steps, dropped: next.dropped })
	}

	// `fallback` is what the run answers when it posted nothing: the message
	// that woke it.
	settle(
		key: RunLogKey,
		outcome: 'done' | 'failed',
		fallback: string | null,
		error: string | null = null
	) {
		const row =
			this.find(key) ??
			this.sql<RunRow>`
				insert into run (agent, thread, submission, started_at, outcome)
				values (${key.agent}, ${key.thread}, ${key.submission}, ${this.now()}, 'working')
				returning *`[0]
		if (row.ended_at) return
		this.close(row, outcome, fallback, error)
	}

	// A main run's trigger leaves the room's records when the run finishes,
	// before its submission settles, so the run keeps it until then.
	noteTrigger(agent: CrewKey, messageId: string | null) {
		if (!messageId) return
		this.sql`
			update run set message_id = ${messageId}
			where agent = ${agent} and thread is null and ended_at is null`
	}

	private find(key: RunLogKey) {
		return this.sql<RunRow>`
			select * from run
			where agent = ${key.agent} and submission = ${key.submission}`[0]
	}

	// One conversation runs one submission at a time, so a run still open
	// when the next one starts lost its close.
	private open(key: RunLogKey, at: string) {
		const stale = this.sql<RunRow>`
			select * from run
			where agent = ${key.agent} and thread is ${key.thread} and ended_at is null`
		for (const row of stale) this.close(row, 'failed', row.thread)
		const row = this.sql<RunRow>`
			insert into run (agent, thread, submission, started_at, outcome)
			values (${key.agent}, ${key.thread}, ${key.submission}, ${at}, 'working')
			returning *`[0]
		this.sql`
			delete from run
			where agent = ${key.agent} and ended_at is not null and id < coalesce((
				select id from run where agent = ${key.agent} and steps != ${NO_STEPS}
				order by id desc limit 1 offset ${RUNS_KEPT - 1}
			), 0)`
		return row
	}

	private close(
		row: RunRow,
		outcome: 'done' | 'failed',
		fallback: string | null,
		error: string | null = null
	) {
		const produced =
			this.lastPost(row.agent, row.started_at, row.thread) ??
			row.message_id ??
			fallback
		const [closed] = this.sql<RunRow>`
			update run set ended_at = ${this.now()}, outcome = ${outcome}, message_id = ${produced},
				error = ${error?.slice(0, MAX_ERROR) ?? null}
			where id = ${row.id}
			returning *`
		this.show(closed)
	}

	// The agent's latest message since the run started, receipts last: in the
	// run's side-thread, or anywhere but a side-thread for a main run.
	private lastPost(agent: CrewKey, since: string, thread: string | null) {
		const place = thread ? threadPlace(thread) : null
		return (
			this.sql<{ id: string }>`
				select id from message
				where author = ${agent} and at >= ${since}
					and ((${place} is null and place not like 'thread:%') or place = ${place})
				order by receipt, at desc, id desc
				limit 1`[0]?.id ?? null
		)
	}

	private show(row: RunRow) {
		if (row.steps !== NO_STEPS || row.error) this.push(toRun(row))
	}
}
