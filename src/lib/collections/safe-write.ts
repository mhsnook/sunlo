/**
 * Wraps a collection write so that if the collection isn't loaded yet,
 * it preloads and retries once. Only retries on "not ready" errors —
 * other errors are re-thrown immediately.
 */
export async function safeWrite(
	preload: () => Promise<unknown>,
	write: () => void
): Promise<void> {
	try {
		write()
	} catch (error) {
		if (error instanceof Error && /ready/i.test(error.message)) {
			await preload()
			write()
		} else {
			throw error
		}
	}
}
