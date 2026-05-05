import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

function parseArgs(argv) {
  const args = {
    file: "",
    batchSize: 200,
    dryRun: false,
    schema: "versos",
    table: "poems"
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--file") args.file = argv[i + 1] ?? "";
    if (token === "--batch-size") args.batchSize = Number(argv[i + 1] ?? "200");
    if (token === "--dry-run") args.dryRun = true;
    if (token === "--schema") args.schema = argv[i + 1] ?? "versos";
    if (token === "--table") args.table = argv[i + 1] ?? "poems";
  }

  if (!args.file) {
    throw new Error("Missing --file. Example: npm run import:poems -- --file scripts/poems.sample.json");
  }
  if (!Number.isFinite(args.batchSize) || args.batchSize <= 0) {
    throw new Error("--batch-size must be a positive number.");
  }
  return args;
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalKey(title, author) {
  return `${normalizeText(title)}::${normalizeText(author)}`;
}

function inferTitle(bodyText) {
  const firstLine = String(bodyText)
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (!firstLine) return "Poema sin titulo";
  return firstLine.slice(0, 90);
}

function ensureString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function stableBodyHash(bodyText) {
  return createHash("sha256").update(normalizeText(bodyText)).digest("hex");
}

function toRow(item, index, createdBy) {
  const title = ensureString(item.title) || inferTitle(item.body_text);
  const author = ensureString(item.author);
  const bodyText = ensureString(item.body_text);
  const era = ensureString(item.era);

  if (!author || !bodyText || !era) {
    return {
      ok: false,
      reason: `Row ${index + 1}: author, body_text and era are required.`
    };
  }

  const row = {
    title,
    author,
    body_text: bodyText,
    era
  };
  if (createdBy) row.created_by = createdBy;

  return { ok: true, row };
}

async function loadJsonArray(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("Input file must be a JSON array.");
  }
  return parsed;
}

async function fetchExistingKeys(client, schema, table) {
  const keys = new Set();
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await client.schema(schema).from(table).select("title, author").range(from, to);
    if (error) {
      throw new Error(`Error reading existing poems (${from}-${to}): ${error.message}`);
    }
    if (!data || data.length === 0) break;

    for (const row of data) {
      keys.add(canonicalKey(row.title, row.author));
    }

    if (data.length < pageSize) break;
    from += pageSize;
  }

  return keys;
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function insertBatchWithRetry(client, schema, table, rows, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const { error } = await client.schema(schema).from(table).insert(rows);
    if (!error) return;
    if (attempt === maxAttempts) {
      throw new Error(`Insert failed after ${maxAttempts} attempts: ${error.message}`);
    }
    const waitMs = 600 * attempt;
    console.warn(`Batch insert failed (attempt ${attempt}). Retrying in ${waitMs}ms...`);
    await sleep(waitMs);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const createdBy = ensureString(process.env.IMPORT_CREATED_BY_USER_ID);

  if (!supabaseUrl) {
    throw new Error("Missing SUPABASE_URL (or VITE_SUPABASE_URL).");
  }
  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY. Use service role for batch imports.");
  }

  const sourceRows = await loadJsonArray(args.file);
  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  console.log(`Loaded ${sourceRows.length} rows from ${args.file}`);
  const existingKeys = await fetchExistingKeys(client, args.schema, args.table);
  console.log(`Fetched ${existingKeys.size} existing title/author keys from DB`);

  const prepared = [];
  const errors = [];
  const seenInFile = new Set();
  let skippedDuplicateInFile = 0;
  let skippedPossibleSameBody = 0;
  const seenBodyHashes = new Set();

  for (let i = 0; i < sourceRows.length; i += 1) {
    const result = toRow(sourceRows[i], i, createdBy);
    if (!result.ok) {
      errors.push(result.reason);
      continue;
    }

    const key = canonicalKey(result.row.title, result.row.author);
    if (seenInFile.has(key)) {
      skippedDuplicateInFile += 1;
      continue;
    }
    seenInFile.add(key);

    const bodyHash = stableBodyHash(result.row.body_text);
    if (seenBodyHashes.has(bodyHash)) {
      skippedPossibleSameBody += 1;
      continue;
    }
    seenBodyHashes.add(bodyHash);

    if (existingKeys.has(key)) {
      continue;
    }
    prepared.push(result.row);
  }

  console.log(`Valid new rows ready to import: ${prepared.length}`);
  console.log(`Skipped duplicates in input (same title+author): ${skippedDuplicateInFile}`);
  console.log(`Skipped possible duplicates in input (same normalized body): ${skippedPossibleSameBody}`);
  console.log(`Invalid rows: ${errors.length}`);

  if (errors.length > 0) {
    const preview = errors.slice(0, 20);
    console.warn("Validation errors (first 20):");
    for (const issue of preview) console.warn(`- ${issue}`);
  }

  if (args.dryRun) {
    console.log("Dry run enabled: no inserts executed.");
    return;
  }

  let inserted = 0;
  for (let i = 0; i < prepared.length; i += args.batchSize) {
    const batch = prepared.slice(i, i + args.batchSize);
    await insertBatchWithRetry(client, args.schema, args.table, batch, 3);
    inserted += batch.length;
    console.log(`Inserted ${inserted}/${prepared.length}`);
  }

  console.log("Import complete.");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
