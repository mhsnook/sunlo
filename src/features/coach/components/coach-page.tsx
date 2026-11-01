import { useCoach } from '../hooks'
import { CoachCanvas } from './coach-canvas'
import { CoachChat } from './coach-chat'

export function CoachPage({ lang }: { lang: string }) {
	const coach = useCoach(lang)

	return (
		<div
			data-testid="coach-page"
			data-lang={lang}
			className="flex h-svh w-full flex-col lg:flex-row"
		>
			<main className="@container min-h-0 flex-1 overflow-y-auto p-4 lg:p-10">
				{coach.ctx && (
					<CoachCanvas
						coachKey={coach.key}
						lang={lang}
						uid={coach.ctx.uid}
						translationLang={coach.translationLang}
					/>
				)}
			</main>
			<aside className="bg-card h-1/2 min-h-0 border-t lg:h-full lg:w-md lg:border-s lg:border-t-0">
				<CoachChat
					coachKey={coach.key}
					lang={lang}
					learnerName={coach.learnerName}
					send={coach.send}
				/>
			</aside>
		</div>
	)
}
