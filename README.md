# VersosGenius MVP

Base implementation for the VersosGenius project:

- React + Vite + TypeScript
- Tailwind CSS with editorial dark theme tokens
- Supabase client wiring
- Initial pages: home, poem reader, profile
- Annotation selection + drawer + optimistic likes baseline
- SQL migration with `versos` schema, RLS, RPC profile helpers, and poem seed data

## Run

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables:

```bash
cp .env.example .env
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

3. Start dev server:

```bash
npm run dev
```

## Database

Run the SQL script in Supabase SQL Editor:

`database/initial_script.sql`

## Batch import poems

Use the importer script to load many poems from a JSON file in one run.

1. Add your Supabase service role key to `.env` (never commit this):

```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

2. Prepare a JSON array file like `scripts/poems.sample.json` with fields:
`title`, `author`, `body_text`, `era`.

3. Validate without writing:

```bash
npm run import:poems -- --file scripts/poems.sample.json --dry-run
```

4. Import in batches (default batch size: 200):

```bash
npm run import:poems -- --file scripts/poems.sample.json --batch-size 200
```

Optional:
- set `IMPORT_CREATED_BY_USER_ID` to stamp `created_by` in inserted rows
