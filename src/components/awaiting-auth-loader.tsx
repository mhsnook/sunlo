import { useEffect, useState } from 'react'
import { Loader } from '@/components/ui/loader'

export function AwaitingAuthLoader() {
	const [time, setTime] = useState(0)
	useEffect(() => {
		const interval = setInterval(() => {
			setTime((prev) => prev + 1)
		}, 1000)
		return () => clearInterval(interval)
	}, [])

	return (
		<div className="flex h-full w-full flex-col items-center justify-center gap-4 py-10">
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
