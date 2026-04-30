import { BookOpen, Handshake, LifeBuoy, type LucideIcon } from 'lucide-react'
import { ChoiceTile } from '@/components/ui/choice-tile'
import { useFieldContext } from '@/components/form'
import { ErrorList } from '@/components/form/fields/error-list'

const options: ReadonlyArray<{
	value: string
	label: string
	Icon: LucideIcon
}> = [
	{ value: 'learner', label: 'Learning', Icon: BookOpen },
	{ value: 'helper', label: 'Helping', Icon: LifeBuoy },
	{ value: 'both', label: 'Both', Icon: Handshake },
]

export function UserRoleField() {
	const field = useFieldContext<string>()
	const value = field.state.value
	const meta = field.state.meta
	const showError = meta.isBlurred && meta.errors.length > 0

	return (
		<div
			role="radiogroup"
			aria-required="true"
			data-testid="user-role"
			className="space-y-2"
		>
			<p>Are you learning for yourself, or helping a friend?</p>
			<div className="grid grid-cols-3 gap-3">
				{options.map(({ value: v, label, Icon }) => (
					<ChoiceTile
						key={v}
						role="radio"
						aria-checked={value === v}
						selected={value === v}
						data-key={v}
						onClick={() => {
							field.handleChange(v)
							field.handleBlur()
						}}
						className="flex flex-col items-center gap-2 p-4"
					>
						<Icon size="16" />
						{label}
					</ChoiceTile>
				))}
			</div>
			{showError && <ErrorList errors={meta.errors} />}
		</div>
	)
}
