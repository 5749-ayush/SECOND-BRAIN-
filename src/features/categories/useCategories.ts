import { useEffect, useState } from "react";
import type { Category } from "../../domain/category";
import { subscribeToCategories } from "./categoryRepository";

export function useCategories(enabled: boolean) {
  const [categories, setCategories] = useState<Category[]>([]);
  useEffect(() => {
    if (!enabled) {
      setCategories([]);
      return;
    }
    return subscribeToCategories(setCategories, () => setCategories([]));
  }, [enabled]);
  return categories;
}
