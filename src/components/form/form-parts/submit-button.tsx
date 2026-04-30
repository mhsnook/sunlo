import type { ComponentProps, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { IconSizedLoader } from '@/components/ui/loader'
import { useFormContext } from '../form-hook'

type SubmitButtonProps = Omit<
	ComponentProps<typeof Button>,
	'type' | 'data-testid'
> & {
	children: ReactNode
	/**
	 * Optional override for what to show while the form is submitting.
	 * If omitted, a loader spinner appears alongside `children`.
	 */
	pendingText?: ReactNode
}

export function SubmitButton({
	children,
	pendingText,
	disabled,
	...rest
}: SubmitButtonProps) {
	const form = useFormContext()

	return (
		<form.Subscribe
			selector={(s) => ({
				canSubmit: s.canSubmit,
				isSubmitting: s.isSubmitting,
			})}
		>
			{({ canSubmit, isSubmitting }) => (
				<Button
					type="submit"
					disabled={!canSubmit || isSubmitting || disabled}
					data-testid="submit-button"
					{...rest}
				>
					{isSubmitting
						? (pendingText ?? (
								<>
									<IconSizedLoader />
									{children}
								</>
							))
						: children}
				</Button>
			)}
		</form.Subscribe>
	)
}
