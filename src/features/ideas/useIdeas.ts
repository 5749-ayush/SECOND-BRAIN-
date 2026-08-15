import { useEffect, useState } from "react";
import type { Idea } from "../../domain/idea";
import { subscribeToIdeas } from "./ideaRepository";

export function useIdeas(enabled: boolean) {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setIdeas([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    return subscribeToIdeas(
      (nextIdeas) => {
        setIdeas(nextIdeas);
        setLoading(false);
        setError(null);
      },
      () => {
        setError("The library could not be loaded. Please try again.");
        setLoading(false);
      }
    );
  }, [enabled]);

  return { ideas, loading, error };
}
