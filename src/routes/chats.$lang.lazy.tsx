import { createLazyFileRoute } from '@tanstack/react-router'
import { ChatPage } from '@/features/chat'
import { ChatLangProvider } from '@/features/chat/store'
import { useLanguageMeta } from '@/features/languages'

export const Route = createLazyFileRoute('/chats/$lang')({
	component: ChatLangRoute,
})

function ChatLangRoute() {
	const { lang } = Route.useParams()
	const { data: meta } = useLanguageMeta(lang)
	return (
		<ChatLangProvider value={lang}>
			<ChatPage languageLabel={meta?.name} />
		</ChatLangProvider>
	)
}
