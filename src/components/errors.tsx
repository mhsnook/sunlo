import { TriangleAlert } from 'lucide-react'
import { useEffect, type PropsWithChildren } from 'react'
import Callout from '@/components/ui/callout'
import supabase from '@/lib/supabase-client'
import { Json } from '@/types/supabase'
import { PostgrestError } from '@supabase/supabase-js'

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
				<TriangleAlert className="text-destructive/50" aria-hidden={true} />
			)}
		>
			{children ?? `An unknown error has occurred (sorry)`}
		</Callout>
	)
}

export function ShowAndLogError({
	error,
	text,
	className = '',
	values = null,
}: PropsWithChildren<{
	error: Error | PostgrestError | null
	text?: string
	className?: string
	values?: Record<string, string | null> | null
}>) {
	if (!error) return null

	return (
		<Callout
			className={className}
			variant="problem"
			alert
			Icon={() => (
				<TriangleAlert className="text-destructive/50" aria-hidden={true} />
			)}
		>
			<Logger error={error} values={values} />
			<strong>
				{'status' in error ?
					<> (Error {error.status}) </>
				:	null}
				{/* Text is only for display purposes; not logged */}
				{text}{' '}
				{'cause' in error ?
					<>({error.cause})</>
				:	null}
			</strong>
			<p>{error.message} </p>
		</Callout>
	)
}

function errorFallback(context: unknown | null = null) {
	console.log('Error trying to send the error to database', context)

	return supabase.from('user_client_event').insert({
		message: 'Error trying to send error to database',
		context: context as Json,
		url: window.location.href,
	})
}

function Logger({
	error,
	values = null,
}: {
	error: Error | PostgrestError
	values?: Record<string, string | null> | null
}) {
	useEffect(() => {
		try {
			const context: Record<string, string | Record<string, string>> = {}
			if (values) {
				if ('password' in values) values.password = '***'
				context.values = values as Record<string, string>
			}
			Object.keys(error).forEach((key) => {
				if (
					key in
						['code', 'status', 'cause', 'name', 'stack', 'details', 'hint'] ||
					typeof (error as any)[key] === 'string' ||
					typeof (error as any)[key] === 'number'
				) {
					context[key] = (error as any)[key]
				}
			})
			const row = {
				message: error.message,
				context,
				url: window.location.href,
			}
			supabase
				.from('user_client_event')
				.insert(row)
				.then((res) => {
					if (res.data) console.log(`Logged error to supabase`, row)
					if (res.error) errorFallback(res.error)
				})
		} catch (e) {
			errorFallback(e)
		}
	}, [error])

	return null
}
