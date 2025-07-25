import { FieldValues, Path, useController } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { ErrorLabel, type ControlledFieldProps } from '.'
import AvatarEditor from '@/components/profile/avatar-editor'

export default function AvatarEditorField<T extends FieldValues>({
	control,
	error,
}: ControlledFieldProps<T>) {
	const {
		field: { value, onChange },
	} = useController({ name: 'avatar_path' as Path<T>, control })
	return (
		<div className="flex flex-col gap-1">
			<Label className={error ? 'text-destructive' : ''}>Profile picture</Label>
			<AvatarEditor avatar_path={value} onUpload={onChange} />
			<ErrorLabel {...error} />
		</div>
	)
}
