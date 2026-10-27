import { useEffect, useRef } from 'react'
import { Loader2, Mic, Square, Volume2, VolumeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
	isCrewKey,
	type CrewKey,
	type CrewMessageType,
} from '../../../shared/crew'
import {
	setVoiceReplies,
	speakInTurn,
	speakNow,
	stopSpeech,
	useDictation,
	useSpeaking,
	useVoiceReplies,
} from '~/lib/voice'

// The mic and the voice-replies toggle, for a compose bar's start slot.
// What the admin says lands in the draft, to read before sending.
export function VoiceControls({ onText }: { onText: (text: string) => void }) {
	const dictation = useDictation(onText)
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

// Plays one message, or stops it while it speaks.
export function ReadAloudButton({
	id,
	text,
	agent,
	className,
}: {
	id: string
	text: string
	agent: CrewKey
	className?: string
}) {
	const speaking = useSpeaking() === id
	return (
		<Button
			type="button"
			variant="ghost"
			size="icon"
			aria-label={speaking ? 'Stop reading' : 'Read aloud'}
			data-testid="voice-read"
			data-key={id}
			className={cn('size-7', className, speaking && 'opacity-100')}
			onClick={() => (speaking ? stopSpeech() : speakNow({ id, text, agent }))}
		>
			{speaking ? <Square /> : <Volume2 />}
		</Button>
	)
}

// Reads each agent message that arrives while the page is open, when voice
// replies are on. Messages already on the page when it opened stay quiet.
export function useReadNewReplies(messages: Array<CrewMessageType>) {
	const voiceReplies = useVoiceReplies()
	const seen = useRef<Set<string> | null>(null)
	useEffect(() => {
		if (!seen.current) {
			seen.current = new Set(messages.map((message) => message.id))
			return
		}
		for (const message of messages) {
			if (seen.current.has(message.id)) continue
			seen.current.add(message.id)
			if (voiceReplies && isCrewKey(message.author) && !message.receipt) {
				speakInTurn({
					id: message.id,
					text: message.body,
					agent: message.author,
				})
			}
		}
	}, [messages, voiceReplies])
}
