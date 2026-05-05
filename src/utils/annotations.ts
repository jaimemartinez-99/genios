import type { Annotation } from "@/types/domain";

export type AnnotationSegment = {
  text: string;
  start: number;
  end: number;
  annotationIds: string[];
};

export function buildAnnotationSegments(
  bodyText: string,
  annotations: Annotation[]
): AnnotationSegment[] {
  const points = new Set<number>([0, bodyText.length]);
  for (const annotation of annotations) {
    const safeStart = clamp(annotation.start_index, 0, bodyText.length);
    const safeEnd = clamp(annotation.end_index, 0, bodyText.length);
    if (safeStart >= safeEnd) continue;
    points.add(safeStart);
    points.add(safeEnd);
  }

  const sorted = [...points].sort((a, b) => a - b);
  const segments: AnnotationSegment[] = [];

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const start = sorted[i];
    const end = sorted[i + 1];
    if (start === end) continue;
    const text = bodyText.slice(start, end);
    if (!text) continue;

    const annotationIds = annotations
      .filter((annotation) => annotation.start_index < end && annotation.end_index > start)
      .map((annotation) => annotation.id);

    segments.push({
      text,
      start,
      end,
      annotationIds
    });
  }

  return segments;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
