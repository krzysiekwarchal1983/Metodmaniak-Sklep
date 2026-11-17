import { useId, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Search } from "lucide-react";

const schema = z.object({ query: z.string().trim().min(1, "Wpisz nazwę lub cechę produktu.").max(100, "Maksymalnie 100 znaków.") });
export function HeaderSearch({ onSearched }: { onSearched?: () => void }) {
  const [, navigate] = useLocation();
  const search = useSearch();
  const id = useId();
  const root = useRef<HTMLFormElement>(null);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { query: new URLSearchParams(search).get("q") ?? "" } });
  return (
    <form ref={root} role="search" aria-label="Wyszukiwanie produktów" className="relative w-full max-w-xs xl:w-44 2xl:w-48"
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) form.clearErrors(); }}
      onKeyDown={(event) => { if (event.key === "Escape") { form.clearErrors(); root.current?.querySelector("input")?.blur(); onSearched?.(); } }}
      onSubmit={form.handleSubmit(({ query }) => {
        root.current?.querySelector("input")?.blur();
        form.clearErrors();
        navigate(`/sklep?q=${encodeURIComponent(query)}`);
        onSearched?.();
      })}>
      <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-lime" />
      <input {...form.register("query")} aria-label="Szukaj produktów" aria-invalid={!!form.formState.errors.query} aria-describedby={form.formState.errors.query ? id : undefined}
        placeholder="Szukaj produktów…" type="search" maxLength={100} data-testid="input-header-search"
        className="h-10 w-full rounded-full border border-white/15 bg-black/20 pl-8 pr-9 text-xs text-white outline-none transition-colors placeholder:text-white/50 focus:border-lime/60 focus:ring-1 focus:ring-lime/40" />
      <button type="submit" aria-label="Wyszukaj produkty" className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-full text-white/70 hover:text-lime focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime" data-testid="button-header-search"><ArrowRight aria-hidden="true" className="h-3.5 w-3.5" /></button>
      {form.formState.errors.query && <p id={id} role="alert" className="absolute top-full z-[60] mt-2 rounded-lg border border-lime/20 bg-[#11140f] p-2 text-xs text-white">{form.formState.errors.query.message}</p>}
    </form>
  );
}
