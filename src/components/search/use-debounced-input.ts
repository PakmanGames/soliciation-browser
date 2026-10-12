"use client";

import { useEffect, useEffectEvent, useState } from "react";

const trim = (raw: string) => raw.trim();

/**
 * Local text for an input whose value lives in the URL, committed after a pause in typing.
 *
 * The URL stays the source of truth: when it changes from outside (back button, "Clear all"),
 * the text resyncs. Echoes of this input's own commits are recognized and ignored, so a commit
 * that lands while the user keeps typing never clobbers the newer characters.
 *
 * @param urlValue The value currently in the URL, in normalized form.
 * @param commit Writes a normalized value to the URL.
 * @param normalize Maps raw input text to the form stored in the URL. Must be a stable
 *   (module-level) function, because the debounce effect depends on it.
 */
export function useDebouncedInput(
  urlValue: string,
  commit: (value: string) => void,
  normalize: (raw: string) => string = trim,
  delay = 250,
) {
  const [text, setText] = useState(urlValue);
  // The last value this input wrote to the URL, or adopted from it.
  const [committed, setCommitted] = useState(urlValue);
  const [seenUrlValue, setSeenUrlValue] = useState(urlValue);

  // Adjusting state during render (not in an effect) avoids painting one frame of stale text.
  if (urlValue !== seenUrlValue) {
    setSeenUrlValue(urlValue);
    if (urlValue !== committed) {
      setText(urlValue);
      setCommitted(urlValue);
    }
  }

  const write = useEffectEvent((value: string) => {
    setCommitted(value);
    commit(value);
  });

  useEffect(() => {
    const value = normalize(text);
    if (value === committed) return;
    const timer = setTimeout(() => write(value), delay);
    return () => clearTimeout(timer);
  }, [text, committed, normalize, delay]);

  /** Sets the text and commits it right away, for Clear buttons and Enter. */
  const commitNow = (raw: string) => {
    const value = normalize(raw);
    setText(raw);
    if (value === committed) return;
    setCommitted(value);
    commit(value);
  };

  return { text, setText, commitNow };
}
