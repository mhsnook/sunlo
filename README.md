# Sunlo.app

A react SPA and a Supabase project.

## Local Setup

**tl;dr:** Install docker desktop, the Supabase CLI, and PNPM packages (`pnpm i`), run the Supabase DB start (or reset) (`supabase start` or `supabase db reset`) and run the vite server (`pnpm dev`).

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

Access the in the browser at `http://127.0.0.1:5173`.

## Database management

[Full list of Supabase CLI commands is here.](https://supabase.com/docs/reference/cli/supabase-status)

### Migrations

1. Use the local admin at [http://localhost://54323](http://localhost://54323) to make changes to your dev DB. You can point and click to add or modify columns, or use the SQL terminal to create or modify views and functions.
2. One your feature is working, use `pnpm run migrate` to create migrations based on your local changes.
3. `pnpm run seeds:schema` to re-create the base.sql schema. Be sure to use a formatter and only commit things you're sure of. (Oftentimes `base.sql` will be created with some key lines removed, like the command that turns on realtime for required tables (because your local doesn't have it turned on), so you have to not commit those deletions.)
4. `pnpm run types` to regenerate typescript types

The migrations should run when the main branch deploys. Or you can `supabase db push` to make it so.

[Read more about working with Supabase migrations.](https://supabase.com/docs/guides/local-development/cli/getting-started)

### To Modify the Seeds

When adding new features that use new parts of the database, it's a good idea to put in new seeds
that mimic both the common uses of the feature and also the edge cases that we want to be sure
will still work properly in production. But the seeds file is not a static set of information, so
some care must be taken when updating it.

The easiest way to modify the seeds might be simply by hand editing `seed.sql`. You will notice in
the file, most dates are calculated from a formula like this:

```sql
insert into
	"public"."user_card_review" (
		"id",
		"uid",
		"score",
		"difficulty",
		"stability",
		"review_time_retrievability",
		"created_at",
		"updated_at",
		"day_session",
		"lang",
		"phrase_id",
		"day_first_review"
	)
values
	(
		'4d828aaf-119c-48c8-89c4-c1747e4a6745',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		3,
		5.282434422319,
		3.173,
		null,
		current_date - 4 + interval '2 minute',
		current_date - 4 + interval '2 minute',
		(current_date - 4 + interval '2 minute' - interval '4 hour')::date,
		'tam',
		'1f6bac22-b32a-4b77-9857-d2de02b538de',
		true
	);
```

This ensures that whenever we are working on the app, this review was always created four days ago.
So our features for "recently added cards" and "cards overdue" and so on will always stay in sync.
Virtually every record in the seed file uses dates and day_session strings constructed in this way.

But you can also modify the data in other ways: use the app! use this new feature of yours! Or go
into the local admin and modify data there. Then, when you're ready, you can dump the whole seeds
file like this: `pnpm run seeds:data`, or modify this command per your needs:
`supabase db dump --data-only --local > supabase/seed.sql`.

Then, be prepared to heavily curate this file because the seeding process will not have any
knowledge of our approach to dates, and your PR will be rejected if your seeds do not follow it.

## The React App

- This app is a full SPA as an architectural choice so that we can use Tauri to compile it to
  native apps.
-     We use Tanstack's Router in a React app bundled by Vite, as the front end framework.
- Data is fetched from the Supabase API using Tanstack DB's QueryCollections, loading up
  whole tables and slices of tables into the local Collections in memory, and then using
  live queries to combine, select, join, filter, and aggregate the data as the UI requies.
- Mostly when we mutate data we are using Tanstack Query's useMutation, and in the onSuccess for
  the mutation we will run an update to the local collection after the response data comes back:

```typescript
onSuccess: (data) => {
	someCollection.utils.writeInsert(SomeSchema.parse(data))
	toast.success('New deck created!')
}
```

- Realtime connections are used for friend requests and chat messages. They are quite easy to set
  up these listeners in a useEffect, to receive updates and then either `utils.writeInsert` or
  `utils.writeUpdate` the new record. It remains to be seen how they affect performance when the
  system has more users, so be mindful.

## Using Tauri for Native Apps

It has always been our intention to cross-compile the JS app for use in a Tauri shell to make
native versions of the app, but at this time we aren't maintaining or supporting the Tauri build.

The technology and its industry support are improving rapidly so by the time we are finished with
some other core features, it will make sense to come back and take another try at it.
