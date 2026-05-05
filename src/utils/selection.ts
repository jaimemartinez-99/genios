type SelectionOffsets = {
  start: number;
  end: number;
  text: string;
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

export function getTextOffsetsFromSelection(
  container: HTMLElement,
  selection: Selection,
  bodyText?: string
): SelectionOffsets | null {
  if (selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);

  if (range.collapsed) return null;
  if (!container.contains(range.commonAncestorContainer)) return null;

  const preRange = document.createRange();
  preRange.selectNodeContents(container);
  preRange.setEnd(range.startContainer, range.startOffset);
  let start = preRange.toString().length;
  const selectedText = range.toString();
  let end = start + selectedText.length;

  // Guard against rare off-by-one mismatches between DOM selection and persisted poem text.
  if (bodyText && selectedText) {
    const directMatch = bodyText.slice(start, end) === selectedText;
    if (!directMatch) {
      const nearIndex = bodyText.indexOf(selectedText, Math.max(0, start - 2));
      if (nearIndex !== -1 && Math.abs(nearIndex - start) <= 2) {
        start = nearIndex;
        end = nearIndex + selectedText.length;
      }
    }
  }

  const rect = range.getBoundingClientRect();
  return {
    start,
    end,
    text: selectedText,
    rect: {
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
      width: rect.width,
      height: rect.height
    }
  };
}
