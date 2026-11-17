import { useId, useState, type ReactElement } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ShoppingBag } from "lucide-react";
import type { Product } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCart } from "@/lib/cart";

export function ProductVariantPicker({ product, children }: { product: Product; children: ReactElement }) {
  const [open, setOpen] = useState(false);
  const { add } = useCart();
  const id = useId();
  const schema = z.object({ variant: z.string().refine((value) => product.variants.includes(value), "Wybierz wariant produktu.") });
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { variant: "" } });
  const selected = form.watch("variant");
  const unavailable = product.stock <= 0;
  return (
    <Dialog open={open} onOpenChange={(value) => { if (value) form.reset({ variant: "" }); setOpen(value); }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-[calc(100%_-_2rem)] rounded-2xl border-lime/25 bg-[#11140f]" data-testid="dialog-product-variant">
        <DialogHeader>
          <DialogTitle>Wybierz {product.category === "przypony" ? "rozmiar haka" : "wariant"}</DialogTitle>
          <DialogDescription>{product.name} — nic nie dodamy do koszyka bez Twojego wyboru.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(({ variant }) => { if (unavailable) return; setOpen(false); add(product, variant); })}>
          <fieldset className="grid gap-2">
            <legend className="sr-only">Dostępne warianty</legend>
            {product.variants.map((variant, index) => (
              <label key={variant} htmlFor={`${id}-${index}`} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors ${selected === variant ? "border-lime/60 bg-lime/10 text-lime" : "border-white/15 hover:border-lime/40"}`}>
                <input id={`${id}-${index}`} type="radio" value={variant} {...form.register("variant")} className="h-4 w-4 accent-lime" data-testid={`radio-product-variant-${index}`} />
                {variant}
              </label>
            ))}
          </fieldset>
          {form.formState.errors.variant && <p role="alert" className="mt-2 text-sm text-lime">{form.formState.errors.variant.message}</p>}
          {unavailable && <p role="alert" className="mt-3 text-sm text-lime">Produkt jest obecnie niedostępny.</p>}
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="submit" disabled={unavailable || !product.variants.includes(selected)} className="btn-lime min-h-11 px-5 py-3 text-sm" data-testid="button-confirm-product-variant"><ShoppingBag aria-hidden="true" className="h-4 w-4" /> Dodaj do koszyka</button>
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost min-h-11 px-5 py-3 text-sm" data-testid="button-cancel-product-variant">Anuluj</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
