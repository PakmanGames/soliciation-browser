"use client";

import { SearchIcon, XIcon } from "lucide-react";
import { useEffect, useRef } from "react";

import { MobileFilters } from "@/components/search/mobile-filters";
import { useDebouncedInput } from "@/components/search/use-debounced-input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { useQueryState } from "@/lib/api";

/**
 * One box for every identifier a vendor might paste or type. Text is local while typing and
 * reaches the URL (and the API) after a 250ms pause; `/` focuses it from anywhere.
 */
export function SearchBox() {
  const [query, setQuery] = useQueryState();
  const inputRef = useRef<HTMLInputElement>(null);
  const { text, setText, commitNow } = useDebouncedInput(query.q ?? "", (q) =>
    setQuery({ q: q || undefined }),
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey)
        return;
      if (isEditable(event.target)) return;
      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="flex items-center gap-2">
      <InputGroup className="h-9 flex-1">
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          ref={inputRef}
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          spellCheck={false}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") commitNow(text);
            if (event.key === "Escape") {
              if (text) commitNow("");
              else inputRef.current?.blur();
            }
          }}
          placeholder="Search solicitation #, NSN, part number, or item name"
          aria-label="Search solicitations"
          // The native clear button would duplicate ours.
          className="text-ellipsis [&::-webkit-search-cancel-button]:appearance-none"
        />
        <InputGroupAddon align="inline-end">
          {text ? (
            <InputGroupButton
              size="icon-xs"
              aria-label="Clear search"
              onClick={() => {
                commitNow("");
                inputRef.current?.focus();
              }}
            >
              <XIcon />
            </InputGroupButton>
          ) : (
            <kbd
              aria-hidden
              className="hidden h-5 min-w-5 items-center justify-center border bg-muted px-1 font-mono text-xs text-muted-foreground md:inline-flex"
            >
              /
            </kbd>
          )}
        </InputGroupAddon>
      </InputGroup>
      <MobileFilters />
    </div>
  );
}

function isEditable(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement)
  );
}
