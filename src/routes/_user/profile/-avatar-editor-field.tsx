import { Label } from '@/components/ui/label'
import { ShowAndLogError } from '@/components/errors'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { UploadIcon, XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { avatarUrlify } from '@/lib/hooks'
import { useFieldContext } from '@/components/form'
import { ErrorList } from '@/components/form/fields/error-list'
import { useUploadImage } from '@/lib/upload-image'

export function AvatarEditorField() {
	const field = useFieldContext<string | null | undefined>()
	const meta = field.state.meta
	const showError = meta.isBlurred && meta.errors.length > 0
	const url = avatarUrlify(field.state.value ?? null, 144)

	const sendImage = useUploadImage({
		onUpload: (path) => {
			field.handleChange(path)
			field.handleBlur()
		},
	})

	return (
		<div className="flex flex-col gap-1">
			<Label className={showError ? 'text-destructive' : ''}>
				Profile picture
			</Label>
			<div className="flex flex-col gap-2">
				<Label
					htmlFor="avatarUploadInput"
					className="group border-3-mlo-primary hover:border-primary hover:bg-1-mlo-primary relative isolate flex h-40 flex-col items-center rounded-2xl border text-center"
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
						{sendImage.isPending ? (
							<>Uploading ...</>
						) : (
							<>
								<UploadIcon className="mx-auto mb-2 size-6" />
								<span>
									drag & drop an image or click&nbsp;here to browse
									your&nbsp;files
								</span>
							</>
						)}
					</div>
				</Label>

				{url && (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="self-start"
						onClick={() => {
							field.handleChange(null)
							field.handleBlur()
						}}
					>
						<XIcon className="size-4" />
						Remove image
					</Button>
				)}

				<ShowAndLogError error={sendImage.error} text="Error uploading image" />
			</div>
			{showError && <ErrorList errors={meta.errors} />}
		</div>
	)
}
