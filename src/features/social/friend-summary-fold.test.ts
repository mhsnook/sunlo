import { describe, it, expect, beforeAll } from 'vitest'
import { createCollection } from '@tanstack/db'
import { createFriendSummaries } from './friend-summary-fold'
import type { FriendRequestActionType } from './schemas'
import type { friendRequestActionsCollection } from './collections'
import type { myProfileCollection } from '@/features/profile/collections'

const ME = '11111111-1111-4111-8111-111111111111'
const ANA = '22222222-2222-4222-8222-222222222222'
const BEN = '33333333-3333-4333-8333-333333333333'

const action = (
	overrides: Partial<FriendRequestActionType> & {
		id: string
		created_at: string
		action_type: FriendRequestActionType['action_type']
	}
): FriendRequestActionType => {
	const uid_by = overrides.uid_by ?? ME
	const uid_for = overrides.uid_for ?? ANA
	const [uid_less, uid_more] = [uid_by, uid_for].toSorted()
	return { uid_by, uid_for, uid_less, uid_more, ...overrides }
}

const LOG: Array<FriendRequestActionType> = [
	// Ana and I are friends: I invited her, she accepted.
	action({
		id: 'a1',
		created_at: '2026-01-01T00:00:00+00:00',
		action_type: 'invite',
	}),
	action({
		id: 'a2',
		created_at: '2026-01-02T00:00:00+00:00',
		uid_by: ANA,
		uid_for: ME,
		action_type: 'accept',
	}),
	// Ben invited me and is still waiting. His invite is newer than both of
	// Ana's actions, so a fold that ignored the pair would pick it for her too.
	action({
		id: 'b1',
		created_at: '2026-01-03T00:00:00+00:00',
		uid_by: BEN,
		uid_for: ME,
		action_type: 'invite',
	}),
]

/** Push a row into a collection's synced layer after the initial load. */
let pushAction: (row: FriendRequestActionType) => void
let loadProfile: () => void

const actions = createCollection<FriendRequestActionType>({
	id: 'test_friend_request_actions',
	getKey: (row) => row.id,
	sync: {
		sync: ({ begin, write, commit, markReady }) => {
			begin()
			for (const row of LOG) write({ type: 'insert', value: row })
			commit()
			markReady()
			pushAction = (row) => {
				begin()
				write({ type: 'insert', value: row })
				commit()
			}
		},
	},
}) as unknown as typeof friendRequestActionsCollection

// The fold reads only `uid` off the profile row, so the rest is not modelled.
// It starts empty, to exercise the "no profile yet" case first.
const me = createCollection<{ uid: string }>({
	id: 'test_my_profile',
	getKey: (row) => row.uid,
	sync: {
		sync: ({ begin, write, commit, markReady }) => {
			markReady()
			loadProfile = () => {
				begin()
				write({ type: 'insert', value: { uid: ME } })
				commit()
			}
		},
	},
}) as unknown as typeof myProfileCollection

const summaries = createFriendSummaries(actions, me)
const byFriend = (uid: string) => summaries.toArray.find((s) => s.uid === uid)

describe('the friend summary fold', () => {
	beforeAll(async () => {
		await summaries.preload()
	})

	it('folds to nothing until the profile says who the reader is', () => {
		expect(summaries.toArray).toHaveLength(0)
	})

	it('fills in on its own once the profile arrives', () => {
		loadProfile()
		expect(summaries.toArray).toHaveLength(2)
	})

	it('folds one summary per pair, not one per action', () => {
		expect(summaries.toArray).toHaveLength(2)
	})

	it('reads each pair state off that pair`s own newest action', () => {
		expect(byFriend(ANA)?.status).toBe('friends')
		expect(byFriend(BEN)?.status).toBe('pending')
	})

	it('names the other party as `uid`, whichever side of the pair they sit on', () => {
		expect(byFriend(ANA)?.uid_less).toBe(ME)
		expect(byFriend(BEN)?.uid_less).toBe(ME)
		expect(byFriend(ANA)?.most_recent_uid_by).toBe(ANA)
		expect(byFriend(BEN)?.most_recent_uid_by).toBe(BEN)
	})

	it('follows a new action live', () => {
		pushAction(
			action({
				id: 'b2',
				created_at: '2026-01-04T00:00:00+00:00',
				uid_by: ME,
				uid_for: BEN,
				action_type: 'accept',
			})
		)
		expect(byFriend(BEN)?.status).toBe('friends')
		expect(summaries.toArray).toHaveLength(2)
	})

	it('picks one winner when two actions on a pair share a timestamp', () => {
		const at = '2026-01-07T00:00:00+00:00'
		pushAction(
			action({
				id: 'b5',
				created_at: at,
				uid_by: ME,
				uid_for: BEN,
				action_type: 'accept',
			})
		)
		pushAction(
			action({
				id: 'b6',
				created_at: at,
				uid_by: ME,
				uid_for: BEN,
				action_type: 'remove',
			})
		)
		expect(summaries.toArray).toHaveLength(2)
		expect(byFriend(BEN)?.most_recent_action_type).toBe('remove')
	})
})
