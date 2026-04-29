// Feature: chat — Prototype-only conversational phrasebook search
// Public API for the chat domain

export {
	ChatTranslationSchema,
	type ChatTranslationType,
	ChatResultPhraseSchema,
	type ChatResultPhraseType,
	ChatQuerySchema,
	type ChatQueryType,
	ChatTurnSchema,
	type ChatTurnType,
} from './schemas'

export { useChatStore, ChatLangProvider, useChatRouteLang } from './store'
export {
	useChatTurns,
	useChatCart,
	useChatSelection,
	useChatSearch,
} from './hooks'
export { chatSearch, type ChatSearchInput } from './api'
export { ChatPage } from './components/chat-page'
