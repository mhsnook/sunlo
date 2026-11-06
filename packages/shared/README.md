# @sunlo/shared

Code that runs unchanged in every runtime Sunlo has: the browser app, the Cloudflare Worker, scripts under Node, and Supabase Edge Functions under Deno.

Anything may import this package. This package imports nothing outside its own folder, and three checks hold it to that:

- **oxlint** (`.oxlintrc.json`): imports must be same-folder relative paths (`./x.ts`) with the `.ts` extension, which Deno requires. No npm packages, no `node:` builtins, and no paths into `src/`, `worker/` or `supabase/`.
- **TypeScript** (`tsconfig.json`, run by `pnpm check`): `lib` is `es2023` with no `types`, so `window`, `process`, `Deno` or `Buffer` is a type error. The root `tsconfig.json` does not reference this project, because CI typechecks the base branch with the PR's root config, and a reference to a folder the base lacks fails that run.
- **`package.json`** has no dependencies.

Each module is a subpath export (`@sunlo/shared/normalize`). Supabase reaches it through an import-map entry with the same name in `supabase/functions/deno.json`, so every runtime imports it with one specifier. A new module needs an entry in both places.
