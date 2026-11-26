import type { ReactNode } from 'react'
import { ago } from '@/lib/dayjs'
import type { MostActiveUserType, NewestUserType } from '~/lib/stats'
import { formatCount } from '~/lib/format'

function UserName({
	username,
	email,
}: {
	username: string | null
	email: string | null
}) {
	return (
		<div className="min-w-0">
			<p className="truncate font-medium">{username ?? 'No username yet'}</p>
			<p className="text-muted-foreground truncate text-xs">{email}</p>
		</div>
	)
}

function Langs({ langs }: { langs: Array<string> | null }) {
	if (!langs?.length) return <span className="text-muted-foreground">None</span>
	return <span className="font-mono text-xs uppercase">{langs.join(' ')}</span>
}

function Table({
	caption,
	headers,
	children,
	isEmpty,
}: {
	caption: string
	headers: Array<string>
	children: ReactNode
	isEmpty: boolean
}) {
	return (
		<div className="bg-card overflow-x-auto rounded border">
			<table className="w-full text-sm">
				<caption className="px-4 pt-4 text-start font-semibold">
					{caption}
				</caption>
				<thead>
					<tr className="text-muted-foreground border-b text-start">
						{headers.map((header) => (
							<th key={header} className="px-4 py-2 text-start font-medium">
								{header}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{isEmpty ? (
						<tr>
							<td
								colSpan={headers.length}
								className="text-muted-foreground px-4 py-6 text-center"
							>
								Nobody yet.
							</td>
						</tr>
					) : (
						children
					)}
				</tbody>
			</table>
		</div>
	)
}

export function MostActiveTable({
	users,
	periodLabel,
}: {
	users: Array<MostActiveUserType>
	periodLabel: string
}) {
	return (
		<Table
			caption={`Most active, last ${periodLabel}`}
			headers={[
				'User',
				'Actions',
				'Reviews',
				'Contributions',
				'Days active',
				'Decks',
				'Last active',
			]}
			isEmpty={users.length === 0}
		>
			{users.map((user) => (
				<tr
					key={user.uid}
					data-key={user.uid}
					className="border-b last:border-0"
				>
					<td className="max-w-56 px-4 py-2">
						<UserName username={user.username} email={user.email} />
					</td>
					<td className="px-4 py-2 tabular-nums">
						{formatCount(user.actions)}
					</td>
					<td className="px-4 py-2 tabular-nums">
						{formatCount(user.reviews)}
					</td>
					<td className="px-4 py-2 tabular-nums">
						{formatCount(user.contributions)}
					</td>
					<td className="px-4 py-2 tabular-nums">{user.active_days}</td>
					<td className="px-4 py-2">
						<Langs langs={user.deck_langs} />
					</td>
					<td className="px-4 py-2 whitespace-nowrap">
						{ago(user.last_active_at)}
					</td>
				</tr>
			))}
		</Table>
	)
}

export function NewestUsersTable({ users }: { users: Array<NewestUserType> }) {
	return (
		<Table
			caption="Newest users"
			headers={[
				'User',
				'Signed up',
				'Onboarded',
				'Decks',
				'Reviews',
				'Last sign-in',
			]}
			isEmpty={users.length === 0}
		>
			{users.map((user) => (
				<tr
					key={user.uid}
					data-key={user.uid}
					className="border-b last:border-0"
				>
					<td className="max-w-56 px-4 py-2">
						<UserName username={user.username} email={user.email} />
					</td>
					<td className="px-4 py-2 whitespace-nowrap">
						{ago(user.created_at)}
					</td>
					<td className="px-4 py-2">{user.onboarded ? 'Yes' : 'No'}</td>
					<td className="px-4 py-2">
						<Langs langs={user.deck_langs} />
					</td>
					<td className="px-4 py-2 tabular-nums">
						{formatCount(user.reviews)}
					</td>
					<td className="px-4 py-2 whitespace-nowrap">
						{ago(user.last_sign_in_at) ?? 'Never'}
					</td>
				</tr>
			))}
		</Table>
	)
}
