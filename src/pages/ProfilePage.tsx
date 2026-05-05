import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import type { ProfileStats } from "@/types/domain";

type AnnotatedPoem = {
  poem_id: string;
  title: string;
  author: string;
  annotation_count: number;
};

type ProfileFavorites = {
  favorite_author: string | null;
  favorite_poem: string | null;
};

export function ProfilePage() {
  const { username } = useParams();
  const [profile, setProfile] = useState<ProfileStats | null>(null);
  const [favorites, setFavorites] = useState<ProfileFavorites | null>(null);
  const [poems, setPoems] = useState<AnnotatedPoem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!username) return;
      setLoading(true);

      const [{ data: summary }, { data: poemsData }, { data: favoriteData }] = await Promise.all([
        supabase.schema("versos").rpc("get_profile_summary", { p_username: username }),
        supabase.schema("versos").rpc("get_profile_poems", { p_username: username }),
        supabase
          .schema("versos")
          .from("profiles")
          .select("favorite_author, favorite_poem")
          .eq("username", username)
          .maybeSingle()
      ]);

      setProfile((summary?.[0] as ProfileStats | undefined) ?? null);
      setPoems((poemsData as AnnotatedPoem[]) ?? []);
      setFavorites((favoriteData as ProfileFavorites | null) ?? null);
      setLoading(false);
    };
    void fetchProfile();
  }, [username]);

  if (loading) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-10">
        <div className="skeleton mb-4 h-32 rounded-xl" />
        <div className="skeleton h-64 rounded-xl" />
      </section>
    );
  }

  if (!profile) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-10">
        <p>Perfil no encontrado.</p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 rounded-xl border border-border bg-panel p-5">
        <div className="mb-3 flex items-center gap-3">
          <img
            src={profile.avatar_url ?? "https://placehold.co/80x80/161318/E8DEC8?text=VG"}
            alt={profile.username}
            className="h-14 w-14 rounded-full border border-border object-cover"
          />
          <div>
            <h1 className="font-display text-3xl">{profile.username}</h1>
            <p className="text-xs text-parchment/60">
              Miembro desde {new Date(profile.created_at).toLocaleDateString("es-ES")}
            </p>
          </div>
        </div>
        {profile.bio && <p className="text-sm text-parchment/85">{profile.bio}</p>}
        {(favorites?.favorite_author || favorites?.favorite_poem) && (
          <p className="mt-2 text-xs text-parchment/65">
            {favorites?.favorite_author && `Autor favorito: ${favorites.favorite_author}`}
            {favorites?.favorite_author && favorites?.favorite_poem && " · "}
            {favorites?.favorite_poem && `Poema favorito: ${favorites.favorite_poem}`}
          </p>
        )}
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-panel p-4">
          <p className="text-xs uppercase text-parchment/55">Anotaciones</p>
          <p className="font-display text-3xl">{profile.total_annotations}</p>
        </div>
        <div className="rounded-lg border border-border bg-panel p-4">
          <p className="text-xs uppercase text-parchment/55">❤ recibidos</p>
          <p className="font-display text-3xl">{profile.total_likes_received}</p>
        </div>
        <div className="rounded-lg border border-border bg-panel p-4">
          <p className="text-xs uppercase text-parchment/55">Poemas anotados</p>
          <p className="font-display text-3xl">{profile.poems_annotated}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-panel p-5">
        <h2 className="mb-4 font-display text-2xl">Poemas comentados</h2>
        <div className="space-y-3">
          {poems.map((poem) => (
            <div key={poem.poem_id} className="flex items-center justify-between border-b border-border pb-2">
              <p className="text-sm">
                <span className="font-medium">{poem.title}</span> · {poem.author}
              </p>
              <span className="text-xs text-parchment/60">{poem.annotation_count} anotaciones</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
