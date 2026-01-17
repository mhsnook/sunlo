import type { ChangeEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { FieldValues, Path, useController } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import type { ControlledFieldProps } from '@/components/fields/types'
import { Label } from '@/components/ui/label'
import supabase from '@/lib/supabase-client'
import { ShowAndLogError } from '@/components/errors'
import { Input } from '@/components/ui/input'
import { ImageIcon, UploadIcon, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { playlistCoverUrlify } from '@/lib/hooks'
import ErrorLabel from '@/components/fields/error-label'
import { Button } from '@/components/ui/button'

export function CoverImageField<T extends FieldValues>({
	control,
	error,
	name = 'cover_image_path' as Path<T>,
	label = 'Cover Image',
}: ControlledFieldProps<T> & { name?: Path<T>; label?: string }) {
	const {
		field: { value, onChange },
	} = useController({ name, control })
	return (
		<div className="flex flex-col gap-1">
			<Label className={error ? 'text-destructive' : ''}>{label}</Label>
			<CoverImageEditor cover_image_path={value} onUpload={onChange} />
			<ErrorLabel error={error} />
		</div>
	)
}

const filenameFromFile = (file: File, prefix: string = 'cover') => {
	// returns a string like cover-my-image-1a4d06.jpg
	let nameparts = file.name.split('.')
	const ext = nameparts.pop()
	const slug = nameparts.join('.').replaceAll(' ', '-')
	const timeHash = Math.round(file.lastModified * 0.000001).toString(16)
	const path = `${prefix}-${slug}-${timeHash}.${ext}`
	return path
}

interface CoverImageEditorProps {
	cover_image_path: string | null | undefined
	onUpload: (path: string | null) => void
}

function CoverImageEditor({
	cover_image_path,
	onUpload,
}: CoverImageEditorProps) {
	const sendImage = useMutation({
		mutationFn: async (event: ChangeEvent<HTMLInputElement>) => {
			event.preventDefault()
			if (!event.target.files || event.target.files.length === 0)
				throw new Error(`There's no file to submit`)
			const file: File = event.target.files[0]
			const filename = filenameFromFile(file, 'playlist')
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
		onSuccess: () => {
			toast.success('Image uploaded')
		},
	})

	const url = playlistCoverUrlify(cover_image_path)

	const handleRemove = () => {
		onUpload(null)
	}

	return (
		<div className="flex flex-col gap-2">
			<Label
				htmlFor="coverImageUploadInput"
				className={cn(
					'group border-primary-foresoft/30 hover:border-primary hover:bg-primary/10 relative isolate flex h-32 flex-col items-center justify-center rounded-2xl border text-center',
					url && 'h-auto'
				)}
			>
				{url ?
					<div className="relative w-full">
						<img
							src={url}
							alt="Cover preview"
							className="h-40 w-full rounded-2xl object-cover"
						/>
						<div className="absolute inset-0 z-30 flex flex-col items-center justify-center rounded-2xl bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
							<UploadIcon className="mx-auto mb-2 size-6 text-white" />
							<span className="text-white">Click to replace</span>
						</div>
					</div>
				:	<div
						className={cn(
							'absolute inset-0 z-30 flex flex-col justify-center rounded-2xl'
						)}
					>
						{sendImage.isPending ?
							<>Uploading ...</>
						:	<>
								<ImageIcon className="mx-auto mb-2 size-6" />
								<span className="text-muted-foreground text-sm">
									Drag & drop or click to upload a cover image
								</span>
								<span className="text-muted-foreground text-xs">
									(optional)
								</span>
							</>
						}
					</div>
				}
				<Input
					className="absolute z-50 h-full cursor-pointer place-items-stretch justify-center opacity-0"
					type="file"
					id="coverImageUploadInput"
					name="files[]"
					accept="image/*"
					onChange={sendImage.mutate}
					disabled={sendImage.isPending}
				/>
			</Label>

			{url && (
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={handleRemove}
					className="text-muted-foreground hover:text-destructive self-start"
				>
					<X className="mr-1 h-4 w-4" />
					Remove image
				</Button>
			)}

			<ShowAndLogError error={sendImage.error} text="Error uploading image" />
		</div>
	)
}
