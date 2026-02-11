import { useMutation } from '@tanstack/react-query'
import { toastError } from '@/components/ui/sonner'
import type { UseLiveQueryResult } from '@/types/main'
import type { NotificationType, TranslationSuggestionType } from '@/lib/schemas'
import { TranslationSuggestionSchema } from '@/lib/schemas'
import supabase from '@/lib/supabase-client'
import { useUserId } from '@/lib/use-auth'
import { eq, useLiveQuery } from '@tanstack/react-db'
import {
	notificationsCollection,
	translationSuggestionsCollection,
} from '@/lib/collections'

export const useNotifications = (): UseLiveQueryResult<NotificationType[]> => {
	return useLiveQuery((q) =>
		q
			.from({ notification: notificationsCollection })
			.orderBy(({ notification }) => notification.created_at, 'desc')
	)
}

export const useUnreadNotifications = (): UseLiveQueryResult<
	NotificationType[]
> => {
	return useLiveQuery((q) =>
		q
			.from({ notification: notificationsCollection })
			.where(({ notification }) => eq(notification.is_read, false))
	)
}

export const useUnreadNotificationsCount = (): number | undefined => {
	const { data: unread } = useUnreadNotifications()
	if (!unread) return undefined
	return unread.length || undefined
}

export const useSuggestionsForTranslation = (
	translationId: string
): UseLiveQueryResult<TranslationSuggestionType[]> => {
	return useLiveQuery(
		(q) =>
			q
				.from({ suggestion: translationSuggestionsCollection })
				.where(({ suggestion }) => eq(suggestion.translation_id, translationId))
				.orderBy(({ suggestion }) => suggestion.created_at, 'desc'),
		[translationId]
	)
}

export const usePendingSuggestionsForMyTranslations = (): UseLiveQueryResult<
	TranslationSuggestionType[]
> => {
	return useLiveQuery((q) =>
		q
			.from({ suggestion: translationSuggestionsCollection })
			.where(({ suggestion }) => eq(suggestion.status, 'pending'))
			.orderBy(({ suggestion }) => suggestion.created_at, 'desc')
	)
}

export const useMarkNotificationRead = () => {
	return useMutation({
		mutationFn: async (notificationId: string) => {
			await supabase
				.from('notification')
				.update({ is_read: true })
				.eq('id', notificationId)
				.throwOnError()
		},
		onMutate: (notificationId) => {
			notificationsCollection.utils.writeUpdate({
				id: notificationId,
				is_read: true,
			})
		},
	})
}

export const useMarkAllNotificationsRead = () => {
	const userId = useUserId()
	return useMutation({
		mutationFn: async () => {
			await supabase
				.from('notification')
				.update({ is_read: true })
				.eq('uid', userId!)
				.eq('is_read', false)
				.throwOnError()
		},
		onMutate: () => {
			notificationsCollection.utils.writeBatch(() => {
				notificationsCollection.forEach((notification) => {
					if (!notification.is_read) {
						notificationsCollection.utils.writeUpdate({
							id: notification.id,
							is_read: true,
						})
					}
				})
			})
		},
	})
}

export const useRespondToSuggestion = () => {
	return useMutation({
		mutationKey: ['respond-to-suggestion'],
		mutationFn: async ({
			suggestionId,
			status,
		}: {
			suggestionId: string
			status: 'accepted' | 'dismissed'
		}) => {
			const { data } = await supabase
				.from('translation_suggestion')
				.update({ status, responded_at: new Date().toISOString() })
				.eq('id', suggestionId)
				.throwOnError()
				.select()
			if (!data) throw new Error('Failed to respond to suggestion')
			return data[0]
		},
		onSuccess: (data) => {
			translationSuggestionsCollection.utils.writeUpdate(
				TranslationSuggestionSchema.parse(data)
			)
		},
		onError: (error) => {
			toastError(error.message)
			console.log('Error', error)
		},
	})
}
