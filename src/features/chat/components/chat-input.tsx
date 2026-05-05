import { type FormEvent } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useChatSearch } from '../hooks'
import { useChatRouteLang, useChatStore } from '../store'

export function ChatInput() {
	const lang = useChatRouteLang()
	const text = useChatStore((s) => s.inputByLang[lang] ?? '')
	const setInput = useChatStore((s) => s.setInput)
	const search = useChatSearch()

	const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault()
		const trimmed = text.trim()
		if (!trimmed) return
		search.mutate({ query: { kind: 'text', text: trimmed } })
		setInput(lang, '')
	}

	return (
		<form
			onSubmit={handleSubmit}
			data-testid="chat-input-form"
			className="flex flex-row items-center gap-2"
		>
			<Input
				type="text"
				value={text}
				onChange={(e) => setInput(lang, e.target.value)}
				placeholder="What do you want to say?"
				data-testid="chat-input"
				autoComplete="off"
			/>
			<Button
				type="submit"
				variant="default"
				size="icon"
				data-testid="chat-send-button"
				disabled={search.isPending || text.trim().length === 0}
				aria-label="Send"
			>
				<Send />
			</Button>
		</form>
	)
}
