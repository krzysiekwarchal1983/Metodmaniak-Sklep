import { Link } from "wouter";
import { LEGAL_CONTACT as owner, LEGAL_VERSION } from "@/lib/legal";
import { usePageMeta } from "@/lib/shop";
import { CookieSettingsLink } from "@/components/cookie-preferences";

const CONTENT = {
  privacy: {
    title: "Polityka prywatności",
    sections: [
      ["Administrator danych", `${owner.name}, ${owner.address}. Kontakt: ${owner.email}, tel. ${owner.phone}. W sprawach danych osobowych użyj tego samego adresu e-mail.`],
      ["Jakie dane i w jakim celu", "Dane konta i uwierzytelniania przetwarzamy w celu utworzenia i obsługi konta (art. 6 ust. 1 lit. b RODO). Korespondencję obsługujemy, aby odpowiedzieć na Twoje zgłoszenie; bezpieczeństwo i ochronę roszczeń opieramy na prawnie uzasadnionym interesie (art. 6 ust. 1 lit. f). Obowiązki wynikające z przepisów realizujemy na podstawie art. 6 ust. 1 lit. c. Nie wymagamy zgody na przetwarzanie danych niezbędnych do obsługi konta."],
      ["Pogoda i lokalizacja", "Współrzędne pobieramy dopiero po Twoim działaniu i zgodzie przeglądarki. BigDataCloud otrzymuje lokalizację w celu ustalenia miejscowości, a Open-Meteo — zaokrąglone współrzędne w celu dostarczenia pogody. Wybrana lokalizacja pozostaje w pamięci bieżącej sesji aplikacji; nie zapisujemy jej w bazie kont. Możesz zamiast GPS wyszukać miejscowość, zmienić ją albo wyczyścić. Dostawcy mogą otrzymać także techniczne dane połączenia."],
      ["Usługi techniczne i odbiorcy", "Korzystamy z Google Firebase (hosting, baza danych Cloud Firestore oraz uwierzytelnianie i konta Firebase Authentication), Open-Meteo oraz BigDataCloud (pogoda). Część czcionek jest pobierana z Google Fonts; dostawca otrzymuje techniczne dane połączenia. Osadzony odtwarzacz YouTube uruchamia się tylko po zgodzie na zewnętrzne multimedia. Materiały graficzne i miniatury dostarczane z serwisów zewnętrznych mogą ujawnić dostawcom dane połączenia. Linki Facebook i WhatsApp nie ładują osadzonych widżetów — przejście do zewnętrznego serwisu następuje po kliknięciu. Dostawcy mogą działać także poza EOG; przed publicznym uruchomieniem wymagane jest potwierdzenie ról, umów powierzenia i właściwych mechanizmów transferu, np. standardowych klauzul umownych lub decyzji o adekwatności."],
      ["Przechowywanie", "Dane konta przechowujemy przez okres jego obsługi, a następnie tylko w zakresie niezbędnym do wykonania obowiązków prawnych i ochrony roszczeń. Korespondencję — przez czas obsługi sprawy i uzasadnionego przechowania. Koszyk pozostaje w lokalnej pamięci do usunięcia przez Ciebie. Wybór cookies wygasa po 180 dniach. Dokładne okresy retencji logów i kopii zapasowych dostawców wymagają zatwierdzenia przed uruchomieniem komercyjnym."],
      ["Twoje prawa", "Na zasadach określonych w RODO możesz żądać dostępu do danych, ich sprostowania, usunięcia, ograniczenia przetwarzania i przenoszenia, a także wnieść sprzeciw wobec przetwarzania opartego na uzasadnionym interesie. Zgodę na opcjonalne usługi możesz wycofać w ustawieniach cookies; nie wpływa to na zgodność wcześniejszego przetwarzania. Masz prawo złożyć skargę do Prezesa UODO. Dane konta podajesz dobrowolnie, ale bez danych wymaganych do logowania nie utworzymy konta."],
      ["Rekomendacje i kontakt", "Dobór przynęty i wskazówki pogodowe są informacyjne. Nie podejmujemy na ich podstawie decyzji wywołujących wobec Ciebie skutki prawne w rozumieniu art. 22 RODO. Nie zapisujemy Cię automatycznie na newsletter ani do działań marketingowych."],
      ["Anonimowe statystyki strony", "W naszej bazie zapisujemy łączną liczbę odsłon według dnia i publicznej podstrony. Licznik nie zapisuje adresów IP, identyfikatorów osób, sesji ani urządzeń, telefonu, referrera, parametrów adresu czy wpisanych fraz. Nie używa cookies ani pamięci przeglądarki i nie służy do profilowania. Nie obejmuje panelu administratora ani stron logowania. Respektuje sygnały Do Not Track i Global Privacy Control. Statystyki nie oznaczają liczby unikalnych osób."],
    ],
  },
  cookies: {
    title: "Polityka cookies",
    sections: [
      ["Co zapisujemy w przeglądarce", "Stosujemy mechanizmy sesji i bezpieczeństwa Firebase Authentication, a także lokalną pamięć przeglądarki do przechowania koszyka i ustawień prywatności. Niezbędne mechanizmy służą wykonaniu usługi, którą wybierasz, i nie wymagają zgody na reklamę."],
      ["Opcjonalne multimedia", "YouTube jest domyślnie zablokowany. Zgoda na zewnętrzne multimedia pozwala załadować odtwarzacz w domenie youtube-nocookie.com; nie oznacza to gwarancji braku przetwarzania danych przez Google. Własne filmy przesłane do serwisu nie wymagają zgody na YouTube."],
      ["Wybór i cofnięcie", "Możesz wybrać tylko niezbędne mechanizmy, zaakceptować wszystkie obecnie dostępne kategorie albo osobno zezwolić na multimedia. Nie używamy śledzenia analitycznego ani marketingowego. Samo przewijanie lub dalsze korzystanie ze strony nie oznacza zgody. Ustawienia są dostępne stale w stopce. Cofnięcie zgody usuwa odtwarzacz; dane zapisane wcześniej przez dostawcę możesz usunąć w ustawieniach przeglądarki."],
      ["Okres ważności", "Wybór prywatności zapisujemy na 180 dni, a po zmianie wersji ustawień pytamy ponownie. Koszyk nie ma automatycznego terminu usunięcia i może zostać wyczyszczony w przeglądarce. Cookies uwierzytelniające wygasają zgodnie z ustawieniami sesji usługi logowania. Tymczasowa sesja administratora w podglądzie wygasa po godzinie. Zablokowanie pamięci przeglądarki może wymagać ponawiania wyboru i ograniczyć działanie logowania oraz koszyka."],
    ],
  },
  terms: {
    title: "Regulamin konta i serwisu",
    sections: [
      ["Usługodawca", `${owner.name}, ${owner.address}. Kontakt: ${owner.email}, tel. ${owner.phone}. Regulamin dotyczy bezpłatnego konta i korzystania z serwisu MetodManiak.`],
      ["Serwis w przygotowaniu", "Serwis znajduje się w fazie prac. Katalog ma charakter demonstracyjny, płatności online są wyłączone, a koszyk nie zawiera działającego procesu składania zamówień. Ten dokument nie jest regulaminem sprzedaży i nie zastępuje informacji wymaganych przy uruchomieniu sklepu."],
      ["Konto i wymagania", "Do korzystania potrzebujesz aktualnej przeglądarki, połączenia z internetem, działającego adresu e-mail i mechanizmów niezbędnych do uwierzytelniania. Konto jest bezpłatne. Przy rejestracji potwierdzasz zapoznanie się z dokumentami i akceptację regulaminu. Nie wymagamy zgody marketingowej. Korzystanie przez osoby bez pełnej zdolności do czynności prawnych musi być zgodne z przepisami i wymaganą zgodą opiekuna."],
      ["Darmowy dostęp do aplikacji", "Nowe konto otrzymuje 7 kolejnych dni darmowego dostępu do doboru przynęty w aplikacji „Co wybrać?”. Okres rozpoczyna się w chwili utworzenia konta w systemie logowania, niezależnie od pierwszego uruchomienia aplikacji, i nie odnawia się po zalogowaniu, reinstalacji ani zmianie urządzenia. Po jego zakończeniu dobór przynęty jest blokowany. Nie pobieramy danych karty, nie uruchamiamy płatnej subskrypcji i nie naliczamy automatycznych opłat. Informacje pogodowe pozostają publiczne. Aplikacja internetowa PWA wymaga połączenia z internetem."],
      ["Zasady korzystania", "Podawaj prawidłowe dane, chroń dostęp do konta i nie udostępniaj treści bezprawnych. Nie naruszaj bezpieczeństwa serwisu ani praw innych osób. Rola administratora jest nadawana oddzielnie i nie wynika z samej rejestracji. Dane i materiały w serwisie podlegają ochronie zgodnie z prawem."],
      ["Rezygnacja i reklamacje", `Możesz w dowolnym momencie zgłosić usunięcie konta na ${owner.email}. Na ten adres zgłoś również reklamację dotyczącą działania konta, opisując problem i podając kontakt do odpowiedzi. Odpowiemy najpóźniej w ciągu 14 dni. Regulamin nie ogranicza praw konsumenta wynikających z bezwzględnie obowiązujących przepisów, w tym prawa odstąpienia, gdy przysługuje.`],
      ["Charakter informacji", "Pogoda jest informacją modelową, a nie gwarancją warunków na łowisku. Porady nie gwarantują brań; temperatura powietrza nie jest temperaturą wody. Zachowaj zasady bezpieczeństwa i stosuj się do komunikatów właściwych służb."],
      ["Zmiany dokumentów", "Istotne zmiany dotyczące konta wymagają poinformowania użytkowników przed ich wejściem w życie. Nie zmieniamy wstecz treści potwierdzenia złożonego przy rejestracji. Gdy uruchomimy sprzedaż lub dodatkowe opcjonalne usługi, dokumenty i wymagane wybory muszą zostać odpowiednio uzupełnione."],
    ],
  },
} as const;

export function LegalPage({ kind }: { kind: keyof typeof CONTENT }) {
  const content = CONTENT[kind];
  usePageMeta(content.title, `${content.title} serwisu MetodManiak. Właściciel i kontakt, dane osobowe oraz zasady korzystania.`);
  return (
    <article className="mx-auto max-w-3xl px-5 py-10 md:py-14">
      <Link href="/" className="text-sm text-lime">← Wróć do strony</Link>
      <h1 className="mt-6 text-3xl font-bold sm:text-4xl">{content.title}</h1>
      <p className="mt-3 text-xs text-muted-foreground">Wersja: {LEGAL_VERSION}</p>
      <p className="mt-5 rounded-xl border border-lime/25 bg-lime/5 p-4 text-sm leading-relaxed">Dokument roboczy serwisu w przygotowaniu. Przed publicznym uruchomieniem wymaga weryfikacji prawnej, potwierdzenia retencji danych i umów z dostawcami.</p>
      <div className="mt-8 space-y-7">{content.sections.map(([title, text]) => <section key={title}><h2 className="text-lg font-semibold">{title}</h2><p className="mt-2 text-sm leading-7 text-white/80">{text}</p></section>)}</div>
      <div className="mt-10 flex flex-wrap gap-4 border-t border-white/10 pt-6 text-xs">
        <Link href="/regulamin" className="hover:text-lime">Regulamin</Link><Link href="/polityka-prywatnosci" className="hover:text-lime">Prywatność</Link><Link href="/polityka-cookies" className="hover:text-lime">Cookies</Link><CookieSettingsLink />
      </div>
    </article>
  );
}
