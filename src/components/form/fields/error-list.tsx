import type { StandardSchemaV1Issue } from '@tanstack/react-form'

type FieldErrorLike = StandardSchemaV1Issue | string | null | undefined

function messageOf(err: FieldErrorLike): string | null {
	if (!err) return null
	if (typeof err === 'string') return err
	if (typeof err === 'object' && 'message' in err) return err.message
	return null
}

export function ErrorList({ errors }: { errors: Array<FieldErrorLike> }) {
	const messages = errors.map(messageOf).filter((m): m is string => !!m)
	if (messages.length === 0) return null
	return <p className="text-destructive mt-2 text-sm">{messages.join('. ')}</p>
}
