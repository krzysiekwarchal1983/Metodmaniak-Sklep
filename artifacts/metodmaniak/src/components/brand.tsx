import { Link } from "wouter";
import { asset } from "@/lib/shop";

export function BrandMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <img src={asset("/brand/symbol.png")} alt="" className={`${className} object-contain`} aria-hidden="true" />
  );
}

export function BrandLink() {
  return (
    <Link href="/" className="group inline-flex max-w-full shrink-0 items-center" aria-label="Metodmaniak.pl — strona główna" data-testid="link-home-brand">
      <img
        src={asset("/brand/symbol.png")}
        alt="Metodmaniak"
        width={334}
        height={334}
        className="h-12 w-12 object-contain transition-opacity duration-300 group-hover:opacity-80"
      />
    </Link>
  );
}

export function BrandWordmarkLink() {
  return (
    <Link href="/" aria-label="Metodmaniak.pl — strona główna" data-testid="link-topbar-brand"
      className="inline-flex w-[132px] shrink-0 items-center rounded-sm transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime sm:w-[180px]">
      <img src={asset("/brand/wordmark-topbar.png")} alt="Metodmaniak.pl" width={2000} height={334} className="h-auto w-full object-contain" />
    </Link>
  );
}
