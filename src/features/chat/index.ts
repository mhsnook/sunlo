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

export { useChatStore } from './store'
export {
	useChatLang,
	useChatTurns,
	useChatCart,
	useChatSelection,
	useChatSearch,
} from './hooks'
export { chatSearch, SUPPORTED_LANGS, type ChatSearchInput } from './api'
export { ChatPage } from './components/chat-page'
