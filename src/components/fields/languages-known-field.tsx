import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react'
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

const proficiencyLevels: {
	value: LanguageProficiencyEnumType
	label: string
}[] = [
	{ value: 'fluent', label: 'Fluent' },
	{ value: 'proficient', label: 'Proficient' },
	{ value: 'beginner', label: 'Beginner' },
]

/**
 * Renders the array of languages-known. The field value is the array;
 * each row reads/writes its own slot via field.handleChange with a
 * remapped array. We keep the component bound to a single
 * `<form.AppField name="languages_known">` parent so order/move/remove
 * mutations stay atomic.
 */
export function LanguagesKnownField() {
	const field = useFieldContext<LanguageKnownType[]>()
	const value = field.state.value ?? []

	const setValue = (next: LanguageKnownType[]) => {
		field.handleChange(next)
	}

	const updateAt = (index: number, patch: Partial<LanguageKnownType>) => {
		setValue(
			value.map((item, i) => (i === index ? { ...item, ...patch } : item))
		)
	}

	const move = (index: number, direction: -1 | 1) => {
		const target = index + direction
		if (target < 0 || target >= value.length) return
		const next = [...value]
		;[next[index], next[target]] = [next[target], next[index]]
		setValue(next)
	}

	const remove = (index: number) => {
		setValue(value.filter((_, i) => i !== index))
	}

	const append = () => {
		setValue([...value, { lang: '', level: 'proficient' }])
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
						key={index}
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
							<div className="min-w-0 flex-1">
								<SelectOneLanguage
									value={item.lang}
									setValue={(v) => updateAt(index, { lang: v })}
									disabled={value
										.map((other) => other.lang)
										.filter((l) => l !== item.lang)}
								/>
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
				<Button
					type="button"
					variant="soft"
					size="sm"
					onClick={append}
					className="mt-0"
					data-testid="add-language-button"
				>
					Add Language
				</Button>
			</div>
		</div>
	)
}
