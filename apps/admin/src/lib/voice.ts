import { useEffect, useRef, useState } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
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
	})
	return z
		.object({ text: z.string() })
		.parse(await res.json())
		.text.trim()
}

// Dictation joins the draft after a space, so talking twice adds a sentence.
export const appendDictation = (draft: string, text: string) =>
	draft.trim() ? `${draft.trimEnd()} ${text}` : text

// ---- Text to speech -------------------------------------------------------

type Speech = { id: string; text: string; agent: CrewKey }

// What is speaking, and whether replies are read aloud on arrival. Only the
// second outlives the page.
type VoiceState = { playing: string | null; voiceReplies: boolean }

const useVoice = create<VoiceState>()(
	persist((): VoiceState => ({ playing: null, voiceReplies: false }), {
		name: 'sunlo-admin-voice',
		partialize: (state) => ({ voiceReplies: state.voiceReplies }),
	})
)

export const useIsSpeaking = (id: string) =>
	useVoice((state) => state.playing === id)
export const useVoiceReplies = () => useVoice((state) => state.voiceReplies)

export function setVoiceReplies(on: boolean) {
	useVoice.setState({ voiceReplies: on })
	if (!on) stopSpeech()
}

// The last few clips, by message id, so a replay costs no second request.
// A queued reply starts loading here as soon as it is queued.
const clips = new Map<string, Promise<Blob>>()
const CLIPS_KEPT = 10
const SPEECH_RATE = 1.25

// `words` is the text already made speakable.
function loadClip(id: string, words: string, agent: CrewKey) {
	let clip = clips.get(id)
	if (!clip) {
		clip = adminRequest('voice/speak', {
			method: 'POST',
			json: { text: words, agent },
		}).then((res) => res.blob())
		clip.catch(() => clips.delete(id))
		clips.set(id, clip)
		const oldest = clips.keys().next().value
		if (clips.size > CLIPS_KEPT && oldest) clips.delete(oldest)
	}
	return { id, clip }
}

// One voice speaks at a time. Play on a message stops whatever is speaking;
// replies read on arrival wait their turn.
const queue: Array<{ id: string; clip: Promise<Blob> }> = []
let current: { audio: HTMLAudioElement; url: string } | null = null

function release() {
	if (!current) return
	current.audio.pause()
	URL.revokeObjectURL(current.url)
	current = null
}

export function stopSpeech() {
	queue.length = 0
	release()
	useVoice.setState({ playing: null })
}

export function speakNow({ id, text, agent }: Speech) {
	stopSpeech()
	const words = speakable(text)
	if (words) void play(loadClip(id, words, agent))
}

export function speakInTurn({ id, text, agent }: Speech) {
	const words = speakable(text)
	if (!words) return
	const item = loadClip(id, words, agent)
	if (useVoice.getState().playing) queue.push(item)
	else void play(item)
}

async function play({ id, clip }: { id: string; clip: Promise<Blob> }) {
	useVoice.setState({ playing: id })
	try {
		const blob = await clip
		// Stopped, or replaced by another message, while the clip loaded.
		if (useVoice.getState().playing !== id) return
		const audio = new Audio(URL.createObjectURL(blob))
		audio.playbackRate = SPEECH_RATE
		current = { audio, url: audio.src }
		audio.addEventListener('ended', () => {
			if (current?.audio === audio) playNext()
		})
		await audio.play()
	} catch (error) {
		if (useVoice.getState().playing === id) {
			toastError((error as Error).message)
			playNext()
		}
	}
}

function playNext() {
	release()
	const next = queue.shift()
	if (next) void play(next)
	else useVoice.setState({ playing: null })
}

// Reads each finished reply that arrives while the page is open, when voice
// replies are on. Replies already there when `ready` turns true stay quiet.
export function useReadOnArrival(replies: Array<Speech>, ready = true) {
	const voiceReplies = useVoiceReplies()
	const seen = useRef<Set<string> | null>(null)
	useEffect(() => {
		if (!ready) return
		if (!seen.current) {
			seen.current = new Set(replies.map((reply) => reply.id))
			return
		}
		for (const reply of replies) {
			if (seen.current.has(reply.id)) continue
			seen.current.add(reply.id)
			if (voiceReplies) speakInTurn(reply)
		}
	}, [replies, ready, voiceReplies])
}
