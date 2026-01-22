import { useId } from 'react'
import {
	useMutation,
	type UseMutationOptions,
	type UseMutationResult,
} from '@tanstack/react-query'
import { toastSuccess, toastMutationError } from '@/components/ui/sonner'

export interface MutationFeedbackOptions<TData, TError> {
	/** Message to show on success (uses toastSuccess) */
	successMessage?: string | ((data: TData) => string)
	/** Message to show on error (uses toastMutationError with button linking) */
	errorMessage?: string | ((error: TError) => string)
	/** Enable retry button in error toast */
	enableRetry?: boolean
	/** Custom button ID for linking (auto-generated if not provided) */
	buttonId?: string
}

export interface MutationButtonProps {
	isPending: boolean
	isSuccess: boolean
	isError: boolean
	buttonId: string
}

export type MutationWithFeedbackResult<TData, TError, TVariables, TContext> =
	UseMutationResult<TData, TError, TVariables, TContext> & {
		/** Props to spread on MutationButton */
		buttonProps: MutationButtonProps
		/** The button ID for this mutation (for manual linking) */
		buttonId: string
	}

/**
 * useMutationWithFeedback - Enhanced useMutation with automatic visual feedback
 *
 * Wraps TanStack Query's useMutation and provides:
 * - Auto-generated buttonProps for MutationButton
 * - Auto-linked error toasts that can scroll to the button
 * - Optional retry functionality
 * - Success toast messages
 *
 * @example
 * ```tsx
 * const mutation = useMutationWithFeedback({
 *   mutationFn: async (data) => {
 *     const { data: result } = await supabase
 *       .from('user_deck')
 *       .update(data)
 *       .eq('id', deckId)
 *       .select()
 *       .throwOnError()
 *     return result[0]
 *   },
 *   onSuccess: (data) => {
 *     collection.utils.writeUpdate(Schema.parse(data))
 *   },
 * }, {
 *   successMessage: 'Settings saved!',
 *   errorMessage: 'Failed to save settings',
 *   enableRetry: true,
 * })
 *
 * // In your JSX:
 * <MutationButton
 *   {...mutation.buttonProps}
 *   onClick={() => mutation.mutate(formData)}
 * >
 *   Save
 * </MutationButton>
 * ```
 */
export function useMutationWithFeedback<
	TData = unknown,
	TError = Error,
	TVariables = void,
	TContext = unknown,
>(
	options: UseMutationOptions<TData, TError, TVariables, TContext>,
	feedbackOptions?: MutationFeedbackOptions<TData, TError>
): MutationWithFeedbackResult<TData, TError, TVariables, TContext> {
	const autoId = useId()
	const buttonId = feedbackOptions?.buttonId || `mutation-${autoId}`

	const {
		successMessage,
		errorMessage,
		enableRetry = false,
	} = feedbackOptions || {}

	// Store the last variables for retry functionality
	let lastVariables: TVariables | undefined

	const mutation = useMutation<TData, TError, TVariables, TContext>({
		...options,
		onMutate: (variables, ctx) => {
			lastVariables = variables
			return options.onMutate?.(variables, ctx) as TContext | Promise<TContext>
		},
		onSuccess: (data, variables, onMutateResult, ctx) => {
			// Show success toast if message provided
			if (successMessage) {
				const message =
					typeof successMessage === 'function' ?
						successMessage(data)
					:	successMessage
				toastSuccess(message)
			}
			// Call original onSuccess
			options.onSuccess?.(data, variables, onMutateResult, ctx)
		},
		onError: (error, variables, onMutateResult, ctx) => {
			// Show error toast with button linking
			const message =
				typeof errorMessage === 'function' ?
					errorMessage(error)
				:	errorMessage ||
					(error instanceof Error ? error.message : 'An error occurred')

			toastMutationError(message, {
				buttonId,
				onRetry:
					enableRetry ?
						() => {
							if (lastVariables !== undefined) {
								mutation.mutate(lastVariables)
							}
						}
					:	undefined,
			})

			// Call original onError
			options.onError?.(error, variables, onMutateResult, ctx)
		},
	})

	const buttonProps: MutationButtonProps = {
		isPending: mutation.isPending,
		isSuccess: mutation.isSuccess,
		isError: mutation.isError,
		buttonId,
	}

	return {
		...mutation,
		buttonProps,
		buttonId,
	}
}

/**
 * Props extractor for using MutationButton with a regular useMutation
 *
 * @example
 * ```tsx
 * const mutation = useMutation({ ... })
 * const buttonProps = getMutationButtonProps(mutation)
 *
 * <MutationButton {...buttonProps}>Save</MutationButton>
 * ```
 */
export function getMutationButtonProps<
	TData = unknown,
	TError = unknown,
	TVariables = unknown,
	TContext = unknown,
>(
	mutation: UseMutationResult<TData, TError, TVariables, TContext>,
	buttonId?: string
): MutationButtonProps {
	return {
		isPending: mutation.isPending,
		isSuccess: mutation.isSuccess,
		isError: mutation.isError,
		buttonId: buttonId || '',
	}
}
