import type { PostgrestError } from '@supabase/supabase-js'
import { ShowAndLogError } from '@/components/errors'

type FormAlertProps = {
	error: Error | PostgrestError | null | undefined
	text?: string
	className?: string
	values?: Record<string, string | null> | null
}

export function FormAlert({
	error,
	text,
	className,
	values = null,
}: FormAlertProps) {
	return (
		<ShowAndLogError
			error={error ?? null}
			text={text}
			className={className}
			values={values}
		/>
	)
}
