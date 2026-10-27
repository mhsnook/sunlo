import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TodoType } from '../../../shared/crew'
import { dayLabel } from '~/lib/format'

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

export function TodoList({ todos }: { todos: Array<TodoType> }) {
	return (
		<ul className="space-y-3" data-testid="agent-todos">
			{todos.map((todo) => (
				<li
					key={todo.id}
					className="flex gap-3"
					data-testid="agent-todo"
					data-key={todo.id}
				>
					<span
						aria-label={todo.done ? 'Done' : 'Not done'}
						className={cn(
							'mt-0.5 grid size-5 shrink-0 place-items-center rounded border',
							todo.done && 'bg-primary-700 border-primary-700 text-paper'
						)}
					>
						{todo.done && <Check className="size-3.5" />}
					</span>
					<span>
						<span
							className={cn(todo.done && 'text-muted-foreground line-through')}
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
					</span>
				</li>
			))}
		</ul>
	)
}
