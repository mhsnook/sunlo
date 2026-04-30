import { Label } from '@/components/ui/label'
import { ShowAndLogError } from '@/components/errors'
import { Input } from '@/components/ui/input'
import { ImageIcon, UploadIcon, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { playlistCoverUrlify } from '@/lib/hooks'
import { Button } from '@/components/ui/button'
import { useFieldContext } from '@/components/form'
import { ErrorList } from '@/components/form/fields/error-list'
import { useUploadImage } from '@/lib/upload-image'

export function CoverImageField({ label = 'Cover Image' }: { label?: string }) {
	const field = useFieldContext<string | null | undefined>()
	const meta = field.state.meta
	const showError = meta.isBlurred && meta.errors.length > 0
	const url = playlistCoverUrlify(field.state.value ?? null)

	const sendImage = useUploadImage({
		prefix: 'playlist',
		onUpload: (path) => {
			field.handleChange(path)
			field.handleBlur()
		},
	})

	return (
		<div className="flex flex-col gap-1">
			<Label className={showError ? 'text-destructive' : ''}>{label}</Label>
			<div className="flex flex-col gap-2">
				<Label
					htmlFor="coverImageUploadInput"
					className={cn(
						'group border-3-mlo-primary hover:border-primary hover:bg-1-mlo-primary relative isolate flex h-32 flex-col items-center justify-center rounded-2xl border text-center',
						url && 'h-auto'
					)}
				>
					{url ? (
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
					) : (
						<div className="absolute inset-0 z-30 flex flex-col justify-center rounded-2xl">
							{sendImage.isPending ? (
								<>Uploading ...</>
							) : (
								<>
									<ImageIcon className="mx-auto mb-2 size-6" />
									<span className="text-muted-foreground text-sm">
										Drag & drop or click to upload a cover image
									</span>
									<span className="text-muted-foreground text-xs">
										(optional)
									</span>
								</>
							)}
						</div>
					)}
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
						onClick={() => {
							field.handleChange(null)
							field.handleBlur()
						}}
						className="text-muted-foreground hover:text-destructive self-start"
					>
						<X className="me-1 h-4 w-4" />
						Remove image
					</Button>
				)}

				<ShowAndLogError error={sendImage.error} text="Error uploading image" />
			</div>
			{showError && <ErrorList errors={meta.errors} />}
		</div>
	)
}
