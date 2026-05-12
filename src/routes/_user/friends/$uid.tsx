import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_user/friends/$uid')({
	beforeLoad: () => ({
		titleBar: {
			title: 'Profile',
		},
	}),
	loader: ({ context, params }) => {
		const { uid } = params
		const isMine = uid === context.auth.userId
		return { uid, isMine }
	},
})
