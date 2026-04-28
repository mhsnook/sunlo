import { useChatStore } from '../store'
import { SUPPORTED_LANGS } from '../api'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

export function LanguagePicker() {
	const lang = useChatStore((s) => s.lang)
	const setLang = useChatStore((s) => s.setLang)

	return (
		<div
			className="flex flex-row flex-wrap gap-2"
			data-testid="chat-language-picker"
		>
			{SUPPORTED_LANGS.map((option) => {
				const isActive = option.code === lang
				return (
					<button
						key={option.code}
						type="button"
						data-key={option.code}
						data-testid="chat-language-option"
						data-active={isActive ? '' : undefined}
						onClick={() => setLang(option.code)}
						className={cn(
							buttonVariants({
								variant: isActive ? 'soft' : 'ghost',
								size: 'sm',
							})
						)}
					>
						{option.label}
					</button>
				)
			})}
		</div>
	)
}
