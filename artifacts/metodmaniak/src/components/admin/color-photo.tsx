import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetProductQueryKey, getListProductsQueryKey, useListProducts, useReplaceWaftersColorPhoto } from "@workspace/api-client-react";
import { asset } from "@/lib/shop";
import { ResponsiveImage } from "@/components/responsive-image";
import { useToast } from "@/hooks/use-toast";

export function ColorPhotoForm({ colors, renderUpload, onClose }: {
  colors: string[];
  renderUpload: (onDone: (url: string) => void, onBusyChange: (busy: boolean) => void) => ReactNode;
  onClose: () => void;
}) {
  const [color, setColor] = useState("");
  const [image, setImage] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [loadedImage, setLoadedImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const products = useListProducts({ category: "waftersy", color }, { query: { enabled: !!color, staleTime: 0 } });
  const mutation = useReplaceWaftersColorPhoto();
  const qc = useQueryClient();
  const { toast } = useToast();
  const rows = [...(products.data ?? [])].sort((a, b) => parseInt(a.subcategory) - parseInt(b.subcategory));
  const complete = rows.length === 3 && ["6mm", "8mm", "10mm"].every((size) => rows.filter((p) => p.subcategory === size).length === 1);
  // Confirmation belongs to a specific server snapshot, never to a later refetch.
  const snapshot = JSON.stringify(rows.map(({ id, image, images }) => ({ id, image, images })));
  const [confirmedSnapshot, setConfirmedSnapshot] = useState("");
  const save = async () => {
    if (uploading || !complete || !confirmed || confirmedSnapshot !== snapshot || loadedImage !== image || !image) return;
    setError("");
    try {
      const updated = await mutation.mutateAsync({ data: {
        color, image, products: rows.map(({ id, image, images }) => ({ id, image, images })),
      } });
      for (const p of updated) qc.setQueryData(getGetProductQueryKey(p.id), p);
      await Promise.all([
        qc.invalidateQueries({ queryKey: getListProductsQueryKey() }),
        ...updated.map((p) => qc.invalidateQueries({ queryKey: getGetProductQueryKey(p.id) })),
      ]);
      toast({ title: "Zmieniono zdjęcie w trzech rozmiarach" });
      onClose();
    } catch (err) {
      const message = (err as { data?: { error?: string } }).data?.error;
      setError(message ?? "Nie udało się zapisać. Sprawdź połączenie i spróbuj ponownie.");
      setConfirmed(false);
      await products.refetch();
    }
  };
  return <div className="space-y-5" data-testid="color-photo-form">
    <p className="text-sm text-muted-foreground">Jedno rzeczywiste zdjęcie zastąpi zdjęcie główne i wizualizacje AI wybranego koloru w rozmiarach 6, 8 i 10 mm. Pozostałe zdjęcia i opisy, ceny oraz stany pozostaną bez zmian.</p>
    <label className="block"><span className="mono-label mb-2 block">Kolor waftersów</span>
      <select className="field" value={color} disabled={mutation.isPending} data-testid="select-photo-color" onChange={(e) => { setColor(e.target.value); setConfirmed(false); setError(""); }}>
        <option value="">Wybierz kolor</option>
        {colors.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
    </label>
    <fieldset disabled={mutation.isPending}>{renderUpload((url) => { setImage(url); setLoadedImage(""); setConfirmed(false); setError(""); }, (busy) => { setUploading(busy); if (busy) setConfirmed(false); })}</fieldset>
    {image && <ResponsiveImage key={image} src={asset(image)} alt={`Nowe zdjęcie — ${color || "waftersy"}`} className="h-56 w-full rounded-xl object-contain" onLoad={() => setLoadedImage(image)} onError={() => { setLoadedImage(""); setError("Nie można wyświetlić zdjęcia. Prześlij poprawny plik."); }} />}
    {color && <div>
      <h3 className="font-bold">Produkty do zmiany</h3>
      {products.isFetching ? <p>Wczytywanie listy…</p> : products.isError ? <button className="btn-ghost p-3" onClick={() => products.refetch()}>Ponów wczytanie produktów</button> : <>
        <ul className="my-3 space-y-2">{rows.map((p) => <li key={p.id} className="text-sm">{p.name} · {p.subcategory} · ID {p.id}</li>)}</ul>
        {!complete && <p role="alert" className="text-sm text-destructive">Wymagany jest dokładnie jeden produkt w każdym rozmiarze: 6, 8 i 10 mm. Nic nie zostanie zapisane.</p>}
      </>}
    </div>}
    <label className="flex gap-3 text-sm"><input type="checkbox" checked={confirmed && confirmedSnapshot === snapshot} disabled={!complete || products.isFetching || mutation.isPending} onChange={(e) => { setConfirmed(e.target.checked); setConfirmedSnapshot(snapshot); }} data-testid="checkbox-confirm-photo" />Potwierdzam zmianę zdjęcia we wszystkich trzech produktach powyżej.</label>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <button className="btn-lime px-6 py-3 text-sm" onClick={save} disabled={uploading || !image || loadedImage !== image || !complete || !confirmed || confirmedSnapshot !== snapshot || products.isFetching || products.isError || mutation.isPending} data-testid="button-save-color-photo">{mutation.isPending ? "Zapisywanie…" : "Zapisz zdjęcie dla 3 rozmiarów"}</button>
  </div>;
}
