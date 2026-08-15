import type { Idea } from "../../domain/idea";
import { IdeaCard } from "./IdeaCard";

interface IdeaGridProps {
  ideas: Idea[];
  onOpen: (idea: Idea) => void;
}

export function IdeaGrid({ ideas, onOpen }: IdeaGridProps) {
  return (
    <section className="idea-grid" aria-label="Saved ideas">
      {ideas.map((idea) => (
        <IdeaCard key={idea.id} idea={idea} onOpen={onOpen} />
      ))}
    </section>
  );
}
