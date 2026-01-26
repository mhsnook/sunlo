import type { TeamConfig } from '@scenetest/cli'

/**
 * One team with all test users from seed data.
 *
 * Roles used in scenes:
 *   visitor  – not logged in (no credentials needed)
 *   new-user – fresh account, no profile yet
 *   learner  – primary test user with decks & data
 *
 * Extra roles available for future scenes:
 *   friend   – social/chat test user
 *   learner2 – second learner (polyglot)
 */
export default {
	visitor: {
		id: 'visitor',
	},

	'new-user': {
		id: 'new-user',
		email: 'sunloapp+new@gmail.com',
		password: 'password',
		uid: 'd4e5f6a7-b8c9-4d0e-a1f2-b3c4d5e6f7a8',
	},

	learner: {
		id: 'learner',
		email: 'sunloapp@gmail.com',
		password: 'password',
		uid: 'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		username: 'GarlicFace',
	},

	friend: {
		id: 'friend',
		email: 'sunloapp+friend@gmail.com',
		password: 'password',
		uid: '7ad846a9-d55b-4035-8be2-dbcc70074f74',
		username: 'Lexigrine',
	},

	learner2: {
		id: 'learner2',
		email: 'sunloapp+1@gmail.com',
		password: 'password',
		uid: 'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		username: 'Best Frin',
	},

	learner3: {
		id: 'learner3',
		email: 'sunloapp+2@gmail.com',
		password: 'password',
		uid: 'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
		username: 'Work Andy',
	},
} satisfies TeamConfig
