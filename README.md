# Fundwell

Fundwell is a game day squares fundraiser platform, live at [fundwell.us](https://fundwell.us). Organizers create a contest for a game, participants claim squares on a 10x10 grid, and the organizer tracks payments, enters scores and announces winners. Fundwell never touches the money: participants pay the organizer directly through their own Venmo, PayPal or other links. Stripe is used only for Fundwell's own subscription plans.

## Stack

- Next.js 15 (App Router) and TypeScript
- Supabase: auth, Postgres with row-level security, storage, edge functions
- Stripe: subscriptions only
- Resend and React Email: app emails
- Tailwind CSS and shadcn/ui
- React Hook Form and Zod
- Sentry and Vercel Analytics
- Hosted on Vercel

## Local setup

1. Install [bun](https://bun.sh), then run `bun install`.
2. Copy `.env.local.example` to `.env.local` and fill in the values. Each variable has a one-line comment.
3. Run `bun run dev` and open http://localhost:3000.

**Local dev uses the live database.** There is no separate dev database, so anything you create or delete locally changes real data. Use throwaway test accounts and delete what you create.

**Stripe test keys only, and no checkout locally.** Don't run Stripe checkout or `bun run stripe:listen` against your local app: they would write test-mode Stripe IDs into the live tables.

## Scripts

| Script                     | What it does                                                         |
| -------------------------- | -------------------------------------------------------------------- |
| `bun run dev`              | Starts the dev server (Turbopack)                                    |
| `bun run build`            | Production build, including type checks                              |
| `bun run start`            | Serves the production build                                          |
| `bun run lint`             | ESLint                                                               |
| `bun run email:dev`        | Previews the email templates on port 3001                            |
| `bun run email:build`      | Builds the email templates                                           |
| `bun run email:export`     | Exports the email templates to HTML                                  |
| `bun run stripe:listen`    | Forwards Stripe webhooks to localhost. Don't run it (see above)      |
| `bun run generate-types`   | Regenerates `src/libs/supabase/types.ts` from the database           |
| `bun run supabase:link`    | Links the Supabase CLI to the project                                |
| `bun run migration:new`    | Creates a new migration file in `supabase/migrations`                |
| `bun run migration:up`     | Applies migrations to the linked project, then regenerates the types |
| `bun run migration:squash` | Squashes migrations on the linked project                            |

Don't build while the dev server is running in the same folder. They share `.next`.

## Deploy

1. Branch off `staging` and open a PR into `staging`. CI runs lint and build.
2. Merging into `staging` creates a Vercel preview deployment.
3. Open a PR from `staging` into `main`. CI only accepts PRs into `main` from `staging`.
4. Merging into `main` deploys production to Vercel.

Database migrations and edge functions are deployed separately with the Supabase CLI. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for environments, CI and environment variables.
