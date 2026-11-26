@AGENTS.md

# Fundwell

Brent's own product.

## Database

- Live Supabase only. Never start Docker, `supabase start`, or any local or throwaway Postgres, including for testing migrations (Brent, 2026-11-24: "point to the live supabase database. No one is really using the site right now").
- Put "live Supabase only, no Docker, no local database" in every subagent brief.
- Test with labelled test users and "ZZ … (delete me)" records, and delete them afterwards. Never change real users' rows.
- Dry-run migrations with `supabase db push --dry-run`, then check after the push.

## Email and paid calls

- Tests and check scripts never send real email: use a placeholder key and capture sends locally. The Resend account and its daily quota are shared with the Elite916 site and agents, so test sends can block real sign-in links and player emails.
- Before any real send, or a batch of paid API calls, ask Brent with the exact count. Put this rule in every subagent brief.
- More: `~/Documents/Brent_Vault/fundwell/release-runbook.md`, "No real email from tests".
