import { ComposeBar } from '@/components/ui/compose-bar'
import { useChatSearch } from '../hooks'
import { useChatRouteLang, useChatStore } from '../store'

export function ChatInput() {
	const lang = useChatRouteLang()
	const text = useChatStore((s) => s.inputByLang[lang] ?? '')
	const setInput = useChatStore((s) => s.setInput)
	const search = useChatSearch()

	return (
		<ComposeBar
			data-testid="chat-input-form"
			value={text}
			onValueChange={(next) => setInput(lang, next)}
			onSend={(query) => {
				search.mutate({ query: { kind: 'text', text: query } })
				setInput(lang, '')
			}}
			busy={search.isPending}
			placeholder="What do you want to say?"
			inputTestId="chat-input"
			sendTestId="chat-send-button"
		/>
	)
}
