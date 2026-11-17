import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { SignUp } from "@clerk/react";
import { BASE } from "@/lib/shop";
import { LEGAL_VERSION } from "@/lib/legal";

const KEY = "metodmaniak-registration-declaration";
const schema = z.object({
  terms: z.boolean().refine(Boolean, "Zaakceptuj regulamin konta."),
  privacy: z.boolean().refine(Boolean, "Potwierdź zapoznanie się z informacją o danych."),
});
type Declaration = { termsAccepted: true; privacyRead: true; documentVersion: string; declaredAt: string };
function readCallbackDeclaration(): Declaration | null {
  if (!window.location.pathname.includes("/sign-up/")) return null;
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY) ?? "null") as Declaration | null;
    const age = Date.now() - Date.parse(value?.declaredAt ?? "");
    return value?.documentVersion === LEGAL_VERSION && value.termsAccepted === true && value.privacyRead === true && age >= 0 && age < 3_600_000 ? value : null;
  } catch { return null; }
}

export function RegistrationAgreements() {
  const [declaration, setDeclaration] = useState<Declaration | null>(readCallbackDeclaration);
  const [storageBlocked, setStorageBlocked] = useState(false);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { terms: false, privacy: false } });
  if (declaration) return (
    <div className="w-full max-w-[440px]">
      <SignUp routing="path" path={`${BASE}/sign-up`} signInUrl={`${BASE}/sign-in`} fallbackRedirectUrl={`${BASE}/aplikacja`}
        unsafeMetadata={{ legalDeclaration: declaration }} />
      <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
        Regulamin zaakceptowany; informacja o danych przeczytana. Wersja {declaration.documentVersion}. Zapis jest deklaracją użytkownika, nie uprawnieniem do panelu.
      </p>
      {storageBlocked && <p role="status" className="mt-3 text-xs text-lime">Pamięć sesji jest zablokowana. Po powrocie z logowania społecznościowego może być potrzebne ponowne potwierdzenie.</p>}
    </div>
  );
  return (
    <form className="w-full max-w-[440px] rounded-3xl border border-white/10 bg-[#151812] p-6"
      onSubmit={form.handleSubmit(() => {
        const value: Declaration = { termsAccepted: true, privacyRead: true, documentVersion: LEGAL_VERSION, declaredAt: new Date().toISOString() };
        try { sessionStorage.setItem(KEY, JSON.stringify(value)); } catch { setStorageBlocked(true); }
        setDeclaration(value);
      })} data-testid="registration-agreements">
      <h2 className="text-xl font-bold">Zanim założysz konto</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Zapoznaj się z zasadami konta i informacją o danych. Serwis jest w przygotowaniu, a dokumenty są wersją roboczą do weryfikacji przed publicznym uruchomieniem.</p>
      <p className="mt-3 text-sm leading-relaxed text-lime">Metod Trener i narzędzia strony są dostępne bez logowania.</p>
      <label className="mt-6 flex items-start gap-3 text-sm leading-relaxed">
        <input type="checkbox" {...form.register("terms")} className="mt-1 h-4 w-4 shrink-0 accent-lime" data-testid="checkbox-registration-terms" />
        <span>Akceptuję <a href={`${BASE}/regulamin`} target="_blank" rel="noopener noreferrer" className="text-lime underline underline-offset-4">regulamin konta i serwisu</a> w wersji {LEGAL_VERSION}.</span>
      </label>
      <label className="mt-4 flex items-start gap-3 text-sm leading-relaxed">
        <input type="checkbox" {...form.register("privacy")} className="mt-1 h-4 w-4 shrink-0 accent-lime" data-testid="checkbox-registration-privacy" />
        <span>Zapoznałem(-am) się z <a href={`${BASE}/polityka-prywatnosci`} target="_blank" rel="noopener noreferrer" className="text-lime underline underline-offset-4">polityką prywatności</a>, w tym informacją o administratorze i moich prawach.</span>
      </label>
      <p className="mt-5 text-xs leading-relaxed text-muted-foreground">To nie jest zgoda marketingowa. Dane niezbędne do obsługi konta przetwarzamy w związku z usługą — nie prosimy o przymusową zgodę RODO.</p>
      <button type="submit" disabled={!form.watch("terms") || !form.watch("privacy")} className="btn-lime mt-6 w-full px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-40" data-testid="button-registration-continue">Kontynuuj rejestrację</button>
    </form>
  );
}
