import { Hammer } from 'lucide-react'
import Callout from './ui/callout'

export function UnderConstruction() {
	return (
		<Callout
			variant="ghost"
			className="mx-auto max-w-xl gap-[5%]"
			Icon={() => (
				<div className="bg-primary/50 flex aspect-square items-center justify-center rounded-full text-white">
					<Hammer absoluteStrokeWidth={true} size={36} className="m-4" />
				</div>
			)}
		>
			<p className="my-4">
				Sunlo is under development. It should be ready to go, but do get in
				touch if you run into any issues.
			</p>
			<p className="my-4">
				You can find us on BlueSky at{' '}
				<a className="s-link" href="https://bsky.app/profile/sunlo.app">
					@sunlo.app
				</a>{' '}
				or send email to sunloapp&nbsp;at&nbsp;gmail&nbsp;dot&nbsp;com.
			</p>
		</Callout>
	)
}
