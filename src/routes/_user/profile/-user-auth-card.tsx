import { Link } from '@tanstack/react-router'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/lib/use-auth'

export default function UserAuthCard() {
	const { userEmail } = useAuth()
	return (
		<>
			<Label>Your email</Label>
			<div className="flex flex-row gap-2">
				<Input
					type="text"
					className="grow"
					value={userEmail ?? 'loading...'}
					disabled
				/>
				<Link
					to="/profile/change-email"
					className="btn btn-size-default btn-variant-neutral"
				>
					Change
				</Link>
			</div>
			<Label>Your password</Label>
			<div className="flex flex-row gap-2">
				<Input type="text" className="grow" value="***************" disabled />

				<Link
					to="/profile/change-password"
					className="btn btn-size-default btn-variant-neutral"
				>
					Change
				</Link>
			</div>
		</>
	)
}
