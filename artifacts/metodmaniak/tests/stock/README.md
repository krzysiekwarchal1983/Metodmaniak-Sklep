# Regresja masowej edycji magazynu

Z katalogu głównego: `pnpm run test:stock`.

## Historia i przejścia uprawnień Clerk

`pnpm run test:stock-history` uruchamia regresje API historii oraz
`pnpm --filter @workspace/metodmaniak run test:session` (testy sesji, cache i renderowania komponentu).

- API korzysta z rzeczywistego middleware Clerk, `requireAdmin` i routerów magazynu.
  Tylko wynik uwierzytelnienia i odczyt metadanych Clerk są lokalnymi atrapami:
  nie tworzy ani nie modyfikuje kont, nie wywołuje usługi Clerk.
- Zwykłe konto otrzymuje 403 dla historii, pojedynczej edycji i masowej zmiany stanów.
  Administrator może odczytać historię i zmienić stany. Po cofnięciu roli
  kolejne żądania dostają 403 mimo niezmienionej sesji ze starą rolą administratora.
  Odmowa nie zmienia stanów ani historii. Wpisy dozwolonych zmian mają autora Clerk.
- Test zapisuje wyłącznie własny, unikalny produkt i usuwa go wraz z jego historią.
  Korzysta tylko z roboczej bazy, nigdy z kont właściciela lub produkcji.
- Testy klienta sprawdzają reset stosowany przy wylogowaniu: znikają aktywna historia,
  nieaktywne strony z filtrami i wyniki mutacji; spóźniona odpowiedź nie odtwarza danych.
  Aktywny obserwator pozostaje podłączony, a komponent przestaje renderować prywatne wpisy.
  Renderowanie jest sprawdzane w Node, nie w zalogowanej przeglądarce; te testy nie
  przechodzą interfejsu logowania Clerk.

## Przygotowanie

- Użyj roboczej bazy PostgreSQL z aktualnym schematem (`pnpm --filter @workspace/db run push`), w tym tabelą historii stanów. Nie uruchamiaj przeciw bazie produkcyjnej.
- Uruchom istniejący workflow `artifacts/metodmaniak: web`. Test API uruchamia własną instancję Express na losowym porcie i nie potrzebuje workflow API.
- Playwright używa `http://localhost:80` przez wspólny proxy. Inny adres można ustawić przez `STOCK_BASE_URL`.
- Na Replit korzystaj z udostępnionego Chromium przez `REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE`; poza Replit z przeglądarki Playwright.

## Zakres i bezpieczeństwo danych

`pnpm --filter @workspace/api-server run test:stock` sprawdza rzeczywisty endpoint, autoryzację, walidację OpenAPI/Zod i transakcje PostgreSQL. Tworzy własne produkty z unikalnym prefiksem, a w `finally` usuwa wyłącznie ich identyfikatory i ich wpisy historii. Nie wybiera ani nie zmienia produktów właściciela. Brak tabeli historii kończy test przed utworzeniem produktów. Wymuszenie błędu drugiego zapisu działa tylko w procesie testowym, bez zmiany schematu czy działającego serwera. Komunikat `Injected second stock write failure` oraz HTTP 500 są w tym scenariuszu oczekiwane.

`pnpm --filter @workspace/metodmaniak run test:stock` sprawdza formularz w prawdziwej przeglądarce, ale przechwytuje wszystkie żądania `/api/**`. Fikcyjne produkty nie trafiają do bazy. Nieoczekiwane żądania zapisu są blokowane i powodują niepowodzenie testu. Scenariusze obejmują konflikt 409, błąd 500, zerwanie sieci, zachowanie wartości (także po zamknięciu okna i odświeżeniu stanów), produkty ukryte filtrem oraz obowiązkowe zatwierdzenie podsumowania.

Raporty, zrzuty i ślady błędów trafiają do ignorowanego `generated-artifacts/stock-tests`.

### Eksport CSV historii

Testy panelu w `bulk-stock.spec.ts` klikają rzeczywisty przycisk komponentu
`StockHistory` i odczytują pobrany plik. Sprawdzają eksport bez zastosowania
formularza, po zastosowaniu wszystkich filtrów oraz ze starszej strony:
niezapisane zmiany formularza nie trafiają do eksportu, a żądanie nie zawiera
kursora ani limitu strony. Kontrolowane opóźnienie odpowiedzi sprawdza napis
„Pobieranie CSV…” i blokadę kolejnego kliknięcia. Testy potwierdzają nazwę
`historia-magazynu.csv`, bajty pliku, polskie znaki i pojedynczy BOM.
Błędy 403, 500 oraz zerwanie sieci nie pobierają pliku; pokazują komunikat,
przywracają przycisk i pozwalają ponowić eksport z tymi samymi zastosowanymi
filtrami, bez utraty starszej strony lub zmian formularza.

Tylko te scenariusze: `pnpm --filter @workspace/metodmaniak exec playwright test --config playwright.stock.config.ts --grep "stock history CSV download"`.
Pełny eksport wszystkich wpisów i bezpieczeństwo zawartości CSV pozostają
odpowiedzialnością testów API.
