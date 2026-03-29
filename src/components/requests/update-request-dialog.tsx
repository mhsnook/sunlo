import { useState } from 'react'
import { Edit } from 'lucide-react'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { PhraseRequestType } from '@/features/requests/schemas'
import { RequestForm } from './request-form'

export function UpdateRequestDialog({
	request,
}: {
	request: PhraseRequestType
}) {
	const [open, setOpen] = useState(false)

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					aria-label="Update request"
					data-testid="update-request-button"
				>
					<Edit className="h-4 w-4" />
				</Button>
			</DialogTrigger>
			<DialogContent data-testid="edit-request-dialog">
				<DialogHeader>
					<DialogTitle>Edit Request</DialogTitle>
					<DialogDescription className="sr-only">
						Edit your request text below
					</DialogDescription>
				</DialogHeader>
				<RequestForm
					lang={request.lang}
					requestId={request.id}
					onSuccess={() => setOpen(false)}
					onCancel={() => setOpen(false)}
					formTestId="edit-request-form"
					inputTestId="edit-request-prompt-input"
					submitTestId="save-request-button"
					rows={4}
				/>
			</DialogContent>
		</Dialog>
	)
}
