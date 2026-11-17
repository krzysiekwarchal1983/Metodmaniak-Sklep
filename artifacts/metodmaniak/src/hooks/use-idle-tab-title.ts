import { useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { setIdleTabTitle, trackTabInactivity } from "@/lib/page-title";

export function useIdleTabTitle() {
  const [location] = useLocation();
  const search = useSearch();
  useEffect(() => trackTabInactivity(window, document, setIdleTabTitle), [location, search]);
}
