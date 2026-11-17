import { useEffect, useRef, type ReactNode } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { dark } from "@clerk/themes";
import { plPL } from "@clerk/localizations";
import { Route, Switch, useLocation, Router as WouterRouter } from "wouter";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Shell } from "@/components/layout";
import { CartProvider } from "@/lib/cart";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Shop from "@/pages/shop";
import ProductPage from "@/pages/product";
import VBlog from "@/pages/vblog";
import PrecisionEpisodePage from "@/pages/precision-episode";
import Selector from "@/pages/selector";
import Admin from "@/pages/admin";
import { SignInPage, SignUpPage } from "@/pages/auth";
import { useIdleTabTitle } from "@/hooks/use-idle-tab-title";
import { WeatherLocationProvider } from "@/components/weather/weather-location";
import { resetSessionCache } from "@/lib/session-cache";
import { CookiePreferencesProvider } from "@/components/cookie-preferences";
import { LegalPage } from "@/pages/legal";
import Nowosci from "@/pages/nowosci";
import Merch from "@/pages/merch";
import Free from "@/pages/free";
import { SiteTraffic } from "@/components/site-traffic";
import { MaintenanceGate } from "@/components/maintenance-gate";

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } } });

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const clerkAppearance = {
  theme: dark,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/brand/symbol.png`,
  },
  variables: {
    colorPrimary: "#ccff00",
    colorForeground: "#e8eedd",
    colorMutedForeground: "#9aa190",
    colorDanger: "#ccff00",
    colorBackground: "#151813",
    colorInput: "#0f110e",
    colorInputForeground: "#e8eedd",
    colorNeutral: "#e8eedd",
    colorPrimaryForeground: "#0f110e",
    fontFamily: "'Manrope', sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#151813] border border-white/10 rounded-3xl w-[440px] max-w-full overflow-hidden shadow-2xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[#e8eedd] font-extrabold",
    headerSubtitle: "text-[#9aa190]",
    socialButtonsBlockButtonText: "text-[#e8eedd] font-semibold",
    formFieldLabel: "text-[#cfd6c4] font-semibold",
    footerActionLink: "text-lime font-bold",
    footerActionText: "text-[#9aa190]",
    dividerText: "text-[#9aa190]",
    identityPreviewEditButton: "text-lime",
    formFieldSuccessText: "text-lime",
    alertText: "text-[#e8eedd]",
    logoBox: "justify-center",
    logoImage: "h-16 w-16 object-contain",
    socialButtonsBlockButton: "border border-white/15 bg-white/[.03]",
    formButtonPrimary: "bg-lime text-[#0f110e] font-extrabold rounded-full",
    formFieldInput: "bg-[#0f110e] border border-white/15 text-[#e8eedd]",
    footerAction: "justify-center",
    dividerLine: "bg-white/10",
    alert: "bg-white/[.04] border border-white/10",
    otpCodeFieldInput: "bg-[#0f110e] border border-white/15 text-[#e8eedd]",
    formFieldRow: "gap-3",
    main: "gap-5",
  },
};

const localization = {
  ...plPL,
  signIn: {
    ...plPL.signIn,
    start: { ...plPL.signIn?.start, title: "Zaloguj się", subtitle: "Wróć do MetodManiak" },
  },
  signUp: {
    ...plPL.signUp,
    start: { ...plPL.signUp?.start, title: "Załóż konto", subtitle: "Dołącz do MetodManiak" },
  },
};

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) void resetSessionCache(qc);
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);
  return null;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Router() {
  return (
    <>
    <SiteTraffic />
    <Switch>
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route>
        <Shell>
          <RoutedErrorBoundary>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/sklep" component={Shop} />
              <Route path="/produkt/:id" component={ProductPage} />
              <Route path="/vblog" component={VBlog} />
              <Route path="/vblog/sztuka-precyzji/:slug" component={PrecisionEpisodePage} />
              <Route path="/aplikacja" component={Selector} />
              <Route path="/aplikacja/:section" component={Selector} />
              <Route path="/admin" component={Admin} />
              <Route path="/nowosci" component={Nowosci} />
              <Route path="/merch" component={Merch} />
              <Route path="/free" component={Free} />
              <Route path="/regulamin"><LegalPage kind="terms" /></Route>
              <Route path="/polityka-prywatnosci"><LegalPage kind="privacy" /></Route>
              <Route path="/polityka-cookies"><LegalPage kind="cookies" /></Route>
              <Route component={NotFound} />
            </Switch>
          </RoutedErrorBoundary>
        </Shell>
      </Route>
    </Switch>
    </>
  );
}

function ClerkProviderWithRoutes() {
  useIdleTabTitle();
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={localization}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <CartProvider>
            <CookiePreferencesProvider>
              <WeatherLocationProvider>
                <MaintenanceGate>
                  <Router />
                </MaintenanceGate>
              </WeatherLocationProvider>
            </CookiePreferencesProvider>
          </CartProvider>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
