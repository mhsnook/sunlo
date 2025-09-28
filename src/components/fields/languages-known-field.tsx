import {
	useFieldArray,
	Controller,
	type FieldValues,
	type ArrayPath,
	type Path,
} from 'react-hook-form'
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react'
import type { LanguageKnown, LanguageProficiency } from '@/types/main'
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
import ErrorLabel from './error-label'
import { ControlledArrayFieldProps } from './types'

const proficiencyLevels: { value: LanguageProficiency; label: string }[] = [
	{ value: 'fluent', label: 'Fluent' },
	{ value: 'proficient', label: 'Proficient' },
	{ value: 'beginner', label: 'Beginner' },
]

export function LanguagesKnownField<T extends FieldValues>({
	control,
	error,
}: ControlledArrayFieldProps<T>) {
	const { fields, append, remove, move } = useFieldArray({
		name: 'languages_known' as ArrayPath<T>,
		control,
	})

	return (
		<div className="space-y-2">
			<Label>Languages You Know</Label>
			<p className="text-muted-foreground text-sm italic">
				This tells the app which translations to show you. It is visible to your
				friends.
			</p>
			<div className="space-y-2">
				{fields.map((field, index) => (
					<div
						key={field.id}
						className="bg-card space-y-2 rounded-lg border p-2"
					>
						<div className="flex items-center gap-2">
							<div className="flex flex-col">
								<Button
									type="button"
									variant="ghost"
									size="icon"
									// oxlint-disable-next-line jsx-no-new-function-as-prop
									onClick={() => move(index, index - 1)}
									disabled={index === 0}
								>
									<ArrowUp className="size-4" />
								</Button>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									// oxlint-disable-next-line jsx-no-new-function-as-prop
									onClick={() => move(index, index + 1)}
									disabled={index === fields.length - 1}
								>
									<ArrowDown className="size-4" />
								</Button>
							</div>
							<div className="flex-1">
								<Controller
									control={control}
									name={`languages_known.${index}.lang` as Path<T>}
									// oxlint-disable-next-line jsx-no-new-function-as-prop
									render={({ field: langField }) => (
										<SelectOneLanguage
											value={langField.value}
											setValue={langField.onChange}
											// oxlint-disable-next-line jsx-no-new-array-as-prop
											disabled={fields
												.map((f) => (f as LanguageKnown).lang)
												.filter((l) => l !== langField.value)}
										/>
									)}
								/>
							</div>
							<Controller
								control={control}
								name={`languages_known.${index}.level` as Path<T>}
								// oxlint-disable-next-line jsx-no-new-function-as-prop
								render={({ field: selectField }) => (
									<Select
										onValueChange={selectField.onChange}
										defaultValue={selectField.value}
									>
										<SelectTrigger className="w-[120px]">
											<SelectValue placeholder="Proficiency" />
										</SelectTrigger>
										<SelectContent>
											{proficiencyLevels.map((level) => (
												<SelectItem key={level.value} value={level.value}>
													{level.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							/>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								// oxlint-disable-next-line jsx-no-new-function-as-prop
								onClick={() => remove(index)}
								disabled={fields.length === 1}
							>
								<Trash2 className="text-destructive size-4" />
							</Button>
						</div>
						{error?.[index] && (
							<div className="ms-12">
								<ErrorLabel error={error[index].lang} />
								<ErrorLabel error={error[index].level} />
							</div>
						)}
					</div>
				))}
				<ErrorLabel error={error?.root} />
			</div>
			<div className="flex w-full flex-row justify-end">
				<Button
					type="button"
					variant="outline"
					size="sm"
					// oxlint-disable-next-line jsx-no-new-function-as-prop
					onClick={() => append({ lang: '', level: 'proficient' })}
					className="mt-0"
				>
					Add Language
				</Button>
			</div>
		</div>
	)
}
