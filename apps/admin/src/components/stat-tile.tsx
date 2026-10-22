import { formatChange, formatCount } from '~/lib/format'

export function StatTile({
	label,
	value,
	previous,
	periodLabel,
	note,
}: {
	label: string
	value: number
	previous?: number
	periodLabel?: string
	note?: string
}) {
	return (
		<div className="bg-card rounded border p-4" data-testid="admin-stat-tile">
			<p className="text-muted-foreground text-sm">{label}</p>
			<p className="mt-1 text-3xl font-semibold tabular-nums">
				{formatCount(value)}
			</p>
			{previous !== undefined && periodLabel && (
				<p className="text-muted-foreground mt-1 text-sm tabular-nums">
					{formatChange(value, previous)} vs. previous {periodLabel}
				</p>
			)}
			{note && <p className="text-muted-foreground mt-1 text-sm">{note}</p>}
		</div>
	)
}
