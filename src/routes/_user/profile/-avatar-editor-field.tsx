import type { ChangeEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { FieldValues, Path, useController } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import type { ControlledFieldProps } from '@/components/fields/types'
import { Label } from '@/components/ui/label'
import supabase from '@/lib/supabase-client'
import { ShowAndLogError } from '@/components/errors'
import { Input } from '@/components/ui/input'
import { UploadIcon } from 'lucide-react'
import { avatarUrlify, cn } from '@/lib/utils'
import ErrorLabel from '@/components/fields/error-label'

export function AvatarEditorField<T extends FieldValues>({
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

const filenameFromFile = (file: File) => {
	// returns a string like pic-of-my-cat-1a4d06.jpg

	// separate the file extension so we can re-append it at the end 'jpg'
	let nameparts = file.name.split('.')
	const ext = nameparts.pop()

	// rejoin the remaining parts in case of 'pic.of.my.cat.jpg'
	const slug = nameparts.join('.').replaceAll(' ', '-')

	// a hash like '1a4d06' from the image timestamp to track uniqueness
	const timeHash = Math.round(file.lastModified * 0.000001).toString(16)

	const path = `${slug}-${timeHash}.${ext}`
	return path
}

interface AvatarEditorProps {
	avatar_path: string
	onUpload: (url: string) => void
}

function AvatarEditor({ avatar_path, onUpload }: AvatarEditorProps) {
	const sendImage = useMutation({
		mutationFn: async (event: ChangeEvent<HTMLInputElement>) => {
			event.preventDefault()
			console.log(`sendImage.mutate`, event)
			if (!event.target.files || event.target.files.length === 0)
				throw new Error(`There's no file to submit`)
			const file: File = event.target.files[0]
			const filename = filenameFromFile(file)
			const { data, error } = await supabase.storage
				.from('avatars')
				.upload(`${filename}`, file, {
					cacheControl: '3600',
					upsert: true,
				})

			if (error) throw error
			onUpload(data.path)
			return data
		},
		onSuccess: (data) => {
			console.log(`onSuccess for uploading avatar`, data)
			toast.success(`Avatar uploaded...`)
		},
	})
	const url = avatarUrlify(avatar_path)

	return (
		<div className="flex flex-col gap-2">
			<Label
				htmlFor="avatarUploadInput"
				className="group border-primary-foresoft/30 hover:border-primary hover:bg-primary/10 relative isolate flex h-40 flex-col items-center rounded-2xl border text-center"
			>
				{!url ? null : (
					<div className="z-10 mx-auto my-2 grid aspect-square size-36">
						<img
							src={url}
							alt="Your profile pic, or avatar"
							className="h-36 w-36 rounded-full object-cover"
						/>
					</div>
				)}
				<Input
					className="absolute z-50 h-full cursor-pointer place-items-stretch justify-center opacity-0"
					type="file"
					id="avatarUploadInput"
					name="files[]"
					accept="image/*"
					onChange={sendImage.mutate}
					disabled={sendImage.isPending}
				/>
				<div
					className={cn(
						!url ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
						'absolute inset-0 z-30 flex flex-col justify-center rounded-2xl'
					)}
				>
					{sendImage.isPending ?
						<>Uploading ...</>
					:	<>
							<UploadIcon className="mx-auto mb-2 size-6" />
							<span>
								drag & drop an image or click&nbsp;here to browse
								your&nbsp;files
							</span>
						</>
					}
				</div>
			</Label>

			<ShowAndLogError error={sendImage.error} text="Error uploading image" />
		</div>
	)
}
