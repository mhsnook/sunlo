import * as v from 'valibot'
import { blockErrors } from '../../shared/blocks'

export const Text = v.pipe(v.string(), v.trim(), v.minLength(1))
const Label = v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(24))
export const Options = v.pipe(v.array(Label), v.minLength(2), v.maxLength(3))

export const toActions = (options: Array<string>) =>
	options.map((label, index) => ({ id: `option-${index + 1}`, label }))

// Throwing from a tool hands the message to the model, which fixes the
// block and calls the tool again; nothing is posted with a broken block.
export function assertBlocks(text: string) {
	const errors = blockErrors(text)
	if (errors.length) {
		throw new Error(`Nothing was posted. ${errors.join(' ')}`)
	}
}
