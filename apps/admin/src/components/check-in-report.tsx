import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Markdown } from '@/components/my-markdown'
import { Button } from '@/components/ui/button'
import { IconSizedLoader } from '@/components/ui/loader'
import {
	checkIn,
	checkInQuery,
	forgetNote,
	notesQuery,
	reportQuery,
	type ReportType,
} from '~/lib/reporter'

const dateTime = new Intl.DateTimeFormat(undefined, {
	month: 'short',
	day: 'numeric',
	hour: 'numeric',
	minute: '2-digit',
})

export function CheckInReport() {
	const queryClient = useQueryClient()
	const checkInResult = useQuery(checkInQuery())
	const reportId = checkInResult.data?.id
	const report = useQuery({
		...reportQuery(reportId ?? ''),
		enabled: !!reportId,
	})
	const freshReport = useMutation({
		mutationFn: () => checkIn({ fresh: true }),
		onSuccess: (next) =>
			queryClient.setQueryData(checkInQuery().queryKey, next),
	})
	const current = report.data ?? checkInResult.data

	return (
		<section
			className="bg-card space-y-3 rounded border p-4"
			data-testid="admin-check-in-report"
		>
			<div className="flex flex-wrap items-start justify-between gap-2">
				<div>
					<h2 className="font-semibold">Since you last checked in</h2>
					{current && (
						<p className="text-muted-foreground text-sm">
							{dateTime.format(new Date(current.since))} to{' '}
							{dateTime.format(new Date(current.until))}
						</p>
					)}
				</div>
				<Button
					variant="neutral"
					size="sm"
					disabled={current?.status === 'writing' || freshReport.isPending}
					onClick={() => freshReport.mutate()}
					data-testid="admin-fresh-report-button"
				>
					Write a fresh report
				</Button>
			</div>
			<ReportBody
				report={current}
				error={checkInResult.error ?? freshReport.error}
			/>
			<ReporterNotes />
		</section>
	)
}

function ReportBody({
	report,
	error,
}: {
	report: ReportType | undefined
	error: Error | null
}) {
	if (error) {
		return (
			<p role="alert" className="text-danger-700 text-sm">
				{error.message}
			</p>
		)
	}
	if (!report || report.status === 'writing') {
		return (
			<div className="text-muted-foreground flex items-center gap-2 text-sm">
				<IconSizedLoader size={16} className="shrink-0" />
				The reporter is reading the database and writing your report. This takes
				about a minute.
			</div>
		)
	}
	if (report.status === 'failed') {
		return (
			<p role="alert" className="text-danger-700 text-sm">
				The report failed: {report.error}
			</p>
		)
	}
	return (
		<div className="prose prose-sm dark:prose-invert max-w-none">
			<Markdown>{report.body ?? ''}</Markdown>
		</div>
	)
}

function ReporterNotes() {
	const queryClient = useQueryClient()
	const notes = useQuery(notesQuery())
	const forget = useMutation({
		mutationFn: forgetNote,
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: notesQuery().queryKey }),
	})
	if (!notes.data?.length) return null
	return (
		<details className="text-sm">
			<summary className="text-muted-foreground cursor-pointer">
				What the reporter remembers ({notes.data.length})
			</summary>
			<ul className="mt-2 space-y-1">
				{notes.data.map((note) => (
					<li
						key={note.id}
						data-key={note.id}
						className="flex items-start justify-between gap-2"
					>
						<span>{note.text}</span>
						<Button
							variant="ghost"
							size="sm"
							disabled={forget.isPending}
							onClick={() => forget.mutate(note.id)}
						>
							Forget
						</Button>
					</li>
				))}
			</ul>
		</details>
	)
}
