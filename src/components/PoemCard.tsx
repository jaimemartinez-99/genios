import { Link } from "react-router-dom";
import type { Poem } from "@/types/domain";

type PoemCardProps = {
  poem: Poem;
  annotationsCount: number;
};

export function PoemCard({ poem, annotationsCount }: PoemCardProps) {
  return (
    <Link
      to={`/poema/${poem.id}`}
      className="group rounded-xl border border-border bg-panel p-5 transition duration-300 hover:-translate-y-1 hover:border-accent/60 hover:shadow-glow"
    >
      <p className="mb-3 inline-block rounded-full border border-border px-2 py-1 text-xs uppercase tracking-wide text-parchment/70">
        {poem.era}
      </p>
      <h3 className="mb-2 font-display text-xl text-parchment transition group-hover:text-accent">
        {poem.title}
      </h3>
      <p className="mb-5 text-sm text-parchment/70">{poem.author}</p>
      <p className="text-xs uppercase tracking-wider text-parchment/55">
        {annotationsCount} anotaciones
      </p>
    </Link>
  );
}
