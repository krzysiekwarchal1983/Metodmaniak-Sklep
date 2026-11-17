import assert from "node:assert/strict";
import test from "node:test";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { getGetAdminSessionQueryKey, getListStockHistoryQueryKey, type AdminSession } from "@workspace/api-client-react";
import { resetSessionCache } from "./session-cache";

test("switching into preview updates an already-mounted session observer without navigation", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const guest: AdminSession = { authenticated: false, isAdmin: false, previewMode: false, previewAccessAvailable: true, message: "" };
  const admin: AdminSession = { ...guest, authenticated: true, isAdmin: true, previewMode: true };
  let server = guest;
  const observer = new QueryObserver(client, { queryKey: getGetAdminSessionQueryKey(), queryFn: async () => server });
  const stop = observer.subscribe(() => {});
  await observer.refetch();
  assert.equal(observer.getCurrentResult().data?.authenticated, false);
  server = admin;
  await resetSessionCache(client, admin);
  assert.equal(observer.getCurrentResult().data?.isAdmin, true);
  await observer.refetch();
  assert.equal(observer.getCurrentResult().data?.previewMode, true);
  server = guest;
  await resetSessionCache(client);
  await observer.refetch();
  assert.equal(observer.getCurrentResult().data?.authenticated, false);
  stop();
  client.clear();
});

test("logout clears active and inactive history pages, mutations and late responses without detaching observers", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const key = getListStockHistoryQueryKey({ limit: 50 });
  const filteredKey = getListStockHistoryQueryKey({ productId: 123, actorId: "user_test", before: 50, limit: 50 });
  const secret = { items: [{ id: 99, productName: "Private stock history" }], nextCursor: 50 };
  let signedIn = true;
  let finishRequest!: (data: typeof secret) => void;
  const observer = new QueryObserver(client, {
    queryKey: key,
    queryFn: () => signedIn
      ? new Promise<typeof secret>((resolve) => { finishRequest = resolve; })
      : Promise.reject(Object.assign(new Error("Signed out"), { status: 401 })),
  });
  client.setQueryData(key, secret);
  client.setQueryData(filteredKey, secret);
  await client.getMutationCache().build(client, { mutationFn: async () => secret }).execute(undefined);
  const stop = observer.subscribe(() => {});
  const pending = observer.refetch();
  assert.equal(observer.getCurrentResult().data, secret);
  assert.equal(typeof finishRequest, "function");
  signedIn = false;
  try {
    await resetSessionCache(client);
    assert.equal(observer.getCurrentResult().data, undefined, "mounted history must lose old rows");
    assert.equal(client.getQueryData(key), undefined);
    assert.equal(client.getQueryData(filteredKey), undefined, "inactive filtered pages must also be scrubbed");
    assert.equal(client.getMutationCache().getAll().length, 0);
    finishRequest(secret); // Simulate a transport that ignores AbortSignal.
    await pending;
    await observer.refetch();
    assert.equal(client.getQueryData(key), undefined, "a late admin response must not repopulate history");
    assert.equal(observer.getCurrentResult().error?.message, "Signed out");
    assert.equal(client.getQueryCache().find({ queryKey: key })?.getObserversCount(), 1);
  } finally {
    stop();
    client.clear();
  }
});
