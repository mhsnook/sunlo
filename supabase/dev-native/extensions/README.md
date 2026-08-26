# Fake extension stubs

`schemas/base.sql` and the migrations open with `create extension` calls for the
Supabase Postgres flavour. Most are real and available on a stock Postgres 16
(`pg_stat_statements`, `pg_trgm`, `pgcrypto`, `uuid-ossp`) or installable
(`vector` / pgvector — built from source by `scripts/db-native.sh` because apt
ships 0.6.0 and the dump needs the `halfvec`/`sparsevec` grants from ≥0.7).

These six are **not** available on a native Postgres and aren't needed for
schema / migration / seed / type / dump work, so `scripts/db-native.sh` installs
a tiny empty "extension" for each, purely so `create extension <name>` succeeds:

| Extension        | Why it's faked                                            |
| ---------------- | --------------------------------------------------------- |
| `pg_net`         | async HTTP from Postgres; `net.http_post()` stubbed no-op |
| `supabase_vault` | secret storage; `vault.decrypted_secrets` stubbed empty   |
| `pg_graphql`     | GraphQL API layer; never called by the schema             |
| `pgjwt`          | JWT signing in SQL; never called by the schema            |
| `pg_cron`        | job scheduler; no jobs are scheduled in the schema        |
| `pgsodium`       | secret-key management; never called by the schema         |

`pgsodium` is the one stub that names a schema. `base.sql` creates it as a
bare `create extension if not exists "pgsodium";` and the dump runs with an
empty `search_path`, so a relocatable stub has nowhere to land and the
statement fails with "no schema has been selected to create in". Its stub
pins `schema = 'public'`, which is nominal — the stub holds no objects. The
extension is enabled on production, so every regenerated dump emits that
line.

`pgjwt` is dropped from the live schema by migration
`20260826120000_drop_pgjwt.sql`, but the January 2025 baseline migration
still creates it, so the stub stays for anyone who replays that file with
`scripts/db-native.sh apply`.

The real objects a couple of functions reference (`net.http_post`,
`vault.decrypted_secrets`) are created as plain objects in
`supabase/dev-native/bootstrap.sql`, not by these extensions.

The stub `.control` + `--1.0.sql` files are written into Postgres's extension
directory at runtime by `scripts/db-native.sh` (see `install_fake_extensions`),
so there are no per-extension files checked in here. The names come from the
script's `FAKE_EXTENSIONS` list; add a name there and a row above together.
