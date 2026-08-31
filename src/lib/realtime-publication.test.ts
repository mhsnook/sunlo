import { describe, expect, it } from 'vitest'
import schema from '../../supabase/schemas/base.sql?raw'

// Supabase tests an UPDATE frame against each subscriber's SELECT policy using
// the *new* row. A soft delete is an UPDATE, so a policy reading
// `deleted = false or uid = auth.uid()` rejects the very frame announcing that
// the row is gone — every subscriber but the owner keeps showing it until the
// next fetch. Nothing throws, and a single-session scene never sees it.
// docs/database.md records the rule; this test enforces it.

const PUBLICATION = 'supabase_realtime'
const FLAGS = ['deleted', 'archived'] as const

/**
 * Statements are collected line by line rather than split on `;`, because
 * base.sql carries function bodies whose `$$` quoting is full of semicolons.
 * Neither publication nor policy statements contain a `$$` block, so
 * accumulating from a matching opening line to the first line ending in `;`
 * captures exactly one statement.
 */
function statementsStartingWith(opening: RegExp): Array<string> {
	const found: Array<string> = []
	let current: string | null = null
	for (const line of schema.split('\n')) {
		if (current === null && !opening.test(line)) continue
		current = current === null ? line : `${current} ${line.trim()}`
		if (current.trimEnd().endsWith(';')) {
			found.push(current.replace(/\s+/g, ' ').trim())
			current = null
		}
	}
	return found
}

/** The tables `alter publication ... add table only` puts on the wire. */
function publishedTables(): Set<string> {
	const statements = statementsStartingWith(
		new RegExp(`^alter publication "${PUBLICATION}"`)
	)
	return new Set(
		statements.flatMap((statement) =>
			Array.from(
				statement.matchAll(/add table only "public"\."(\w+)"/g),
				(match) => match[1]
			)
		)
	)
}

/**
 * The policy's `using` clause, by paren matching. `with check` governs what a
 * write may store rather than what a reader may see, so it cannot drop a
 * realtime frame and is deliberately excluded.
 */
function usingClause(statement: string): string {
	const keyword = statement.search(/\busing\s*\(/)
	if (keyword === -1) return ''
	const open = statement.indexOf('(', keyword)
	let depth = 0
	for (let i = open; i < statement.length; i++) {
		if (statement[i] === '(') depth++
		else if (statement[i] === ')' && --depth === 0)
			return statement.slice(open + 1, i)
	}
	return ''
}

type Policy = { table: string; name: string; flag: string | null }

/**
 * Policies that decide what a subscriber may read. A policy with no `for`
 * clause defaults to ALL, and ALL covers SELECT, so both count.
 */
function selectPolicies(): Array<Policy> {
	return statementsStartingWith(/^create policy/)
		.filter((statement) => {
			const command = /\bfor (select|insert|update|delete|all)\b/.exec(
				statement
			)
			return !command || command[1] === 'select' || command[1] === 'all'
		})
		.map((statement) => {
			const clause = usingClause(statement)
			return {
				table: /\bon "public"\."(\w+)"/.exec(statement)?.[1] ?? '',
				name: /^create policy "([^"]+)"/.exec(statement)?.[1] ?? '',
				flag:
					FLAGS.find((flag) => new RegExp(`"?\\b${flag}\\b"?`).test(clause)) ??
					null,
			}
		})
		.filter((policy) => policy.table !== '')
}

describe('realtime publication', () => {
	const published = publishedTables()
	const policies = selectPolicies()
	const narrowing = policies.filter((policy) => policy.flag !== null)

	// Without these the real assertion below passes on an empty set, so a
	// reformatting of base.sql would silently retire the check.
	it('parses tables and policies out of base.sql', () => {
		expect(published.size, 'no published table parsed').toBeGreaterThan(0)
		expect(policies.length, 'no policy parsed').toBeGreaterThan(0)
		expect(
			narrowing.length,
			`no policy narrows on ${FLAGS.join('/')} — the parser probably broke`
		).toBeGreaterThan(0)
	})

	it('publishes no table that narrows its own SELECT visibility', () => {
		const offenders = narrowing
			.filter((policy) => published.has(policy.table))
			.map(
				(policy) =>
					`${policy.table}: policy "${policy.name}" narrows on \`${policy.flag}\``
			)

		expect(
			offenders,
			`These tables are in the ${PUBLICATION} publication AND hide rows by a soft-delete flag, so subscribers never receive the update that removes one. Either drop the flag from the policy's using clause and filter it in the live query instead, or take the table out of the publication. See docs/database.md.`
		).toEqual([])
	})
})
