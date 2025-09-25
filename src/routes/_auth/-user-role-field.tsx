import { BookOpen, Handshake, LifeBuoy } from 'lucide-react'
import type { ControlledFieldProps } from '@/components/fields/types'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { FieldValues, Path, useController } from 'react-hook-form'
import ErrorLabel from '@/components/fields/error-label'

const outer = 'flex flex-row gap-2 items-center',
	inner =
		'flex-col gap-2 flex w-full cursor-pointer items-center rounded border p-4 transition-colors',
	selected = 'bg-primary/20 border-primary-foresoft/30 hover:border-primary',
	unselected = 'hover:bg-primary/10 border-input'

export function UserRoleField<T extends FieldValues>({
	control,
	error,
	tabIndex,
}: ControlledFieldProps<T>) {
	const {
		field: { value, onChange },
	} = useController({ name: 'user_role' as Path<T>, control })

	return (
		<div className="space-y-2">
			<p>Are you learning for yourself, or helping a friend?</p>
			<RadioGroup
				onValueChange={onChange}
				className="grid grid-cols-3 gap-3"
				tabIndex={tabIndex}
			>
				<div className={outer}>
					<RadioGroupItem value="learner" id="learner" className="sr-only" />
					<Label
						htmlFor="learner"
						className={`${inner} ${value === 'learner' ? selected : unselected}`}
					>
						<BookOpen size="16" />
						Learning
					</Label>
				</div>
				<div className={outer}>
					<RadioGroupItem value="helper" id="helper" className="sr-only" />
					<Label
						htmlFor="helper"
						className={`${inner} ${value === 'helper' ? selected : unselected}`}
					>
						<LifeBuoy size="16" />
						Helping
					</Label>
				</div>
				<div className={outer}>
					<RadioGroupItem value="both" id="both" className="sr-only" />
					<Label
						htmlFor="both"
						className={`${inner} ${value === 'both' ? selected : unselected}`}
					>
						<Handshake size="16" />
						Both
					</Label>
				</div>
			</RadioGroup>
			<ErrorLabel error={error} />
		</div>
	)
}
