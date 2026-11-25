import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'
import languages from '@/lib/languages'
import { displayName, isCrewKey, roomNames } from '../../../shared/crew'
import {
	feedbackKindLabels,
	feedbackOutcomeLabels,
	type FeedbackItemType,
} from '../../../shared/feedback'
import { feedbackQuery, startTriage } from '~/lib/feedback'
import { formatCount, timeOrDay } from '~/lib/format'
import { CrewText } from '~/components/crew/crew-parts'
import { RefLink } from '~/components/crew/ref-links'
import { MobileSidebarButton } from '~/components/crew/crew-sidebar'

type FeedbackSearch = { all?: true }

export const Route = createFileRoute('/_admin/feedback')({
	validateSearch: (search: Record<string, unknown>): FeedbackSearch =>
		search.all === true || search.all === 'true' ? { all: true } : {},
	loaderDeps: ({ search }) => ({ open: !search.all }),
	loader: ({ context, deps }) =>
		context.queryClient.ensureQueryData(feedbackQuery(deps.open)),
	component: FeedbackPage,
})

function FeedbackPage() {
	const { all } = Route.useSearch()
	const { data } = useSuspenseQuery(feedbackQuery(!all))

	return (
		<div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<MobileSidebarButton />
				<div className="me-auto">
					<h1 className="text-2xl font-semibold">Feedback</h1>
					<p className="text-muted-foreground text-sm">
						{formatCount(data.untriaged)} waiting for the crew to triage
					</p>
				</div>
				<TriageButton disabled={data.untriaged === 0} />
				<div className="flex gap-1 rounded-2xl border p-1 text-sm">
					<FilterLink active={!all} all={false} label="Waiting" />
					<FilterLink active={!!all} all label="All" />
				</div>
			</div>
			{data.items.length === 0 ? (
				<p className="text-muted-foreground" data-testid="admin-feedback-empty">
					{all ? 'Nobody has sent feedback yet.' : 'Nothing waits for triage.'}
				</p>
			) : (
				<ul className="space-y-4">
					{data.items.map((item) => (
						<FeedbackCard key={item.id} item={item} />
					))}
				</ul>
			)}
		</div>
	)
}

function TriageButton({ disabled }: { disabled: boolean }) {
	const triage = useMutation({
		mutationFn: startTriage,
		onSuccess: (count) =>
			toastSuccess(
				count
					? `O'Brien is triaging ${count} items. Refresh in a few minutes to see the results.`
					: 'Nothing waits for triage.'
			),
		onError: (error) => toastError(error.message),
	})
	return (
		<Button
			variant="neutral"
			disabled={disabled || triage.isPending}
			onClick={() => triage.mutate()}
			data-testid="admin-feedback-triage-button"
		>
			Triage now
		</Button>
	)
}

function FilterLink({
	active,
	all,
	label,
}: {
	active: boolean
	all: boolean
	label: string
}) {
	return (
		<Link
			to="/feedback"
			search={all ? { all: true } : {}}
			data-testid="admin-feedback-filter"
			data-key={all ? 'all' : 'waiting'}
			className={cn(
				'rounded-2xl px-3 py-1',
				active ? 'bg-primary-100 font-medium' : 'hover:bg-neutral-100'
			)}
		>
			{label}
		</Link>
	)
}

function FeedbackCard({ item }: { item: FeedbackItemType }) {
	const language = item.lang
		? (languages[item.lang as keyof typeof languages] ?? item.lang)
		: null
	const sender =
		item.username ?? (item.signed_in ? 'No username' : 'Signed out')
	return (
		<li
			className="space-y-3 rounded border p-4"
			data-testid="admin-feedback-item"
			data-key={item.id}
		>
			<div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
				<span className="text-foreground font-medium">
					{feedbackKindLabels[item.kind]}
				</span>
				{language && <span>{language}</span>}
				<span>{sender}</span>
				{item.page_url && <code className="text-xs">{item.page_url}</code>}
				<span className="ms-auto">{timeOrDay(item.created_at)}</span>
			</div>
			<p className="whitespace-pre-wrap">{item.message}</p>
			{item.contact_email && (
				<a
					href={`mailto:${item.contact_email}`}
					className="text-primary-700 text-sm underline"
				>
					Reply to {item.contact_email}
				</a>
			)}
			{item.triage && (
				<div
					className="space-y-1 rounded bg-neutral-50 p-3 text-sm"
					data-testid="admin-feedback-triage"
				>
					<p className="font-medium">
						{feedbackOutcomeLabels[item.triage.outcome]}
						{item.triage.issue && (
							<>
								{' · '}
								<RefLink target={{ kind: 'github', number: item.triage.issue }}>
									{`#${item.triage.issue}`}
								</RefLink>
							</>
						)}
						{' · '}
						{roomNames[item.triage.room]}
						{isCrewKey(item.triage.agent) &&
							` · ${displayName(item.triage.agent)}`}
					</p>
					{item.triage.note && <CrewText text={item.triage.note} />}
				</div>
			)}
		</li>
	)
}
