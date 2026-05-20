import { useState } from 'react'
import { Play } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { IconSizedLoader } from '@/components/ui/loader'
import Flagged from '@/components/flagged'
import { toastError } from '@/components/ui/sonner'
import supabase from '@/lib/supabase-client'

type TtsResponse = { audio: string; mime: string }

// POC: a Workers AI call costs money and the audio is deterministic, so each
// synthesized clip (as a `data:` URL) is kept for the lifetime of the page.
const audioCache = new Map<string, string>()
let currentAudio: HTMLAudioElement | null = null

// invoke() reports the function's status code but not its body, so on failure
// read the raw Response — our `{ error }` JSON carries a message worth showing.
async function readErrorMessage(
	response: Response | undefined
): Promise<string> {
	const fallback = 'Text-to-speech request failed'
	if (!response) return fallback
	try {
		const body = (await response.json()) as { error?: string }
		return body.error ?? fallback
	} catch {
		return fallback
	}
}

async function getAudioUrl(text: string, lang: string): Promise<string> {
	const key = `${lang}::${text}`
	const cached = audioCache.get(key)
	if (cached) return cached

	const result = await supabase.functions.invoke<TtsResponse>('tts', {
		body: { text, lang },
	})
	if (result.error) {
		throw new Error(await readErrorMessage(result.response))
	}
	if (!result.data?.audio) throw new Error('No audio was returned')

	const dataUrl = `data:${result.data.mime};base64,${result.data.audio}`
	audioCache.set(key, dataUrl)
	return dataUrl
}

export function PhraseSpeakerButton({
	text,
	lang,
	'aria-label': ariaLabel = 'Play audio',
}: {
	text: string
	lang: string
	'aria-label'?: string
}) {
	const [loading, setLoading] = useState(false)

	const play = async () => {
		if (loading) return
		setLoading(true)
		try {
			const url = await getAudioUrl(text, lang)
			currentAudio?.pause()
			currentAudio = new Audio(url)
			await currentAudio.play()
		} catch (err) {
			console.error('TTS error:', err)
			toastError(err instanceof Error ? err.message : 'Could not play audio')
		} finally {
			setLoading(false)
		}
	}

	return (
		<Flagged name="text_to_speech">
			<Button
				type="button"
				size="icon"
				variant="ghost"
				onClick={() => void play()}
				disabled={loading}
				aria-label={ariaLabel}
				data-testid="phrase-speaker-button"
			>
				{loading ? <IconSizedLoader size={16} /> : <Play className="size-4" />}
			</Button>
		</Flagged>
	)
}
