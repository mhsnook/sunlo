import supabase from '@/lib/supabase-client'
import type { ChatQueryType, ChatResultPhraseType } from './schemas'

// Two implementations of `chatSearch` live here:
//   - chatSearchMock — deterministic canned data, used by scenetest specs.
//   - chatSearchLive — invokes the chat-search Edge Function.
//
// `chatSearch` defaults to the live function but falls back to the mock when
// the env flag is set OR when running under the scenetest harness so the
// existing UI tests keep passing without populated chat_corpus.

export type ChatSearchInput = {
	lang: string
	excludePids: string[]
	query: ChatQueryType
}

const USE_MOCK =
	import.meta.env.VITE_CHAT_USE_MOCK === 'true' ||
	import.meta.env.MODE === 'test'

const MOCK_BANK: Record<string, ChatResultPhraseType[]> = {
	spa: [
		{
			id: 'mock-spa-001',
			lang: 'spa',
			text: 'Voy a la tienda',
			score: 0.92,
			translations: [
				{ id: 'mock-spa-001-en', lang: 'eng', text: 'I am going to the store' },
			],
		},
		{
			id: 'mock-spa-002',
			lang: 'spa',
			text: '¿Cuánto cuesta?',
			score: 0.81,
			translations: [
				{ id: 'mock-spa-002-en', lang: 'eng', text: 'How much does it cost?' },
			],
		},
		{
			id: 'mock-spa-003',
			lang: 'spa',
			text: '¿Dónde está el supermercado?',
			score: 0.78,
			translations: [
				{
					id: 'mock-spa-003-en',
					lang: 'eng',
					text: 'Where is the supermarket?',
				},
			],
		},
		{
			id: 'mock-spa-004',
			lang: 'spa',
			text: 'Necesito comprar pan',
			score: 0.74,
			translations: [
				{ id: 'mock-spa-004-en', lang: 'eng', text: 'I need to buy bread' },
			],
		},
		{
			id: 'mock-spa-005',
			lang: 'spa',
			text: '¿Aceptan tarjeta?',
			score: 0.7,
			translations: [
				{ id: 'mock-spa-005-en', lang: 'eng', text: 'Do you take card?' },
			],
		},
	],
	hin: [
		{
			id: 'mock-hin-001',
			lang: 'hin',
			text: 'main dukaan jaa rahaa hoon',
			score: 0.91,
			translations: [
				{ id: 'mock-hin-001-en', lang: 'eng', text: 'I am going to the shop' },
			],
		},
		{
			id: 'mock-hin-002',
			lang: 'hin',
			text: 'yeh kitne ka hai?',
			score: 0.83,
			translations: [
				{ id: 'mock-hin-002-en', lang: 'eng', text: 'How much is this?' },
			],
		},
		{
			id: 'mock-hin-003',
			lang: 'hin',
			text: 'mujhe yeh khariidnaa hai',
			score: 0.79,
			translations: [
				{ id: 'mock-hin-003-en', lang: 'eng', text: 'I want to buy this' },
			],
		},
		{
			id: 'mock-hin-004',
			lang: 'hin',
			text: 'baazaar kahaan hai?',
			score: 0.75,
			translations: [
				{ id: 'mock-hin-004-en', lang: 'eng', text: 'Where is the market?' },
			],
		},
		{
			id: 'mock-hin-005',
			lang: 'hin',
			text: 'kya aap card lete hain?',
			score: 0.71,
			translations: [
				{ id: 'mock-hin-005-en', lang: 'eng', text: 'Do you take cards?' },
			],
		},
	],
}

export async function chatSearchMock(
	input: ChatSearchInput
): Promise<ChatResultPhraseType[]> {
	await new Promise((resolve) => setTimeout(resolve, 350))

	const bank = MOCK_BANK[input.lang] ?? MOCK_BANK.spa
	const filtered = bank.filter((p) => !input.excludePids.includes(p.id))
	return filtered.slice(0, 3)
}

export async function chatSearchLive(
	input: ChatSearchInput
): Promise<ChatResultPhraseType[]> {
	const result = await supabase.functions.invoke<ChatResultPhraseType[]>(
		'chat-search',
		{ body: input }
	)
	if (result.error) {
		throw new Error(`chat-search failed: ${String(result.error)}`)
	}
	return result.data ?? []
}

export const chatSearch = USE_MOCK ? chatSearchMock : chatSearchLive

export const SUPPORTED_LANGS = [
	{ code: 'spa', label: 'Spanish' },
	{ code: 'hin', label: 'Hindi' },
] as const
