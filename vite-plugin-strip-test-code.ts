import type { Plugin } from 'vite'

export interface StripTestCodeOptions {
	/** Enable the plugin (default: true in production, false otherwise) */
	enabled?: boolean
	/** File patterns to identify as test code (default: ['**\/*.spec.ts', '**\/*.spec.tsx', '**\/*.test.ts', '**\/*.test.tsx']) */
	patterns?: string[]
	/** Log what's being stripped (default: false) */
	verbose?: boolean
}

/**
 * Vite plugin to strip test code from production builds.
 *
 * This plugin:
 * 1. Identifies test files by pattern (e.g., .spec.ts, .test.ts)
 * 2. Removes test files from the bundle
 * 3. Removes imports from test files in application code
 * 4. Removes function calls to imported test functions
 *
 * @example
 * ```typescript
 * // vite.config.ts
 * import { stripTestCode } from './vite-plugin-strip-test-code'
 *
 * export default defineConfig({
 *   plugins: [
 *     stripTestCode({
 *       enabled: process.env.NODE_ENV === 'production',
 *       verbose: true
 *     })
 *   ]
 * })
 * ```
 */
export function stripTestCode(options: StripTestCodeOptions = {}): Plugin {
	const {
		enabled = process.env.NODE_ENV === 'production',
		patterns = ['**/*.spec.ts', '**/*.spec.tsx', '**/*.test.ts', '**/*.test.tsx'],
		verbose = false,
	} = options

	// Track which identifiers were imported from test files
	// Map: file path -> Set of imported identifiers
	const testImports = new Map<string, Set<string>>()

	/**
	 * Check if a file path should be treated as a test file
	 */
	function isTestFile(id: string): boolean {
		if (!id) return false

		return patterns.some((pattern) => {
			// Simple pattern matching - check if filename contains the pattern
			const patternParts = pattern.split('/')
			const lastPart = patternParts[patternParts.length - 1]
			const extension = lastPart.replace('**/*', '')

			return id.endsWith(extension)
		})
	}

	return {
		name: 'strip-test-code',
		enforce: 'pre',

		load(id) {
			// If plugin is disabled, do nothing
			if (!enabled) return null

			// If this is a test file, return empty code to exclude it from bundle
			if (isTestFile(id)) {
				if (verbose) {
					console.log(`[strip-test-code] Excluding test file: ${id}`)
				}
				return { code: '', map: null }
			}

			return null
		},

		transform(code, id) {
			// If plugin is disabled, do nothing
			if (!enabled) return null

			// Don't transform test files themselves
			if (isTestFile(id)) return null

			let modified = code
			let hasChanges = false

			// Track imported test identifiers for this file
			const importedTestIds = new Set<string>()

			// Phase 1: Remove imports from test files
			// Match: import { something } from './file.spec'
			// Match: import something from './file.spec'
			// Match: import './file.spec'
			const importRegex =
				/import\s+(?:{([^}]+)}|(\w+))?\s+from\s+['"]([^'"]+)['"]/g
			let importMatch

			while ((importMatch = importRegex.exec(code)) !== null) {
				const namedImports = importMatch[1] // { foo, bar }
				const defaultImport = importMatch[2] // foo
				const importPath = importMatch[3] // ./file.spec

				// Check if this import is from a test file
				const isFromTestFile = patterns.some((pattern) => {
					const ext = pattern.replace('**/*', '')
					return importPath.includes(ext.replace('.ts', '').replace('.tsx', ''))
				})

				if (isFromTestFile) {
					if (verbose) {
						console.log(
							`[strip-test-code] Removing import from ${importPath} in ${id}`,
						)
					}

					// Track imported identifiers
					if (namedImports) {
						namedImports.split(',').forEach((name) => {
							const trimmed = name.trim()
							importedTestIds.add(trimmed)
						})
					}
					if (defaultImport) {
						importedTestIds.add(defaultImport.trim())
					}

					// Remove this import statement
					modified = modified.replace(importMatch[0], '')
					hasChanges = true
				}
			}

			// Also handle side-effect imports: import 'test-runtime-helpers.spec'
			const sideEffectImportRegex = /import\s+['"]([^'"]+)['"]/g
			let sideEffectMatch

			while ((sideEffectMatch = sideEffectImportRegex.exec(code)) !== null) {
				const importPath = sideEffectMatch[1]

				const isFromTestFile = patterns.some((pattern) => {
					const ext = pattern.replace('**/*', '')
					return importPath.includes(ext.replace('.ts', '').replace('.tsx', ''))
				})

				if (isFromTestFile) {
					if (verbose) {
						console.log(
							`[strip-test-code] Removing side-effect import from ${importPath} in ${id}`,
						)
					}
					modified = modified.replace(sideEffectMatch[0], '')
					hasChanges = true
				}
			}

			// Phase 2: Remove function calls to imported test functions
			if (importedTestIds.size > 0) {
				// Store for this file
				testImports.set(id, importedTestIds)

				importedTestIds.forEach((identifier) => {
					// Match: identifier(...) including multiline
					// This is a simple regex - for production you'd want AST parsing
					const callRegex = new RegExp(
						`\\s*${identifier}\\s*\\([^)]*\\)\\s*`,
						'g',
					)

					if (callRegex.test(modified)) {
						if (verbose) {
							console.log(
								`[strip-test-code] Removing calls to ${identifier}() in ${id}`,
							)
						}
						modified = modified.replace(callRegex, '')
						hasChanges = true
					}
				})
			}

			if (!hasChanges) return null

			return { code: modified, map: null }
		},
	}
}
