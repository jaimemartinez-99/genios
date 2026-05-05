import { useEffect, useMemo, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const NON_LETTER = "#";
const BATCH_SIZE = 1000;

type AuthorEntry = {
  name: string;
  poem_count: number;
};

export function AutoresPage() {
  const [authors, setAuthors] = useState<AuthorEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLetter, setSelectedLetter] = useState("A");
  const [search, setSearch] = useState("");

  // Debounce search to avoid filtering on every keystroke
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    const fetchAllAuthors = async () => {
      setLoading(true);

      const countMap = new Map<string, number>();
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const to = from + BATCH_SIZE - 1;

        const { data, error } = await supabase
          .schema("versos")
          .from("poems")
          .select("author")
          .range(from, to);

        if (error) {
          console.error("Error fetching authors:", error);
          setLoading(false);
          return;
        }

        const rows = data as { author: string }[] | null;
        if (!rows || rows.length === 0) {
          hasMore = false;
          break;
        }

        for (const row of rows) {
          countMap.set(row.author, (countMap.get(row.author) ?? 0) + 1);
        }

        // If we got fewer rows than the batch size, we've reached the end
        if (rows.length < BATCH_SIZE) {
          hasMore = false;
        }

        from += BATCH_SIZE;
      }

      // Build sorted entries
      const entries: AuthorEntry[] = Array.from(countMap.entries())
        .map(([name, poem_count]) => ({ name, poem_count }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setAuthors(entries);
      setLoading(false);
    };

    void fetchAllAuthors();
  }, []);

  // Group authors by first letter
  const grouped = useMemo(() => {
    const groups = new Map<string, AuthorEntry[]>();

    for (const entry of authors) {
      const firstChar = entry.name.charAt(0).toUpperCase();
      const key = /^[A-Z]$/.test(firstChar) ? firstChar : NON_LETTER;

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(entry);
    }

    return groups;
  }, [authors]);

  // Filter authors by search term (across all letters)
  const filteredAuthors = useMemo(() => {
    if (!debouncedSearch.trim()) return null; // null means no filter, use letter groups
    const term = debouncedSearch.trim().toLowerCase();
    return authors.filter((entry) => entry.name.toLowerCase().includes(term));
  }, [authors, debouncedSearch]);

  const currentAuthors = filteredAuthors ?? grouped.get(selectedLetter) ?? [];
  const availableLetters = new Set(grouped.keys());

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl text-parchment mb-8">Autores</h1>

      {/* Search bar */}
      <div className="mb-6">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Busca un autor por nombre..."
          className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-parchment outline-none placeholder:text-parchment/45 focus:border-accent"
        />
      </div>

      {/* Letter navigation — hidden while searching */}
      {!debouncedSearch.trim() && (
      <div className="flex flex-wrap gap-1.5 mb-8">
        {ALPHABET.map((letter) => {
          const hasAuthors = availableLetters.has(letter);
          return (
            <button
              key={letter}
              type="button"
              onClick={() => setSelectedLetter(letter)}
              disabled={!hasAuthors}
              className={`w-9 h-9 rounded-md text-sm font-medium transition flex items-center justify-center
                ${
                  selectedLetter === letter
                    ? "bg-accent text-ink"
                    : hasAuthors
                      ? "border border-border text-parchment/80 hover:text-parchment hover:border-parchment/40"
                      : "border border-border/30 text-parchment/20 cursor-not-allowed"
                }`}
            >
              {letter}
            </button>
          );
        })}
        {/* Non-letter group */}
        {availableLetters.has(NON_LETTER) && (
          <button
            type="button"
            onClick={() => setSelectedLetter(NON_LETTER)}
            className={`w-9 h-9 rounded-md text-sm font-medium transition flex items-center justify-center
              ${
                selectedLetter === NON_LETTER
                  ? "bg-accent text-ink"
                  : "border border-border text-parchment/80 hover:text-parchment hover:border-parchment/40"
              }`}
          >
            #
          </button>
        )}
      </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-12 rounded-lg" />
          ))}
        </div>
      )}

      {/* Author list */}
      {!loading && currentAuthors.length === 0 && (
        <p className="text-parchment/50 text-lg">
          {debouncedSearch.trim()
            ? `No se encontraron autores que coincidan con &ldquo;${debouncedSearch.trim()}&rdquo;.`
            : `No hay autores que comiencen con la letra &ldquo;${selectedLetter}&rdquo;.`}
        </p>
      )}

      {!loading && currentAuthors.length > 0 && (
        <div className="space-y-2">
          {currentAuthors.map((entry) => (
            <Link
              key={entry.name}
              to={`/?search=${encodeURIComponent(entry.name)}&searchBy=author`}
              className="flex items-center justify-between rounded-lg border border-border px-5 py-3 text-parchment/80 transition hover:border-parchment/40 hover:text-parchment hover:bg-parchment/5"
            >
              <span className="text-lg">{entry.name}</span>
              <span className="text-sm text-parchment/50">
                {entry.poem_count} {entry.poem_count === 1 ? "poema" : "poemas"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
