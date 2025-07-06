import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Users, GraduationCap, Briefcase } from 'lucide-react'
import { ControlledFieldProps } from '.'
import { Path, useController, FieldValues } from 'react-hook-form'
import { ShowError } from '@/components/errors'
import { cn } from '@/lib/utils'

export function LearningGoalField<T extends FieldValues>({
	control,
	error,
}: ControlledFieldProps<T>) {
	const {
		field: { value, onChange },
	} = useController({ name: 'learning_goal' as Path<T>, control })
	return (
		<div>
			<RadioGroup onValueChange={onChange} className="gap-0">
				<RadioGroupItem value="moving" id="moving" className="sr-only" />
				<Label
					htmlFor="moving"
					className={cn(
						`flex w-full cursor-pointer items-center rounded border border-transparent p-4 transition-colors`,
						value === 'moving' ?
							'bg-primary/20 border-primary-foresoft/30'
						:	'hover:bg-primary/10 hover:border-input'
					)}
				>
					<GraduationCap
						className={`transition-color mr-3 size-5 ${value === 'moving' ? 'text-primary' : ''}`}
					/>
					<div className="space-y-1">
						<div>Moving or learning for friends</div>
						<div className="text-sm font-medium opacity-60">
							I'll be getting help from friends or colleagues
						</div>
					</div>
				</Label>

				<RadioGroupItem value="family" id="family" className="sr-only" />
				<Label
					htmlFor="family"
					className={cn(
						`flex w-full cursor-pointer items-center rounded border border-transparent p-4 transition-colors`,
						value === 'family' ?
							'bg-primary/20 border-primary-foresoft/30'
						:	'hover:bg-primary/10 hover:border-input'
					)}
				>
					<Users
						className={`transition-color mr-3 size-5 ${value === 'family' ? 'text-primary' : ''}`}
					/>
					<div className="space-y-1">
						<div>Family connection</div>
						<div className="text-sm font-medium opacity-60">
							I want to connect with relatives by learning a family or ancestral
							language
						</div>
					</div>
				</Label>

				<RadioGroupItem value="visiting" id="visiting" className="sr-only" />
				<Label
					htmlFor="visiting"
					className={cn(
						`flex w-full cursor-pointer items-center rounded border border-transparent p-4 transition-colors`,
						value === 'visiting' ?
							'bg-primary/20 border-primary-foresoft/30'
						:	'hover:bg-primary/10 hover:border-input'
					)}
				>
					<Briefcase
						className={`transition-color mr-3 size-5 ${value === 'visiting' ? 'text-primary' : ''}`}
					/>
					<div className="space-y-1">
						<div>Just visiting</div>
						<div className="text-sm font-medium opacity-60">
							I'm learning the basics for an upcoming trip
						</div>
					</div>
				</Label>
			</RadioGroup>
			<ShowError>{error?.message}</ShowError>
		</div>
	)
}
