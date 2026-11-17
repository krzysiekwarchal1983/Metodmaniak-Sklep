# MetodManiak — pakiet wdrożeniowy Google Cloud

Pakiet zawiera pełny kod sklepu i API oraz konfigurację pojedynczej usługi Cloud Run. Serwis HTTP udostępnia frontend, API pod `/api` i SPA routing na jednym adresie.

## Zanim uruchomisz produkcję

ZIP jest paczką **kodu aplikacji**, nie kopią danych. Nie zawiera sekretów, bazy użytkowników, zamówień, magazynu ani plików z Replit Object Storage. Przed otwarciem sklepu publicznie:

1. Utwórz PostgreSQL (np. Cloud SQL) i przenieś schemat oraz potrzebne rekordy z obecnej bazy. Nie uruchamiaj seedów demonstracyjnych na bazie produkcyjnej. Schemat jest w `lib/db/src/schema`; konfigurację połączenia podaj przez Secret Manager jako `DATABASE_URL`.
2. Skopiuj publiczne pliki sklepu z Replit Object Storage do GCS. Zachowaj ścieżki w podfolderze `public/` (m.in. `wafters-previews/`, `hero/`, `free/`, `channel/`). Ustaw `PUBLIC_OBJECT_SEARCH_PATHS=NAZWA_BUCKET/public` oraz `PRIVATE_OBJECT_DIR=/NAZWA_BUCKET/private`.
3. Nadaj tożsamości usługi Cloud Run dostęp do obiektów GCS oraz możliwość podpisywania URL-i (`roles/storage.objectAdmin` na bucket i `roles/iam.serviceAccountTokenCreator` dla konta usługi). Skonfiguruj CORS bucketa plikiem `gcs-cors.json`, wpisując dokładny adres strony.
4. Skonfiguruj Clerk dla domeny docelowej i ustaw nowe klucze produkcyjne w Secret Manager. Użytkownicy Replit-managed Clerk nie są kopiowani tym ZIP-em; zweryfikuj logowanie, powrót OAuth i konto administratora przed publikacją. Admin wymaga `publicMetadata.role = "admin"` w Clerk.
5. **Płatności internetowe są wyłączone w obecnym kodzie** — PayU, Przelewy24, BLIK i Autopay są wyświetlane jako nieaktywne, a endpoint checkout nie przyjmuje zamówień ani płatności. Podłącz i przetestuj operatora płatności przed sprzedażą.
6. Zaktualizuj w polityce prywatności informację o hostingu i dostawcach; obecny tekst odnosi się do Replit.

## Budowanie i wdrożenie na Cloud Run

Wymagane: Google Cloud CLI, włączone Cloud Run, Cloud Build, Artifact Registry i Secret Manager oraz wybrane konto/billing w GCP.

```sh
gcloud config set project YOUR_PROJECT_ID
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com
gcloud artifacts repositories create metodmaniak --repository-format=docker --location=europe-central2
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_IMAGE=europe-central2-docker.pkg.dev/YOUR_PROJECT_ID/metodmaniak/shop:latest,_VITE_CLERK_PUBLISHABLE_KEY=pk_live_REPLACE_ME,_VITE_CLERK_PROXY_URL=
gcloud run deploy metodmaniak \
  --image europe-central2-docker.pkg.dev/YOUR_PROJECT_ID/metodmaniak/shop:latest \
  --region europe-central2 --port 8080 --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,PORT=8080,BASE_PATH=/,PRIVATE_OBJECT_DIR=/YOUR_GCS_BUCKET/private,PUBLIC_OBJECT_SEARCH_PATHS=YOUR_GCS_BUCKET/public \
  --set-secrets DATABASE_URL=DATABASE_URL:latest,CLERK_SECRET_KEY=CLERK_SECRET_KEY:latest,CLERK_PUBLISHABLE_KEY=CLERK_PUBLISHABLE_KEY:latest
```

Podmień projekt, region, bucket i wartości Clerk. Nie wpisuj hasła bazy ani sekretnego klucza Clerk bezpośrednio w komendzie — utwórz sekrety w Secret Manager i podłącz je do usługi. Jeśli używasz Cloud SQL, skonfiguruj również połączenie instancji w Cloud Run i właściwy adres `DATABASE_URL`.

## Test po wdrożeniu

- Otwórz `https://ADRES_USLUGI/` i `/api/healthz`.
- Sprawdź katalog, obrazy i pobieranie materiałów; błędy 404 zwykle oznaczają brak skopiowanych obiektów lub zły prefiks.
- Przetestuj logowanie Clerk, role administratora, przesyłanie pliku do GCS, kalendarz i listę łowisk.
- Nie uruchamiaj sprzedaży, dopóki checkout nie jest podłączony do prawdziwego operatora i sprawdzony testowymi transakcjami.

## Co jest w ZIP-ie

- Frontend MetodManiak, API, współdzielone biblioteki, OpenAPI i schemat PostgreSQL.
- Dockerfile Cloud Run; API serwuje też zbudowaną stronę.
- Wariant Object Storage dla GCS: domyślne konto usługi Cloud Run oraz podpisywane uploady V4.
- Nie są dołączone `.env`, `.git`, `node_modules`, baza, dane klientów/zamówień ani zawartość Replit App Storage.
