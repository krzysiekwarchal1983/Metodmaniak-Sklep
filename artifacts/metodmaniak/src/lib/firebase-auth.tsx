import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { firebaseAuth, firestoreDb } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";

export type AppUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  username: string | null;
  imageUrl: string | null;
  primaryEmailAddress: { emailAddress: string } | null;
};

type ListenerCallback = (payload: { user: AppUser | null }) => void;

type AuthContextValue = {
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
  user: AppUser | null;
  signOut: (options?: { redirectUrl?: string }) => Promise<void>;
  addListener: (cb: ListenerCallback) => () => void;
};

const AuthContext = createContext<AuthContextValue>({
  isLoaded: false,
  isSignedIn: false,
  userId: null,
  user: null,
  signOut: async () => {},
  addListener: () => () => {},
});

const listeners = new Set<ListenerCallback>();

function mapFirebaseUser(fbUser: FirebaseUser | null): AppUser | null {
  if (!fbUser) return null;
  const displayName = fbUser.displayName?.trim() || "";
  const parts = displayName ? displayName.split(/\s+/) : [];
  const firstName = parts[0] || fbUser.email?.split("@")[0] || "Wędkarz";
  const lastName = parts.slice(1).join(" ") || "";
  return {
    id: fbUser.uid,
    firstName,
    lastName: lastName || null,
    fullName: displayName || firstName,
    username: fbUser.email?.split("@")[0] || null,
    imageUrl: fbUser.photoURL,
    primaryEmailAddress: fbUser.email ? { emailAddress: fbUser.email } : null,
  };
}

async function syncUserToFirestore(
  fbUser: FirebaseUser,
  extraMeta?: { firstName?: string; lastName?: string; legalDeclaration?: unknown },
) {
  try {
    const userRef = doc(firestoreDb, "users", fbUser.uid);
    const snap = await getDoc(userRef);
    const displayName = fbUser.displayName?.trim() || "";
    const parts = displayName ? displayName.split(/\s+/) : [];
    const firstName = extraMeta?.firstName ?? parts[0] ?? fbUser.email?.split("@")[0] ?? "";
    const lastName = extraMeta?.lastName ?? parts.slice(1).join(" ") ?? "";
    const createdIso = fbUser.metadata.creationTime
      ? new Date(fbUser.metadata.creationTime).toISOString()
      : new Date().toISOString();
    const lastSignInIso = fbUser.metadata.lastSignInTime
      ? new Date(fbUser.metadata.lastSignInTime).toISOString()
      : new Date().toISOString();

    if (!snap.exists()) {
      await setDoc(userRef, {
        id: fbUser.uid,
        firstName,
        lastName,
        username: fbUser.email?.split("@")[0] ?? "",
        email: fbUser.email ?? "",
        phone: fbUser.phoneNumber ?? "",
        emailVerified: fbUser.emailVerified,
        role: "user",
        registeredAt: createdIso,
        lastSignInAt: lastSignInIso,
        ...(extraMeta?.legalDeclaration ? { legalDeclaration: extraMeta.legalDeclaration } : {}),
      });
    } else {
      const existing = snap.data();
      await setDoc(userRef, {
        ...existing,
        id: fbUser.uid,
        firstName: firstName || existing.firstName || "",
        lastName: lastName || existing.lastName || "",
        email: fbUser.email ?? existing.email ?? "",
        emailVerified: fbUser.emailVerified,
        registeredAt: existing.registeredAt ?? createdIso,
        lastSignInAt: lastSignInIso,
      });
    }
  } catch {
    // Non-blocking profile sync
  }
}

export function publishableKeyFromHost(_host: string, envKey?: string): string {
  return envKey || "firebase-metodmaniak-sklep-internetowy";
}

export function ClerkProvider({
  children,
}: {
  children: ReactNode;
  routerPush?: (to: string) => void;
  routerReplace?: (to: string) => void;
  [key: string]: unknown;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [fbUser, setFbUser] = useState<FirebaseUser | null>(() => firebaseAuth.currentUser);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth, (nextUser) => {
      setFbUser(nextUser);
      setIsLoaded(true);
      const mapped = mapFirebaseUser(nextUser);
      listeners.forEach((cb) => cb({ user: mapped }));
      if (nextUser) {
        void syncUserToFirestore(nextUser);
      }
    });
    return unsub;
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const mapped = mapFirebaseUser(fbUser);
    return {
      isLoaded,
      isSignedIn: Boolean(fbUser),
      userId: fbUser?.uid ?? null,
      user: mapped,
      signOut: async (options) => {
        await firebaseSignOut(firebaseAuth);
        if (options?.redirectUrl) {
          setLocation(options.redirectUrl);
        }
      },
      addListener: (cb: ListenerCallback) => {
        listeners.add(cb);
        return () => {
          listeners.delete(cb);
        };
      },
    };
  }, [fbUser, isLoaded, setLocation]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useClerk() {
  const ctx = useContext(AuthContext);
  return {
    signOut: ctx.signOut,
    addListener: ctx.addListener,
    user: ctx.user,
  };
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  return {
    isLoaded: ctx.isLoaded,
    isSignedIn: ctx.isSignedIn,
    userId: ctx.userId,
  };
}

export function useUser() {
  const ctx = useContext(AuthContext);
  return {
    isLoaded: ctx.isLoaded,
    isSignedIn: ctx.isSignedIn,
    user: ctx.user,
  };
}

export function Show({ when, children }: { when: "signed-in" | "signed-out"; children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return null;
  if (when === "signed-in" && isSignedIn) return <>{children}</>;
  if (when === "signed-out" && !isSignedIn) return <>{children}</>;
  return null;
}

export function UserButton() {
  const { user } = useUser();
  const { signOut } = useClerk();
  if (!user) return null;
  const initials = (user.firstName?.[0] || "M").toUpperCase();
  return (
    <button
      type="button"
      onClick={() => void signOut({ redirectUrl: "/" })}
      title={`Zalogowano jako ${user.primaryEmailAddress?.emailAddress ?? user.fullName} — kliknij, aby wylogować`}
      className="grid h-9 w-9 place-items-center rounded-full border border-lime/50 bg-lime/15 font-mono text-xs font-bold text-lime transition-colors hover:bg-lime hover:text-[#0f110e]"
    >
      {initials}
    </button>
  );
}

function translateAuthError(code: string): string {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Nieprawidłowy adres e-mail lub hasło.";
    case "auth/email-already-in-use":
      return "Konto z tym adresem e-mail już istnieje. Zaloguj się.";
    case "auth/weak-password":
      return "Hasło musi mieć co najmniej 6 znaków.";
    case "auth/invalid-email":
      return "Podaj poprawny adres e-mail.";
    case "auth/popup-closed-by-user":
      return "Zamknięto okno logowania Google.";
    case "auth/unauthorized-domain":
      return "Domena nie jest jeszcze autoryzowana w Firebase Auth.";
    default:
      return "Nie udało się wykonać operacji logowania. Spróbuj ponownie.";
  }
}

export function SignIn({
  signUpUrl = "/sign-up",
  fallbackRedirectUrl = "/",
}: {
  routing?: string;
  path?: string;
  signUpUrl?: string;
  fallbackRedirectUrl?: string;
}) {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const handleEmailSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);
    try {
      const cred = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
      await syncUserToFirestore(cred.user);
      setLocation(fallbackRedirectUrl || "/");
    } catch (err) {
      const code = (err as { code?: string })?.code ?? "";
      setError(translateAuthError(code));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setInfo("");
    setBusy(true);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(firebaseAuth, provider);
      await syncUserToFirestore(cred.user);
      setLocation(fallbackRedirectUrl || "/");
    } catch (err) {
      const code = (err as { code?: string })?.code ?? "";
      setError(translateAuthError(code));
    } finally {
      setBusy(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setError("Wpisz najpierw swój adres e-mail powyżej, aby zresetować hasło.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      await sendPasswordResetEmail(firebaseAuth, email.trim());
      setInfo("Wysłano link do resetu hasła na podany adres e-mail.");
    } catch (err) {
      const code = (err as { code?: string })?.code ?? "";
      setError(translateAuthError(code));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-[440px] max-w-full overflow-hidden rounded-3xl border border-white/10 bg-[#151813] p-7 shadow-2xl">
      <div className="flex flex-col items-center text-center">
        <img src="/brand/symbol.png" alt="MetodManiak" className="h-16 w-16 object-contain" />
        <h2 className="mt-4 text-2xl font-extrabold text-[#e8eedd]">Zaloguj się</h2>
        <p className="mt-1 text-sm text-[#9aa190]">Wróć do MetodManiak</p>
      </div>

      <div className="mt-6">
        <button
          type="button"
          onClick={() => void handleGoogleSignIn()}
          disabled={busy}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-white/[.03] px-4 py-3 text-sm font-semibold text-[#e8eedd] transition-colors hover:border-lime/60 disabled:opacity-50"
          data-testid="button-google-sign-in"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#EA4335"
              d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5c5.5 0 9.1-3.8 9.1-9.2 0-.6-.1-1.1-.2-1.6H12z"
            />
          </svg>
          Kontynuuj przez Google
        </button>
      </div>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs text-[#9aa190]">lub e-mailem</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <form onSubmit={(e) => void handleEmailSignIn(e)} className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-[#cfd6c4]">Adres e-mail</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="twoj@email.pl"
            className="w-full rounded-xl border border-white/15 bg-[#0f110e] px-3.5 py-2.5 text-sm text-[#e8eedd] outline-none focus:border-lime"
            data-testid="input-signin-email"
          />
        </label>
        <label className="block">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-[#cfd6c4]">Hasło</span>
            <button
              type="button"
              onClick={() => void handleResetPassword()}
              className="text-xs text-lime hover:underline"
            >
              Nie pamiętasz hasła?
            </button>
          </div>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-xl border border-white/15 bg-[#0f110e] px-3.5 py-2.5 text-sm text-[#e8eedd] outline-none focus:border-lime"
            data-testid="input-signin-password"
          />
        </label>

        {error && (
          <div className="rounded-xl border border-white/10 bg-white/[.04] p-3 text-xs text-lime" role="alert">
            {error}
          </div>
        )}
        {info && (
          <div className="rounded-xl border border-lime/30 bg-lime/10 p-3 text-xs text-lime" role="status">
            {info}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-lime py-3 text-sm font-extrabold text-[#0f110e] transition-opacity hover:opacity-90 disabled:opacity-50"
          data-testid="button-signin-submit"
        >
          {busy ? "Logowanie..." : "Zaloguj się"}
        </button>
      </form>

      <div className="mt-6 text-center text-xs text-[#9aa190]">
        Nie masz jeszcze konta?{" "}
        <Link href={signUpUrl} className="font-bold text-lime hover:underline">
          Załóż konto
        </Link>
      </div>
    </div>
  );
}

export function SignUp({
  signInUrl = "/sign-in",
  fallbackRedirectUrl = "/aplikacja",
  unsafeMetadata,
}: {
  routing?: string;
  path?: string;
  signInUrl?: string;
  fallbackRedirectUrl?: string;
  unsafeMetadata?: { legalDeclaration?: unknown };
}) {
  const [, setLocation] = useLocation();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleEmailSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const cred = await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password);
      const displayName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
      if (displayName) {
        await updateProfile(cred.user, { displayName });
      }
      await syncUserToFirestore(cred.user, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        legalDeclaration: unsafeMetadata?.legalDeclaration,
      });
      setLocation(fallbackRedirectUrl || "/aplikacja");
    } catch (err) {
      const code = (err as { code?: string })?.code ?? "";
      setError(translateAuthError(code));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError("");
    setBusy(true);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(firebaseAuth, provider);
      await syncUserToFirestore(cred.user, {
        legalDeclaration: unsafeMetadata?.legalDeclaration,
      });
      setLocation(fallbackRedirectUrl || "/aplikacja");
    } catch (err) {
      const code = (err as { code?: string })?.code ?? "";
      setError(translateAuthError(code));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-[440px] max-w-full overflow-hidden rounded-3xl border border-white/10 bg-[#151813] p-7 shadow-2xl">
      <div className="flex flex-col items-center text-center">
        <img src="/brand/symbol.png" alt="MetodManiak" className="h-16 w-16 object-contain" />
        <h2 className="mt-4 text-2xl font-extrabold text-[#e8eedd]">Załóż konto</h2>
        <p className="mt-1 text-sm text-[#9aa190]">Dołącz do MetodManiak</p>
      </div>

      <div className="mt-6">
        <button
          type="button"
          onClick={() => void handleGoogleSignUp()}
          disabled={busy}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-white/[.03] px-4 py-3 text-sm font-semibold text-[#e8eedd] transition-colors hover:border-lime/60 disabled:opacity-50"
          data-testid="button-google-sign-up"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#EA4335"
              d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5c5.5 0 9.1-3.8 9.1-9.2 0-.6-.1-1.1-.2-1.6H12z"
            />
          </svg>
          Zarejestruj przez Google
        </button>
      </div>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs text-[#9aa190]">lub e-mailem</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <form onSubmit={(e) => void handleEmailSignUp(e)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[#cfd6c4]">Imię</span>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Jan"
              className="w-full rounded-xl border border-white/15 bg-[#0f110e] px-3.5 py-2.5 text-sm text-[#e8eedd] outline-none focus:border-lime"
              data-testid="input-signup-firstname"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[#cfd6c4]">Nazwisko</span>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Kowalski"
              className="w-full rounded-xl border border-white/15 bg-[#0f110e] px-3.5 py-2.5 text-sm text-[#e8eedd] outline-none focus:border-lime"
              data-testid="input-signup-lastname"
            />
          </label>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-[#cfd6c4]">Adres e-mail</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="twoj@email.pl"
            className="w-full rounded-xl border border-white/15 bg-[#0f110e] px-3.5 py-2.5 text-sm text-[#e8eedd] outline-none focus:border-lime"
            data-testid="input-signup-email"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-[#cfd6c4]">Hasło (min. 6 znaków)</span>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-xl border border-white/15 bg-[#0f110e] px-3.5 py-2.5 text-sm text-[#e8eedd] outline-none focus:border-lime"
            data-testid="input-signup-password"
          />
        </label>

        {error && (
          <div className="rounded-xl border border-white/10 bg-white/[.04] p-3 text-xs text-lime" role="alert">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-lime py-3 text-sm font-extrabold text-[#0f110e] transition-opacity hover:opacity-90 disabled:opacity-50"
          data-testid="button-signup-submit"
        >
          {busy ? "Tworzenie konta..." : "Utwórz konto"}
        </button>
      </form>

      <div className="mt-6 text-center text-xs text-[#9aa190]">
        Masz już konto?{" "}
        <Link href={signInUrl} className="font-bold text-lime hover:underline">
          Zaloguj się
        </Link>
      </div>
    </div>
  );
}
