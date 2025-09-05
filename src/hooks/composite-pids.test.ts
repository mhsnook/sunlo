import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useCompositePids } from './composite-pids'
import type {
	DeckPids,
	PhrasesMap,
	ProfileFull,
	pids,
	PhraseFull,
	TranslationRow,
} from '@/types/main'

// Mock dependencies
vi.mock('@/lib/use-profile', () => ({
	useProfile: vi.fn(),
}))
vi.mock('@/lib/use-language', () => ({
	useLanguagePhrasesMap: vi.fn(),
	useLanguagePids: vi.fn(),
}))
vi.mock('@/lib/use-deck', () => ({
	useDeckPids: vi.fn(),
}))

// Import mocked hooks to use them
const { useProfile } = await import('@/lib/use-profile')
const { useLanguagePhrasesMap, useLanguagePids } = await import(
	'@/lib/use-language'
)
const { useDeckPids } = await import('@/lib/use-deck')

// Some helper types for mocks
type Mockable<T> = {
	-readonly [P in keyof T]: T[P]
}

const mockProfile: Mockable<ProfileFull> = {
	uid: 'user-1',
	username: 'testuser',
	avatarUrl: '',
	languagesToShow: ['eng'],
	decksMap: {},
	deckLanguages: ['spa'],
	languages_known: [{ lang: 'eng', level: 'fluent' }],
	created_at: '2023-01-01T00:00:00Z',
	updated_at: '2023-01-01T00:00:00Z',
}

const mockPhrases: Array<
	PhraseFull & { translations: Partial<TranslationRow> }
> = Array.from({ length: 20 }, (_, i) => ({
	id: `p${i + 1}`,
	lang: 'spa',
	text: `Phrase ${i + 1}`,
	translations:
		i % 3 === 0 ?
			[
				{
					id: `t${i + 1}`,
					lang: 'eng',
					text: `Translation ${i + 1}`,
					added_by: null,
					created_at: `2023-01-${(i + 1).toString().padStart(2, '0')}T00:00:00Z`,
					literal: null,
					phrase_id: `p${i + 1}`,
					text_script: null,
				},
			]
		: i % 3 === 1 ?
			[
				{
					id: `t${i + 1}`,
					lang: 'fra',
					text: `Traduction ${i + 1}`,
					added_by: null,
					created_at: `2023-01-${(i + 1).toString().padStart(2, '0')}T00:00:00Z`,
					literal: null,
					phrase_id: `p${i + 1}`,
					text_script: null,
				},
			]
		:	[
				{
					id: `p${i + 1}-t1`,
					lang: 'eng',
					text: `Sranslation ${i + 1}-1`,
					added_by: null,
					created_at: `2023-01-${(i + 1).toString().padStart(2, '0')}T00:00:00Z`,
					literal: null,
					phrase_id: `p${i + 1}`,
					text_script: null,
				},
				{
					id: `p${i + 1}-t2`,
					lang: 'fra',
					text: `Sraduction ${i + 1}-2`,
					added_by: null,
					created_at: `2023-01-${(i + 1).toString().padStart(2, '0')}T00:00:00Z`,
					literal: null,
					phrase_id: `p${i + 1}`,
					text_script: null,
				},
			],
	avg_difficulty: (i + 1) * 5, // p1: 5, p2: 10, ...
	count_cards: 100 - i * 4, // p1: 100, p2: 96, ...
	created_at: `2023-01-${(i + 1).toString().padStart(2, '0')}T00:00:00Z`,
	phrase_id: `p${i + 1}`,
	tags: [],
	count_translations: 1,
	count_decks: 1,
	avg_stability: null,
	count_active: 60 - i * 4,
	count_learned: 20 - 2 * i,
	count_skipped: 20 - 1 * i,
	percent_active: (60 - i * 4) / (100 - i * 4),
	percent_learned: (20 - i * 2) / (100 - i * 4),
	percent_skipped: (20 - i * 1) / (100 - i * 4),
	rank_least_difficult: i,
	rank_least_skipped: i,
	rank_most_learned: i,
	rank_most_stable: i,
	rank_newest: i,
}))

const mockPhrasesMap: PhrasesMap = mockPhrases.reduce((acc, p) => {
	acc[p.id!] = p
	return acc
}, {} as PhrasesMap)

const mockLanguagePids: pids = mockPhrases.map((p) => p.id!)

const mockDeckPids: DeckPids = {
	all: ['p1', 'p4', 'p10'],
	active: ['p1', 'p4'],
	inactive: ['p10'],
	reviewed: ['p1'],
	reviewed_or_inactive: ['p1', 'p10'],
	reviewed_last_7d: ['p1'],
	unreviewed_active: ['p4'],
	today_active: [],
}

describe('useCompositePids', () => {
	beforeEach(() => {
		// Reset mocks before each test
		vi.mocked(useProfile).mockReturnValue({ data: mockProfile } as any)
		vi.mocked(useLanguagePhrasesMap).mockReturnValue({
			data: mockPhrasesMap,
		} as any)
		vi.mocked(useLanguagePids).mockReturnValue({
			data: mockLanguagePids,
		} as any)
		vi.mocked(useDeckPids).mockReturnValue({ data: mockDeckPids } as any)
	})

	describe('data loading states', () => {
		it('should return data when all dependent queries are loaded', () => {
			const { result } = renderHook(() => useCompositePids('spa'))
			expect(result.current).not.toBeNull()
		})

		it('should return null if profile data is missing', () => {
			vi.mocked(useProfile).mockReturnValue({ data: undefined } as any)
			const { result } = renderHook(() => useCompositePids('spa'))
			expect(result.current).toBeNull()
		})

		it('should return null if phrasesMap data is missing', () => {
			vi.mocked(useLanguagePhrasesMap).mockReturnValue({
				data: undefined,
			} as any)
			const { result } = renderHook(() => useCompositePids('spa'))
			expect(result.current).toBeNull()
		})

		it('should return null if languagePids data is missing', () => {
			vi.mocked(useLanguagePids).mockReturnValue({ data: undefined } as any)
			const { result } = renderHook(() => useCompositePids('spa'))
			expect(result.current).toBeNull()
		})

		it('should return null if deckPids data is missing', () => {
			vi.mocked(useDeckPids).mockReturnValue({ data: undefined } as any)
			const { result } = renderHook(() => useCompositePids('spa'))
			expect(result.current).toBeNull()
		})
	})

	it('should correctly filter phrases based on user-known languages', () => {
		const { result } = renderHook(() => useCompositePids('spa'))
		// Phrases with index i where i % 3 === 0 have 'eng' translations.
		// i = 0, 3, 6, 9, 12, 15, 18
		// pids: p1, p4, p7, p10, p13, p16, p19
		const expectedPids = ['p1', 'p4', 'p7', 'p10', 'p13', 'p16', 'p19']
		expect(result.current?.language_filtered).toEqual(
			expect.arrayContaining(expectedPids)
		)
		expect(result.current?.language_filtered).toHaveLength(expectedPids.length)
	})

	it('should identify phrases that have no usable translations', () => {
		const { result } = renderHook(() => useCompositePids('spa'))
		const expectedPids = ['p1', 'p4', 'p7', 'p10', 'p13', 'p16', 'p19']
		const allPids = mockLanguagePids
		const pidsWithoutTranslations = allPids.filter(
			(p) => !expectedPids.includes(p)
		)
		expect(result.current?.language_no_translations).toEqual(
			expect.arrayContaining(pidsWithoutTranslations)
		)
		expect(result.current?.language_no_translations).toHaveLength(
			pidsWithoutTranslations.length
		)
	})

	it('should identify phrases not yet in the user deck', () => {
		const { result } = renderHook(() => useCompositePids('spa'))
		// language_filtered: ['p1', 'p4', 'p7', 'p10', 'p13', 'p16', 'p19']
		// deckPids.all: ['p1', 'p4', 'p10']
		const expected = ['p7', 'p13', 'p16', 'p19']
		expect(result.current?.not_in_deck).toEqual(
			expect.arrayContaining(expected)
		)
		expect(result.current?.not_in_deck).toHaveLength(expected.length)
	})

	it('should identify selectable phrases for the user', () => {
		const { result } = renderHook(() => useCompositePids('spa'))
		// language_filtered: ['p1', 'p4', 'p7', 'p10', 'p13', 'p16', 'p19']
		// deckPids.reviewed_or_inactive: ['p1', 'p10']
		const expected = ['p4', 'p7', 'p13', 'p16', 'p19']
		expect(result.current?.language_selectables).toEqual(
			expect.arrayContaining(expected)
		)
		expect(result.current?.language_selectables).toHaveLength(expected.length)
	})

	describe('top 8 recommendations', () => {
		it('should sort selectable phrases correctly', () => {
			const { result } = renderHook(() => useCompositePids('spa'))
			const selectables = result.current!.language_selectables // ['p4', 'p7', 'p13', 'p16', 'p19']

			// Easiest: sorted by avg_difficulty ascending
			// p4: 20, p7: 35, p13: 65, p16: 80, p19: 95
			const easiest = selectables.toSorted(
				(a, b) =>
					mockPhrasesMap[a].avg_difficulty! - mockPhrasesMap[b].avg_difficulty!
			)
			expect(easiest).toEqual(['p4', 'p7', 'p13', 'p16', 'p19'])

			// Popular: sorted by count_cards descending
			// p4: 84, p7: 72, p13: 48, p16: 36, p19: 24
			const popular = selectables.toSorted(
				(a, b) =>
					mockPhrasesMap[b].count_cards! - mockPhrasesMap[a].count_cards!
			)
			expect(popular).toEqual(['p4', 'p7', 'p13', 'p16', 'p19'])

			// Newest: sorted by created_at descending
			// p19 > p16 > p13 > p7 > p4
			const newest = selectables.toSorted((a, b) =>
				mockPhrasesMap[b].created_at! > mockPhrasesMap[a].created_at! ? 1 : -1
			)
			expect(newest).toEqual(['p19', 'p16', 'p13', 'p7', 'p4'])
		})

		it('should return top 8 for each category without overlaps', () => {
			// Use a larger set of selectable phrases to test slicing and uniqueness
			const largeMockDeckPids: DeckPids = {
				...mockDeckPids,
				reviewed_or_inactive: [], // makes all filtered phrases selectable
			}
			vi.mocked(useDeckPids).mockReturnValue({
				data: largeMockDeckPids,
			} as any)

			const { result } = renderHook(() => useCompositePids('spa'))
			const { top8 } = result.current!

			expect(top8.popular.length).toBeLessThanOrEqual(8)
			expect(top8.easiest.length).toBeLessThanOrEqual(8)
			expect(top8.newest.length).toBeLessThanOrEqual(8)

			const allTop = [...top8.popular, ...top8.easiest, ...top8.newest]
			const uniqueTop = [...new Set(allTop)]
			expect(allTop.length).toEqual(uniqueTop.length)
		})
	})
})
