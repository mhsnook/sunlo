import { BookOpen, Handshake, LifeBuoy } from 'lucide-react'
import { type ControlledFieldProps, ErrorLabel } from '.'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { useController } from 'react-hook-form'
import { cn } from '@/lib/utils'

const outer = 'flex flex-row gap-2 items-center',
	inner =
		'transition-colors flex flex-col items-center justify-center h-20 gap-2 rounded-md border bg-popover p-4 w-full'

export default function UserRoleField({
	control,
	error,
	tabIndex,
}: ControlledFieldProps) {
	const {
		field: { value, onChange },
	} = useController({ name: 'user_role', control })

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
						className={cn(
							inner,
							value === 'learner' ?
								'border-primary bg-primary/20 hover:bg-primary/20'
							:	'hover:bg-primary/10'
						)}
					>
						<BookOpen size="16" />
						Learning
					</Label>
				</div>
				<div className={outer}>
					<RadioGroupItem value="helper" id="helper" className="sr-only" />
					<Label
						htmlFor="helper"
						className={cn(
							inner,
							value === 'helper' ?
								'border-primary bg-primary/20 hover:bg-primary/20'
							:	'hover:bg-primary/10'
						)}
					>
						<LifeBuoy size="16" />
						Helping
					</Label>
				</div>
				<div className={outer}>
					<RadioGroupItem value="both" id="both" className="sr-only" />
					<Label
						htmlFor="both"
						className={cn(
							inner,
							value === 'both' ?
								'border-primary bg-primary/20 hover:bg-primary/20'
							:	'hover:bg-primary/10'
						)}
					>
						<Handshake size="16" />
						Both
					</Label>
				</div>
			</RadioGroup>
			<ErrorLabel {...error} />
		</div>
	)
}
