import { defineTeam } from '@scenetest/scenes'

export default defineTeam({
	name: 'Sunlo Default',
	owns: ['/learn', '/friends'],
	tags: { lang: 'kan' },
	actors: {
		visitor: {
			key: undefined!,
		},

		'new-user': {
			email: 'sunloapp+new@gmail.com',
			password: 'password',
			key: 'd4e5f6a7-b8c9-4d0e-a1f2-b3c4d5e6f7a8',
		},

		learner: {
			email: 'sunloapp@gmail.com',
			password: 'password',
			key: 'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
			username: 'GarlicFace',
		},

		friend: {
			email: 'sunloapp+friend@gmail.com',
			password: 'password',
			key: '7ad846a9-d55b-4035-8be2-dbcc70074f74',
			username: 'Lexigrine',
		},

		learner2: {
			email: 'sunloapp+1@gmail.com',
			password: 'password',
			key: 'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
			username: 'Best Frin',
		},

		learner3: {
			email: 'sunloapp+2@gmail.com',
			password: 'password',
			key: 'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
			username: 'Work Andy',
		},
	},
})
