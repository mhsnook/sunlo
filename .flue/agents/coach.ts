'use agent'
import { useDelivery, useModel, useTool } from '@flue/runtime'
import { env } from 'cloudflare:workers'
import {
	coachToolDescriptions,
	coachToolInputs,
	parseCoachContext,
	type CoachContext,
} from '../../src/features/coach/protocol'
import { supabaseFor } from '../../worker/supabase'
import { findSimilar, listTags, searchLibrary } from '../coach/library'
import { coachInstructions } from '../coach/prompt'

export function Coach() {
	const delivery = useDelivery()
	const context =
		delivery.kind === 'user' ? parseCoachContext(delivery.body) : null
	// Every message from the coach page carries its context line.
	const page = (): CoachContext => {
		if (!context)
			throw new Error('The message did not say which language is open.')
		return context
	}
	const sb = supabaseFor(env)
	useModel(env.COACH_MODEL, { thinkingLevel: 'off' })

	useTool({
		name: 'search_library',
		description: coachToolDescriptions.search_library,
		input: coachToolInputs.search_library,
		annotations: { readOnlyHint: true },
		run: async ({ data: search }) => ({
			output: await searchLibrary(sb, page(), search),
		}),
	})
	useTool({
		name: 'find_similar',
		description: coachToolDescriptions.find_similar,
		input: coachToolInputs.find_similar,
		annotations: { readOnlyHint: true },
		run: async ({ data: input }) => ({
			output: await findSimilar(sb, page(), input.phrase_ids, input.limit),
		}),
	})
	useTool({
		name: 'list_tags',
		description: coachToolDescriptions.list_tags,
		input: coachToolInputs.list_tags,
		annotations: { readOnlyHint: true },
		run: async () => ({ output: { tags: await listTags(sb, page().lang) } }),
	})

	// The page reads these outputs off the conversation and acts on them.
	useTool({
		name: 'show_on_page',
		description: coachToolDescriptions.show_on_page,
		input: coachToolInputs.show_on_page,
		run: ({ data: input }) => ({
			output: {
				lang: page().lang,
				title: input.title,
				subtitle: input.subtitle ?? null,
				phrase_ids: input.phrase_ids,
				request_ids: input.request_ids ?? [],
				playlist_ids: input.playlist_ids ?? [],
			},
		}),
	})
	useTool({
		name: 'add_to_deck',
		description: coachToolDescriptions.add_to_deck,
		input: coachToolInputs.add_to_deck,
		run: ({ data: input }) => ({ output: { phrase_ids: input.phrase_ids } }),
	})
	useTool({
		name: 'suggest_replies',
		description: coachToolDescriptions.suggest_replies,
		input: coachToolInputs.suggest_replies,
		run: ({ data: input }) => ({ output: { replies: input.replies } }),
	})
	useTool({
		name: 'draft_request',
		description: coachToolDescriptions.draft_request,
		input: coachToolInputs.draft_request,
		run: ({ data: input }) => ({
			output: { lang: page().lang, prompt: input.prompt },
		}),
	})
	useTool({
		name: 'navigate',
		description: coachToolDescriptions.navigate,
		input: coachToolInputs.navigate,
		run: ({ data: input }) => ({ output: input }),
	})

	return coachInstructions(context)
}

Coach.agentName = 'coach'
// Every attempt is a paid model run. A turn that cannot finish in two
// minutes or three attempts fails, and the learner can send again.
Coach.durability = { maxAttempts: 3, timeoutMs: 120_000 }
