import { CircleX } from 'lucide-react'
import type { PropsWithChildren } from 'react'
import Callout from '@/components/ui/callout'

/*
  If the error message passed as `children` is nullable, we can simply use:

    <ShowError>{some nullable message}</ShowError>

  But when we want to put some text directly in the template, like `Error: ${message}` it will mean
  that `children` is never null, so we add the `show` prop:

    <ShowError show={!!error}>Error submitting form: {error.message}</ShowError>
*/

export function ShowError({
	show = null,
	className = '',
	children = null,
}: PropsWithChildren<{ show?: boolean | null; className?: string }>) {
	// if show is "false", don't show. if show is true, show it.
	// if show us not set, then show if there's content to show.
	if (show === false) return null
	if (show === null && !children) return null
	return (
		<Callout
			className={className}
			variant="problem"
			alert
			Icon={() => (
				<CircleX className="text-destructive/50" aria-hidden={true} />
			)}
		>
			{children ?? `An unknown error has occurred (sorry)`}
		</Callout>
	)
}
