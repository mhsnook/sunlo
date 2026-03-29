import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { useIsAuthenticated } from '@/components/require-auth'
import { RequireAuth } from '@/components/require-auth'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { RequestForm } from '@/components/requests/request-form'
import type { PhraseRequestType } from '@/features/requests/schemas'

export const Route = createFileRoute('/_user/learn/$lang/requests/new')({
	component: NewRequestPage,
	beforeLoad: () => ({
		titleBar: { title: 'New Community Request' },
	}),
})

function NewRequestPage() {
	const isAuth = useIsAuthenticated()
	const { lang } = Route.useParams()
	const navigate = useNavigate()

	// Require auth to create requests
	if (!isAuth) {
		return (
			<RequireAuth message="You need to be logged in to create phrase requests.">
				<div />
			</RequireAuth>
		)
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Post a Request</CardTitle>
				<CardDescription>
					Ask the community (or share with a friend) for a flashcard
					recommendation from the library, or to make you a new one for everyone
					to learn.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<RequestForm
					lang={lang}
					onSuccess={(data: PhraseRequestType) => {
						void navigate({
							to: '/learn/$lang/requests/$id',
							params: { lang, id: data.id },
						})
					}}
				/>
			</CardContent>
		</Card>
	)
}
