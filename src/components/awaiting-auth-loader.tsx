import { CSSProperties, useEffect, useState } from 'react'
import { Loader } from '@/components/ui/loader'
import { Button } from '@/components/ui/button'
import { ShowErrorDontLog } from '@/components/errors'
import { useAuth } from '@/lib/use-auth'

const style = { viewTransitionName: `main-area` } as CSSProperties

export function AwaitingAuthLoader() {
	const { connectionError } = useAuth()
	const [time, setTime] = useState(0)
	useEffect(() => {
		const interval = setInterval(() => {
			setTime((prev) => prev + 1)
		}, 1000)
		return () => clearInterval(interval)
	}, [])

	if (connectionError) {
		return <ConnectionErrorScreen error={connectionError} />
	}

	return (
		<div
			className="flex h-full w-full flex-col items-center justify-center gap-4 py-10"
			style={style}
		>
			<p
				className={`${time >= 5 ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300 ease-linear`}
			>
				Connecting for {time} seconds...
			</p>

			<Loader
				size={40}
				className={`${time >= 1 ? 'opacity-50' : 'opacity-0'} transition-opacity duration-300 ease-linear`}
			/>

			<div
				className={`${time >= 10 ? 'opacity-100' : 'opacity-0'} max-w-120 space-y-4 text-center transition-opacity duration-300 ease-linear`}
			>
				<p>
					FYI this should never take longer than about 1 second. It's possible
					your internet connection is down.
				</p>
				<p>
					If not that... consider{' '}
					<a className="s-link" href="mailto:sunloapp@gmail.com">
						contacting the team by email
					</a>{' '}
					or get in touch with Em directly (it may be affecting others too).
				</p>
			</div>
		</div>
	)
}

function ConnectionErrorScreen({ error }: { error: Error }) {
	const isDev = import.meta.env.DEV
	return (
		<div
			className="mx-auto flex h-full w-full max-w-160 flex-col items-center justify-center gap-4 px-4 py-10"
			style={style}
			data-testid="connection-error-screen"
		>
			<ShowErrorDontLog error={error} text="Unable to contact the Server" />
			<div className="max-w-120 space-y-3 text-center">
				<p>
					The app couldn't connect to the backend, (where the database lives).
					Please check your internet connection and try again.
				</p>
				{isDev ? (
					<p className="text-muted-foreground text-sm">
						<strong>Dev tip:</strong> make sure Docker Desktop is running and
						<code className="bg-muted mx-1 rounded px-1">supabase start</code>
						has finished, then confirm your{' '}
						<code className="bg-muted rounded px-1">.env</code> values match the
						CLI output.
					</p>
				) : null}
			</div>
			<Button variant="default" onClick={() => window.location.reload()}>
				Retry
			</Button>
		</div>
	)
}
