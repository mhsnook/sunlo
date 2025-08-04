import type { FieldError } from 'react-hook-form'

export default function ErrorLabel({
	error,
}: {
	error: FieldError | undefined
}) {
	return !error?.message ?
			null
		:	<p className="text-destructive mt-2 text-sm dark:text-red-400">
				{error.message}
			</p>
}
