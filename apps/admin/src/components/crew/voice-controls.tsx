import type { ReactNode } from 'react'
import { Loader2, Mic, Square, Volume2, VolumeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { CrewKey } from '../../../shared/crew'
import {
	appendDictation,
	setVoiceReplies,
	speakNow,
	stopSpeech,
	useDictation,
	useIsSpeaking,
	useVoiceReplies,
} from '~/lib/voice'

// The mic and the voice-replies toggle, for a compose bar's start slot. What
// the admin says joins the draft, to read before sending.
export function VoiceControls({
	setDraft,
}: {
	setDraft: (update: (draft: string) => string) => void
}) {
	const dictation = useDictation((text) =>
		setDraft((draft) => appendDictation(draft, text))
	)
	const voiceReplies = useVoiceReplies()
	return (
		<>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				aria-label={
					dictation.state === 'recording'
						? 'Stop recording'
						: dictation.state === 'transcribing'
							? 'Transcribing'
							: 'Talk'
				}
				aria-pressed={dictation.state === 'recording'}
				disabled={dictation.state === 'transcribing'}
				data-testid="voice-mic"
				data-state={dictation.state}
				className={cn(
					dictation.state === 'recording' &&
						'bg-danger-100 text-danger-700 hover:bg-danger-200 animate-pulse'
				)}
				onClick={dictation.toggle}
			>
				{dictation.state === 'transcribing' ? (
					<Loader2 className="animate-spin" />
				) : dictation.state === 'recording' ? (
					<Square />
				) : (
					<Mic />
				)}
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				aria-label="Read replies aloud"
				aria-pressed={voiceReplies}
				data-testid="voice-replies"
				className={cn(voiceReplies && 'text-primary-700 bg-primary-100')}
				onClick={() => setVoiceReplies(!voiceReplies)}
			>
				{voiceReplies ? <Volume2 /> : <VolumeOff />}
			</Button>
		</>
	)
}

// An agent's bubble with a button beside it that reads it aloud, shown on
// hover and always on a touch screen. Anything else renders as it is.
export function SpeakableBubble({
	id,
	text,
	agent,
	blocks,
	children,
}: {
	id: string
	text: string
	agent: CrewKey | null
	// A bubble with a chart or other block spans the full width.
	blocks: boolean
	children: ReactNode
}) {
	if (!agent) return children
	return (
		<div
			className={cn(
				'group/speech flex items-end gap-1',
				blocks
					? 'w-full'
					: 'max-w-full @md:max-w-[80%] *:data-[slot=bubble]:max-w-full'
			)}
		>
			{children}
			<ReadAloudButton id={id} text={text} agent={agent} />
		</div>
	)
}

function ReadAloudButton({
	id,
	text,
	agent,
}: {
	id: string
	text: string
	agent: CrewKey
}) {
	const speaking = useIsSpeaking(id)
	return (
		<Button
			type="button"
			variant="ghost"
			size="icon"
			aria-label={speaking ? 'Stop reading' : 'Read aloud'}
			data-testid="voice-read"
			data-key={id}
			className={cn(
				'size-7 shrink-0 opacity-0 group-hover/speech:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100',
				speaking && 'opacity-100'
			)}
			onClick={() => (speaking ? stopSpeech() : speakNow({ id, text, agent }))}
		>
			{speaking ? <Square /> : <Volume2 />}
		</Button>
	)
}
