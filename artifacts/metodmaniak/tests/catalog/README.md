# Catalog filter regression tests

These persistent Playwright tests exercise `src/pages/shop.tsx` and the running
`artifacts/api-server/src/routes/products.ts` through the shared proxy. No admin
login, database writes, fixed colour list, product IDs, or seeded names are used.

## Run

Start the existing MetodManiak web and API workflows against a populated
development catalogue (at least two products, two categories, and a coloured
product with a size/type). Do not run against a concurrently edited catalogue.
If the development database is empty, the explicit seed command is documented
in root `replit.md`; the tests never seed or change the database themselves.

```sh
pnpm --filter @workspace/metodmaniak exec playwright install chromium
pnpm --filter @workspace/metodmaniak run test:catalog:types
pnpm --filter @workspace/metodmaniak run test:catalog
# Read-only API checks without launching a browser:
pnpm --filter @workspace/metodmaniak run test:catalog:api
```

Default target: `http://localhost:80`. Set `CATALOG_BASE_URL` to a different
development/test origin if needed. The runner never launches duplicate servers.
On a generic Linux CI host, provision Playwright's browser OS dependencies too.
On Replit the runner automatically uses the provided
`REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE` (Nix-compatible); no browser download is
needed when that variable is set.

The API project compares exact product IDs and colour sets derived independently
from the unfiltered catalogue, covering every current colour and category/size
combination, name/scent search, empty results and malformed query parameters.
The desktop and 390px touch-phone projects cover selection, filter intersections,
URL reload, category changes, clearing colour (button and select), resetting all
filters, empty results, colour API failure/retry, and labelled 44px colour targets
with no horizontal page overflow. Stock is filtered client-side by design, not
sent as an unsupported API parameter.

Only the availability test controls returned stock values to guarantee both
available and sold-out results even when the live catalogue has only one state.
Only the colour failure test intercepts the colours endpoint (HTTP 503).
All other requests use the real catalogue/API. Missing prerequisites fail
explicitly rather than silently skipping coverage.

Failures retain screenshots and traces under the ignored
`generated-artifacts/catalog-tests/` directory. Open a trace with
`pnpm --filter @workspace/metodmaniak exec playwright show-trace <trace.zip>`.
