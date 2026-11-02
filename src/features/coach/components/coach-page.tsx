import { useCoach, useDeckMeter } from '../hooks'
import { startOver } from '../store'
import { CoachCanvas } from './coach-canvas'
import { CoachChat } from './coach-chat'

export function CoachPage({ lang, uid }: { lang: string; uid: string }) {
	const deck = useDeckMeter(lang)
	const coach = useCoach(lang, uid, deck)

	return (
		<div
			data-testid="coach-page"
			data-lang={lang}
			className="flex h-svh w-full flex-col lg:flex-row"
		>
			<main className="@container min-h-0 flex-1 overflow-y-auto p-4 lg:p-10">
				<CoachCanvas
					coachKey={coach.key}
					coachViews={coach.views}
					lang={lang}
					uid={uid}
					translationLang={coach.translationLang}
					deck={deck}
				/>
			</main>
			<aside className="bg-card h-1/2 min-h-0 border-t lg:h-full lg:w-md lg:border-s lg:border-t-0">
				<CoachChat
					coachKey={coach.key}
					lang={lang}
					learnerName={coach.learnerName}
					deckSize={deck.size}
					log={coach.log}
					suggestions={coach.suggestions}
					started={coach.started}
					busy={coach.busy}
					send={(text) => void coach.send(text)}
					startOver={() => startOver(uid, lang)}
				/>
			</aside>
		</div>
	)
}
