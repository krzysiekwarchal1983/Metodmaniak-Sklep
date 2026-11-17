import { useState, type ReactNode } from "react";
import { SignIn } from "@clerk/react";
import { BrandLink } from "@/components/brand";
import { ResponsiveImage } from "@/components/responsive-image";
import { PreviewAdminEntry } from "@/components/preview-admin";
import { asset, BASE, usePageMeta } from "@/lib/shop";
import { RegistrationAgreements } from "@/components/registration-agreements";

function AuthShell({ children, title, text }: { children: ReactNode; title: ReactNode; text: string }) {
  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden lg:block">
        <ResponsiveImage src={asset("/images/hero-fishing.png")} sizes="50vw" loading="eager" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f110e] via-[#0f110e]/50 to-[#0f110e]/30" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <BrandLink />
          <div>
            <h1 className="font-display text-8xl font-black uppercase leading-[.82]">{title}</h1>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-white/70">{text}</p>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center gap-8 px-4 py-12">
        <div className="lg:hidden"><BrandLink /></div>
        {children}
      </div>
    </div>
  );
}

export function SignInPage() {
  usePageMeta("Logowanie", "Zaloguj się do MetodManiak.");
  const [returnToApp] = useState(() => new URLSearchParams(window.location.search).get("returnTo") === "app");
  return (
    <AuthShell title={<>Wracasz<br /><span className="text-lime">nad wodę.</span></>} text="Zaloguj się, aby zarządzać kontem. Dostęp do zaplecza mają wyłącznie konta z rolą administratora.">
      <SignIn routing="path" path={`${BASE}/sign-in`} signUpUrl={`${BASE}/sign-up`} fallbackRedirectUrl={returnToApp ? `${BASE}/aplikacja` : BASE || "/"} />
      <PreviewAdminEntry />
    </AuthShell>
  );
}

export function SignUpPage() {
  usePageMeta("Rejestracja", "Załóż konto w MetodManiak.");
  return (
    <AuthShell title={<>Pierwszy<br /><span className="text-lime">rzut.</span></>} text="Konto w MetodManiak. Bez newsletterowego spamu – tylko to, co potrzebne.">
      <RegistrationAgreements />
    </AuthShell>
  );
}
