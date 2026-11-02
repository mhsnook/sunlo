import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import oxlint from 'eslint-plugin-oxlint'

export default [
	{
		ignores: [
			'dist/',
			'src-tauri/',
			'scripts/',
			'src/types/supabase.ts',
			'worker/worker-configuration.d.ts',
			'apps/admin/worker/worker-configuration.d.ts',
			'apps/admin/.flue-vite/',
			'.flue-vite/',
		],
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
			// Long-running false-positive history in inference-heavy contexts
			// (TanStack Form's useForm generics in particular). eslint --fix
			// silently strips load-bearing casts, so keep the rule off project-
			// wide rather than re-add per-line disables.
			'@typescript-eslint/no-unnecessary-type-assertion': 'off',
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
		},
	},
	{
		files: ['apps/admin/src/**/*.{ts,tsx}'],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'module',
			parser: tseslint.parser,
			parserOptions: { project: ['./apps/admin/tsconfig.json'] },
			globals: { ...globals.browser },
		},
		plugins: {
			'@typescript-eslint': tseslint.plugin,
			'react-hooks': reactHooks,
		},
		rules: {
			...js.configs.recommended.rules,
			...tseslint.plugin.configs['recommended'].rules,
			...tseslint.plugin.configs['recommended-requiring-type-checking'].rules,
			...reactHooks.configs.recommended.rules,
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
				},
			],
		},
	},
	{
		files: ['worker/**/*.ts', '.flue/**/*.ts'],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'module',
			parser: tseslint.parser,
			parserOptions: { project: ['./tsconfig.worker.json'] },
			globals: { ...globals.serviceworker },
		},
		plugins: { '@typescript-eslint': tseslint.plugin },
		rules: {
			...js.configs.recommended.rules,
			...tseslint.plugin.configs['recommended'].rules,
			...tseslint.plugin.configs['recommended-requiring-type-checking'].rules,
			// `Env` and other Workers globals come from worker-configuration.d.ts,
			// which only TypeScript sees.
			'no-undef': 'off',
		},
	},
	{
		files: [
			'apps/admin/worker/**/*.ts',
			'apps/admin/.flue/**/*.ts',
			'apps/admin/shared/**/*.ts',
		],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'module',
			parser: tseslint.parser,
			parserOptions: { project: ['./apps/admin/tsconfig.worker.json'] },
			globals: { ...globals.serviceworker },
		},
		plugins: { '@typescript-eslint': tseslint.plugin },
		rules: {
			...js.configs.recommended.rules,
			...tseslint.plugin.configs['recommended'].rules,
			...tseslint.plugin.configs['recommended-requiring-type-checking'].rules,
			'no-undef': 'off',
		},
	},
	{
		files: ['vite.config.ts', 'apps/admin/vite.config.ts'],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'module',
			parser: tseslint.parser,
			parserOptions: {
				project: ['./tsconfig.node.json', './apps/admin/tsconfig.json'],
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
