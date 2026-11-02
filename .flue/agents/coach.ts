'use agent'
import { useInitialData, useModel, useTool } from '@flue/runtime'
import { env } from 'cloudflare:workers'
import {
	CoachInitialDataSchema,
	coachToolDescriptions,
	coachToolInputs,
	type CoachInitialData,
} from '../../src/features/coach/protocol'
import { supabaseFor } from '../../worker/supabase'
import { findSimilar, listTags, searchLibrary } from '../coach/library'
import { coachInstructions } from '../coach/prompt'

export function Coach() {
	const data = useInitialData<CoachInitialData>()
	const sb = supabaseFor(env)
	useModel(env.COACH_MODEL, { thinkingLevel: 'off' })

	useTool({
		name: 'search_library',
		description: coachToolDescriptions.search_library,
		input: coachToolInputs.search_library,
		annotations: { readOnlyHint: true },
		run: async ({ data: search }) => ({
			output: await searchLibrary(sb, data, search),
		}),
	})
	useTool({
		name: 'find_similar',
		description: coachToolDescriptions.find_similar,
		input: coachToolInputs.find_similar,
		annotations: { readOnlyHint: true },
		run: async ({ data: input }) => ({
			output: await findSimilar(sb, data, input.phrase_ids, input.limit),
		}),
	})
	useTool({
		name: 'list_tags',
		description: coachToolDescriptions.list_tags,
		input: coachToolInputs.list_tags,
		annotations: { readOnlyHint: true },
		run: async () => ({ output: { tags: await listTags(sb, data.lang) } }),
	})

	// The page reads these outputs off the conversation and acts on them.
	useTool({
		name: 'show_on_page',
		description: coachToolDescriptions.show_on_page,
		input: coachToolInputs.show_on_page,
		run: ({ data: input }) => ({
			output: {
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
		name: 'navigate',
		description: coachToolDescriptions.navigate,
		input: coachToolInputs.navigate,
		run: ({ data: input }) => ({ output: input }),
	})

	return coachInstructions(data)
}

Coach.agentName = 'coach'
Coach.initialData = CoachInitialDataSchema
