import { Hono } from 'hono'
import { z } from 'zod'
import { crewKeys, MAX_SPEECH_CHARS, type CrewKey } from '../shared/crew'
import type { AppEnv } from './api'

type Speaker = NonNullable<Ai_Cf_Deepgram_Aura_2_En_Input['speaker']>

// Each agent speaks in its own Deepgram Aura 2 voice.
const voices: Record<CrewKey, Speaker> = {
	'command-1': 'orion',
	'command-2': 'arcas',
	'product-1': 'apollo',
	'library-1': 'minerva',
	'learnership-1': 'phoebe',
}

// Push-to-talk clips are seconds long; this only stops a runaway upload.
const MAX_AUDIO_BYTES = 20 * 1024 * 1024

async function transcribe(ai: Ai, audio: ReadableStream, contentType: string) {
	const result = await ai.run('@cf/deepgram/nova-3', {
		audio: { body: audio, contentType },
		smart_format: true,
		punctuate: true,
	})
	return result.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? ''
}

function speak(ai: Ai, text: string, agent: CrewKey) {
	return ai.run(
		'@cf/deepgram/aura-2-en',
		{ text, speaker: voices[agent], encoding: 'mp3' },
		{ returnRawResponse: true }
	)
}

// Speech to text for the mic in every compose bar, and text to speech for
// reading the crew's replies aloud. Mounted behind the admin check.
export const voiceRoutes = new Hono<AppEnv>()
	.post('/transcribe', async (c) => {
		const contentType = c.req.header('content-type')?.split(';')[0] ?? ''
		if (!contentType.startsWith('audio/') || !c.req.raw.body) {
			return c.json({ error: 'Send the recording as an audio/* body' }, 400)
		}
		const size = Number(c.req.header('content-length') ?? 0)
		if (size > MAX_AUDIO_BYTES) {
			return c.json({ error: 'That recording is too long' }, 413)
		}
		return c.json({
			text: await transcribe(c.env.AI, c.req.raw.body, contentType),
		})
	})
	.post('/speak', async (c) => {
		const body = z
			.object({
				text: z.string().trim().min(1).max(MAX_SPEECH_CHARS),
				agent: z.enum(crewKeys),
			})
			.safeParse(await c.req.json().catch(() => null))
		if (!body.success) {
			return c.json({ error: 'Send { text, agent }' }, 400)
		}
		const audio = await speak(c.env.AI, body.data.text, body.data.agent)
		if (!audio.ok) {
			return c.json({ error: 'The voice model failed' }, 502)
		}
		return new Response(audio.body, {
			headers: { 'content-type': 'audio/mpeg' },
		})
	})
