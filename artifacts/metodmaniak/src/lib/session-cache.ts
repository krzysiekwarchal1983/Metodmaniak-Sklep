import type { QueryClient } from "@tanstack/react-query";
import { getGetAdminSessionQueryKey, type AdminSession } from "@workspace/api-client-react";

export async function resetSessionCache(client: QueryClient, session?: AdminSession): Promise<void> {
  await client.cancelQueries();
  client.getMutationCache().clear();
  // Keep active observers attached; clear() leaves same-route views with their old result.
  void client.resetQueries();
  if (session) client.setQueryData(getGetAdminSessionQueryKey(), session);
}
