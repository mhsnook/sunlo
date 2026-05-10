import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import oxlint from 'eslint-plugin-oxlint'

export default [
	{
		ignores: ['dist/', 'src-tauri/', 'scripts/'],
	},
	{
		files: ['src/**/*.{ts,tsx}'],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'module',
			parser: tseslint.parser,
			parserOptions: { project: ['./tsconfig.app.json'] },
			globals: { ...globals.browser },
		},
		plugins: {
			'@typescript-eslint': tseslint.plugin,
			'react-hooks': reactHooks,
			'react-refresh': reactRefresh,
		},
		rules: {
			// JavaScript recommended rules
			...js.configs.recommended.rules,

			// TypeScript recommended rules
			...tseslint.plugin.configs['recommended'].rules,
			...tseslint.plugin.configs['recommended-requiring-type-checking'].rules,

			...reactHooks.configs.recommended.rules,
			'react-refresh/only-export-components': ['off'],
			'@typescript-eslint/only-throw-error': [
				'error',
				{
					allow: [
						'Redirect',
						{
							from: 'package',
							package: '@tanstack/router',
							name: 'NotFoundError',
						},
					],
					allowThrowingAny: false,
					allowThrowingUnknown: false,
				},
			],
			// Barrel pattern enforcement, scoped to @/features/* imports only.
			// esquery's regex literal can't escape `/` directly, so / is the
			// literal slash inside the source.value patterns.
			'no-restricted-syntax': [
				'error',
				{
					selector:
						"ImportDeclaration[importKind='type'][source.value=/^@\\u002Ffeatures\\u002F[^\\u002F]+\\u002F.+/]",
					message:
						"Cross-feature type imports must come from the barrel '@/features/<feature>', not internal paths like '@/features/<feature>/schemas'.",
				},
				{
					selector:
						"ImportDeclaration[source.value=/^@\\u002Ffeatures\\u002F.+/] > ImportSpecifier[importKind='type']",
					message:
						"Don't mix value and type specifiers in a feature import. Split into a plain `import { ... }` from the internal path and an `import type { ... }` from the barrel.",
				},
			],
		},
	},
	{
		files: ['vite.config.ts'],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'module',
			parser: tseslint.parser,
			parserOptions: {
				project: ['./tsconfig.node.json'],
				// tsconfigRootDir: './',
			},
		},
		plugins: {
			'@typescript-eslint': tseslint.plugin,
		},
		rules: {
			...js.configs.recommended.rules,
			...tseslint.plugin.configs['recommended'].rules,
			...tseslint.plugin.configs['recommended-requiring-type-checking'].rules,
		},
	},
	...oxlint.buildFromOxlintConfigFile('./.oxlintrc.json'),
]
