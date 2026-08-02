"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import type {
  CalculationMethod,
  SearchResponse,
  StockSearchResult,
} from "@/lib/types";

interface StockSearchProps {
  autoFocus?: boolean;
  compact?: boolean;
  method?: CalculationMethod;
}

export function StockSearch({
  autoFocus = false,
  method = "graham",
}: StockSearchProps) {
  const router = useRouter();
  const listboxId = useId();
  const wrapperRef = useRef<HTMLFormElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [hasSearched, setHasSearched] = useState(false);
  const [message, setMessage] = useState<string | undefined>();
  const [isDemo, setIsDemo] = useState(false);

  const selectableIndexes = useMemo(
    () =>
      results
        .map((result, index) => (result.supported ? index : -1))
        .filter((index) => index >= 0),
    [results],
  );

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      setIsOpen(true);

      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(trimmedQuery)}&method=${method}`,
          { signal: controller.signal },
        );

        if (!response.ok) throw new Error("search-failed");

        const data = (await response.json()) as SearchResponse;
        setResults(data.results);
        setMessage(data.message);
        setIsDemo(data.demo);
        setActiveIndex(data.results.findIndex((result) => result.supported));
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setResults([]);
        setMessage("A busca não pôde ser concluída. Tente novamente.");
      } finally {
        if (!controller.signal.aborted) {
          setHasSearched(true);
          setIsLoading(false);
        }
      }
    }, 320);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [method, query]);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setIsOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  function selectStock(stock: StockSearchResult) {
    if (!stock.supported) return;
    setIsOpen(false);
    router.push(method === "bazin" ? `/bazin/${stock.ticker}` : `/acao/${stock.ticker}`);
  }

  function handleQueryChange(value: string) {
    setQuery(value);

    if (value.trim().length < 2) {
      setResults([]);
      setHasSearched(false);
      setIsLoading(false);
      setIsOpen(false);
      setMessage(undefined);
      setActiveIndex(-1);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selected = results[activeIndex] ?? results.find((result) => result.supported);
    if (selected?.supported) selectStock(selected);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setIsOpen(false);
      return;
    }

    if (!isOpen || selectableIndexes.length === 0) return;

    const currentPosition = selectableIndexes.indexOf(activeIndex);

    if (event.key === "ArrowDown") {
      event.preventDefault();
      const nextPosition = (currentPosition + 1) % selectableIndexes.length;
      setActiveIndex(selectableIndexes[nextPosition]);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      const nextPosition =
        (currentPosition - 1 + selectableIndexes.length) % selectableIndexes.length;
      setActiveIndex(selectableIndexes[nextPosition]);
    }

    if (event.key === "Enter" && results[activeIndex]?.supported) {
      event.preventDefault();
      selectStock(results[activeIndex]);
    }
  }

  return (
    <form
      id="pesquisar"
      className="stock-search"
      onSubmit={handleSubmit}
      ref={wrapperRef}
      role="search"
    >
      <label className="sr-only" htmlFor={`${listboxId}-input`}>
        Pesquise pelo ticker ou nome da empresa
      </label>
      <div className="search-control">
        <span className="search-icon" aria-hidden="true" />
        <input
          id={`${listboxId}-input`}
          className="search-input"
          value={query}
          onChange={(event) => handleQueryChange(event.target.value)}
          onFocus={() => query.trim().length >= 2 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Digite BBAS3 ou Banco do Brasil"
          autoComplete="off"
          autoCapitalize="characters"
          autoFocus={autoFocus}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={
            activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined
          }
        />
        <button
          className="search-button"
          type="submit"
          disabled={isLoading || selectableIndexes.length === 0}
        >
          {isLoading ? <span className="spinner" aria-label="Buscando" /> : "Consultar"}
        </button>
      </div>

      {isOpen && query.trim().length >= 2 ? (
        <ul className="search-results" id={listboxId} role="listbox">
          {message ? <li className="search-state">{message}</li> : null}
          {!message && hasSearched && results.length === 0 ? (
            <li className="search-state">Nenhuma ação encontrada para essa busca.</li>
          ) : null}
          {results.map((result, index) => (
            <li key={result.ticker} role="presentation">
              <button
                id={`${listboxId}-${index}`}
                className="search-option"
                type="button"
                role="option"
                aria-selected={activeIndex === index}
                data-active={activeIndex === index}
                disabled={!result.supported}
                onMouseEnter={() => result.supported && setActiveIndex(index)}
                onClick={() => selectStock(result)}
              >
                <span className="option-company">
                  <span className="option-ticker">{result.ticker}</span>
                  <span className="option-name">{result.name}</span>
                </span>
                <span
                  className="option-class"
                  data-mode={result.calculationMode}
                  title={result.assetClass}
                >
                  {result.supported
                    ? result.calculationMode === "automatic"
                      ? "Cálculo automático"
                      : "Sem dados automáticos"
                    : `${result.assetClass} · indisponível`}
                </span>
              </button>
            </li>
          ))}
          {isDemo && results.length > 0 ? (
            <li className="search-mode">Dados de demonstração.</li>
          ) : null}
        </ul>
      ) : null}
    </form>
  );
}
