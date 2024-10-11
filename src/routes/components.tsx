import { createFileRoute } from '@tanstack/react-router'
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from 'components/ui/accordion'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from 'components/ui/alert-dialog'
import { Button } from 'components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from 'components/ui/card'
import { Checkbox } from 'components/ui/checkbox'
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from 'components/ui/command'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from 'components/ui/dialog'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from 'components/ui/dropdown-menu'
import { Input } from 'components/ui/input'
import { Label } from 'components/ui/label'
import {
	NavigationMenu,
	NavigationMenuContent,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	NavigationMenuTrigger,
} from 'components/ui/navigation-menu'
import { Popover, PopoverContent, PopoverTrigger } from 'components/ui/popover'
import { ScrollArea } from 'components/ui/scroll-area'

export const Route = createFileRoute('/components')({
	component: ComponentsPage,
})

function ComponentsPage() {
	return (
		<div className="container mx-auto p-4">
			<h1 className="text-3xl font-bold mb-6">ShadCN Component Showcase</h1>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{/* Accordion */}
				<Card>
					<CardHeader>
						<CardTitle>Accordion</CardTitle>
					</CardHeader>
					<CardContent>
						<Accordion type="single" collapsible>
							<AccordionItem value="item-1">
								<AccordionTrigger>Is it accessible?</AccordionTrigger>
								<AccordionContent>
									Yes. It adheres to the WAI-ARIA design pattern.
								</AccordionContent>
							</AccordionItem>
						</Accordion>
					</CardContent>
				</Card>

				{/* Alert Dialog */}
				<Card>
					<CardHeader>
						<CardTitle>Alert Dialog</CardTitle>
					</CardHeader>
					<CardContent>
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button variant="outline">Show Alert</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Are you sure?</AlertDialogTitle>
									<AlertDialogDescription>
										This action cannot be undone.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Cancel</AlertDialogCancel>
									<AlertDialogAction>Continue</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</CardContent>
				</Card>

				{/* Button */}
				<Card>
					<CardHeader>
						<CardTitle>Button</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex space-x-2">
							<Button>Default</Button>
							<Button variant="secondary">Secondary</Button>
							<Button variant="ghost">Ghost</Button>
							<Button variant="outline">Outline</Button>
							<Button variant="destructive">Destructive</Button>
							<Button variant="white">White</Button>
						</div>
					</CardContent>
				</Card>

				{/* Card */}
				<Card>
					<CardHeader>
						<CardTitle>Card Title</CardTitle>
						<CardDescription>
							Card Description (CardHeader: [CardTitle, CardDescription],
							CardContent, CardFooter)
						</CardDescription>
					</CardHeader>
					<CardContent>
						<p>Card content goes here.</p>
					</CardContent>
					<CardFooter className="flex space-x-2">
						<Button>Submit</Button>
						<Button variant="outline">Cancel</Button>
					</CardFooter>
				</Card>

				{/* Checkbox */}
				<Card>
					<CardHeader>
						<CardTitle>Checkbox</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex items-center space-x-2">
							<Checkbox id="terms" />
							<label
								htmlFor="terms"
								className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
							>
								Accept terms and conditions
							</label>
						</div>
					</CardContent>
				</Card>

				{/* Command */}
				<Card>
					<CardHeader>
						<CardTitle>Command</CardTitle>
					</CardHeader>
					<CardContent>
						<Command>
							<CommandInput placeholder="Type a command or search..." />
							<CommandList>
								<CommandEmpty>No results found.</CommandEmpty>
								<CommandGroup heading="Suggestions">
									<CommandItem>Calendar</CommandItem>
									<CommandItem>Search Emoji</CommandItem>
									<CommandItem>Calculator</CommandItem>
								</CommandGroup>
							</CommandList>
						</Command>
					</CardContent>
				</Card>

				{/* Dialog */}
				<Card>
					<CardHeader>
						<CardTitle>Dialog</CardTitle>
					</CardHeader>
					<CardContent>
						<Dialog>
							<DialogTrigger asChild>
								<Button variant="outline">Open Dialog</Button>
							</DialogTrigger>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>Are you sure absolutely sure?</DialogTitle>
									<DialogDescription>
										This action cannot be undone.
									</DialogDescription>
								</DialogHeader>
								<DialogFooter>
									<Button type="submit">Confirm</Button>
								</DialogFooter>
							</DialogContent>
						</Dialog>
					</CardContent>
				</Card>

				{/* Dropdown Menu */}
				<Card>
					<CardHeader>
						<CardTitle>Dropdown Menu</CardTitle>
					</CardHeader>
					<CardContent>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline">Open Menu</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent>
								<DropdownMenuLabel>My Account</DropdownMenuLabel>
								<DropdownMenuSeparator />
								<DropdownMenuItem>Profile</DropdownMenuItem>
								<DropdownMenuItem>Billing</DropdownMenuItem>
								<DropdownMenuItem>Team</DropdownMenuItem>
								<DropdownMenuItem>Subscription</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</CardContent>
				</Card>

				{/* Input */}
				<Card>
					<CardHeader>
						<CardTitle>Input</CardTitle>
					</CardHeader>
					<CardContent>
						<Input type="email" placeholder="Email" />
					</CardContent>
				</Card>

				{/* Label */}
				<Card>
					<CardHeader>
						<CardTitle>Label</CardTitle>
					</CardHeader>
					<CardContent>
						<Label htmlFor="email">Email</Label>
						<Input type="email" id="email" placeholder="m@example.com" />
					</CardContent>
				</Card>

				{/* Navigation Menu */}
				<Card>
					<CardHeader>
						<CardTitle>Navigation Menu</CardTitle>
					</CardHeader>
					<CardContent>
						<NavigationMenu>
							<NavigationMenuList>
								<NavigationMenuItem>
									<NavigationMenuTrigger>Item One</NavigationMenuTrigger>
									<NavigationMenuContent>
										<NavigationMenuLink>Link</NavigationMenuLink>
									</NavigationMenuContent>
								</NavigationMenuItem>
							</NavigationMenuList>
						</NavigationMenu>
					</CardContent>
				</Card>

				{/* Popover */}
				<Card>
					<CardHeader>
						<CardTitle>Popover</CardTitle>
					</CardHeader>
					<CardContent>
						<Popover>
							<PopoverTrigger asChild>
								<Button variant="outline">Open popover</Button>
							</PopoverTrigger>
							<PopoverContent className="w-80">
								<div className="grid gap-4">
									<div className="space-y-2">
										<h4 className="font-medium leading-none">Dimensions</h4>
										<p className="text-sm text-muted-foreground">
											Set the dimensions for the layer.
										</p>
									</div>
									<div className="grid gap-2">
										<div className="grid grid-cols-3 items-center gap-4">
											<Label htmlFor="width">Width</Label>
											<Input
												id="width"
												defaultValue="100%"
												className="col-span-2 h-8"
											/>
										</div>
										<div className="grid grid-cols-3 items-center gap-4">
											<Label htmlFor="height">Height</Label>
											<Input
												id="height"
												defaultValue="25px"
												className="col-span-2 h-8"
											/>
										</div>
									</div>
								</div>
							</PopoverContent>
						</Popover>
					</CardContent>
				</Card>

				{/* Scroll Area */}
				<Card>
					<CardHeader>
						<CardTitle>Scroll Area</CardTitle>
					</CardHeader>
					<CardContent>
						<ScrollArea className="h-[200px] w-[350px] rounded-md border p-4">
							Jokester began sneaking into the castle in the middle of the night
							and leaving jokes all over the place: under the king's pillow, in
							his soup, even in the royal toilet. The king was furious, but he
							couldn't seem to stop Jokester. And then, one day, the king
							realized that the jokes were actually pretty funny. He laughed so
							hard that he fell off his throne!
						</ScrollArea>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
