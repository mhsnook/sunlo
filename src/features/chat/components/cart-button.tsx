import { ShoppingCart, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import { useChatStore } from '../store'

export function CartButton() {
	const cart = useChatStore((s) => s.cart)
	const removeFromCart = useChatStore((s) => s.removeFromCart)
	const clearCart = useChatStore((s) => s.clearCart)

	return (
		<Popover>
			<PopoverTrigger
				render={
					<Button
						type="button"
						variant="ghost"
						size="icon"
						data-testid="chat-cart-button"
						aria-label={`Cart (${cart.length})`}
					/>
				}
			>
				<span className="relative">
					<ShoppingCart />
					{cart.length > 0 && (
						<span
							data-testid="chat-cart-badge"
							className="bg-primary text-primary-foreground absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.65rem] font-medium"
						>
							{cart.length}
						</span>
					)}
				</span>
			</PopoverTrigger>
			<PopoverContent
				align="end"
				className="w-80"
				data-testid="chat-cart-popover"
			>
				<div className="flex flex-col gap-3">
					<div className="flex flex-row items-center justify-between">
						<h3 className="text-sm font-medium">
							Cart{cart.length > 0 ? ` (${cart.length})` : ''}
						</h3>
						{cart.length > 0 && (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								data-testid="chat-cart-clear-button"
								onClick={clearCart}
							>
								<Trash2 />
								Clear
							</Button>
						)}
					</div>

					{cart.length === 0 ? (
						<p
							data-testid="chat-cart-empty"
							className="text-muted-foreground py-4 text-center text-sm"
						>
							Your cart is empty.
						</p>
					) : (
						<ul className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto">
							{cart.map((phrase) => (
								<li
									key={phrase.id}
									data-key={phrase.id}
									data-testid="chat-cart-item"
									className="hover:bg-1-mlo-primary flex flex-row items-start justify-between gap-2 rounded p-2 text-sm"
								>
									<div className="flex flex-col">
										<span lang={phrase.lang} className="font-medium">
											{phrase.text}
										</span>
										{phrase.translations[0] && (
											<span
												lang={phrase.translations[0].lang}
												className="text-muted-foreground text-xs"
											>
												{phrase.translations[0].text}
											</span>
										)}
									</div>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										data-testid="chat-cart-remove-button"
										aria-label="Remove from cart"
										onClick={() => removeFromCart(phrase.id)}
									>
										<X />
									</Button>
								</li>
							))}
						</ul>
					)}
				</div>
			</PopoverContent>
		</Popover>
	)
}
