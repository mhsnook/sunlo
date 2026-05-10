import { CSSProperties, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ChevronsRight, ShieldAlert } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Loader } from '@/components/ui/loader'
import Callout from '@/components/ui/callout'
import { SelectOneLanguage } from '@/components/select-one-language'
import { useLanguagesSortedByLearners } from '@/features/languages/hooks'
import { useAuth } from '@/lib/use-auth'
import { languagesCollection } from '@/features/languages/collections'

export const Route = createFileRoute('/_user/admin/')({
	component: AdminIndex,
	beforeLoad: () => ({
		titleBar: {
			title: 'Admin',
			subtitle: 'Content Management',
		},
	}),
	loader: async () => {
		await languagesCollection.preload()
	},
})

const style = { viewTransitionName: 'main-area' } as CSSProperties

function AdminIndex() {
	const { isAdmin, userEmail } = useAuth()
	const { data: languages, isLoading } = useLanguagesSortedByLearners()
	const navigate = useNavigate()
	const [langValue, setLangValue] = useState('')

	const topLanguages = languages?.slice(0, 6) ?? []

	return (
		<main style={style} className="space-y-8" data-testid="admin-index-page">
			{!isAdmin && (
				<div data-testid="admin-not-authorized-warning">
					<Callout variant="problem" Icon={ShieldAlert}>
						<p>
							You are logged in as <strong>{userEmail}</strong> who is not an
							admin user; the forms on this page will not work.
						</p>
					</Callout>
				</div>
			)}

			<header>
				<h1 className="text-2xl font-bold">Content Management</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					Select a language to manage its phrases and requests.
				</p>
			</header>

			{isLoading ? (
				<Loader />
			) : (
				<>
					<section className="space-y-3">
						<h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
							Popular languages
						</h2>
						<div className="grid grid-cols-1 gap-3 @sm:grid-cols-2 @xl:grid-cols-3">
							{topLanguages.map((lang) => (
								<Link
									key={lang.lang}
									to="/admin/$lang/phrases"
									params={{ lang: lang.lang }}
									className="block transition-all duration-200 hover:-translate-y-0.5"
								>
									<Card className="flex items-center justify-between gap-3 p-4 hover:shadow">
										<div className="space-y-0.5">
											<h3 className="text-lg leading-tight font-semibold">
												{lang.name}
											</h3>
											<p className="text-muted-foreground text-xs">
												{lang.phrases_to_learn ?? 0} phrases
												{' · '}
												{lang.learners ?? 0} learners
											</p>
										</div>
										<ChevronsRight className="text-muted-foreground h-5 w-5 shrink-0" />
									</Card>
								</Link>
							))}
						</div>
					</section>

					<section className="space-y-3">
						<h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
							Or find a language
						</h2>
						<div className="max-w-sm">
							<SelectOneLanguage
								value={langValue}
								setValue={(val) => {
									setLangValue(val)
									if (val) {
										void navigate({
											to: '/admin/$lang/phrases',
											params: { lang: val },
										})
									}
								}}
							/>
						</div>
					</section>
				</>
			)}
		</main>
	)
}
