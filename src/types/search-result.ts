export type SearchResultType = 'phrase' | 'playlist' | 'request'

export interface SearchResult {
	id: string
	lang: string
	title: string
	subtitle: string | null
	type: SearchResultType
}
