import { type ReactNode, useState } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toastError } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'
import type { CrewKey, TodoType } from '../../../shared/crew'
import { useAddTodo, useDeleteTodo, useEditTodo } from '~/lib/crew'
import { dayLabel } from '~/lib/format'
import { EditableEntry } from './editable-entry'

export function Section({
	title,
	children,
}: {
	title: string
	children: ReactNode
}) {
	return (
		<section className="space-y-2">
			<h2 className="text-muted-foreground text-sm font-semibold">{title}</h2>
			{children}
		</section>
	)
}

export function Empty({ children }: { children: ReactNode }) {
	return <p className="text-muted-foreground text-sm">{children}</p>
}

// A one-line box for the admin to add an entry, such as a memory or a to-do.
// Each button adds the text its own way; Enter uses the first.
export function AddEntry({
	placeholder,
	label,
	buttons,
	busy,
	testId,
}: {
	placeholder: string
	label: string
	buttons: Array<{ label: string; onAdd: (text: string) => Promise<unknown> }>
	busy: boolean
	testId: string
}) {
	const [draft, setDraft] = useState('')
	const add = (onAdd: (text: string) => Promise<unknown>) => {
		const text = draft.trim()
		if (!text) return
		onAdd(text).then(
			() => setDraft(''),
			(error: Error) => toastError(error.message)
		)
	}
	return (
		<form
			className="flex flex-wrap gap-2"
			data-testid={testId}
			onSubmit={(event) => {
				event.preventDefault()
				add(buttons[0].onAdd)
			}}
		>
			<Input
				value={draft}
				onChange={(event) => setDraft(event.target.value)}
				placeholder={placeholder}
				aria-label={label}
				className={cn('min-w-48 flex-1', buttons.length > 1 && 'basis-full')}
				data-testid={`${testId}-input`}
			/>
			{buttons.map((button, index) => (
				<Button
					key={button.label}
					type={index ? 'button' : 'submit'}
					size="sm"
					variant="soft"
					disabled={busy || !draft.trim()}
					onClick={index ? () => add(button.onAdd) : undefined}
					data-testid={`${testId}-button`}
					data-key={button.label}
				>
					{button.label}
				</Button>
			))}
		</form>
	)
}

// An agent's to-dos. The admin can tick them, edit them, delete them and add
// more, and the agent hears about each change on its next run.
export function TodoList({
	agent,
	todos,
}: {
	agent: CrewKey
	todos: Array<TodoType>
}) {
	const add = useAddTodo(agent)
	const edit = useEditTodo(agent)
	const remove = useDeleteTodo(agent)
	const busy = add.isPending || edit.isPending || remove.isPending
	return (
		<div className="space-y-3">
			{todos.length > 0 && (
				<ul className="space-y-3" data-testid="agent-todos">
					{todos.map((todo) => (
						<EditableEntry
							key={todo.id}
							id={todo.id}
							text={todo.text}
							label="To-do"
							leading={
								<button
									type="button"
									aria-pressed={todo.done}
									aria-label="Done"
									disabled={busy}
									onClick={() =>
										edit.mutate(
											{ id: todo.id, done: !todo.done },
											{ onError: (error) => toastError(error.message) }
										)
									}
									className={cn(
										'mt-0.5 grid size-5 shrink-0 place-items-center rounded border',
										todo.done && 'bg-primary-700 border-primary-700 text-paper'
									)}
									data-testid="agent-todo-done"
								>
									{todo.done && <Check className="size-3.5" />}
								</button>
							}
							busy={busy}
							onSave={(text) => edit.mutateAsync({ id: todo.id, text })}
							onDelete={() => remove.mutateAsync(todo.id)}
							deleteLabel="Delete this to-do"
							quiet
							testId="agent-todo"
						>
							<span
								className={cn(
									todo.done && 'text-muted-foreground line-through'
								)}
							>
								{todo.text}
							</span>
							{(todo.note || todo.doneAt) && (
								<span className="text-muted-foreground block text-xs">
									{todo.done && todo.doneAt
										? `Done ${dayLabel(todo.doneAt)}`
										: todo.note}
								</span>
							)}
						</EditableEntry>
					))}
				</ul>
			)}
			<AddEntry
				placeholder="A to-do for this officer"
				label="Add a to-do"
				buttons={[{ label: 'Add', onAdd: (text) => add.mutateAsync(text) }]}
				busy={busy}
				testId="agent-todo-add"
			/>
		</div>
	)
}
