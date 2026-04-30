import type { ChangeEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toastSuccess } from '@/components/ui/sonner'
import supabase from './supabase-client'

const filenameFromFile = (file: File, prefix?: string): string => {
	const parts = file.name.split('.')
	const ext = parts.pop()
	const slug = parts.join('.').replaceAll(' ', '-')
	const timeHash = Math.round(file.lastModified * 0.000001).toString(16)
	const stem = `${slug}-${timeHash}.${ext}`
	return prefix ? `${prefix}-${stem}` : stem
}

/**
 * File-upload mutation shared by AvatarEditorField and CoverImageField.
 * Both upload to the `avatars` bucket; the prefix distinguishes them
 * by filename. Calls onUpload(path) with the storage path on success.
 */
export function useUploadImage({
	prefix,
	onUpload,
}: {
	prefix?: string
	onUpload: (path: string) => void
}) {
	return useMutation({
		mutationFn: async (event: ChangeEvent<HTMLInputElement>) => {
			event.preventDefault()
			if (!event.target.files || event.target.files.length === 0)
				throw new Error(`There's no file to submit`)
			const file: File = event.target.files[0]
			const filename = filenameFromFile(file, prefix)
			const { data, error } = await supabase.storage
				.from('avatars')
				.upload(filename, file, { cacheControl: '3600', upsert: true })
			if (error) throw error
			onUpload(data.path)
			return data
		},
		onSuccess: () => {
			toastSuccess('Image uploaded')
		},
	})
}
