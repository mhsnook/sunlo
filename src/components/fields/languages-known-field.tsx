import {
	useFieldArray,
	Controller,
	type FieldValues,
	type ArrayPath,
	type Path,
} from 'react-hook-form'
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
import ErrorLabel from './error-label'
import { ControlledArrayFieldProps } from './types'
import type {
	LanguageKnownType,
	LanguageProficiencyEnumType,
} from '@/lib/schemas'
import { Card } from '@/components/ui/card'

const proficiencyLevels: {
	value: LanguageProficiencyEnumType
	label: string
}[] = [
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
					<Card key={field.id} className="space-y-2 p-2">
						<div className="flex items-center gap-2">
							<div className="flex flex-col">
								<Button
									type="button"
									variant="ghost"
									size="icon"
									onClick={() => move(index, index - 1)}
									disabled={index === 0}
								>
									<ArrowUp className="size-4" />
								</Button>
								<Button
									type="button"
									variant="ghost"
									size="icon"
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
									render={({ field: langField }) => (
										<SelectOneLanguage
											value={langField.value}
											setValue={langField.onChange}
											disabled={fields
												.map((f) => (f as unknown as LanguageKnownType).lang)
												.filter((l) => l !== langField.value)}
										/>
									)}
								/>
							</div>
							<Controller
								control={control}
								name={`languages_known.${index}.level` as Path<T>}
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
								onClick={() => remove(index)}
								disabled={fields.length === 1}
							>
								<Trash2 className="text-destructive size-4" />
							</Button>
						</div>
						{/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
						{(error as any)?.[index] && (
							<div className="ms-12">
								{/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
								<ErrorLabel error={(error as any)[index]?.lang} />
								{/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
								<ErrorLabel error={(error as any)[index]?.level} />
							</div>
						)}
					</Card>
				))}
				{/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
				<ErrorLabel error={(error as any)?.root} />
			</div>
			<div className="flex w-full flex-row justify-end">
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() =>
						append({
							lang: '',
							level: 'proficient',
						} as unknown as T[ArrayPath<T>][number])
					}
					className="mt-0"
				>
					Add Language
				</Button>
			</div>
		</div>
	)
}
