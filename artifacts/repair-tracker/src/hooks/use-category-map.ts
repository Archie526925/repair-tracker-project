import { useMemo } from "react";
import { useListCategories, getListCategoriesQueryKey } from "@workspace/api-client-react";

export type CategoryInfo = { label: string; color: string };

export function useCategoryMap(): Record<string, CategoryInfo> {
  const { data } = useListCategories({
    query: { queryKey: getListCategoriesQueryKey(), staleTime: 30_000 },
  });

  return useMemo(() => {
    if (!data || !Array.isArray(data)) return {};
    return Object.fromEntries(data.map((c) => [c.slug, { label: c.label, color: c.color }]));
  }, [data]);
}
