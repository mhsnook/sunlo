import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useAuth } from '@/lib/hooks'
import ProfileCreationForm from '@/components/profile-creation-form'
import { useProfile } from '@/lib/use-profile'
import SuccessCheckmark from '@/components/success-checkmark'
import { uuid } from '@/types/main'

type GettingStartedProps = {
	referrer?: uuid
}

export const Route = createFileRoute('/_user/getting-started')({
	validateSearch: (search?: Record<string, unknown>): GettingStartedProps => {
		return search ?
				{
					referrer: (search.referrer as string) || '',
				}
			:	{}
	},
	component: GettingStartedPage,
})

function GettingStartedPage() {
	const { referrer }: GettingStartedProps = Route.useSearch()
	const { userId, userRole } = useAuth()
	const { data: profile } = useProfile()

	const nextPage =
		referrer ? `/friends/search/${referrer}`
		: userRole === 'learner' ? '/learn/add-deck'
		: '/friends'

	return profile !== null ?
			<Navigate to={nextPage} />
		:	<main className="w-app px-[5cqw] py-10">
				<div className="my-4 space-y-4 text-center">
					<h1 className="d1">Welcome to Sunlo</h1>
					<div className="mx-auto flex max-w-sm flex-row items-center gap-4">
						<SuccessCheckmark className="bg-transparent" />
						<p className="text-muted-foreground text-2xl font-thin">
							Thanks&nbsp;for&nbsp;confirming your email &ndash; let&apos;s
							get&nbsp;you&nbsp;set&nbsp;up.
						</p>
					</div>
				</div>
				<ProfileCreationForm userId={userId!} />
			</main>
}
