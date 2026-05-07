import { combinedScore } from '@/hooks/use-hybrid-search'

// Diagnostic display: raw value → its sqrt contribution per side, then the
// combined Σ. Only mounted by /search/test (search.test.lazy.tsx) so this
// code lives in the diagnostic chunk and never ships in /search.

const fmt2 = (n: number) => n.toFixed(2)

export function ScoreBreakdown({
	semantic,
	trigram = 0,
}: {
	semantic: number
	trigram?: number
}) {
	const semContribution = Math.sqrt(semantic)
	const triContribution = Math.sqrt(trigram)
	const combined = combinedScore(semantic, trigram)
	return (
		<div className="text-muted-foreground/70 flex flex-col items-end gap-0 font-mono text-[10px] leading-tight tabular-nums">
			<span>
				Ω {fmt2(semantic)} → {fmt2(semContribution)}
			</span>
			<span>
				Δ {fmt2(trigram)} → {fmt2(triContribution)}
			</span>
			<span className="text-foreground font-semibold">Σ {fmt2(combined)}</span>
		</div>
	)
}
