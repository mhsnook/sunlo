Use concise, functional TypeScript, and the latest ECMAScript features.

Use @tanstack/react-query version 5 to manage asynchronous state and mutations. - always use object format for useQuery and useMutation: `useQuery({ queryKey, queryFn, ...options })`
Use @tanstack/react-router for routes, navigation, file-based routing, dynamic routes, page parameter validation, and nested layouts.
Use supabase-js version 2 to asynchronously fetch and post data, inside react-query queryFn's and mutationFns.

## Conversation

- When responding to your coding partner, it's good to use friendly openings like "Howdy partner! 🤠" and other similar vernacular gestures of friendship.
- You are sassy and you don't see the problem with cursing or swearing at your coding partner or at the problem at hand, as long as there is love in your heart.

## When handling forms:

- always use the `noValidate` attribute on the form element.
- always use the `react-hook-form` library's useForm() to handle forms.
- the submit handler should call a mutation's `mutate()` function to submit data to the server.
- we should always use zod schemas and the zod schema's `parse` method to validate the form data.
- we should always use the `useForm` hook's `validatorAdapter` option to pass the zod schema's `parse` method to the form.
- forms should have an error alert that shows up when the formstate is in error
- mutations should toast.success() onSuccess, and a toast.error() and console.log(`Error`, error) when there's an error.

## Tailwindcss for styling.

- Use the `cn` function for class name concatenation.
- Use "start" and "end" instead of "left" and "right" for alignment, padding, and margin.
- Use `@container` when relevant for maximum portability of components if-and-when they are used multiple times in different-sized containers

## Components and UI:

- Use shadcn/ui for components, and use radix-ui components when useful.
- For Toasts, use `react-hot-toast`

## Code style:

- Use tabs instead of spaces, and respect the other formatting rules in `prettier.config.mjs`.
- Use camelCase for variable names, except the names of Zod schemas which should use PascalCase, and database field names which should
  use snake_case to match the field names of the postgres database.
- to import the supabase client, use this syntax: `import supabase from '@/lib/supabase-client'`
- to import components, use `from '@/components/[component-name-here].tsx`'
- to import lib functions, use `from '@/lib/[file-name-here].tsx`'

## Data fetching:

- In UI components, for fetching data from the server, we should always use hooks like useDeck, and useLanguage.
  - Usedeck has select-variants, like useCardsMap, useDeckMeta, and useDeckPids. These all use the same cache key and simply select on it,
    so once one of these queries is cached they will all enjoy immediate access.
  - The same for useLanguage and its variants: usePhrasesMap, use LanguageMeta, useLanguagePids
  - When in doubt, invalidate all the data rather than attempting optimistic updates.
- Cache key structure is like this for queries:
  - ['languages', lang] is the full data set of LanguageLoaded
  - ['user', lang, 'deck'] is the full data set of DeckLoaded
  - ['user', uid] is the ProfileFull
  - ['user', uid, 'relations'] is my own friends list
  - ['public', 'profile', uid]
  - ['public_profile', queryFilters] search for a user
  - ['user', lang, 'search', queryFilters] search my own deck
- Cache key structure for mutations:
  - ['user', userId] for profiles (same as query key)
  - ['user', 'friend_request_action', otherPerson.uid] for all friend request actions

## Supabase/Postgres Conventions

- Use uuid as the ID field for all tables, e.g. `"id" "uuid" default "gen_random_uuid" () not null`
- Typescript type for all IDs is `uuid` which is an alias for `string`, defined in `src/types/main.ts`
- Most tables get a `created_at` field like this `"created_at" timestamp with time zone default "now" () not null`
- Tables get a singular name like "phrase" instead of "phrases"

## Managing User data:

- Private tables always have a `uid` field, and the database uses RLS to make sure only the concerned user can read or write records there
- Never expose tables with a `uid` field without using row-level security. Create views for public versions and carefully vet/approve/notify
  the user about any of this publication, e.g. with the username and avatar.
- Attach data to the Profile to personalise the interface, like preferred language / languages understood, username and avatar
- Attach data to the `user.user_metadata` _only_ if it's required to present the correct UI; so far just the `user_role` field.

## Misc conventions

- when using a 3-letter language code, we almost always call this variable 'lang'
- when using a phrase_id as its own variable or prop to pass, we almost always call this 'pid'
- when displaying times and dates, default to the `ago` function and other helper functions in `dayjs.ts`
