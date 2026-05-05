import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const currentUser = data.session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        void ensureProfileForUser(currentUser);
      }
      setLoading(false);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        void ensureProfileForUser(currentUser);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin
      }
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, loading, signInWithGoogle, signOut };
}

async function ensureProfileForUser(user: User) {
  const { data: existingProfile } = await supabase
    .schema("versos")
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfile) {
    await supabase
      .schema("versos")
      .from("profiles")
      .update({
        avatar_url: (user.user_metadata.avatar_url as string | undefined) ?? null
      })
      .eq("id", user.id);
    return;
  }

  const username = await buildAvailableUsername(user);

  await supabase.schema("versos").from("profiles").insert({
    id: user.id,
    username,
    avatar_url: (user.user_metadata.avatar_url as string | undefined) ?? null
  });
}

async function buildAvailableUsername(user: User) {
  const base =
    sanitizeUsername(
      (user.user_metadata.user_name as string | undefined) ??
        (user.user_metadata.preferred_username as string | undefined) ??
        (user.email?.split("@")[0] ?? "")
    ) || `lector_${user.id.slice(0, 8)}`;

  let candidate = base;
  let attempt = 0;

  while (attempt < 5) {
    const { data: taken } = await supabase
      .schema("versos")
      .from("profiles")
      .select("id")
      .eq("username", candidate)
      .maybeSingle();

    if (!taken) return candidate;
    attempt += 1;
    candidate = `${base}_${user.id.slice(0, 4)}${attempt}`;
  }

  return `lector_${user.id.slice(0, 8)}`;
}

function sanitizeUsername(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
}
