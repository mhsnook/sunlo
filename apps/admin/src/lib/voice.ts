import { useRef, useState, useSyncExternalStore } from 'react'
import { z } from 'zod'
import { toastError } from '@/components/ui/sonner'
import type { CrewKey } from '../../shared/crew'
import { adminRequest } from './api'
import { speakable } from './speakable'

// ---- Speech to text -------------------------------------------------------

// Push to talk: the first toggle records, the second sends the recording to
// the Worker and hands back the words.
export function useDictation(onText: (text: string) => void) {
	const [state, setState] = useState<'idle' | 'recording' | 'transcribing'>(
		'idle'
	)
	const recorder = useRef<MediaRecorder | null>(null)

	async function start() {
		const stream = await navigator.mediaDevices
			.getUserMedia({ audio: true })
			.catch(() => null)
		if (!stream) {
			toastError('Allow the microphone to talk to the crew')
			return
		}
		const chunks: Array<Blob> = []
		const media = new MediaRecorder(stream)
		media.ondataavailable = (event) => chunks.push(event.data)
		media.onstop = () => {
			for (const track of stream.getTracks()) track.stop()
			setState('transcribing')
			void transcribe(new Blob(chunks, { type: media.mimeType }))
				.then((text) => text && onText(text))
				.catch((error: Error) => toastError(error.message))
				.finally(() => setState('idle'))
		}
		media.start()
		recorder.current = media
		setState('recording')
	}

	function toggle() {
		if (state === 'recording') {
			recorder.current?.stop()
			recorder.current = null
		} else if (state === 'idle') {
			void start()
		}
	}

	return { state, toggle }
}

async function transcribe(audio: Blob) {
	const res = await adminRequest('voice/transcribe', {
		method: 'POST',
		body: audio,
		contentType: audio.type,
	})
	return z
		.object({ text: z.string() })
		.parse(await res.json())
		.text.trim()
}

// ---- Text to speech -------------------------------------------------------

// One voice speaks at a time. Pressing play on a message stops whatever is
// speaking; replies read aloud on arrival wait their turn in the queue.
type Speech = { id: string; text: string; agent: CrewKey }

let playing: string | null = null
let audio: HTMLAudioElement | null = null
const queue: Array<Speech> = []
const listeners = new Set<() => void>()

function setPlaying(id: string | null) {
	playing = id
	for (const listener of listeners) listener()
}

export function useSpeaking() {
	return useSyncExternalStore(
		(listener) => {
			listeners.add(listener)
			return () => listeners.delete(listener)
		},
		() => playing
	)
}

export function stopSpeech() {
	queue.length = 0
	audio?.pause()
	audio = null
	setPlaying(null)
}

export function speakNow(speech: Speech) {
	stopSpeech()
	void play(speech)
}

export function speakInTurn(speech: Speech) {
	if (playing) queue.push(speech)
	else void play(speech)
}

async function play(speech: Speech) {
	const text = speakable(speech.text)
	if (!text) return playNext()
	setPlaying(speech.id)
	try {
		const res = await adminRequest('voice/speak', {
			method: 'POST',
			body: JSON.stringify({ text, agent: speech.agent }),
			contentType: 'application/json',
		})
		const url = URL.createObjectURL(await res.blob())
		// Stopped, or replaced by another message, while the audio loaded.
		if (playing !== speech.id) return URL.revokeObjectURL(url)
		const sound = new Audio(url)
		sound.onended = () => {
			URL.revokeObjectURL(url)
			if (audio === sound) playNext()
		}
		audio = sound
		await sound.play()
	} catch (error) {
		if (playing === speech.id) {
			toastError((error as Error).message)
			playNext()
		}
	}
}

function playNext() {
	audio = null
	const next = queue.shift()
	if (next) void play(next)
	else setPlaying(null)
}

// ---- Voice replies --------------------------------------------------------

// Whether new replies are read aloud as they arrive, remembered per browser.
const VOICE_REPLIES_KEY = 'sunlo-admin-voice-replies'
let voiceReplies = (() => {
	try {
		return localStorage.getItem(VOICE_REPLIES_KEY) === 'on'
	} catch {
		return false
	}
})()
const voiceListeners = new Set<() => void>()

export function setVoiceReplies(on: boolean) {
	voiceReplies = on
	try {
		localStorage.setItem(VOICE_REPLIES_KEY, on ? 'on' : 'off')
	} catch {
		// Storage can be refused, as in a private window; the choice then
		// lasts until the page reloads.
	}
	if (!on) stopSpeech()
	for (const listener of voiceListeners) listener()
}

export function useVoiceReplies() {
	return useSyncExternalStore(
		(listener) => {
			voiceListeners.add(listener)
			return () => voiceListeners.delete(listener)
		},
		() => voiceReplies
	)
}
