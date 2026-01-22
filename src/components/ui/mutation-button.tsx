import * as React from 'react'
import { useEffect, useRef, useState, useId } from 'react'
import { cva } from 'class-variance-authority'
import { Check, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants, type ButtonProps } from './button'

type MutationState = 'idle' | 'pending' | 'success' | 'error'

export interface MutationButtonProps extends ButtonProps {
	/** Whether the mutation is currently pending */
	isPending?: boolean
	/** Whether the mutation succeeded (triggers success animation) */
	isSuccess?: boolean
	/** Whether the mutation failed (triggers error animation) */
	isError?: boolean
	/** Duration in ms for success state before fading back to idle (default: 2000) */
	successDuration?: number
	/** Custom icon to show in idle state */
	idleIcon?: React.ReactNode
	/** Text to show while pending (optional, defaults to children) */
	pendingText?: React.ReactNode
	/** Custom class for the icon container */
	iconClassName?: string
	/** Unique ID for linking error toasts back to this button */
	buttonId?: string
}

const stateStyles = cva('', {
	variants: {
		state: {
			idle: '',
			pending: 'animate-mutation-pulse cursor-wait',
			success: 'animate-mutation-success',
			error: 'animate-mutation-error',
		},
	},
	defaultVariants: {
		state: 'idle',
	},
})

const iconContainerStyles = cva(
	'inline-flex items-center justify-center transition-all duration-300',
	{
		variants: {
			state: {
				idle: 'scale-100 opacity-100',
				pending: 'scale-100 opacity-100',
				success: 'scale-100 opacity-100',
				error: 'scale-100 opacity-100',
			},
		},
		defaultVariants: {
			state: 'idle',
		},
	}
)

const StateIcon = ({
	state,
	idleIcon,
	className,
}: {
	state: MutationState
	idleIcon?: React.ReactNode
	className?: string
}) => {
	const baseClass = cn('transition-all duration-300', className)

	switch (state) {
		case 'pending':
			return <Loader2 className={cn(baseClass, 'animate-spin')} />
		case 'success':
			return (
				<Check
					className={cn(baseClass, 'animate-mutation-check text-green-500')}
				/>
			)
		case 'error':
			return <X className={cn(baseClass, 'animate-mutation-x text-red-500')} />
		default:
			return idleIcon ? <>{idleIcon}</> : null
	}
}

/**
 * MutationButton - A button with beautiful visual feedback for mutation states
 *
 * Features:
 * - Pulse animation while pending
 * - Green glow + checkmark on success that fades gracefully
 * - Red glow + X on error with shake animation
 * - Supports linking error toasts back to button via buttonId
 *
 * @example
 * ```tsx
 * const mutation = useMutation({ ... })
 *
 * <MutationButton
 *   isPending={mutation.isPending}
 *   isSuccess={mutation.isSuccess}
 *   isError={mutation.isError}
 *   onClick={() => mutation.mutate(data)}
 * >
 *   Save Changes
 * </MutationButton>
 * ```
 */
export const MutationButton = React.forwardRef<
	HTMLButtonElement,
	MutationButtonProps
>(
	(
		{
			className,
			variant,
			size,
			isPending = false,
			isSuccess = false,
			isError = false,
			successDuration = 2000,
			idleIcon,
			pendingText,
			iconClassName,
			buttonId,
			children,
			disabled,
			...props
		},
		ref
	) => {
		const internalId = useId()
		const actualId = buttonId || internalId
		const buttonRef = useRef<HTMLButtonElement>(null)
		const [internalState, setInternalState] = useState<MutationState>('idle')
		const [showSuccessFade, setShowSuccessFade] = useState(false)

		// Determine actual state from props
		const externalState: MutationState =
			isPending ? 'pending'
			: isSuccess ? 'success'
			: isError ? 'error'
			: 'idle'

		// Handle state transitions with proper timing
		useEffect(() => {
			if (externalState === 'success') {
				setInternalState('success')
				setShowSuccessFade(false)

				// Start fade after showing success
				const fadeTimer = setTimeout(() => {
					setShowSuccessFade(true)
				}, successDuration * 0.6)

				// Return to idle after full duration
				const idleTimer = setTimeout(() => {
					setInternalState('idle')
					setShowSuccessFade(false)
				}, successDuration)

				return () => {
					clearTimeout(fadeTimer)
					clearTimeout(idleTimer)
				}
			} else if (externalState === 'error') {
				setInternalState('error')

				// Return to idle after error animation
				const timer = setTimeout(() => {
					setInternalState('idle')
				}, 1500)

				return () => clearTimeout(timer)
			} else {
				setInternalState(externalState)
			}
		}, [externalState, successDuration])

		// Register button for toast linking
		useEffect(() => {
			if (buttonRef.current) {
				buttonRef.current.dataset.mutationButtonId = actualId
			}
		}, [actualId])

		const showStateIcon = internalState !== 'idle'
		const isDisabled = disabled || isPending

		return (
			<button
				ref={(node) => {
					// Handle both refs
					;(
						buttonRef as React.MutableRefObject<HTMLButtonElement | null>
					).current = node
					if (typeof ref === 'function') {
						ref(node)
					} else if (ref) {
						ref.current = node
					}
				}}
				className={cn(
					buttonVariants({ variant, size }),
					stateStyles({ state: internalState }),
					// Success glow effect
					internalState === 'success' &&
						'ring-offset-background ring-2 ring-green-400/50 ring-offset-2',
					// Success fade effect
					showSuccessFade && 'animate-mutation-success-fade',
					// Error glow effect
					internalState === 'error' &&
						'ring-offset-background ring-2 ring-red-400/50 ring-offset-2',
					className
				)}
				disabled={isDisabled}
				data-mutation-state={internalState}
				data-mutation-button-id={actualId}
				{...props}
			>
				{showStateIcon && (
					<span className={cn(iconContainerStyles({ state: internalState }))}>
						<StateIcon
							state={internalState}
							idleIcon={idleIcon}
							className={iconClassName}
						/>
					</span>
				)}
				{!showStateIcon && idleIcon && (
					<span className={iconContainerStyles({ state: 'idle' })}>
						{idleIcon}
					</span>
				)}
				<span
					className={cn(
						'transition-opacity duration-200',
						internalState === 'pending' && 'opacity-80'
					)}
				>
					{internalState === 'pending' && pendingText ?
						pendingText
					: internalState === 'success' ?
						children
					: internalState === 'error' ?
						children
					:	children}
				</span>
			</button>
		)
	}
)
MutationButton.displayName = 'MutationButton'

/**
 * Utility to scroll to and highlight a mutation button by ID
 * Called from error toasts to help users find the affected button
 */
export function scrollToMutationButton(buttonId: string) {
	const button = document.querySelector<HTMLButtonElement>(
		`[data-mutation-button-id="${buttonId}"]`
	)

	if (button) {
		button.scrollIntoView({ behavior: 'smooth', block: 'center' })
		button.focus()

		// Add temporary highlight
		button.classList.add('animate-mutation-highlight')
		setTimeout(() => {
			button.classList.remove('animate-mutation-highlight')
		}, 2000)
	}
}

/**
 * Hook to track mutation state across multiple sequential mutations
 * Useful for forms that might need to show cumulative state
 */
export function useMutationButtonState() {
	const [state, setState] = useState<MutationState>('idle')
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const setSuccess = (duration = 2000) => {
		if (timeoutRef.current) clearTimeout(timeoutRef.current)
		setState('success')
		timeoutRef.current = setTimeout(() => setState('idle'), duration)
	}

	const setError = (duration = 1500) => {
		if (timeoutRef.current) clearTimeout(timeoutRef.current)
		setState('error')
		timeoutRef.current = setTimeout(() => setState('idle'), duration)
	}

	const setPending = () => {
		if (timeoutRef.current) clearTimeout(timeoutRef.current)
		setState('pending')
	}

	const reset = () => {
		if (timeoutRef.current) clearTimeout(timeoutRef.current)
		setState('idle')
	}

	useEffect(() => {
		return () => {
			if (timeoutRef.current) clearTimeout(timeoutRef.current)
		}
	}, [])

	return {
		state,
		isPending: state === 'pending',
		isSuccess: state === 'success',
		isError: state === 'error',
		isIdle: state === 'idle',
		setSuccess,
		setError,
		setPending,
		reset,
	}
}
