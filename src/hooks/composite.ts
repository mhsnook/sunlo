import { splitPhraseTranslations } from '@/lib/process-pids'
import { useLanguagePhrase } from '@/lib/use-language'
import { useProfile } from '@/lib/use-profile'
import type { CompositeQueryResults, PhraseFiltered, uuid } from '@/types/main'

export const usePhrase = (
	pid: uuid,
	lang: string
): CompositeQueryResults<PhraseFiltered> => {
	const { data: profile, isPending: isProfilePending } = useProfile()
	const { data: phrase, isPending: isPhrasePending } = useLanguagePhrase(
		pid,
		lang
	)

	if (isPhrasePending) return { data: null, status: 'pending' }
	if (!phrase) return { data: null, status: 'not-found' }
	if (isProfilePending) return { data: phrase, status: 'partial' }
	if (!profile) return { data: phrase, status: 'complete' }

	const phraseFiltered = splitPhraseTranslations(
		phrase,
		profile.languagesToShow
	)

	return { data: phraseFiltered as PhraseFiltered, status: 'complete' }
}
