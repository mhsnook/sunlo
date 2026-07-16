# Fake extension stubs

`schemas/base.sql` and the migrations open with `create extension` calls for the
Supabase Postgres flavour. Most are real and available on a stock Postgres 16
(`pg_stat_statements`, `pg_trgm`, `pgcrypto`, `uuid-ossp`) or installable
(`vector` / pgvector — built from source by `scripts/db-native.sh` because apt
ships 0.6.0 and the dump needs the `halfvec`/`sparsevec` grants from ≥0.7).

These five are **not** available on a native Postgres and aren't needed for
schema / migration / seed / type / dump work, so `scripts/db-native.sh` installs
a tiny empty "extension" for each, purely so `create extension <name>` succeeds:

| Extension        | Why it's faked                                            |
| ---------------- | --------------------------------------------------------- |
| `pg_net`         | async HTTP from Postgres; `net.http_post()` stubbed no-op |
| `supabase_vault` | secret storage; `vault.decrypted_secrets` stubbed empty   |
| `pg_graphql`     | GraphQL API layer; never called by the schema             |
| `pgjwt`          | JWT signing in SQL; never called by the schema            |
| `pg_cron`        | job scheduler; no jobs are scheduled in the schema        |

The real objects a couple of functions reference (`net.http_post`,
`vault.decrypted_secrets`) are created as plain objects in
`supabase/dev-native/bootstrap.sql`, not by these extensions.

The stub `.control` + `--1.0.sql` files are written into Postgres's extension
directory at runtime by `scripts/db-native.sh` (see `install_fake_extensions`),
so there are no per-extension files checked in here — the list above is the
source of truth.
