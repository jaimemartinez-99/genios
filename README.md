# Genios (VersosGenius)

Genios is a Spanish-first web application for reading, discovering, and collaboratively annotating poetry. Readers can select any passage in a poem, attach an interpretation or context, explore overlapping annotations, and support useful contributions with likes.

https://genios-phi.vercel.app/
## Features

- Browse poems with server-side search, era filters, and pagination.
- Explore an author directory and open filtered poem collections.
- Read poems stanza by stanza with offset-based, overlapping highlights.
- Create, view, like, and remove annotations from an interactive drawer.
- Sign in with Google through Supabase Auth.
- Maintain a public reader profile with activity statistics and favorite poems.
- Add poems with author suggestions and duplicate checks.
- Switch between dark and light editorial themes.
- Import poem collections from JSON with validation, duplicate detection, batching, and a dry-run mode.

## Tech stack

- React 18 and TypeScript
- Vite 5
- React Router
- Tailwind CSS
- Supabase (Postgres, Auth, and Row Level Security)
- Vercel configuration for SPA routing

## Requirements

- Node.js 18 or newer
- npm
- A Supabase project configured with Google OAuth when authentication is required
- A Supabase custom schema named `versos`

The frontend expects the following tables in the `versos` schema:

- `profiles`
- `poems`
- `annotations`
- `likes`

The schema must be exposed through the Supabase Data API, and its grants and RLS policies must allow the operations used by the application. In particular, public reads and authenticated user-owned writes should be protected at the database layer.

## Local setup

1. Clone the repository and install dependencies:

   ```bash
   git clone https://github.com/jaimemartinez-99/genios.git
   cd genios
   npm ci
   ```

2. Create a local `.env` file:

   ```dotenv
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open `http://localhost:5173`.

For Google sign-in, enable the Google provider in Supabase Auth and add the local and deployed application URLs to the allowed redirect URLs.

## Available commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server on port 5173. |
| `npm run build` | Type-check the project and create a production build. |
| `npm run preview` | Preview the production build locally. |
| `npm run import:poems -- --file <path>` | Import poems from a JSON array. |

## Batch import

The importer at `scripts/import-poems.mjs` accepts objects with `title`, `author`, `body_text`, and `era`. `title` may be omitted and will be inferred from the first non-empty line; the other three fields are required.

Set these variables only in your local shell or a private environment file:

```dotenv
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
IMPORT_CREATED_BY_USER_ID=optional-user-uuid
```

Validate a file without writing to Supabase:

```bash
npm run import:poems -- --file scripts/poems.sample.json --dry-run
```

Run the import with a custom batch size:

```bash
npm run import:poems -- --file scripts/poems.sample.json --batch-size 200
```

The importer also accepts `--schema` and `--table`; they default to `versos` and `poems`.

## Application routes

| Route | Description |
| --- | --- |
| `/` | Poem discovery, search, filtering, and pagination. |
| `/autores` | Author directory. |
| `/poema/:poemId` | Interactive poem reader and annotations. |
| `/nuevo-poema` | Authenticated poem submission form. |
| `/perfil/:username` | Public profile and account activity. |

## Project structure

```text
src/
  components/   Reusable navigation, cards, annotation UI, and poem rendering
  hooks/        Authentication and debouncing hooks
  lib/          Supabase client configuration
  pages/        Route-level screens
  types/        Domain models
  utils/        Selection offsets and annotation segmentation
scripts/        Batch import and data-loading utilities
```

## Deployment

The included `vercel.json` rewrites application routes to `index.html`, allowing React Router URLs to work when opened directly. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the deployment environment before building.

## Security

- `.env` is ignored by Git and must never be committed.
- Variables prefixed with `VITE_` are bundled into client-side JavaScript and are visible to browser users. Use only the Supabase project URL and anon/publishable key there.
- Never expose a Supabase `service_role` key in frontend code, a `VITE_` variable, logs, examples, or committed files. It bypasses RLS and is only appropriate for trusted local or server-side administration.
- Keep RLS enabled and tested on every exposed table. The anon key is not a substitute for authorization policies.
- Store deployment credentials in the hosting provider's encrypted environment-variable settings.
- If a privileged credential is ever committed, rotate it immediately and purge it from Git history; deleting it in a later commit is not sufficient.

## License

No license has been declared for this repository.
