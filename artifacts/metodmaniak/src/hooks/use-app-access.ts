import { useAuth } from "@clerk/react";
import { getGetAppAccessQueryKey, useGetAppAccess } from "@workspace/api-client-react";

export function useAppAccess() {
  const { isLoaded, userId } = useAuth();
  return useGetAppAccess({
    query: {
      queryKey: [...getGetAppAccessQueryKey(), userId ?? "signed-out"],
      enabled: isLoaded,
      staleTime: 0,
      refetchInterval: 30_000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  });
}
