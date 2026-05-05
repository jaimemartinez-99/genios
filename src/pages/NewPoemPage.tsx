import { FormEvent, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type NewPoemPageProps = {
  user: User | null;
  onSignIn: () => Promise<void>;
};

export function NewPoemPage({ user, onSignIn }: NewPoemPageProps) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [era, setEra] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [authorOptions, setAuthorOptions] = useState<string[]>([]);
  const [eraOptions, setEraOptions] = useState<string[]>([]);
  const [activeAutocomplete, setActiveAutocomplete] = useState<"author" | "era" | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    title: string;
    author: string;
    similarity: number;
  } | null>(null);

  const suggestedTitle = useMemo(() => {
    if (title.trim()) return title.trim();
    const firstLine = bodyText.split("\n").find((line) => line.trim().length > 0)?.trim() ?? "";
    return firstLine.slice(0, 120);
  }, [title, bodyText]);

  useEffect(() => {
    const fetchAuthorMatches = async () => {
      const term = author.trim();
      if (term.length < 1) {
        setAuthorOptions([]);
        return;
      }

      const { data } = await supabase
        .schema("versos")
        .from("poems")
        .select("author")
        .ilike("author", `%${term}%`)
        .limit(8);

      const uniqueAuthors = [...new Set((data ?? []).map((row) => (row as { author: string }).author))];
      setAuthorOptions(uniqueAuthors);
    };

    void fetchAuthorMatches();
  }, [author]);

  useEffect(() => {
    const fetchEraMatches = async () => {
      const term = era.trim();
      const query = supabase.schema("versos").from("poems").select("era").limit(8);
      const { data } = term.length
        ? await query.ilike("era", `%${term}%`)
        : await query.order("created_at", { ascending: false });

      const uniqueEras = [...new Set((data ?? []).map((row) => (row as { era: string }).era).filter(Boolean))];
      setEraOptions(uniqueEras);
    };

    void fetchEraMatches();
  }, [era]);

  useEffect(() => {
    setDuplicateWarning(null);
  }, [title, bodyText]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await savePoem(false);
  };

  const savePoem = async (allowDuplicate: boolean) => {
    setMessage(null);
    setError(null);

    if (!user) {
      setError("Inicia sesion para guardar poemas.");
      return;
    }
    if (!author.trim() || !bodyText.trim() || !era.trim()) {
      setError("Completa autor, epoca y texto del poema.");
      return;
    }

    setSaving(true);
    try {
      const finalTitle = suggestedTitle || "Poema sin titulo";
      const duplicate = await findDuplicatePoem({
        title: finalTitle,
        bodyText: bodyText.trim()
      });

      if (duplicate && !allowDuplicate) {
        setDuplicateWarning({
          title: duplicate.title,
          author: duplicate.author,
          similarity: duplicate.score
        });
        setError(
          `Posible duplicado detectado (${Math.round(duplicate.score * 100)}%): "${duplicate.title}" de ${duplicate.author}.`
        );
        setSaving(false);
        return;
      }

      const { error: insertError } = await supabase.schema("versos").from("poems").insert({
        title: finalTitle,
        author: author.trim(),
        body_text: bodyText.trim(),
        era: era.trim(),
        created_by: user.id
      });

      if (insertError) throw insertError;

      setMessage("Poema guardado correctamente.");
      setDuplicateWarning(null);
      setTitle("");
      setAuthor("");
      setEra("");
      setBodyText("");
      setAuthorOptions([]);
      setEraOptions([]);
    } catch (err) {
      setError("No se pudo guardar el poema. Revisa permisos y vuelve a intentarlo.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-6">
        <h1 className="font-display text-4xl text-parchment">Guardar nuevo poema</h1>
        <p className="mt-2 text-sm text-parchment/70">
          Comparte versos y alimenta la biblioteca colaborativa.
        </p>
      </header>

      {!user && (
        <div className="mb-6 rounded-xl border border-border bg-panel p-4">
          <p className="mb-3 text-sm text-parchment/80">Necesitas una cuenta para publicar poemas.</p>
          <button
            type="button"
            onClick={() => void onSignIn()}
            className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-ink"
          >
            Inicia sesion con Google
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-panel p-5">
        <div className="mb-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-parchment/70">Titulo (opcional)</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Si lo dejas vacio, usamos el primer verso"
              className="w-full rounded-md border border-border bg-ink px-3 py-2 text-sm text-parchment outline-none placeholder:text-parchment/45 focus:border-accent"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-parchment/70">Autor</span>
            <div className="relative">
              <input
                value={author}
                onChange={(event) => setAuthor(event.target.value)}
                onFocus={() => setActiveAutocomplete("author")}
                onBlur={() => window.setTimeout(() => setActiveAutocomplete(null), 100)}
                placeholder="Empieza a escribir para ver autores guardados"
                className="w-full rounded-md border border-border bg-ink px-3 py-2 text-sm text-parchment outline-none placeholder:text-parchment/45 focus:border-accent"
              />
              {activeAutocomplete === "author" && authorOptions.length > 0 && (
                <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-10 rounded-md border border-border bg-panel shadow-xl">
                  {authorOptions.map((authorOption) => (
                    <button
                      key={authorOption}
                      type="button"
                      onMouseDown={() => setAuthor(authorOption)}
                      className="block w-full border-b border-border/60 px-3 py-2 text-left text-xs text-parchment/85 last:border-b-0 hover:bg-ink/60"
                    >
                      {authorOption}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </label>
        </div>

        <div className="mb-4">
          <label className="text-sm">
            <span className="mb-1 block text-parchment/70">Epoca</span>
            <div className="relative">
              <input
                value={era}
                onChange={(event) => setEra(event.target.value)}
                onFocus={() => setActiveAutocomplete("era")}
                onBlur={() => window.setTimeout(() => setActiveAutocomplete(null), 100)}
                placeholder="Escribe una epoca (puede ser nueva)"
                className="w-full rounded-md border border-border bg-ink px-3 py-2 text-sm text-parchment outline-none placeholder:text-parchment/45 focus:border-accent"
              />
              {activeAutocomplete === "era" && eraOptions.length > 0 && (
                <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-10 rounded-md border border-border bg-panel shadow-xl">
                  {eraOptions.map((eraOption) => (
                    <button
                      key={eraOption}
                      type="button"
                      onMouseDown={() => setEra(eraOption)}
                      className="block w-full border-b border-border/60 px-3 py-2 text-left text-xs text-parchment/85 last:border-b-0 hover:bg-ink/60"
                    >
                      {eraOption}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </label>
        </div>

        <label className="text-sm">
          <span className="mb-1 block text-parchment/70">Texto del poema</span>
          <textarea
            value={bodyText}
            onChange={(event) => setBodyText(event.target.value)}
            placeholder="Escribe o pega aqui el poema completo..."
            rows={14}
            className="w-full rounded-md border border-border bg-ink p-3 font-poem text-2xl leading-relaxed text-parchment outline-none placeholder:font-ui placeholder:text-sm placeholder:text-parchment/45 focus:border-accent"
          />
        </label>

        <div className="mt-4 flex items-center justify-between gap-4">
          <p className="text-xs text-parchment/60">Titulo final: {suggestedTitle || "Poema sin titulo"}</p>
          <div className="flex items-center gap-2">
            {duplicateWarning && (
              <button
                type="button"
                onClick={() => void savePoem(true)}
                disabled={saving}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-parchment/85 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Guardar de todos modos
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar poema"}
            </button>
          </div>
        </div>

        {message && <p className="mt-3 text-sm text-emerald-300">{message}</p>}
        {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
      </form>
    </section>
  );
}

type DuplicateCheckInput = {
  title: string;
  bodyText: string;
};

type DuplicateResult = {
  title: string;
  author: string;
  score: number;
};

async function findDuplicatePoem(input: DuplicateCheckInput): Promise<DuplicateResult | null> {
  const { data } = await supabase
    .schema("versos")
    .from("poems")
    .select("title, author, body_text")
    .order("created_at", { ascending: false })
    .limit(200);

  const candidates = (data ?? []) as { title: string; author: string; body_text: string }[];
  if (candidates.length === 0) return null;

  const normalizedTitle = normalizeText(input.title);
  const normalizedBody = normalizeText(input.bodyText);
  const bodyWindow = normalizedBody.slice(0, 4500);
  let best: DuplicateResult | null = null;

  for (const candidate of candidates) {
    const candidateTitle = normalizeText(candidate.title);
    const candidateBody = normalizeText(candidate.body_text).slice(0, 4500);

    const titleScore = tokenJaccard(normalizedTitle, candidateTitle);
    const bodyScore = tokenJaccard(bodyWindow, candidateBody);
    const combinedScore = titleScore * 0.42 + bodyScore * 0.58;

    const looksDuplicate = bodyScore >= 0.92 || (combinedScore >= 0.82 && bodyScore >= 0.68);
    if (!looksDuplicate) continue;

    if (!best || combinedScore > best.score) {
      best = {
        title: candidate.title,
        author: candidate.author,
        score: combinedScore
      };
    }
  }

  return best;
}

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenJaccard(a: string, b: string) {
  const setA = new Set(a.split(" ").filter((token) => token.length > 2));
  const setB = new Set(b.split(" ").filter((token) => token.length > 2));
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
