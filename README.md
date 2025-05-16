# Sunlo.app

A react SPA and a Supabase project.

## Local Setup

**tl;dr:** Install docker desktop, the Supabase CLI, and NPM packages, run the Supabase DB start (or reset) and run the vite server.

### Supabase back-end

- Install [Docker Desktop](https://docs.docker.com/desktop/)
- Install [Supabase cli](https://supabase.com/docs/guides/local-development/cli/getting-started)
- `supabase start` to set up the Supabase project for the first time
- `supabase db reset` to run migrations and seeds

### React front-end

- `pnpm install`
- `cp .env.example .env`
- populate the environment variables in .env with the outputs from `supabase start`
- `pnpm dev`

Access the in the browser at `127.0.0.1:5173`. (The Vite server should respond to any requests on port 5173, but not always `localhost`.)

### Mobile Apps with Tauri

    - install Tauri [pre-requisites](https://v2.tauri.app/start/prerequisites/)
    - `pnpm tauri android init` && `pnpm tauri android dev`
    - `pnpm tauri ios init` && `pnpm tauri ios dev`

To make the Android app work, you will probably have to run:

    - `adb reverse tcp:5173 tcp:5173`
    - `adb reverse tcp:54321 tcp:54321`

## Configurations / URLs

- `VITE_SUPABASE_URL` -- host for the Supabase API (Docker container). to work in the browser this can be `127.0.0.1:54321`, but when testing android locally, use a local-network addressable IP, e.g. `10.0.0.17:54321`
- Tauri `build.devUrl` -- should be the network-addressable host for the vite/react app, e.g. `http://10.0.0.17:5173`. Found in tauri.conf.

## Database management

### Migrations

- Use the local admin at [http://localhost://54323](http://localhost://54323) to make changes to the DB
- `pnpm run migrate` to create migrations from your local changes
- `pnpm run types` to regenerate typescript types

The migrations should run when the main branch deploys. Or you can `supabase db push` to make it so.

[Read more about working with Supabase migrations.](https://supabase.com/docs/guides/local-development/cli/getting-started)

### Working on the Seeds

To work on the seeds, get your local database into the shape you want and then:

- `supabase db dump --local --data-only > supabase/seed.sql`

When your local supabase starts up it will spit out the environment variables you need for your environment file.
You can either change your values in `.env.local` or add another file `.env.development.local` which overrides its values.

### Using Tauri for Native Apps

The app is set to deploy as static HTML outputs, so it should generally work
with the Tauri system for compiling to WASM/Rust. e.g. `pnpm tauri dev`,
`pnpm tauri android dev`, `pnpm tauri ios dev`, and so on.

To test the Android app with local supabase connection, you'll need to enter your IP address as `VITE_SUPABASE_URL`, e.g. `http://10.0.0.17:54321`.

Remember to start the Android Studio and activate a Virtual Device from the Device Manager. Check `adb devices` to make sure something is connected.

## Crab Nebula deploys

Execute a release manually using [these instructions](https://web.crabnebula.cloud/crabnebula/cn-cli/releases).

- `cn release draft sunlo/sunlo-tanstack --framework tauri`
- `cn release upload sunlo/sunlo-tanstack --framework tauri`
- `cn release publish sunlo/sunlo-tanstack --framework tauri`
