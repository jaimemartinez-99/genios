import { useMemo, useState } from "react";
import clsx from "clsx";
import type { Annotation } from "@/types/domain";
import { LikeButton } from "@/components/LikeButton";

type AnnotationDrawerProps = {
  open: boolean;
  selectedQuote: string;
  annotations: Annotation[];
  canAnnotate: boolean;
  currentUserId?: string;
  onClose: () => void;
  onCreate: (comment: string) => Promise<void>;
  onLike: (annotationId: string) => Promise<void>;
  onDelete: (annotationId: string) => Promise<void>;
};

export function AnnotationDrawer({
  open,
  selectedQuote,
  annotations,
  canAnnotate,
  currentUserId,
  onClose,
  onCreate,
  onLike,
  onDelete
}: AnnotationDrawerProps) {
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const hasContent = useMemo(() => selectedQuote.trim().length > 0, [selectedQuote]);

  const handleSave = async () => {
    if (!comment.trim()) return;
    setSaving(true);
    try {
      await onCreate(comment.trim());
      setComment("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <aside
      className={clsx(
        "fixed right-0 top-0 z-30 h-full w-full max-w-md border-l border-border bg-panel p-5 shadow-2xl transition-transform lg:w-[420px]",
        open ? "animate-slide-in-right translate-x-0" : "translate-x-full"
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl text-parchment">Anotaciones</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-border px-2 py-1 text-sm text-parchment/70 hover:text-parchment"
        >
          Cerrar
        </button>
      </div>

      <blockquote className="mb-5 border-l-2 border-accent/70 pl-3 font-poem text-2xl italic text-parchment/90">
        {hasContent ? `“${selectedQuote}”` : "Selecciona un verso para abrir sus anotaciones"}
      </blockquote>

      {canAnnotate ? (
        <div className="mb-5 rounded-lg border border-border p-3">
          <label className="mb-2 block text-xs uppercase tracking-wider text-parchment/50">
            Tu lectura del verso
          </label>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={4}
            placeholder="¿Qué emoción, símbolo o contexto histórico ves aquí?"
            className="w-full resize-none rounded-md border border-border bg-ink p-2 text-sm text-parchment outline-none placeholder:text-parchment/45 focus:border-accent"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !comment.trim()}
            className="mt-3 rounded-md bg-accent px-3 py-2 text-sm font-medium text-ink disabled:cursor-not-allowed disabled:opacity-45"
          >
            {saving ? "Guardando..." : "Guardar anotación"}
          </button>
        </div>
      ) : (
        <p className="mb-5 rounded-md border border-border bg-ink/40 p-3 text-sm text-parchment/80">
          Inicia sesión para anotar.
        </p>
      )}

      <div className="space-y-3">
        {annotations.length === 0 && (
          <p className="rounded-md border border-dashed border-border p-4 text-sm text-parchment/65">
            Sé el primero en anotar este verso.
          </p>
        )}
        {annotations.map((annotation) => (
          <article key={annotation.id} className="rounded-md border border-border p-3">
            <p className="mb-3 text-sm leading-relaxed text-parchment/90">{annotation.comment_text}</p>
            <div className="flex items-center justify-between gap-2 text-xs text-parchment/60">
              <span>{annotation.profiles?.username ?? "Lector anonimo"}</span>
              <div className="flex items-center gap-2">
                <LikeButton likesCount={annotation.likes_count ?? 0} onToggle={() => onLike(annotation.id)} />
                {currentUserId === annotation.user_id && (
                  <button
                    type="button"
                    onClick={() => void onDelete(annotation.id)}
                    className="rounded border border-border px-2 py-1 text-[11px] text-parchment/75 hover:border-rose-300/60 hover:text-rose-200"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </aside>
  );
}
