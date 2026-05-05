import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/hooks/useAuth";
import { HomePage } from "@/pages/HomePage";
import { NewPoemPage } from "@/pages/NewPoemPage";
import { AccountPage } from "@/pages/AccountPage";
import { PoemPage } from "@/pages/PoemPage";
import { AutoresPage } from "@/pages/AutoresPage";

export default function App() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = window.localStorage.getItem("versos_theme");
    return saved === "light" ? "light" : "dark";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("versos_theme", theme);
  }, [theme]);

  return (
    <div className="min-h-screen bg-ink text-parchment">
      <TopBar
        user={user}
        onSignIn={signInWithGoogle}
        onSignOut={signOut}
        theme={theme}
        onToggleTheme={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
      />
      {loading ? (
        <main className="mx-auto max-w-6xl px-4 py-10">
          <div className="skeleton h-48 rounded-xl" />
        </main>
      ) : (
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/autores" element={<AutoresPage />} />
          <Route path="/nuevo-poema" element={<NewPoemPage user={user} onSignIn={signInWithGoogle} />} />
          <Route path="/poema/:poemId" element={<PoemPage user={user} />} />
          <Route path="/perfil/:username" element={<AccountPage user={user} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </div>
  );
}
