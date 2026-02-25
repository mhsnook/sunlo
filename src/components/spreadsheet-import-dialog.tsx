import { useState, useMemo } from 'react'
import { ArrowLeft, ArrowRight, FileSpreadsheet } from 'lucide-react'

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import languages from '@/lib/languages'
import { SelectOneOfYourLanguages } from '@/components/fields/select-one-of-your-languages'

type ColumnRole = 'phrase' | 'translation' | 'tags' | 'skip'

type ColumnMapping = {
	role: ColumnRole
	lang: string
}

export type SpreadsheetPhrase = {
	phrase_text: string
	translations: Array<{ lang: string; text: string }>
	tags: Array<string>
}

type Step = 'paste' | 'map'

function parseTsv(text: string): {
	headers: Array<string>
	rows: Array<Array<string>>
} {
	const lines = text.trim().split('\n')
	if (lines.length < 2) return { headers: [], rows: [] }

	// Auto-detect delimiter: prefer tab, fall back to comma
	const delimiter = lines[0].includes('\t') ? '\t' : ','
	const headers = lines[0].split(delimiter).map((h) => h.trim())
	const rows = lines
		.slice(1)
		.map((line) => line.split(delimiter).map((cell) => cell.trim()))
		.filter((row) => row.some((cell) => cell.length > 0))

	return { headers, rows }
}

function detectColumnMapping(header: string, routeLang: string): ColumnMapping {
	const lower = header.toLowerCase().trim()

	// Extract parenthetical content like "phrase (kan)" or "translation (English)"
	const parenMatch = header.match(/\((\w+)\)/)
	const parenContent = parenMatch?.[1]?.toLowerCase()

	// Try to detect language from parenthetical
	let detectedLang = ''
	if (parenContent) {
		if (parenContent.length === 3 && languages[parenContent]) {
			detectedLang = parenContent
		} else {
			const entry = Object.entries(languages).find(
				([, name]) => name.toLowerCase() === parenContent
			)
			if (entry) detectedLang = entry[0]
		}
	}

	// Detect role from keywords
	if (/tag/i.test(lower)) return { role: 'tags', lang: '' }
	if (/phrase/i.test(lower))
		return { role: 'phrase', lang: detectedLang || routeLang }
	if (/translat/i.test(lower))
		return { role: 'translation', lang: detectedLang || '' }

	// If no keyword detected but has a language, infer role
	if (detectedLang === routeLang) return { role: 'phrase', lang: routeLang }
	if (detectedLang) return { role: 'translation', lang: detectedLang }

	// Try to match full header text as a language name or code
	if (lower.length === 3 && languages[lower]) {
		if (lower === routeLang) return { role: 'phrase', lang: routeLang }
		return { role: 'translation', lang: lower }
	}
	const langEntry = Object.entries(languages).find(
		([, name]) => name.toLowerCase() === lower
	)
	if (langEntry) {
		if (langEntry[0] === routeLang) return { role: 'phrase', lang: routeLang }
		return { role: 'translation', lang: langEntry[0] }
	}

	return { role: 'skip', lang: '' }
}

function buildPhrases(
	rows: Array<Array<string>>,
	mappings: Array<ColumnMapping>,
	includedRows: Array<boolean>
): Array<SpreadsheetPhrase> {
	const phraseColIndex = mappings.findIndex((m) => m.role === 'phrase')
	const translationCols = mappings
		.map((m, i) => ({ ...m, index: i }))
		.filter((m) => m.role === 'translation')
	const tagsCols = mappings
		.map((m, i) => ({ ...m, index: i }))
		.filter((m) => m.role === 'tags')

	if (phraseColIndex === -1) return []

	return rows
		.filter((_, i) => includedRows[i])
		.map((row) => {
			const phrase_text = row[phraseColIndex] || ''
			const translations = translationCols
				.map((col) => ({
					lang: col.lang,
					text: row[col.index] || '',
				}))
				.filter((t) => t.text.length > 0 && t.lang.length === 3)

			const tags = tagsCols
				.flatMap((col) =>
					(row[col.index] || '').split(',').map((t) => t.trim())
				)
				.filter((t) => t.length > 0)

			return { phrase_text, translations, tags }
		})
		.filter((p) => p.phrase_text.length > 0 && p.translations.length > 0)
}

export function SpreadsheetImportDialog({
	lang,
	onImport,
}: {
	lang: string
	onImport: (phrases: Array<SpreadsheetPhrase>) => void
}) {
	const [open, setOpen] = useState(false)
	const [step, setStep] = useState<Step>('paste')
	const [rawText, setRawText] = useState('')
	const [headers, setHeaders] = useState<Array<string>>([])
	const [rows, setRows] = useState<Array<Array<string>>>([])
	const [mappings, setMappings] = useState<Array<ColumnMapping>>([])
	const [includedRows, setIncludedRows] = useState<Array<boolean>>([])

	const handleParse = () => {
		const { headers: h, rows: r } = parseTsv(rawText)
		if (h.length === 0 || r.length === 0) return

		setHeaders(h)
		setRows(r)
		const detected = h.map((header) => detectColumnMapping(header, lang))
		// Ensure exactly one phrase column: if none detected, default the first column
		const hasPhraseCol = detected.some((m) => m.role === 'phrase')
		if (!hasPhraseCol) {
			detected[0] = { role: 'phrase', lang }
		}
		setMappings(detected)
		setIncludedRows(r.map(() => true))
		setStep('map')
	}

	const handleBack = () => {
		setStep('paste')
	}

	const updateMapping = (index: number, updates: Partial<ColumnMapping>) => {
		setMappings((prev) =>
			prev.map((m, i) => (i === index ? { ...m, ...updates } : m))
		)
	}

	const toggleRow = (index: number) => {
		setIncludedRows((prev) => prev.map((v, i) => (i === index ? !v : v)))
	}

	const toggleAllRows = (checked: boolean) => {
		setIncludedRows((prev) => prev.map(() => checked))
	}

	// Validation
	const phraseCount = mappings.filter((m) => m.role === 'phrase').length
	const translationCount = mappings.filter(
		(m) => m.role === 'translation'
	).length
	const translationsWithoutLang = mappings.filter(
		(m) => m.role === 'translation' && m.lang.length !== 3
	).length
	const isValid =
		phraseCount === 1 && translationCount >= 1 && translationsWithoutLang === 0

	const phrases = useMemo(
		() => (isValid ? buildPhrases(rows, mappings, includedRows) : []),
		[rows, mappings, includedRows, isValid]
	)

	const handleImport = () => {
		if (phrases.length === 0) return
		onImport(phrases)
		resetState()
		setOpen(false)
	}

	const resetState = () => {
		setStep('paste')
		setRawText('')
		setHeaders([])
		setRows([])
		setMappings([])
		setIncludedRows([])
	}

	const handleOpenChange = (nextOpen: boolean) => {
		if (!nextOpen) resetState()
		setOpen(nextOpen)
	}

	const includedCount = includedRows.filter(Boolean).length
	const allIncluded = includedRows.length > 0 && includedRows.every(Boolean)

	const phraseColIndex = mappings.findIndex((m) => m.role === 'phrase')
	const hasTags = mappings.some((m) => m.role === 'tags')

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button
					type="button"
					variant="soft"
					data-testid="spreadsheet-import-trigger"
				>
					<FileSpreadsheet className="me-2 size-4" /> Paste from Spreadsheet
				</Button>
			</DialogTrigger>
			<DialogContent className="max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{step === 'paste' ?
							'Paste from Spreadsheet'
						:	'Map Columns & Review'}
					</DialogTitle>
					<DialogDescription>
						{step === 'paste' ?
							'Paste tab-separated data from a spreadsheet. The first row should contain column headers.'
						:	`Set the role and language for each column, then review the ${includedCount} phrases to import.`
						}
					</DialogDescription>
				</DialogHeader>

				{step === 'paste' ?
					<PasteStep
						rawText={rawText}
						setRawText={setRawText}
						onParse={handleParse}
					/>
				:	<MapAndReviewStep
						headers={headers}
						rows={rows}
						mappings={mappings}
						includedRows={includedRows}
						lang={lang}
						translationCount={translationCount}
						translationsWithoutLang={translationsWithoutLang}
						isValid={isValid}
						phrases={phrases}
						includedCount={includedCount}
						allIncluded={allIncluded}
						phraseColIndex={phraseColIndex}
						hasTags={hasTags}
						updateMapping={updateMapping}
						toggleRow={toggleRow}
						toggleAllRows={toggleAllRows}
						onBack={handleBack}
						onImport={handleImport}
					/>
				}
			</DialogContent>
		</Dialog>
	)
}

function PasteStep({
	rawText,
	setRawText,
	onParse,
}: {
	rawText: string
	setRawText: (text: string) => void
	onParse: () => void
}) {
	const lineCount = rawText.trim().split('\n').length

	return (
		<div className="space-y-4">
			<Textarea
				value={rawText}
				onChange={(e) => setRawText(e.target.value)}
				placeholder={`phrase\ttranslation\ttags\nhello\thola\tgreetings\ngoodbye\tadiós\tgreetings, basics`}
				rows={10}
				className="font-mono text-sm"
				data-testid="spreadsheet-paste-textarea"
			/>
			<p className="text-muted-foreground text-xs">
				Tip: Headers like &ldquo;translation (eng)&rdquo; or
				&ldquo;English&rdquo; will auto-detect the translation language.
			</p>
			<div className="flex justify-end">
				<Button
					onClick={onParse}
					disabled={lineCount < 2}
					data-testid="spreadsheet-parse-button"
				>
					Continue <ArrowRight className="ms-2 size-4" />
				</Button>
			</div>
		</div>
	)
}

function MapAndReviewStep({
	headers,
	rows,
	mappings,
	includedRows,
	lang,
	translationCount,
	translationsWithoutLang,
	isValid,
	phrases,
	includedCount,
	allIncluded,
	phraseColIndex,
	hasTags,
	updateMapping,
	toggleRow,
	toggleAllRows,
	onBack,
	onImport,
}: {
	headers: Array<string>
	rows: Array<Array<string>>
	mappings: Array<ColumnMapping>
	includedRows: Array<boolean>
	lang: string
	translationCount: number
	translationsWithoutLang: number
	isValid: boolean
	phrases: Array<SpreadsheetPhrase>
	includedCount: number
	allIncluded: boolean
	phraseColIndex: number
	hasTags: boolean
	updateMapping: (index: number, updates: Partial<ColumnMapping>) => void
	toggleRow: (index: number) => void
	toggleAllRows: (checked: boolean) => void
	onBack: () => void
	onImport: () => void
}) {
	return (
		<div className="space-y-4">
			{/* Column mapping */}
			<div>
				<Label className="mb-2 block">Column Mapping</Label>
				<div className="overflow-x-auto rounded border">
					<table className="w-full text-sm">
						<thead>
							<tr className="bg-muted/50">
								{headers.map((header, i) => (
									<th key={i} className="px-3 py-2 text-start font-medium">
										{header}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							<tr className="border-t">
								{mappings.map((mapping, i) => (
									<td key={i} className="px-3 py-2">
										{mapping.role === 'phrase' ?
											<span className="text-muted-foreground text-xs font-medium">
												Phrase ({languages[lang]})
											</span>
										:	<select
												value={mapping.role}
												onChange={(e) =>
													updateMapping(i, {
														role: e.target.value as ColumnRole,
													})
												}
												className="bg-card border-input w-full rounded-2xl border px-2 py-1.5 text-sm"
												data-testid={`column-role-${i}`}
											>
												<option value="skip">Skip</option>
												<option value="translation">Translation</option>
												<option value="tags">Tags</option>
											</select>
										}
									</td>
								))}
							</tr>
							<tr className="border-t">
								{mappings.map((mapping, i) => (
									<td key={i} className="px-3 py-2">
										{mapping.role === 'translation' ?
											<SelectOneOfYourLanguages
												value={mapping.lang}
												setValue={(val) =>
													updateMapping(i, {
														lang: val,
													})
												}
												className="w-36"
											/>
										:	null}
									</td>
								))}
							</tr>
						</tbody>
					</table>
				</div>
			</div>

			{/* Validation messages */}
			<ValidationMessages
				translationCount={translationCount}
				translationsWithoutLang={translationsWithoutLang}
			/>

			{/* Preview table */}
			{isValid && (
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<Label>
							Preview ({phrases.length} valid of {includedCount} selected)
						</Label>
						<div className="flex items-center gap-2">
							<Checkbox
								checked={allIncluded}
								onCheckedChange={(checked) => toggleAllRows(checked === true)}
							/>
							<span className="text-muted-foreground text-xs">Select all</span>
						</div>
					</div>
					<div className="max-h-64 overflow-y-auto rounded border">
						<table className="w-full text-sm">
							<thead className="bg-muted/50 sticky top-0">
								<tr>
									<th className="w-8 px-2 py-1.5" />
									<th className="px-2 py-1.5 text-start font-medium">Phrase</th>
									<th className="px-2 py-1.5 text-start font-medium">
										Translations
									</th>
									{hasTags && (
										<th className="px-2 py-1.5 text-start font-medium">Tags</th>
									)}
								</tr>
							</thead>
							<tbody>
								{rows.map((row, rowIndex) => {
									const phraseText = row[phraseColIndex] || ''
									if (!phraseText) return null

									const translationTexts = mappings
										.map((m, i) => ({
											...m,
											index: i,
										}))
										.filter((m) => m.role === 'translation')
										.map(
											(m) =>
												`${languages[m.lang] || m.lang}: ${row[m.index] || ''}`
										)

									const tagTexts = mappings
										.map((m, i) => ({
											...m,
											index: i,
										}))
										.filter((m) => m.role === 'tags')
										.flatMap((m) =>
											(row[m.index] || '').split(',').map((t) => t.trim())
										)
										.filter((t) => t.length > 0)

									return (
										<tr
											key={rowIndex}
											className={`border-t ${!includedRows[rowIndex] ? 'opacity-40' : ''}`}
										>
											<td className="px-2 py-1.5">
												<Checkbox
													checked={includedRows[rowIndex]}
													onCheckedChange={() => toggleRow(rowIndex)}
												/>
											</td>
											<td className="px-2 py-1.5 font-medium">{phraseText}</td>
											<td className="px-2 py-1.5">
												{translationTexts.map((t, i) => (
													<div
														key={i}
														className="text-muted-foreground text-xs"
													>
														{t}
													</div>
												))}
											</td>
											{hasTags && (
												<td className="px-2 py-1.5">
													<div className="flex flex-wrap gap-1">
														{tagTexts.map((t, i) => (
															<span
																key={i}
																className="bg-muted inline-block rounded px-1.5 py-0.5 text-xs"
															>
																{t}
															</span>
														))}
													</div>
												</td>
											)}
										</tr>
									)
								})}
							</tbody>
						</table>
					</div>
				</div>
			)}

			<DialogFooter>
				<Button variant="neutral" onClick={onBack}>
					<ArrowLeft className="me-2 size-4" /> Back
				</Button>
				<Button
					onClick={onImport}
					disabled={!isValid || phrases.length === 0}
					data-testid="spreadsheet-import-button"
				>
					Import {phrases.length} Phrases
				</Button>
			</DialogFooter>
		</div>
	)
}

function ValidationMessages({
	translationCount,
	translationsWithoutLang,
}: {
	translationCount: number
	translationsWithoutLang: number
}) {
	return (
		<>
			{translationCount === 0 && (
				<p className="text-destructive text-sm">
					Please mark at least one column as &ldquo;Translation&rdquo;
				</p>
			)}
			{translationsWithoutLang > 0 && (
				<p className="text-destructive text-sm">
					Please select a language for all translation columns
				</p>
			)}
		</>
	)
}
