import { useRef, useState, type ChangeEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Camera, Check, ImageUp, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { IconSizedLoader } from '@/components/ui/loader'
import { LangBadge } from '@/components/ui/badge'
import Callout from '@/components/ui/callout'
import languages from '@/lib/languages'
import { cn } from '@/lib/utils'
import {
	extractPhrasesFromImage,
	imageFileToDataUrl,
	type ExtractedPhraseType,
} from '@/features/phrases/extract'

export function PhotoPhraseExtractor({
	lang,
	translationLang,
	onPick,
}: {
	lang: string
	translationLang: string
	onPick: (phrase: ExtractedPhraseType) => void
}) {
	const inputRef = useRef<HTMLInputElement>(null)
	const [preview, setPreview] = useState<string | null>(null)
	const [pickedIndex, setPickedIndex] = useState<number | null>(null)

	const extract = useMutation({
		mutationFn: async (file: File) => {
			const image = await imageFileToDataUrl(file)
			setPreview(image)
			return extractPhrasesFromImage({ image, lang, translationLang })
		},
	})

	const openPicker = () => inputRef.current?.click()

	const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		// Clear so choosing the same photo again still fires onChange.
		event.target.value = ''
		if (!file) return
		setPickedIndex(null)
		setPreview(null)
		extract.mutate(file)
	}

	const close = () => {
		extract.reset()
		setPreview(null)
		setPickedIndex(null)
	}

	const isOpen = extract.isPending || extract.isError || extract.isSuccess

	return (
		<div data-testid="photo-extract" className="space-y-3">
			{/* No `capture` attribute: phones then offer both camera and library. */}
			<input
				ref={inputRef}
				type="file"
				accept="image/*"
				aria-label="Photo to read phrases from"
				className="hidden"
				data-testid="photo-extract-input"
				onChange={handleFile}
			/>
			{!isOpen && (
				<Button
					type="button"
					variant="soft"
					onClick={openPicker}
					data-testid="photo-extract-button"
				>
					<Camera />
					Add from a photo
				</Button>
			)}

			{isOpen && (
				<div className="bg-card space-y-3 rounded border p-3">
					<div className="flex items-start gap-3">
						{preview ? (
							<img
								src={preview}
								alt=""
								className="size-16 shrink-0 rounded object-cover"
							/>
						) : (
							<div className="bg-muted size-16 shrink-0 rounded" />
						)}
						<div className="min-w-0 grow text-sm">
							{extract.isPending && (
								<p className="text-muted-foreground inline-flex items-center gap-2">
									<IconSizedLoader size={16} />
									Reading the text in your photo…
								</p>
							)}
							{extract.isSuccess && (
								<p className="text-muted-foreground">
									{extract.data.length === 0
										? 'No text found in this photo.'
										: `Found ${extract.data.length} ${extract.data.length === 1 ? 'phrase' : 'phrases'}. Choose one to fill in the form, then check it before you save.`}
								</p>
							)}
						</div>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							onClick={close}
							aria-label="Close photo results"
							data-testid="photo-extract-close"
						>
							<X />
						</Button>
					</div>

					{extract.isError && (
						<Callout variant="problem" size="sm" alert>
							<p className="text-sm">{extract.error.message}</p>
						</Callout>
					)}

					{extract.isSuccess && extract.data.length > 0 && (
						<ul className="space-y-2" data-testid="photo-extract-results">
							{extract.data.map((phrase, index) => (
								<ExtractedPhraseItem
									key={phrase.text}
									index={index}
									phrase={phrase}
									pageLang={lang}
									isPicked={pickedIndex === index}
									onPick={() => {
										setPickedIndex(index)
										onPick(phrase)
									}}
								/>
							))}
						</ul>
					)}

					{!extract.isPending && (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={openPicker}
						>
							<ImageUp />
							Try another photo
						</Button>
					)}
				</div>
			)}
		</div>
	)
}

function ExtractedPhraseItem({
	index,
	phrase,
	pageLang,
	isPicked,
	onPick,
}: {
	index: number
	phrase: ExtractedPhraseType
	pageLang: string
	isPicked: boolean
	onPick: () => void
}) {
	const isOtherLang = !!phrase.lang && phrase.lang !== pageLang
	return (
		<li>
			<button
				type="button"
				onClick={onPick}
				data-testid="photo-extract-candidate"
				data-key={index}
				className={cn(
					'hover:bg-primary-50 w-full cursor-pointer space-y-1 rounded-2xl border p-3 text-start transition-colors',
					isPicked && 'border-primary-500 bg-primary-50'
				)}
			>
				<div className="flex items-start justify-between gap-2">
					<span className="text-lg font-medium">{phrase.text}</span>
					{isPicked ? (
						<span className="text-primary-700 inline-flex shrink-0 items-center gap-1 text-xs">
							<Check className="size-3" /> In the form
						</span>
					) : (
						<span className="text-primary-700 shrink-0 text-xs">Use this</span>
					)}
				</div>
				{phrase.transliteration && (
					<p className="text-muted-foreground text-sm italic">
						{phrase.transliteration}
					</p>
				)}
				{phrase.translation && <p className="text-sm">{phrase.translation}</p>}
				{isOtherLang && (
					<p className="text-muted-foreground inline-flex items-center gap-1 text-xs">
						<LangBadge lang={phrase.lang} />
						This looks like {languages[phrase.lang] ?? phrase.lang}, not{' '}
						{languages[pageLang]}.
					</p>
				)}
			</button>
		</li>
	)
}
