import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  items: any[];
  /** Render a single item. */
  renderItem: (item: any, index: number) => ReactNode;
  /** Tailwind basis class per slide (controls visible slides). */
  slideClass?: string;
  /** Activate auto-scroll only if items exceed this count. */
  autoScrollThreshold?: number;
  /** ms between auto advances. */
  intervalMs?: number;
  /** scroll direction; "rtl" advances right-to-left visually. */
  direction?: "ltr" | "rtl";
  ariaLabel?: string;
};

export function AutoCarousel({
  items,
  renderItem,
  slideClass = "basis-full sm:basis-1/2 lg:basis-1/3",
  autoScrollThreshold = 3,
  intervalMs = 3500,
  direction = "rtl",
  ariaLabel,
}: Props) {
  const shouldAutoplay = items.length > autoScrollThreshold;
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: shouldAutoplay,
    align: "start",
    dragFree: false,
    direction: direction === "rtl" ? "rtl" : "ltr",
  });
  const hoveringRef = useRef(false);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateButtons = useCallback(() => {
    if (!emblaApi) return;
    setCanPrev(emblaApi.canScrollPrev());
    setCanNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    updateButtons();
    emblaApi.on("select", updateButtons);
    emblaApi.on("reInit", updateButtons);
  }, [emblaApi, updateButtons]);

  useEffect(() => {
    if (!emblaApi || !shouldAutoplay) return;
    const id = window.setInterval(() => {
      if (hoveringRef.current) return;
      if (document.hidden) return;
      if (emblaApi.canScrollNext()) emblaApi.scrollNext();
      else emblaApi.scrollTo(0);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [emblaApi, shouldAutoplay, intervalMs]);

  if (!items.length) return null;

  return (
    <div
      className="relative"
      onMouseEnter={() => (hoveringRef.current = true)}
      onMouseLeave={() => (hoveringRef.current = false)}
      aria-label={ariaLabel}
    >
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-6">
          {items.map((item, i) => (
            <div key={item.id ?? i} className={`min-w-0 shrink-0 grow-0 ${slideClass}`}>
              {renderItem(item, i)}
            </div>
          ))}
        </div>
      </div>
      {items.length > 1 && (
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => emblaApi?.scrollPrev()}
            disabled={!canPrev}
            aria-label="Previous"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground/80 transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => emblaApi?.scrollNext()}
            disabled={!canNext}
            aria-label="Next"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground/80 transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
