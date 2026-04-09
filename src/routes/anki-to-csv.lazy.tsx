import { type DragEvent, useState, useCallback } from 'react'
import { createLazyFileRoute } from '@tanstack/react-router'
import { Download, FileUp, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import {
	type AnkiDeckData,
	parseAnkiDeck,
	notesToCsv,
	downloadCsv,
} from '@/lib/anki-to-csv'

export const Route = createLazyFileRoute('/anki-to-csv')({
	component: AnkiToCsvPage,
})

function AnkiToCsvPage() {
	const [dragging, setDragging] = useState(false)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [result, setResult] = useState<AnkiDeckData | null>(null)
	const [confirmed, setConfirmed] = useState(false)

	const processFile = useCallback(async (file: File) => {
		setError(null)
		setResult(null)
		setLoading(true)
		try {
			const buffer = await file.arrayBuffer()
			const data = await parseAnkiDeck(buffer)
			setResult(data)
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Failed to parse deck')
		} finally {
			setLoading(false)
		}
	}, [])

	const handleDrop = useCallback(
		(e: DragEvent) => {
			e.preventDefault()
			setDragging(false)
			if (!confirmed) return
			const file = e.dataTransfer.files[0]
			if (file) processFile(file)
		},
		[processFile, confirmed]
	)

	const handleFileInput = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0]
			if (file) processFile(file)
		},
		[processFile]
	)

	const handleDownload = useCallback(() => {
		if (!result) return
		const csv = notesToCsv(result.notes, result.fieldNames)
		const filename = result.deckName.replace(/[^a-zA-Z0-9_-]/g, '_') + '.csv'
		downloadCsv(csv, filename)
	}, [result])

	return (
		<main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4">
			<Card>
				<CardHeader>
					<CardTitle>Anki Deck → CSV</CardTitle>
					<CardDescription>
						Drop an <code>.apkg</code> file to extract its notes as a CSV.
						Everything runs in your browser — nothing is uploaded.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					{/* Usage rights confirmation */}
					<div className="flex items-start gap-3 rounded-lg border p-4">
						<Checkbox
							id="usage-rights"
							checked={confirmed}
							onCheckedChange={(checked) => setConfirmed(checked === true)}
						/>
						<Label
							htmlFor="usage-rights"
							className="cursor-pointer text-sm leading-relaxed"
						>
							I confirm that I am not using this tool to violate the usage
							rights of the original deck author.
						</Label>
					</div>

					{/* Drop zone */}
					<label
						className={`flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
							!confirmed ? 'pointer-events-none opacity-40'
							: dragging ? 'border-primary bg-1-mlo-primary cursor-pointer'
							: 'border-muted-foreground/30 hover:border-muted-foreground/50 cursor-pointer'
						}`}
						onDragOver={(e) => {
							e.preventDefault()
							if (confirmed) setDragging(true)
						}}
						onDragLeave={() => setDragging(false)}
						onDrop={handleDrop}
					>
						<input
							type="file"
							accept=".apkg"
							className="hidden"
							disabled={!confirmed}
							onChange={handleFileInput}
						/>
						{loading ?
							<Loader2 className="text-muted-foreground size-10 animate-spin" />
						:	<FileUp className="text-muted-foreground size-10" />}
						<div>
							<p className="font-medium">
								{loading ? 'Parsing deck...' : 'Drop .apkg file here'}
							</p>
							{!loading && (
								<p className="text-muted-foreground text-sm">
									or click to browse
								</p>
							)}
						</div>
					</label>

					{/* Error */}
					{error && (
						<div className="bg-1-mlo-danger text-7-hi-danger rounded p-3 text-sm">
							{error}
						</div>
					)}

					{/* Results */}
					{result && (
						<div className="flex flex-col gap-4">
							<div className="flex items-center justify-between">
								<div>
									<p className="font-medium">{result.deckName}</p>
									<p className="text-muted-foreground text-sm">
										{result.notes.length} notes &middot;{' '}
										{result.fieldNames.length} fields
									</p>
								</div>
								<Button onClick={handleDownload}>
									<Download className="me-2 size-4" />
									Download CSV
								</Button>
							</div>

							{/* Preview table */}
							<div className="overflow-x-auto rounded border">
								<table className="w-full text-sm">
									<thead>
										<tr className="bg-muted/50 border-b">
											{result.fieldNames.map((name) => (
												<th
													key={name}
													className="px-3 py-2 text-start font-medium"
												>
													{name}
												</th>
											))}
										</tr>
									</thead>
									<tbody>
										{result.notes.slice(0, 10).map((note, i) => (
											<tr key={i} className="border-b last:border-0">
												{result.fieldNames.map((_, fi) => (
													<td key={fi} className="max-w-64 truncate px-3 py-2">
														{note.fields[fi] ?? ''}
													</td>
												))}
											</tr>
										))}
									</tbody>
								</table>
								{result.notes.length > 10 && (
									<p className="text-muted-foreground px-3 py-2 text-center text-xs">
										Showing 10 of {result.notes.length} notes
									</p>
								)}
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</main>
	)
}
