import { Browser, BrowserContext, Page, expect, Locator } from '@playwright/test'
import { login } from './auth-helpers'

// Test user credentials from seed data
const TEST_USERS = [
	{
		email: 'sunloapp@gmail.com',
		uid: 'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		username: 'GarlicFace',
	},
	{
		email: 'sunloapp+1@gmail.com',
		uid: 'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		username: 'Best Frin',
	},
	{
		email: 'sunloapp+2@gmail.com',
		uid: 'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
		username: 'Work Andy',
	},
	{
		email: 'sunloapp+friend@gmail.com',
		uid: '7ad846a9-d55b-4035-8be2-dbcc70074f74',
		username: 'Lexigrine',
	},
] as const

type TestUser = (typeof TEST_USERS)[number]

// ============================================================================
// MESSAGE BUS - For coordination between actors
// ============================================================================

type MessageHandler = (payload?: unknown) => Promise<void> | void

/**
 * MessageBus enables coordination between actors via named events.
 * Actors can emit messages and register watchers that fire when messages arrive.
 */
export class MessageBus {
	private handlers = new Map<string, Set<MessageHandler>>()
	private emittedMessages = new Set<string>()
	private pendingMessages: Array<{ message: string; payload?: unknown }> = []

	/**
	 * Register a handler for a named message
	 */
	on(message: string, handler: MessageHandler): () => void {
		if (!this.handlers.has(message)) {
			this.handlers.set(message, new Set())
		}
		this.handlers.get(message)!.add(handler)

		// If message was already emitted, fire immediately
		if (this.emittedMessages.has(message)) {
			Promise.resolve(handler())
		}

		// Return unsubscribe function
		return () => {
			this.handlers.get(message)?.delete(handler)
		}
	}

	/**
	 * Emit a named message, triggering all registered handlers
	 */
	async emit(message: string, payload?: unknown): Promise<void> {
		this.emittedMessages.add(message)
		const handlers = this.handlers.get(message)
		if (handlers) {
			await Promise.all([...handlers].map((h) => h(payload)))
		}
	}

	/**
	 * Wait for a specific message to be emitted
	 */
	async waitFor(message: string, timeout = 30000): Promise<void> {
		if (this.emittedMessages.has(message)) {
			return
		}

		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				reject(new Error(`Timeout waiting for message: "${message}"`))
			}, timeout)

			this.on(message, () => {
				clearTimeout(timer)
				resolve()
			})
		})
	}

	/**
	 * Check if a message has been emitted
	 */
	wasEmitted(message: string): boolean {
		return this.emittedMessages.has(message)
	}

	/**
	 * Clear all handlers and emitted messages (for test cleanup)
	 */
	clear(): void {
		this.handlers.clear()
		this.emittedMessages.clear()
		this.pendingMessages = []
	}
}

// ============================================================================
// ACTION CHAIN - For building deferred action sequences
// ============================================================================

type ActionFn = (page: Page, locator?: Locator) => Promise<Locator | void>

/**
 * ActionChain allows building chainable action sequences that execute lazily.
 * Actions are accumulated and executed when fire() is called.
 */
export class ActionChain {
	private actions: ActionFn[] = []
	private actor: Actor

	constructor(actor: Actor, initialAction?: ActionFn) {
		this.actor = actor
		if (initialAction) {
			this.actions.push(initialAction)
		}
	}

	/**
	 * Wait for an element with the given test ID to be visible
	 */
	thenSeeId(testId: string): ActionChain {
		this.actions.push(async (page) => {
			const locator = page.getByTestId(testId)
			await expect(locator).toBeVisible({ timeout: 10000 })
			return locator
		})
		return this
	}

	/**
	 * Wait for an element with the given ID attribute
	 */
	thenSeeHtmlId(id: string): ActionChain {
		this.actions.push(async (page) => {
			const locator = page.locator(`#${id}`)
			await expect(locator).toBeVisible({ timeout: 10000 })
			return locator
		})
		return this
	}

	/**
	 * Click an element by test ID
	 */
	clickId(testId: string): ActionChain {
		this.actions.push(async (page) => {
			const locator = page.getByTestId(testId)
			await expect(locator).toBeVisible({ timeout: 10000 })
			await locator.click()
			return locator
		})
		return this
	}

	/**
	 * Click an element by HTML ID
	 */
	clickHtmlId(id: string): ActionChain {
		this.actions.push(async (page) => {
			const locator = page.locator(`#${id}`)
			await expect(locator).toBeVisible({ timeout: 10000 })
			await locator.click()
			return locator
		})
		return this
	}

	/**
	 * Click on the previously located element
	 */
	click(): ActionChain {
		this.actions.push(async (_page, locator) => {
			if (!locator) throw new Error('No locator to click')
			await locator.click()
			return locator
		})
		return this
	}

	/**
	 * Click a link within the current locator
	 */
	clickLink(text?: string | RegExp): ActionChain {
		this.actions.push(async (page, locator) => {
			const target = locator ?? page
			const link = text
				? target.getByRole('link', { name: text })
				: target.locator('a')
			await expect(link).toBeVisible({ timeout: 10000 })
			await link.click()
			return link
		})
		return this
	}

	/**
	 * Click a button within the current locator
	 */
	clickButton(text?: string | RegExp): ActionChain {
		this.actions.push(async (page, locator) => {
			const target = locator ?? page
			const button = text
				? target.getByRole('button', { name: text })
				: target.locator('button')
			await expect(button).toBeVisible({ timeout: 10000 })
			await button.click()
			return button
		})
		return this
	}

	/**
	 * Verify text is visible on the page or within current locator
	 */
	thenReadText(text: string | RegExp): ActionChain {
		this.actions.push(async (page, locator) => {
			const target = locator ?? page
			await expect(target.getByText(text)).toBeVisible({ timeout: 10000 })
		})
		return this
	}

	/**
	 * Fill an input field by test ID
	 */
	fillId(testId: string, value: string): ActionChain {
		this.actions.push(async (page) => {
			const locator = page.getByTestId(testId)
			await expect(locator).toBeVisible({ timeout: 10000 })
			await locator.fill(value)
			return locator
		})
		return this
	}

	/**
	 * Fill an input by name attribute
	 */
	fillName(name: string, value: string): ActionChain {
		this.actions.push(async (page) => {
			const locator = page.locator(`[name="${name}"]`)
			await expect(locator).toBeVisible({ timeout: 10000 })
			await locator.fill(value)
			return locator
		})
		return this
	}

	/**
	 * Wait for the URL to match a pattern
	 */
	thenUrl(urlPattern: string | RegExp): ActionChain {
		this.actions.push(async (page) => {
			await expect(page).toHaveURL(urlPattern, { timeout: 10000 })
		})
		return this
	}

	/**
	 * Get an element by test ID (sets as current locator)
	 */
	getById(testId: string): ActionChain {
		this.actions.push(async (page) => {
			const locator = page.getByTestId(testId)
			await expect(locator).toBeVisible({ timeout: 10000 })
			return locator
		})
		return this
	}

	/**
	 * Wait for a specified number of milliseconds
	 */
	wait(ms: number): ActionChain {
		this.actions.push(async (page) => {
			await page.waitForTimeout(ms)
		})
		return this
	}

	/**
	 * Wait for network to be idle
	 */
	waitForNetwork(): ActionChain {
		this.actions.push(async (page) => {
			await page.waitForLoadState('networkidle')
		})
		return this
	}

	/**
	 * Execute a custom action
	 */
	do(fn: (page: Page, locator?: Locator) => Promise<void>): ActionChain {
		this.actions.push(fn)
		return this
	}

	/**
	 * Execute all accumulated actions
	 */
	async fire(): Promise<void> {
		const page = this.actor.page
		let currentLocator: Locator | undefined

		for (const action of this.actions) {
			const result = await action(page, currentLocator)
			if (result) {
				currentLocator = result
			}
		}
	}

	/**
	 * Execute actions and then emit a message
	 */
	async fireAndEmit(message: string): Promise<void> {
		await this.fire()
		await this.actor.emit(message)
	}
}

// ============================================================================
// ACTOR - The main test user class
// ============================================================================

export interface ActorOptions {
	user: TestUser
	browser: Browser
	messageBus: MessageBus
	baseURL: string
}

/**
 * Actor represents a test user with their own browser context and page.
 * Actors can perform actions and coordinate via the message bus.
 */
export class Actor {
	readonly id: string
	readonly username: string
	readonly email: string
	readonly uid: string

	private _page: Page | null = null
	private _context: BrowserContext | null = null
	private browser: Browser
	private messageBus: MessageBus
	private baseURL: string
	private watchers: Array<() => void> = []

	constructor(options: ActorOptions) {
		this.id = options.user.uid
		this.username = options.user.username
		this.email = options.user.email
		this.uid = options.user.uid
		this.browser = options.browser
		this.messageBus = options.messageBus
		this.baseURL = options.baseURL
	}

	/**
	 * Get the page for this actor (creates context if needed)
	 */
	get page(): Page {
		if (!this._page) {
			throw new Error(
				`Actor ${this.username} has not been initialized. Call init() first.`
			)
		}
		return this._page
	}

	/**
	 * Get the browser context
	 */
	get context(): BrowserContext {
		if (!this._context) {
			throw new Error(
				`Actor ${this.username} has not been initialized. Call init() first.`
			)
		}
		return this._context
	}

	/**
	 * Initialize the actor with a fresh browser context
	 */
	async init(): Promise<void> {
		this._context = await this.browser.newContext({
			baseURL: this.baseURL,
		})
		this._page = await this._context.newPage()
	}

	/**
	 * Navigate to a URL and optionally wait for an element
	 */
	async openBrowserTo(path: string): Promise<ActionChain> {
		await this.page.goto(path)
		await this.page.waitForLoadState('networkidle')
		return new ActionChain(this)
	}

	/**
	 * Log in as this actor
	 */
	async login(): Promise<void> {
		await login(this.page, this.email, 'password')
	}

	/**
	 * Log in and navigate to a specific path
	 */
	async loginAndGoTo(path: string): Promise<ActionChain> {
		await this.login()
		await this.page.goto(path)
		await this.page.waitForLoadState('networkidle')
		return new ActionChain(this)
	}

	// ========================================================================
	// Immediate actions (return ActionChain for chaining)
	// ========================================================================

	/**
	 * Wait for element by test ID to be visible
	 */
	seeId(testId: string): ActionChain {
		return new ActionChain(this, async (page) => {
			const locator = page.getByTestId(testId)
			await expect(locator).toBeVisible({ timeout: 10000 })
			return locator
		})
	}

	/**
	 * Get element by test ID
	 */
	getById(testId: string): ActionChain {
		return new ActionChain(this, async (page) => {
			const locator = page.getByTestId(testId)
			await expect(locator).toBeVisible({ timeout: 10000 })
			return locator
		})
	}

	/**
	 * Click element by test ID
	 */
	clickId(testId: string): ActionChain {
		return new ActionChain(this, async (page) => {
			const locator = page.getByTestId(testId)
			await expect(locator).toBeVisible({ timeout: 10000 })
			await locator.click()
			return locator
		})
	}

	/**
	 * Verify text is visible
	 */
	seeText(text: string | RegExp): ActionChain {
		return new ActionChain(this, async (page) => {
			await expect(page.getByText(text)).toBeVisible({ timeout: 10000 })
		})
	}

	/**
	 * Click a link by text
	 */
	clickLink(text: string | RegExp): ActionChain {
		return new ActionChain(this, async (page) => {
			const link = page.getByRole('link', { name: text })
			await expect(link).toBeVisible({ timeout: 10000 })
			await link.click()
			return link
		})
	}

	/**
	 * Click a button by text
	 */
	clickButton(text: string | RegExp): ActionChain {
		return new ActionChain(this, async (page) => {
			const button = page.getByRole('button', { name: text })
			await expect(button).toBeVisible({ timeout: 10000 })
			await button.click()
			return button
		})
	}

	/**
	 * Fill an input by test ID
	 */
	fillId(testId: string, value: string): ActionChain {
		return new ActionChain(this, async (page) => {
			const locator = page.getByTestId(testId)
			await expect(locator).toBeVisible({ timeout: 10000 })
			await locator.fill(value)
			return locator
		})
	}

	/**
	 * Start a chain that waits for URL
	 */
	waitForUrl(urlPattern: string | RegExp): ActionChain {
		return new ActionChain(this, async (page) => {
			await expect(page).toHaveURL(urlPattern, { timeout: 10000 })
		})
	}

	// ========================================================================
	// Message bus integration
	// ========================================================================

	/**
	 * Emit a message to the bus
	 */
	async emit(message: string, payload?: unknown): Promise<void> {
		await this.messageBus.emit(message, payload)
	}

	/**
	 * Wait for a message on the bus
	 */
	async waitForMessage(message: string, timeout?: number): Promise<void> {
		await this.messageBus.waitFor(message, timeout)
	}

	/**
	 * Watch for a trigger and execute a callback
	 *
	 * @param trigger - Message to watch for, OR an ActionChain/async function
	 * @param callback - Message to emit, OR an async function to execute
	 *
	 * Examples:
	 * - watchFor('user2 logged in', 'continue test') - when message received, emit message
	 * - watchFor('user2 logged in', async () => {...}) - when message received, run callback
	 * - watchFor(async () => user1.seeId('alert').fire(), 'alert shown') - after action, emit message
	 */
	watchFor(
		trigger: string | (() => Promise<void>),
		callback: string | ((actor: Actor) => Promise<void>)
	): void {
		const handler = async () => {
			// Execute callback
			if (typeof callback === 'string') {
				await this.emit(callback)
			} else {
				await callback(this)
			}
		}

		if (typeof trigger === 'string') {
			// Register handler for message
			const unsubscribe = this.messageBus.on(trigger, handler)
			this.watchers.push(unsubscribe)
		} else {
			// Execute trigger function and then handler
			trigger().then(handler)
		}
	}

	/**
	 * Execute an action when a message is received
	 */
	when(message: string): {
		then: (fn: (actor: Actor) => Promise<void>) => void
	} {
		return {
			then: (fn) => {
				const unsubscribe = this.messageBus.on(message, () => fn(this))
				this.watchers.push(unsubscribe)
			},
		}
	}

	// ========================================================================
	// Cleanup
	// ========================================================================

	/**
	 * Clean up this actor's resources
	 */
	async cleanup(): Promise<void> {
		// Unsubscribe all watchers
		for (const unsubscribe of this.watchers) {
			unsubscribe()
		}
		this.watchers = []

		// Close context (which closes page)
		if (this._context) {
			await this._context.close()
			this._context = null
			this._page = null
		}
	}
}

// ============================================================================
// ACTORS FACTORY
// ============================================================================

export interface ActorsConfig {
	browser: Browser
	baseURL?: string
}

export interface ActorsResult {
	actors: Actor[]
	messageBus: MessageBus
	cleanup: () => Promise<void>
}

/**
 * Create multiple actors for multi-user testing
 *
 * @param config - Browser and configuration
 * @param count - Number of actors to create (default: 2)
 * @returns Array of Actor instances with shared MessageBus
 *
 * Example:
 * ```ts
 * const { actors: [user1, user2], cleanup } = await createActors({ browser }, 2)
 * try {
 *   await user1.login()
 *   await user2.login()
 *   // ... test interactions ...
 * } finally {
 *   await cleanup()
 * }
 * ```
 */
export async function createActors(
	config: ActorsConfig,
	count = 2
): Promise<ActorsResult> {
	if (count > TEST_USERS.length) {
		throw new Error(
			`Cannot create ${count} actors. Only ${TEST_USERS.length} test users available.`
		)
	}

	const messageBus = new MessageBus()
	const baseURL = config.baseURL ?? 'http://localhost:5173'

	const actors: Actor[] = []

	for (let i = 0; i < count; i++) {
		const actor = new Actor({
			user: TEST_USERS[i],
			browser: config.browser,
			messageBus,
			baseURL,
		})
		await actor.init()
		actors.push(actor)
	}

	const cleanup = async () => {
		await Promise.all(actors.map((a) => a.cleanup()))
		messageBus.clear()
	}

	return { actors, messageBus, cleanup }
}

/**
 * Playwright test fixture helper for using actors in tests
 *
 * Example:
 * ```ts
 * test('friend request flow', async ({ browser }) => {
 *   const { actors: [user1, user2], cleanup } = await createActors({ browser })
 *
 *   try {
 *     await user1.login()
 *     await user2.login()
 *
 *     // User1 sends friend request
 *     await user1.openBrowserTo(`/friends/search?q=${user2.username}`)
 *     await user1.getById(`user-${user2.id}`).clickId('send-request').fire()
 *
 *     // User2 accepts
 *     await user2.seeId('notification-badge')
 *       .clickId('notifications')
 *       .thenSeeId('friend-request')
 *       .clickId('accept')
 *       .fire()
 *
 *     // Verify both see the friendship
 *     await user1.seeText(user2.username).fire()
 *     await user2.seeText(user1.username).fire()
 *   } finally {
 *     await cleanup()
 *   }
 * })
 * ```
 */
