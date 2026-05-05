import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { AnnotationDrawer } from "@/components/AnnotationDrawer";
import { PoemRenderer } from "@/components/PoemRenderer";
import { supabase } from "@/lib/supabase";
import type { Annotation, Poem } from "@/types/domain";
import { getTextOffsetsFromSelection } from "@/utils/selection";

type PoemPageProps = {
  user: User | null;
};

type PendingSelection = {
  start: number;
  end: number;
  text: string;
  x: number;
  y: number;
};

export function PoemPage({ user }: PoemPageProps) {
  const { poemId } = useParams();
  const [poem, setPoem] = useState<Poem | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeIds, setActiveIds] = useState<string[]>([]);
  const [pendingSelection, setPendingSelection] = useState<PendingSelection | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedQuote = useMemo(() => {
    if (pendingSelection?.text) return pendingSelection.text;
    const first = annotations.find((annotation) => activeIds.includes(annotation.id));
    return first?.quote ?? "";
  }, [pendingSelection?.text, annotations, activeIds]);

  const loadAnnotationsForPoem = async (targetPoemId: string) => {
    const { data: annotationRows } = await supabase
      .schema("versos")
      .from("annotations")
      .select("id, poem_id, user_id, quote, comment_text, start_index, end_index, created_at")
      .eq("poem_id", targetPoemId)
      .order("created_at", { ascending: true });

    const baseAnnotations = (annotationRows as Annotation[] | null) ?? [];
    const userIds = [...new Set(baseAnnotations.map((annotation) => annotation.user_id))];

    if (userIds.length === 0) return baseAnnotations;

    const { data: profileRows } = await supabase
      .schema("versos")
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", userIds);

    const profilesById = new Map(
      ((profileRows as { id: string; username: string; avatar_url: string | null }[] | null) ?? []).map(
        (profile) => [profile.id, { username: profile.username, avatar_url: profile.avatar_url }]
      )
    );

    return baseAnnotations.map((annotation) => ({
      ...annotation,
      profiles: profilesById.get(annotation.user_id) ?? null
    }));
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!poemId) return;
      setLoading(true);

      const [poemResponse, enrichedAnnotations] = await Promise.all([
        supabase
          .schema("versos")
          .from("poems")
          .select("id, title, author, body_text, era, created_at")
          .eq("id", poemId)
          .single(),
        loadAnnotationsForPoem(poemId)
      ]);

      setPoem((poemResponse.data as Poem | null) ?? null);
      setAnnotations(enrichedAnnotations);
      setLoading(false);
    };

    void fetchData();
  }, [poemId]);

  const handlePoemMouseUp = () => {
    if (!containerRef.current || !poem) return;
    const selection = window.getSelection();
    if (!selection) return;
    const offset = getTextOffsetsFromSelection(containerRef.current, selection, poem.body_text);
    if (!offset) {
      setPendingSelection(null);
      return;
    }
    setPendingSelection({
      start: offset.start,
      end: offset.end,
      text: offset.text,
      x: offset.rect.x + offset.rect.width / 2,
      y: offset.rect.y - 12
    });
  };

  const visibleAnnotations = annotations.filter((annotation) =>
    activeIds.length === 0 ? true : activeIds.includes(annotation.id)
  );

  const createAnnotation = async (comment: string) => {
    if (!pendingSelection || !poemId || !user) return;
    const payload = {
      poem_id: poemId,
      user_id: user.id,
      quote: pendingSelection.text,
      comment_text: comment,
      start_index: pendingSelection.start,
      end_index: pendingSelection.end
    };

    const { data } = await supabase.schema("versos").from("annotations").insert(payload).select().single();
    if (data) {
      const refreshedAnnotations = await loadAnnotationsForPoem(poemId);
      setAnnotations(refreshedAnnotations);
      setActiveIds([data.id as string]);
      setPendingSelection(null);
      setDrawerOpen(true);
      window.getSelection()?.removeAllRanges();
    }
  };

  const handleLike = async (annotationId: string) => {
    if (!user) throw new Error("Unauthenticated");
    const { error } = await supabase.schema("versos").from("likes").insert({
      annotation_id: annotationId,
      user_id: user.id
    });
    if (error) throw error;
  };

  const handleDeleteAnnotation = async (annotationId: string) => {
    if (!user) return;
    const { error } = await supabase
      .schema("versos")
      .from("annotations")
      .delete()
      .eq("id", annotationId)
      .eq("user_id", user.id);

    if (error) throw error;
    setAnnotations((prev) => prev.filter((annotation) => annotation.id !== annotationId));
    setActiveIds((prev) => prev.filter((id) => id !== annotationId));
  };

  if (loading) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-10">
        <div className="skeleton mb-5 h-10 w-2/3 rounded-md" />
        <div className="skeleton h-[420px] rounded-xl" />
      </section>
    );
  }

  if (!poem) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-10">
        <p>No se encontró el poema.</p>
      </section>
    );
  }

  return (
    <>
      <section className="mx-auto max-w-4xl px-4 py-10">
        <header className="mb-6">
          <h1 className="font-display text-4xl text-parchment">{poem.title}</h1>
          <p className="text-parchment/70">
            {poem.author} · {poem.era}
          </p>
        </header>

        <div ref={containerRef} onMouseUp={handlePoemMouseUp}>
          <PoemRenderer
            bodyText={poem.body_text}
            annotations={annotations}
            onMarkClick={(ids) => {
              setActiveIds(ids);
              setPendingSelection(null);
              setDrawerOpen(true);
            }}
          />
        </div>
      </section>

      {pendingSelection && (
        <button
          type="button"
          onClick={() => {
            setActiveIds([]);
            setDrawerOpen(true);
          }}
          style={{
            position: "absolute",
            left: pendingSelection.x,
            top: pendingSelection.y
          }}
          className="z-20 -translate-x-1/2 rounded-full border border-border bg-panel px-3 py-1 text-xs text-parchment shadow-glow"
        >
          ✍️ Añadir anotación
        </button>
      )}

      <AnnotationDrawer
        open={drawerOpen}
        selectedQuote={selectedQuote}
        annotations={visibleAnnotations}
        canAnnotate={Boolean(user)}
        currentUserId={user?.id}
        onClose={() => setDrawerOpen(false)}
        onCreate={createAnnotation}
        onLike={handleLike}
        onDelete={handleDeleteAnnotation}
      />
    </>
  );
}
