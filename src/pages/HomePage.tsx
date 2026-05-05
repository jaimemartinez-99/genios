import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useSearchParams } from "react-router-dom";
import { PoemCard } from "@/components/PoemCard";
import { supabase } from "@/lib/supabase";
import type { Poem } from "@/types/domain";

const HOME_AUTHORS = [
  "Francisco de Quevedo",
  "Miguel Hernández",
  "Federico García Lorca",
  "Luis de Góngora",
];
const ERAS = ["Todos", "Romanticismo", "Modernismo", "Generación del 27", "Contemporáneo"];
const ITEMS_PER_PAGE = 20;
const MAX_VISIBLE_PAGES = 7;

type PoemWithCount = Poem & { annotations_count: number };
type SearchBy = "title" | "author";

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [poems, setPoems] = useState<PoemWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [searchBy, setSearchBy] = useState<SearchBy>(
    searchParams.get("searchBy") === "author" ? "author" : "title"
  );
  const [era, setEra] = useState("Todos");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Debounce search to avoid firing API calls on every keystroke
  const debouncedSearch = useDebounce(search, 300);

  // Keep a ref to the latest search/era to avoid stale closure issues
  const searchRef = useRef(debouncedSearch);
  const eraRef = useRef(era);
  const searchByRef = useRef<SearchBy>(searchBy);
  searchRef.current = debouncedSearch;
  eraRef.current = era;
  searchByRef.current = searchBy;

  // Sync search state to URL params
  useEffect(() => {
    const nextParams: Record<string, string> = {};

    if (debouncedSearch.trim()) {
      nextParams.search = debouncedSearch.trim();
    }

    if (searchBy !== "title") {
      nextParams.searchBy = searchBy;
    }

    setSearchParams(nextParams, { replace: true });
  }, [debouncedSearch, searchBy, setSearchParams]);

  // Determine whether we have active filters
  const hasFilters = debouncedSearch.trim() !== "" || era !== "Todos";

  // Reset page to 1 whenever search or era changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, era, searchBy]);

  // On first mount, get total count for the home authors
  useEffect(() => {
    const init = async () => {
      const { count } = await supabase
        .schema("versos")
        .from("poems")
        .select("*", { count: "exact", head: true })
        .in("author", HOME_AUTHORS);
      setTotalCount(count ?? 0);
    };
    init();
  }, []);

  // Fetch poems — depends on search, era, page, etc.
  useEffect(() => {
    const fetchPoems = async () => {
      setLoading(true);
      setPoems([]);

      const currentSearch = searchRef.current.trim();
      const currentEra = eraRef.current;
      const currentSearchBy = searchByRef.current;
      const isFiltered = currentSearch !== "" || currentEra !== "Todos";

      if (isFiltered) {
        // ── Filtered mode: query Supabase with ilike / eq filters ──
        // Build the query
        let query = supabase
          .schema("versos")
          .from("poems")
          .select("id, title, author, body_text, era, created_at", { count: "exact" });

        // Era filter
        if (currentEra !== "Todos") {
          query = query.eq("era", currentEra);
        }

        // Search filter: match selected column (case-insensitive)
        if (currentSearch) {
          if (currentSearchBy === "author") {
            query = query.ilike("author", `%${currentSearch}%`);
          } else {
            query = query.ilike("title", `%${currentSearch}%`);
          }
        }

        // Pagination
        const from = (page - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;
        query = query
          .order("created_at", { ascending: false })
          .range(from, to);

        const { data: poemsData, count } = await query;
        setTotalCount(count ?? 0);

        const ids = (poemsData as Poem[] | null)?.map((p) => p.id) ?? [];

        // Fetch annotation counts for the displayed poems
        const { data: annotationsData } =
          ids.length > 0
            ? await supabase
                .schema("versos")
                .from("annotations")
                .select("poem_id")
                .in("poem_id", ids)
            : { data: [] };

        const countByPoem = new Map<string, number>();
        for (const row of annotationsData ?? []) {
          const pid = (row as { poem_id: string }).poem_id;
          countByPoem.set(pid, (countByPoem.get(pid) ?? 0) + 1);
        }

        const rows: PoemWithCount[] =
          (poemsData as Poem[] | null)?.map((poem) => ({
            ...poem,
            annotations_count: countByPoem.get(poem.id) ?? 0,
          })) ?? [];

        setPoems(rows);
      } else {
        // ── No filters: show home authors sorted alphabetically ──
        const from = (page - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;

        const { data: poemsData, count } = await supabase
          .schema("versos")
          .from("poems")
          .select("id, title, author, body_text, era, created_at", { count: "exact" })
          .in("author", HOME_AUTHORS)
          .order("author", { ascending: true })
          .range(from, to);

        setTotalCount(count ?? 0);

        const ids = (poemsData as Poem[] | null)?.map((p) => p.id) ?? [];

        // Fetch annotation counts
        const { data: annotationsData } =
          ids.length > 0
            ? await supabase
                .schema("versos")
                .from("annotations")
                .select("poem_id")
                .in("poem_id", ids)
            : { data: [] };

        const countByPoem = new Map<string, number>();
        for (const row of annotationsData ?? []) {
          const pid = (row as { poem_id: string }).poem_id;
          countByPoem.set(pid, (countByPoem.get(pid) ?? 0) + 1);
        }

        const rows: PoemWithCount[] =
          (poemsData as Poem[] | null)?.map((poem) => ({
            ...poem,
            annotations_count: countByPoem.get(poem.id) ?? 0,
          })) ?? [];

        setPoems(rows);
      }

      setLoading(false);
    };

    fetchPoems();
  }, [page, totalCount, debouncedSearch, era, searchBy]);

  // ── No client-side filtering needed anymore ──
  // The poems array already reflects the server-side filters.
  const displayedPoems = poems;

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  // Windowed page numbers so we don't render 100+ buttons
  const paginationPages = useMemo(() => {
    const half = Math.floor(MAX_VISIBLE_PAGES / 2);
    let start = Math.max(1, page - half);
    let end = Math.min(totalPages, start + MAX_VISIBLE_PAGES - 1);
    if (end - start < MAX_VISIBLE_PAGES - 1) {
      start = Math.max(1, end - MAX_VISIBLE_PAGES + 1);
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [page, totalPages]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 font-display text-4xl text-parchment">Listado de poemas</h1>
      <div className="mb-8 grid gap-3 md:grid-cols-[1fr_auto]">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={searchBy === "author" ? "Busca por autor" : "Busca por título"}
          className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-parchment outline-none placeholder:text-parchment/45 focus:border-accent"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSearchBy((prev) => (prev === "title" ? "author" : "title"))}
            className="rounded-full border border-border bg-panel px-3 py-1 text-xs uppercase tracking-wide text-parchment/70 hover:text-parchment"
          >
            Buscar por: {searchBy === "author" ? "Autor" : "Título"}
          </button>
          {ERAS.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => setEra(label)}
              className={`rounded-full px-3 py-1 text-xs uppercase tracking-wide ${
                era === label
                  ? "bg-accent text-ink"
                  : "border border-border bg-panel text-parchment/70 hover:text-parchment"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-40 rounded-xl border border-border" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {displayedPoems.map((poem) => (
              <PoemCard key={poem.id} poem={poem} annotationsCount={poem.annotations_count} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-1.5">
              {/* Previous */}
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-border bg-panel px-3 py-1.5 text-sm text-parchment/70 hover:text-parchment disabled:opacity-30"
              >
                Anterior
              </button>

              {/* First page + ellipsis */}
              {paginationPages[0] > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setPage(1)}
                    className="rounded-lg border border-border bg-panel px-3 py-1.5 text-sm text-parchment/70 hover:text-parchment"
                  >
                    1
                  </button>
                  {paginationPages[0] > 2 && (
                    <span className="px-1 text-parchment/50">…</span>
                  )}
                </>
              )}

              {/* Windowed page numbers */}
              {paginationPages.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={`rounded-lg px-3 py-1.5 text-sm ${
                    n === page
                      ? "bg-accent text-ink"
                      : "border border-border bg-panel text-parchment/70 hover:text-parchment"
                  }`}
                >
                  {n}
                </button>
              ))}

              {/* Last page + ellipsis */}
              {paginationPages[paginationPages.length - 1] < totalPages && (
                <>
                  {paginationPages[paginationPages.length - 1] < totalPages - 1 && (
                    <span className="px-1 text-parchment/50">…</span>
                  )}
                  <button
                    type="button"
                    onClick={() => setPage(totalPages)}
                    className="rounded-lg border border-border bg-panel px-3 py-1.5 text-sm text-parchment/70 hover:text-parchment"
                  >
                    {totalPages}
                  </button>
                </>
              )}

              {/* Next */}
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-border bg-panel px-3 py-1.5 text-sm text-parchment/70 hover:text-parchment disabled:opacity-30"
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
