import { createFileRoute } from '@tanstack/react-router'
import { Archive } from 'lucide-react'

import { useProfile } from '@/lib/use-profile'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { DeckCard } from '@/components/learn/deck-card'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import Callout from '@/components/ui/callout'

export const Route = createFileRoute('/_user/learn/')({
	component: Page,
})

export default function Page() {
	const { data: profile } = useProfile()
	const [activeTab, setActiveTab] = useState('active')
	if (!profile) return null
	const { decksMap, deckLanguages } = profile
	const activeDecks = deckLanguages.filter((lang) => !decksMap[lang].archived)
	const archivedDecks = deckLanguages.filter((lang) => decksMap[lang].archived)

	return (
		<main className="">
			{/* Navigation Tabs */}
			<Tabs
				value={activeTab}
				onValueChange={setActiveTab}
				className="w-full space-y-6"
			>
				<TabsList className="grid w-full max-w-md grid-cols-2 rounded px-1 py-0">
					<TabsTrigger value="active" className="flex items-center gap-2">
						Active Decks
						{activeDecks.length ?
							<Badge
								variant="secondary"
								className="outline-primary/50 ms-1 outline"
							>
								{activeDecks.length}
							</Badge>
						:	null}
					</TabsTrigger>
					<TabsTrigger value="archived" className="flex items-center gap-2">
						<Archive className="h-4 w-4" />
						Archived
						{archivedDecks.length > 0 && (
							<Badge
								variant="secondary"
								className="outline-primary/50 ms-1 outline"
							>
								{archivedDecks.length}
							</Badge>
						)}
					</TabsTrigger>
				</TabsList>

				<TabsContent value="active" className="w-full space-y-6">
					{activeDecks.length > 0 ?
						<>
							<div className="flex items-center justify-between">
								<h2 className="text-lg font-medium">Ready to study</h2>
								<span className="text--foreground text-sm">
									{activeDecks.length} deck
									{activeDecks.length !== 1 ? 's' : ''}
								</span>
							</div>
							<div className="grid grid-cols-1 gap-6 @xl:grid-cols-2">
								{activeDecks.map((lang) => (
									<DeckCard key={lang} deck={decksMap[lang]} />
								))}
							</div>
						</>
					:	<div className="py-12 text-center">
							<div className="text-muted-foreground mb-4">
								<Archive className="mx-auto h-12 w-12" />
							</div>
							<h3 className="mb-2 text-lg font-medium">No active decks</h3>
							<p className="text-muted-foreground mb-4">
								All your decks have been archived. Restore some to start
								studying!
							</p>
							<Button onClick={() => setActiveTab('archived')}>
								View archived decks
							</Button>
						</div>
					}
				</TabsContent>

				<TabsContent value="archived" className="w-full space-y-6">
					{archivedDecks.length > 0 ?
						<>
							<div className="flex items-center justify-between">
								<h2 className="text-lg font-medium">Archived decks</h2>
								<span className="text-muted-foreground me-2 text-sm">
									{archivedDecks.length} archived deck
									{archivedDecks.length !== 1 ? 's' : ''}
								</span>
							</div>
							<Callout Icon={Archive}>
								<h3 className="font-medium">Archived decks</h3>
								<p className="mt-1 text-sm opacity-70">
									These decks are hidden from your main view but can be restored
									anytime. Your progress is safely preserved.
								</p>
							</Callout>

							<div className="grid grid-cols-1 gap-6 @xl:grid-cols-2">
								{archivedDecks.map((lang) => (
									<DeckCard key={lang} deck={decksMap[lang]} />
								))}
							</div>
						</>
					:	<div className="py-12 text-center">
							<div className="text-muted-foreground mb-4">
								<Archive className="mx-auto h-12 w-12" />
							</div>
							<h3 className="mb-2 text-lg font-medium">No archived decks</h3>
							<p className="text-muted-foreground">
								When you archive decks, they'll appear here for easy
								restoration.
							</p>
						</div>
					}
				</TabsContent>
			</Tabs>
		</main>
	)
}
