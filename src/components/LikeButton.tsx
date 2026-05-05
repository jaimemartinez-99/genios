import { useRef, useState } from "react";

type LikeButtonProps = {
  likesCount: number;
  onToggle: () => Promise<void>;
};

export function LikeButton({ likesCount, onToggle }: LikeButtonProps) {
  const [optimisticLiked, setOptimisticLiked] = useState(false);
  const [optimisticCount, setOptimisticCount] = useState(likesCount);
  const [shake, setShake] = useState(false);
  const debounceRef = useRef<number | null>(null);

  const handleLike = async () => {
    if (debounceRef.current) return;
    debounceRef.current = window.setTimeout(() => {
      debounceRef.current = null;
    }, 350);

    const wasLiked = optimisticLiked;
    setOptimisticLiked(!wasLiked);
    setOptimisticCount((count) => count + (wasLiked ? -1 : 1));

    try {
      await onToggle();
    } catch {
      setOptimisticLiked(wasLiked);
      setOptimisticCount((count) => count + (wasLiked ? 1 : -1));
      setShake(true);
      window.setTimeout(() => setShake(false), 420);
      window.alert("No se pudo guardar el me gusta");
    }
  };

  return (
    <button
      type="button"
      onClick={handleLike}
      className={`inline-flex items-center gap-1 rounded px-2 py-1 text-sm transition hover:bg-ink ${
        shake ? "translate-x-[2px]" : ""
      }`}
    >
      <span aria-hidden="true">{optimisticLiked ? "❤️" : "🤍"}</span>
      <span>{optimisticCount}</span>
    </button>
  );
}
