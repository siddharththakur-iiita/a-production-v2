# A Productions — Backend

## Setup

```bash
npm install
cp .env.example .env   # then fill in real values
npm run typecheck      # tsc --noEmit
npm test                # vitest run
npm run dev              # vite dev server
```

## Critical: do not loosen the `@supabase/supabase-js` version pin

`package.json` pins `@supabase/supabase-js` to an **exact** version
(`2.47.16`, no `^`), not a range. This is deliberate and load-bearing.

A caret range (`^2.45.0`) lets npm silently resolve to whatever the
latest matching version is at install time. At the time this was
discovered, that resolved to `2.110.2`, which bundles a much newer
`@supabase/postgrest-js` (`1.21.x`) with a stricter `GenericTable`
constraint requiring every table/view in the hand-authored `Database`
type (`src/lib/supabase/database.types.ts`) to declare a
`Relationships: []` field. Without it — and even with it, in
combination with this schema's size (94 tables + views) — the
newer version's generic machinery collapsed every `.insert()`,
`.update()`, and `.rpc()` call across the entire codebase to `never`,
producing over a hundred cascading, misleading type errors that have
nothing to do with the actual code.

Pinning to `2.47.16` (which resolves a compatible, older
`@supabase/postgrest-js@1.17.x`) resolves cleanly. If this dependency
is ever intentionally upgraded, re-run `npm run typecheck` on a clean
`rm -rf node_modules package-lock.json && npm install` before trusting
the result — a single `npx tsc --noEmit` pass with zero errors is the
only real confirmation that a version bump didn't reintroduce this.

Do not add `@supabase/postgrest-js` as a direct dependency of this
project. It is a transitive dependency of `@supabase/supabase-js`, and
nothing in this codebase imports from it directly (`PostgrestError` is
imported from `@supabase/supabase-js`, which re-exports it) — pinning
it explicitly here previously forced an incompatible version and
caused the exact same failure mode described above.

## Environment variables

See `.env.example`. Variables prefixed `VITE_` are bundled into
browser code and must never hold a secret; every other variable is
server-only and is validated at runtime by `src/lib/env/env.ts`
(third-party integrations) and `src/lib/supabase/env.ts` (Supabase).
