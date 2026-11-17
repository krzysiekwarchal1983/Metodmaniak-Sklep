import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Loader2, LogOut, ShieldAlert } from "lucide-react";
import { useCreatePreviewAdminSession, useDeletePreviewAdminSession, useGetAdminSession, getGetAdminSessionQueryKey } from "@workspace/api-client-react";
import { resetSessionCache } from "@/lib/session-cache";

export function PreviewAdminEntry() {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const session = useGetAdminSession();
  const enter = useCreatePreviewAdminSession();
  if (!session.data?.previewAccessAvailable) return null;
  return (
    <div className="w-full max-w-[440px] rounded-2xl border border-lime/30 bg-lime/[.04] p-5" data-testid="section-preview-entry">
      <div className="mb-2 flex items-center gap-2 font-bold"><ShieldAlert className="h-4 w-4 text-lime" /> Tylko wersja robocza</div>
      <p className="mb-4 text-sm leading-relaxed text-muted-foreground">Tymczasowe zarządzanie sklepem bez konta i hasła. Dostęp wygasa po godzinie. Każdy z dostępem do tego podglądu może z niego skorzystać. W opublikowanej stronie to wejście jest wyłączone.</p>
      <button type="button" disabled={enter.isPending} className="btn-lime w-full px-5 py-3 text-sm" data-testid="button-preview-admin"
        onClick={() => enter.mutate(undefined, { onSuccess: async (data) => {
          await resetSessionCache(queryClient, data);
          navigate("/admin");
        } })}>
        {enter.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Wejdź do panelu bez logowania
      </button>
      {enter.isError && <p className="mt-3 text-sm text-lime" role="alert" data-testid="status-preview-entry-error">Nie udało się otworzyć sesji roboczej. Odśwież stronę i spróbuj ponownie.</p>}
    </div>
  );
}

export function PreviewAdminBanner() {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const leave = useDeletePreviewAdminSession();
  return (
    <div className="mx-auto mt-8 flex max-w-[1336px] flex-wrap items-center justify-between gap-4 rounded-2xl border border-lime/40 bg-lime/[.05] p-5 max-[1400px]:mx-5" data-testid="banner-preview-admin">
      <div className="flex max-w-3xl items-start gap-3">
        <ShieldAlert className="mt-1 h-5 w-5 shrink-0 text-lime" />
        <div><p className="font-bold text-lime">Roboczy dostęp administratora bez logowania</p><p className="mt-1 text-sm text-muted-foreground">Zmiany produktów i filmów są rzeczywiste. Ta sesja działa przez godzinę i tylko w podglądzie. Nie jest powiązana z kontem e-mail.</p></div>
      </div>
      <button type="button" className="btn-ghost px-4 py-2.5 text-sm" disabled={leave.isPending} data-testid="button-leave-preview-admin"
        onClick={() => leave.mutate(undefined, { onSuccess: async () => {
          await resetSessionCache(queryClient);
          navigate("/sign-in");
        } })}>
        {leave.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} Zakończ dostęp roboczy
      </button>
      {leave.isError && <p className="w-full text-sm text-lime" role="alert">Nie udało się zamknąć sesji. Spróbuj ponownie.</p>}
    </div>
  );
}

export const adminSessionQueryOptions = {
  queryKey: getGetAdminSessionQueryKey(), staleTime: 0, refetchInterval: 60_000, refetchOnMount: "always" as const,
};
