import { Link } from '@tanstack/react-router'
import { Garlic } from './garlic'
import Callout from './ui/callout'
import { buttonVariants } from './ui/button-variants'
import { MessageSquarePlus } from 'lucide-react'

export function LanguageIsEmpty({ lang }: { lang: string }) {
	return (
		<Callout className="mt-4" Icon={() => <Garlic size={120} />}>
			<h3 className="h3">Library under construction</h3>
			<p>
				This language is fully empty! But Sunlo is a community effort &ndash;{' '}
				<em>you</em> have the power to do something about it.
			</p>
			<p>
				You must know <em>at least one phrase</em> in this new language, right?
				Add it to the library!
			</p>
			<Link
				className={buttonVariants({ size: 'lg' })}
				to="/learn/$lang/add-phrase"
				params={{ lang }}
			>
				<MessageSquarePlus size="48" className="h-12 w-12 grow" />
				Add phrases to the library
			</Link>
		</Callout>
	)
}

export function LanguageFilteredIsEmpty({ lang }: { lang: string }) {
	return (
		<Callout Icon={() => <Garlic size={120} />}>
			<h3 className="h3">Library under construction</h3>
			<p>
				This language has cards but none of them are translated into languages
				you know. But Sunlo is a community effort &mdash; you can add phrases
				and new translations any time you want.
			</p>
			<ul className="ms-4 list-disc space-y-4">
				<li>
					<Link
						to="/learn/$lang/add-phrase"
						params={{ lang }}
						className="s-link"
					>
						Add phrases to the library
					</Link>
				</li>
				<li>
					<Link
						to="/learn/$lang/library"
						params={{ lang }}
						search={{ filter: 'language_no_translations' }}
						className="s-link"
					>
						View existing phrases to add translations in one of your languages
					</Link>{' '}
				</li>
				<li>
					<Link to="/profile" className="s-link">
						Or, update your profile to view additional translations
					</Link>{' '}
				</li>
			</ul>
		</Callout>
	)
}
