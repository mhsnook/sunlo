import { FieldValues, Path, useController } from 'react-hook-form'
import type { ControlledFieldProps } from './types'
import { Label } from '@/components/ui/label'
import AvatarEditor from '@/components/profile/avatar-editor'
import ErrorLabel from './error-label'

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
			<ErrorLabel error={error} />
		</div>
	)
}
