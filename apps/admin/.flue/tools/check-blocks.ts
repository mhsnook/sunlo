import { blockErrors } from '../../shared/blocks'

// Throwing from a tool hands the message to the model, which fixes the
// block and calls the tool again; nothing is posted with a broken block.
export function assertBlocks(...texts: Array<string>) {
	const errors = texts.flatMap(blockErrors)
	if (errors.length) {
		throw new Error(`Nothing was posted. ${errors.join(' ')}`)
	}
}
