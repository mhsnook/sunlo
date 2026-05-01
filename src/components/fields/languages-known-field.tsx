import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SelectOneLanguage } from '@/components/select-one-language'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import type {
	LanguageKnownType,
	LanguageProficiencyEnumType,
} from '@/features/profile/schemas'
import { Card } from '@/components/ui/card'
import { useFieldContext } from '@/components/form'
import { ErrorList } from '@/components/form/fields/error-list'
import languages from '@/lib/languages'

const proficiencyLevels: {
	value: LanguageProficiencyEnumType
	label: string
}[] = [
	{ value: 'fluent', label: 'Fluent' },
	{ value: 'proficient', label: 'Proficient' },
	{ value: 'beginner', label: 'Beginner' },
]

/**
 * Renders the array of languages-known. The language is fixed once a row
 * is added — only proficiency and order can change. To "swap" a language
 * the user removes the row and adds the new one. This makes `lang` a
 * stable per-row identity, so it doubles as the React key.
 */
export function LanguagesKnownField() {
	const field = useFieldContext<LanguageKnownType[]>()
	const value = field.state.value ?? []

	const updateAt = (index: number, patch: Partial<LanguageKnownType>) => {
		field.handleChange(
			value.map((item, i) => (i === index ? { ...item, ...patch } : item))
		)
	}

	const move = (index: number, direction: -1 | 1) => {
		const target = index + direction
		if (target < 0 || target >= value.length) return
		const next = [...value]
		;[next[index], next[target]] = [next[target], next[index]]
		field.handleChange(next)
	}

	const remove = (index: number) => {
		field.handleChange(value.filter((_, i) => i !== index))
	}

	const addLanguage = (lang: string) => {
		if (!lang || value.some((item) => item.lang === lang)) return
		field.handleChange([...value, { lang, level: 'proficient' }])
	}

	return (
		<div className="space-y-2" data-testid="languages-known">
			<Label>Languages You Know</Label>
			<p className="text-muted-foreground text-sm italic">
				This tells the app which translations to show you. It is visible to your
				friends.
			</p>
			<div className="space-y-2">
				{value.map((item, index) => (
					<Card
						key={item.lang}
						className="@container space-y-2 p-2"
						data-key={String(index)}
					>
						<div className="flex items-center gap-1 @lg:gap-2">
							<div className="flex flex-col">
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="size-7 @lg:size-9"
									onClick={() => move(index, -1)}
									disabled={index === 0}
									aria-label="Move language up"
									data-testid="move-up"
								>
									<ArrowUp className="size-3 @lg:size-4" />
								</Button>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="size-7 @lg:size-9"
									onClick={() => move(index, 1)}
									disabled={index === value.length - 1}
									aria-label="Move language down"
									data-testid="move-down"
								>
									<ArrowDown className="size-3 @lg:size-4" />
								</Button>
							</div>
							<div
								className="text-foreground min-w-0 flex-1 px-2 text-sm @lg:text-base"
								data-testid="language-name"
							>
								{languages[item.lang] ?? item.lang}
							</div>
							<div className="w-24 shrink-0 @lg:w-30">
								<Select
									value={item.level}
									onValueChange={(v) => {
										if (v) updateAt(index, { level: v })
									}}
								>
									<SelectTrigger
										className="w-full text-xs @lg:text-sm"
										data-testid="level-trigger"
									>
										<SelectValue placeholder="Level" />
									</SelectTrigger>
									<SelectContent>
										{proficiencyLevels.map((level) => (
											<SelectItem
												key={level.value}
												value={level.value}
												data-testid={`level-${level.value}`}
											>
												{level.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="shrink-0"
								onClick={() => remove(index)}
								disabled={value.length === 1}
								aria-label="Remove language"
								data-testid="remove-language"
							>
								<Trash2 className="text-destructive size-4" />
							</Button>
						</div>
					</Card>
				))}
				<ErrorList errors={field.state.meta.errors} />
			</div>
			<div className="flex w-full flex-row justify-end">
				<SelectOneLanguage
					value=""
					setValue={addLanguage}
					disabled={value.map((item) => item.lang)}
					trigger={
						<Button
							type="button"
							variant="soft"
							size="sm"
							className="mt-0"
							data-testid="add-language-button"
						>
							<Plus className="me-1 size-4" />
							Add Language
						</Button>
					}
					popoverAlign="end"
				/>
			</div>
		</div>
	)
}
