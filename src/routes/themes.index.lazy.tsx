import type { CSSProperties } from 'react'
import { useLiveQuery } from '@tanstack/react-db'
import { createLazyFileRoute } from '@tanstack/react-router'
import { gt } from '@tanstack/db'
import { allLanguageOptions } from '@/lib/languages'
import {
	getLangHue,
	getLangHueIndex,
	getLangPopularityIndex,
	LANG_HUES,
} from '@/lib/lang-theme'
import { languagesCollection } from '@/features/languages/collections'
import { LangBadge } from '@/components/ui/badge'

export const Route = createLazyFileRoute('/themes/')({
	component: ThemesPage,
})

function ThemesPage() {
	const { data: ranked = [] } = useLiveQuery((q) =>
		q
			.from({ language: languagesCollection })
			.where(({ language }) => gt(language.display_order, 0))
			.orderBy(({ language }) => language.display_order)
	)

	const grouped = LANG_HUES.map((hue, i) => ({
		index: i,
		hue,
		langs: allLanguageOptions.filter((opt) => getLangHueIndex(opt.value) === i),
	}))

	return (
		<div className="mx-auto max-w-5xl space-y-8 p-6">
			<header className="space-y-2">
				<h1 className="text-2xl font-bold">Per-language palette</h1>
				<p className="text-muted-foreground text-sm">
					{LANG_HUES.length} hand-picked OKLCH stops, walked over languages in
					popularity order ({'learners × phrases_to_learn'}). Stop walk: 6, 0,
					4, 8, 2, 7, 1, 5, 9, 3 — adjacent ranks always land far apart on the
					wheel.
				</p>
			</header>

			<section className="space-y-2">
				<h2 className="text-lg font-semibold">Swatches</h2>
				<div className="grid grid-cols-5 gap-2 @md:grid-cols-10">
					{LANG_HUES.map((hue, i) => (
						<div
							key={hue}
							className="flex flex-col items-center gap-1 rounded p-2 text-xs"
							style={{ '--hue-primary': hue } as CSSProperties}
						>
							<div className="bg-1-mlo-primary h-10 w-full rounded" />
							<span className="text-muted-foreground">
								#{i} · {hue}°
							</span>
						</div>
					))}
				</div>
			</section>

			<section className="space-y-2">
				<h2 className="text-lg font-semibold">Popularity walk</h2>
				<p className="text-muted-foreground text-sm">
					Languages in popularity order. The stop column should read 6, 0, 4, 8,
					2, 7, 1, 5, 9, 3, 6, 0, 4 …
				</p>
				<div className="grid grid-cols-1 gap-1 @md:grid-cols-2 @lg:grid-cols-3">
					{ranked.map((lang, i) => (
						<div key={lang.lang} className="flex items-center gap-2 text-sm">
							<span className="text-muted-foreground w-6 text-end text-xs tabular-nums">
								{i + 1}
							</span>
							<LangBadge lang={lang.lang} />
							<span className="flex-1 truncate">{lang.name}</span>
							<span className="text-muted-foreground text-xs tabular-nums">
								#{getLangHueIndex(lang.lang)} · {getLangHue(lang.lang)}°
							</span>
						</div>
					))}
				</div>
			</section>

			<section className="space-y-4">
				<h2 className="text-lg font-semibold">Languages by stop</h2>
				{grouped.map((group) => (
					<div key={group.hue} className="space-y-2">
						<div className="text-muted-foreground text-xs">
							stop #{group.index} · hue {group.hue}° · {group.langs.length}{' '}
							{group.langs.length === 1 ? 'language' : 'languages'}
						</div>
						<div className="flex flex-wrap gap-2">
							{group.langs.map((opt) => {
								const pop = getLangPopularityIndex(opt.value)
								return (
									<div
										key={opt.value}
										className="flex items-center gap-2 text-sm"
									>
										<LangBadge lang={opt.value} />
										<span>{opt.label}</span>
										<span className="text-muted-foreground text-xs tabular-nums">
											#{pop + 1}
										</span>
									</div>
								)
							})}
						</div>
					</div>
				))}
			</section>
		</div>
	)
}
