import { Fragment } from "react";
import clsx from "clsx";
import type { Annotation } from "@/types/domain";
import { buildAnnotationSegments } from "@/utils/annotations";

type PoemRendererProps = {
  bodyText: string;
  annotations: Annotation[];
  onMarkClick: (annotationIds: string[]) => void;
};

export function PoemRenderer({ bodyText, annotations, onMarkClick }: PoemRendererProps) {
  const segments = buildAnnotationSegments(bodyText, annotations);
  const stanzas = splitIntoStanzas(segments);

  return (
    <div className="relative rounded-xl border border-border bg-panel p-6 md:p-8">
      {stanzas.map((stanzaSegments, stanzaIndex) => {
        return (
          <div key={stanzaIndex} className="mb-10 flex gap-4">
            <span className="w-8 select-none pt-1 text-right text-xs text-parchment/35">
              {stanzaIndex + 1}
            </span>
            <div className="whitespace-pre-wrap font-poem text-[1.9rem] leading-[2] text-parchment">
              {stanzaSegments.map((segment) => {
                const depth = Math.min(segment.annotationIds.length, 4);
                const dataIds = segment.annotationIds.join(",");
                const key = `${segment.start}:${segment.end}`;

                if (segment.annotationIds.length === 0) {
                  return <Fragment key={key}>{segment.text}</Fragment>;
                }

                return (
                  <ColoredMark
                    key={key}
                    dataIds={dataIds}
                    annotationIds={segment.annotationIds}
                    depth={depth}
                    onClick={() => onMarkClick(segment.annotationIds)}
                  >
                    {segment.text}
                  </ColoredMark>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

type ColoredMarkProps = {
  children: string;
  dataIds: string;
  annotationIds: string[];
  depth: number;
  onClick: () => void;
};

function ColoredMark({ children, dataIds, annotationIds, depth, onClick }: ColoredMarkProps) {
  const tone = getAnnotationTone(annotationIds);
  const underline = `rgba(${tone}, 0.95)`;
  const fillAlpha = Math.min(0.12 + depth * 0.05, 0.34);
  const fill = `rgba(${tone}, ${fillAlpha})`;
  const hoverFill = `rgba(${tone}, ${Math.min(fillAlpha + 0.08, 0.42)})`;

  return (
    <mark
      data-annotation-ids={dataIds}
      className={clsx(
        "cursor-pointer rounded-[2px] bg-transparent text-inherit underline decoration-[1.5px] underline-offset-[0.2em] transition"
      )}
      style={{
        textDecorationColor: underline,
        boxShadow: `inset 0 -0.2em 0 ${fill}`
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.boxShadow = `inset 0 -0.24em 0 ${hoverFill}`;
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.boxShadow = `inset 0 -0.2em 0 ${fill}`;
      }}
      onClick={onClick}
    >
      {children}
    </mark>
  );
}

const ANNOTATION_TONES = [
  "240,181,112", // amber
  "199,140,122", // dusty rose
  "164,156,208", // lavender smoke
  "133,177,166", // desaturated teal
  "216,164,132", // apricot
  "174,145,124" // sepia
];

function getAnnotationTone(annotationIds: string[]) {
  const source = annotationIds.join("|");
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash << 5) - hash + source.charCodeAt(i);
    hash |= 0;
  }
  return ANNOTATION_TONES[Math.abs(hash) % ANNOTATION_TONES.length];
}

function splitIntoStanzas(segments: ReturnType<typeof buildAnnotationSegments>) {
  const stanzas: ReturnType<typeof buildAnnotationSegments>[] = [[]];

  for (const segment of segments) {
    let text = segment.text;
    let cursor = segment.start;

    while (text.length > 0) {
      const breakIndex = text.indexOf("\n\n");

      if (breakIndex === -1) {
        stanzas[stanzas.length - 1].push({
          ...segment,
          text,
          start: cursor,
          end: cursor + text.length
        });
        break;
      }

      const beforeBreak = text.slice(0, breakIndex);
      if (beforeBreak) {
        stanzas[stanzas.length - 1].push({
          ...segment,
          text: beforeBreak,
          start: cursor,
          end: cursor + beforeBreak.length
        });
      }

      cursor += breakIndex + 2;
      text = text.slice(breakIndex + 2);
      stanzas.push([]);
    }
  }

  return stanzas.filter((stanza) => stanza.length > 0);
}
