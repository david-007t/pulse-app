"use client";

import { useState, useRef, useCallback } from "react";

interface Prediction {
  placeId: string;
  mainText: string;
  secondaryText: string;
}

interface SearchBarProps {
  onSelect: (lat: number, lng: number, label: string) => void;
  userLocation: { lat: number; lng: number };
}

export default function SearchBar({ onSelect, userLocation }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchPredictions = useCallback(
    async (input: string) => {
      if (input.trim().length < 2) {
        setPredictions([]);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      try {
        const res = await fetch("/api/places/autocomplete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input,
            lat: userLocation.lat,
            lng: userLocation.lng,
          }),
        });
        const data = await res.json();

        const preds: Prediction[] = (data.suggestions ?? [])
          .map((s: Record<string, unknown>) => {
            const pp = s.placePrediction as Record<string, unknown> | undefined;
            const sf = pp?.structuredFormat as Record<string, Record<string, string>> | undefined;
            return {
              placeId: (pp?.placeId as string) ?? "",
              mainText: sf?.mainText?.text ?? "",
              secondaryText: sf?.secondaryText?.text ?? "",
            };
          })
          .filter((p: Prediction) => p.placeId);

        setPredictions(preds);
        setIsOpen(preds.length > 0);
      } catch (err) {
        console.error("[SearchBar] autocomplete error:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [userLocation]
  );

  const handleInputChange = (value: string) => {
    setQuery(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPredictions(value), 300);
  };

  const handleSelect = async (pred: Prediction) => {
    setQuery(pred.mainText);
    setIsOpen(false);
    setPredictions([]);

    try {
      const res = await fetch(
        `/api/places/details?placeId=${encodeURIComponent(pred.placeId)}`
      );
      const data = await res.json();
      if (data.location?.lat != null && data.location?.lng != null) {
        onSelect(data.location.lat, data.location.lng, pred.mainText);
      }
    } catch (err) {
      console.error("[SearchBar] place details error:", err);
    }
  };

  const handleClear = () => {
    setQuery("");
    setPredictions([]);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Input */}
      <div className="bg-surface/95 backdrop-blur-lg border border-border rounded-2xl px-4 py-3 flex items-center gap-3 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
        {isLoading ? (
          <div className="w-[18px] h-[18px] shrink-0 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg
            className="shrink-0"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#9CA3AF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        )}

        <input
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => predictions.length > 0 && setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          placeholder="Search bars, clubs, neighborhoods…"
          className="flex-1 bg-transparent text-text text-sm placeholder:text-subtext outline-none min-w-0"
        />

        {query && (
          <button
            onClick={handleClear}
            className="text-subtext shrink-0 transition-opacity active:opacity-60"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && predictions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-30">
          {predictions.map((pred, i) => (
            <button
              key={pred.placeId}
              onMouseDown={() => handleSelect(pred)}
              className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-background/60 active:bg-background transition-colors text-left ${
                i < predictions.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <svg
                className="mt-0.5 shrink-0"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#7C3AED"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <div className="min-w-0">
                <p className="text-text text-sm font-medium truncate">
                  {pred.mainText}
                </p>
                <p className="text-subtext text-xs mt-0.5 truncate">
                  {pred.secondaryText}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
