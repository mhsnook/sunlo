type ClaimUser = {
	id: string
	is_anonymous?: boolean
	user_metadata?: Record<string, unknown>
}

export type GuestNameClaimIo = {
	currentUser: () => Promise<ClaimUser | null>
	profileUsername: (userId: string) => string | null | undefined
	/** Rejects with the Postgres error when the write fails. */
	writeUsername: (userId: string, name: string) => Promise<unknown>
	clearPendingName: () => Promise<unknown>
	nameTaken: (name: string) => void
	writeFailed: (error: unknown) => void
}

const isUniqueViolation = (error: unknown) =>
	(error as { code?: unknown } | null)?.code === '23505'

/**
 * A guest picks a display name when they sign up (GuestSignupForm), but
 * guard_anonymous_profile refuses it until they confirm their email, so it
 * waits in their auth metadata. The returned function writes it to the
 * profile on a load as an account, at most once per tab. A loader can call it
 * while the user is still a guest; that call changes nothing.
 *
 * The metadata keeps the name until the write succeeds or the name turns out
 * to be taken, so any other failure retries on the next load.
 */
export function createGuestNameClaim(io: GuestNameClaimIo) {
	let claimedFor: string | null = null

	return async function claimGuestUsername(userId: string): Promise<void> {
		if (claimedFor === userId) return
		const user = await io.currentUser()
		if (!user || user.id !== userId || user.is_anonymous) return
		const name = user.user_metadata?.username
		if (typeof name !== 'string' || !name) return
		// Two loaders can both pass the first check while currentUser() awaits.
		if (claimedFor === userId) return
		claimedFor = userId

		if (!io.profileUsername(userId)) {
			try {
				await io.writeUsername(userId, name)
			} catch (error) {
				if (!isUniqueViolation(error)) {
					claimedFor = null
					io.writeFailed(error)
					return
				}
				io.nameTaken(name)
			}
		}
		await io.clearPendingName()
	}
}
