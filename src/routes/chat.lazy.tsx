import { createLazyFileRoute } from '@tanstack/react-router'
import { ChatPage } from '@/features/chat'

export const Route = createLazyFileRoute('/chat')({
	component: ChatPage,
})
