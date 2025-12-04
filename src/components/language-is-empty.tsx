import { Link } from '@tanstack/react-router'
import { Garlic120 } from '@/components/garlic'
import Callout from '@/components/ui/callout'
import { buttonVariants } from '@/components/ui/button-variants'
import { MessageSquarePlus } from 'lucide-react'

export function LanguageIsEmpty({ lang }: { lang: string }) {
	return (
		<Callout className="mt-4" Icon={Garlic120}>
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
				// oxlint-disable-next-line jsx-no-new-object-as-prop
				params={{ lang }}
			>
				<MessageSquarePlus size="48" className="h-12 w-12 grow" />
				Add phrases to the library
			</Link>
		</Callout>
	)
}
const constFilter = { filter: 'language_no_translations' } as const

export function LanguageFilteredIsEmpty({ lang }: { lang: string }) {
	return (
		<Callout Icon={Garlic120}>
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
						// oxlint-disable-next-line jsx-no-new-object-as-prop
						params={{ lang }}
						className="s-link"
					>
						Add phrases to the library
					</Link>
				</li>
				<li>
					<Link
						to="/learn/$lang/feed"
						// @@TODO -- support this filter? change it?
						// oxlint-disable-next-line jsx-no-new-object-as-prop
						params={{ lang }}
						search={constFilter}
						className="s-link"
					>
						Browse the Requests feed to find new Phrases to learn
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
