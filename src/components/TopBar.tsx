import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type TopBarProps = {
  user: User | null;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  theme: "dark" | "light";
  onToggleTheme: () => void;
};

export function TopBar({ user, onSignIn, onSignOut, theme, onToggleTheme }: TopBarProps) {
  const [profileUsername, setProfileUsername] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsername = async () => {
      if (!user) {
        setProfileUsername(null);
        return;
      }
      const { data } = await supabase
        .schema("versos")
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();

      setProfileUsername(((data as { username?: string } | null)?.username ?? null) as string | null);
    };
    void fetchUsername();
  }, [user]);

  const fallbackUsername = user?.user_metadata.user_name ?? user?.email;
  const accountHref = `/perfil/${encodeURIComponent(profileUsername ?? fallbackUsername ?? "")}`;

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-ink/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link to="/" className="font-display text-2xl tracking-wide text-parchment">
          Genios
        </Link>

        <nav className="flex items-center gap-3">
          <Link
            to="/"
            className="rounded-md border border-border px-3 py-1.5 text-sm text-parchment/80 transition hover:text-parchment"
          >
            Inicio
          </Link>
          <Link
            to="/autores"
            className="rounded-md border border-border px-3 py-1.5 text-sm text-parchment/80 transition hover:text-parchment"
          >
            Autores
          </Link>
          {user ? (
            <>
              <Link
                to="/nuevo-poema"
                className="rounded-md border border-border px-3 py-1.5 text-sm text-parchment/80 transition hover:text-parchment"
              >
                Guardar poema
              </Link>
              <Link
                to={accountHref}
                className="rounded-md border border-border px-3 py-1.5 text-sm text-parchment/80 transition hover:text-parchment"
              >
                Tu cuenta
              </Link>
              <button
                type="button"
                onClick={onSignOut}
                className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-ink transition hover:opacity-90"
              >
                Cerrar sesión
              </button>
              <img
                src={user.user_metadata.avatar_url as string | undefined}
                alt="Avatar"
                className="h-9 w-9 rounded-full border border-border object-cover"
              />
            </>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-ink transition hover:opacity-90"
            >
              Inicia sesión con Google
            </button>
          )}
          <button
            type="button"
            onClick={onToggleTheme}
            className="rounded-md border border-border px-3 py-1.5 text-sm text-parchment/85 transition hover:text-parchment"
            aria-label={theme === "dark" ? "Cambiar a modo día" : "Cambiar a modo noche"}
            title={theme === "dark" ? "Cambiar a modo día" : "Cambiar a modo noche"}
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
        </nav>
      </div>
    </header>
  );
}
