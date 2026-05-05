import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useParams } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type AccountPageProps = {
  user: User | null;
};

type ProfileRow = {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  favorite_author: string | null;
  favorite_poem: string | null;
  created_at: string;
};

type UploadedPoem = {
  id: string;
  title: string;
  author: string;
  era: string;
};

type CommentedPoem = {
  poem_id: string;
  title: string;
  author: string;
  comments_count: number;
};

type LikedAnnotation = {
  like_id: string;
  annotation_id: string;
  poem_id: string;
  poem_title: string;
  annotation_quote: string;
  annotation_text: string;
};

export function AccountPage({ user }: AccountPageProps) {
  const { username } = useParams();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [uploadedPoems, setUploadedPoems] = useState<UploadedPoem[]>([]);
  const [commentedPoems, setCommentedPoems] = useState<CommentedPoem[]>([]);
  const [likedAnnotations, setLikedAnnotations] = useState<LikedAnnotation[]>([]);
  const [favoriteAuthor, setFavoriteAuthor] = useState("");
  const [favoritePoem, setFavoritePoem] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingFavs, setSavingFavs] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [favoriteAuthorSuggestions, setFavoriteAuthorSuggestions] = useState<string[]>([]);
  const [favoritePoemSuggestions, setFavoritePoemSuggestions] = useState<string[]>([]);
  const [activeAutocomplete, setActiveAutocomplete] = useState<"author" | "poem" | null>(null);

  const joinedAt = useMemo(() => {
    if (!profile) return "";
    return new Date(profile.created_at).toLocaleDateString("es-ES");
  }, [profile]);
  const isOwnAccount = Boolean(user && profile && user.id === profile.id);

  useEffect(() => {
    const fetchAccountData = async () => {
      if (!user && !username) {
        setLoading(false);
        return;
      }
      setLoading(true);

      const profileQuery = supabase
        .schema("versos")
        .from("profiles")
        .select("id, username, avatar_url, bio, favorite_author, favorite_poem, created_at");
      const { data: profileData } = username
        ? await profileQuery.eq("username", username).maybeSingle()
        : await profileQuery.eq("id", user?.id ?? "").maybeSingle();

      const profileRow = (profileData as ProfileRow | null) ?? null;
      if (!profileRow) {
        setProfile(null);
        setUploadedPoems([]);
        setCommentedPoems([]);
        setLikedAnnotations([]);
        setLoading(false);
        return;
      }

      const [{ data: uploadedData }, { data: annotationData }, { data: likesData }] = await Promise.all([
        supabase
          .schema("versos")
          .from("poems")
          .select("id, title, author, era")
          .eq("created_by", profileRow.id)
          .order("created_at", { ascending: false }),
        supabase
          .schema("versos")
          .from("annotations")
          .select("id, poem_id")
          .eq("user_id", profileRow.id),
        supabase
          .schema("versos")
          .from("likes")
          .select("id, annotation_id")
          .eq("user_id", profileRow.id)
          .order("created_at", { ascending: false })
      ]);

      setProfile(profileRow);
      setFavoriteAuthor(profileRow?.favorite_author ?? "");
      setFavoritePoem(profileRow?.favorite_poem ?? "");
      setUploadedPoems((uploadedData as UploadedPoem[]) ?? []);

      const annotationRows = (annotationData as { id: string; poem_id: string }[]) ?? [];
      const commentsByPoem = new Map<string, number>();
      for (const row of annotationRows) {
        commentsByPoem.set(row.poem_id, (commentsByPoem.get(row.poem_id) ?? 0) + 1);
      }

      const commentedPoemIds = [...commentsByPoem.keys()];
      if (commentedPoemIds.length > 0) {
        const { data: commentedPoemRows } = await supabase
          .schema("versos")
          .from("poems")
          .select("id, title, author")
          .in("id", commentedPoemIds);

        const rows = ((commentedPoemRows as { id: string; title: string; author: string }[]) ?? []).map((poem) => ({
          poem_id: poem.id,
          title: poem.title,
          author: poem.author,
          comments_count: commentsByPoem.get(poem.id) ?? 0
        }));

        rows.sort((a, b) => b.comments_count - a.comments_count);
        setCommentedPoems(rows);
      } else {
        setCommentedPoems([]);
      }

      const likeRows = (likesData as { id: string; annotation_id: string }[]) ?? [];
      const likedAnnotationIds = likeRows.map((like) => like.annotation_id);

      if (likedAnnotationIds.length > 0) {
        const { data: likedAnnotationRows } = await supabase
          .schema("versos")
          .from("annotations")
          .select("id, poem_id, quote, comment_text")
          .in("id", likedAnnotationIds);

        const annotations = (likedAnnotationRows ??
          []) as { id: string; poem_id: string; quote: string; comment_text: string }[];
        const poemIds = [...new Set(annotations.map((annotation) => annotation.poem_id))];

        const { data: likedPoemRows } = await supabase
          .schema("versos")
          .from("poems")
          .select("id, title")
          .in("id", poemIds);

        const poemTitleById = new Map(
          ((likedPoemRows as { id: string; title: string }[]) ?? []).map((poem) => [poem.id, poem.title])
        );
        const likeIdByAnnotationId = new Map(likeRows.map((like) => [like.annotation_id, like.id]));

        setLikedAnnotations(
          annotations.map((annotation) => ({
            like_id: likeIdByAnnotationId.get(annotation.id) ?? annotation.id,
            annotation_id: annotation.id,
            poem_id: annotation.poem_id,
            poem_title: poemTitleById.get(annotation.poem_id) ?? "Poema",
            annotation_quote: annotation.quote,
            annotation_text: annotation.comment_text
          }))
        );
      } else {
        setLikedAnnotations([]);
      }

      setLoading(false);
    };

    void fetchAccountData();
  }, [user, username]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!isOwnAccount) return;
      const term = favoriteAuthor.trim();
      if (!term) {
        setFavoriteAuthorSuggestions([]);
        return;
      }
      const { data } = await supabase
        .schema("versos")
        .from("poems")
        .select("author")
        .ilike("author", `%${term}%`)
        .limit(6);
      const unique = [...new Set(((data as { author: string }[] | null) ?? []).map((row) => row.author))];
      setFavoriteAuthorSuggestions(unique);
    }, 300);
    return () => clearTimeout(timer);
  }, [favoriteAuthor, isOwnAccount]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!isOwnAccount) return;
      const term = favoritePoem.trim();
      if (!term) {
        setFavoritePoemSuggestions([]);
        return;
      }
      const { data } = await supabase
        .schema("versos")
        .from("poems")
        .select("title")
        .ilike("title", `%${term}%`)
        .limit(6);
      const unique = [...new Set(((data as { title: string }[] | null) ?? []).map((row) => row.title))];
      setFavoritePoemSuggestions(unique);
    }, 300);
    return () => clearTimeout(timer);
  }, [favoritePoem, isOwnAccount]);

  const saveFavorites = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !isOwnAccount) return;
    setSavingFavs(true);
    setStatus(null);

    const { error } = await supabase
      .schema("versos")
      .from("profiles")
      .update({
        favorite_author: favoriteAuthor.trim() || null,
        favorite_poem: favoritePoem.trim() || null
      })
      .eq("id", user.id);

    if (error) {
      setStatus("No se pudieron guardar tus favoritos.");
    } else {
      setStatus("Favoritos guardados.");
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              favorite_author: favoriteAuthor.trim() || null,
              favorite_poem: favoritePoem.trim() || null
            }
          : prev
      );
    }

    setSavingFavs(false);
  };

  if (!user && !username) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-sm text-parchment/80">Inicia sesión para abrir tu cuenta.</p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-10">
        <div className="skeleton mb-4 h-32 rounded-xl" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="skeleton h-56 rounded-xl" />
          <div className="skeleton h-56 rounded-xl" />
          <div className="skeleton h-56 rounded-xl" />
        </div>
      </section>
    );
  }

  if (!profile) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-sm text-parchment/80">Perfil no encontrado.</p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 rounded-xl border border-border bg-panel p-5">
        <div className="mb-4 flex items-center gap-3">
          <img
            src={profile?.avatar_url ?? "https://placehold.co/80x80/161318/E8DEC8?text=VG"}
            alt={profile?.username ?? "Avatar"}
            className="h-14 w-14 rounded-full border border-border object-cover"
          />
          <div>
            <h1 className="font-display text-3xl">{profile?.username ?? "Tu cuenta"}</h1>
            <p className="text-xs text-parchment/60">Miembro desde {joinedAt}</p>
          </div>
        </div>

        {isOwnAccount ? (
          <form onSubmit={saveFavorites} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <div className="relative">
              <input
                value={favoriteAuthor}
                onChange={(event) => setFavoriteAuthor(event.target.value)}
                onFocus={() => setActiveAutocomplete("author")}
                onBlur={() => window.setTimeout(() => setActiveAutocomplete(null), 100)}
                placeholder="Autor favorito"
                className="w-full rounded-md border border-border bg-ink px-3 py-2 text-sm text-parchment outline-none placeholder:text-parchment/45 focus:border-accent"
              />
              {activeAutocomplete === "author" && favoriteAuthorSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-10 rounded-md border border-border bg-panel shadow-xl">
                  {favoriteAuthorSuggestions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onMouseDown={() => setFavoriteAuthor(item)}
                      className="block w-full border-b border-border/60 px-3 py-2 text-left text-xs text-parchment/85 last:border-b-0 hover:bg-ink/60"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <input
                value={favoritePoem}
                onChange={(event) => setFavoritePoem(event.target.value)}
                onFocus={() => setActiveAutocomplete("poem")}
                onBlur={() => window.setTimeout(() => setActiveAutocomplete(null), 100)}
                placeholder="Poema favorito"
                className="w-full rounded-md border border-border bg-ink px-3 py-2 text-sm text-parchment outline-none placeholder:text-parchment/45 focus:border-accent"
              />
              {activeAutocomplete === "poem" && favoritePoemSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-10 rounded-md border border-border bg-panel shadow-xl">
                  {favoritePoemSuggestions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onMouseDown={() => setFavoritePoem(item)}
                      className="block w-full border-b border-border/60 px-3 py-2 text-left text-xs text-parchment/85 last:border-b-0 hover:bg-ink/60"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={savingFavs}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-ink disabled:opacity-50"
            >
              {savingFavs ? "Guardando..." : "Guardar favoritos"}
            </button>
          </form>
        ) : (
          <p className="text-xs text-parchment/70">
            {profile?.favorite_author && `Autor favorito: ${profile.favorite_author}`}
            {profile?.favorite_author && profile?.favorite_poem && " · "}
            {profile?.favorite_poem && `Poema favorito: ${profile.favorite_poem}`}
          </p>
        )}
        {status && <p className="mt-2 text-xs text-parchment/70">{status}</p>}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-border bg-panel p-4">
          <h2 className="mb-3 font-display text-2xl">Poemas subidos</h2>
          {uploadedPoems.length === 0 ? (
            <p className="text-sm text-parchment/65">Aún no has subido poemas.</p>
          ) : (
            <p className="font-display text-4xl">{uploadedPoems.length}</p>
          )}
        </article>

        <article className="rounded-xl border border-border bg-panel p-4">
          <h2 className="mb-3 font-display text-2xl">Poemas comentados</h2>
          <div className="space-y-2">
            {commentedPoems.length === 0 && <p className="text-sm text-parchment/65">Aún no has comentado poemas.</p>}
            {commentedPoems.map((poem) => (
              <Link
                key={poem.poem_id}
                to={`/poema/${poem.poem_id}`}
                className="block rounded-md border border-border p-2 hover:border-accent/60"
              >
                <p className="text-sm font-medium">{poem.title}</p>
                <p className="text-xs text-parchment/65">
                  {poem.author} · {poem.comments_count} anotaciones
                </p>
              </Link>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-border bg-panel p-4">
          <h2 className="mb-3 font-display text-2xl">Anotaciones con me gusta</h2>
          <div className="space-y-2">
            {likedAnnotations.length === 0 && (
              <p className="text-sm text-parchment/65">Aún no has dado me gusta a anotaciones.</p>
            )}
            {likedAnnotations.map((item) => (
              <Link
                key={item.like_id}
                to={`/poema/${item.poem_id}`}
                className="block rounded-md border border-border p-2 hover:border-accent/60"
              >
                <p className="text-xs uppercase text-parchment/50">{item.poem_title}</p>
                <p className="text-sm text-parchment/90">“{item.annotation_quote}”</p>
                <p className="mt-1 text-xs text-parchment/70">{item.annotation_text}</p>
              </Link>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
