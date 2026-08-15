import { Plus, Search, UserRound } from "lucide-react";
import type { Idea } from "../../domain/idea";
import { AppShell } from "../../app/AppShell";
import { Button } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { IdeaGrid } from "./IdeaGrid";

interface LibraryScreenProps {
  ideas: Idea[];
  onOpenIdea: (idea: Idea) => void;
  onSaveIdea: () => void;
  onOpenProfile: () => void;
}

export function LibraryScreen({
  ideas,
  onOpenIdea,
  onSaveIdea,
  onOpenProfile
}: LibraryScreenProps) {
  return (
    <AppShell>
      <header className="library-header">
        <a className="brand" href="#top" aria-label="Second Brain home">
          <span className="brand-symbol" aria-hidden="true">S/B</span>
          <span className="brand-wordmark">Second Brain</span>
        </a>
        <div className="library-header-actions">
          <button className="icon-button header-search" type="button" aria-label="Search ideas">
            <Search size={19} />
          </button>
          <Button icon={<Plus size={18} />} onClick={onSaveIdea}>
            Save an idea
          </Button>
          <button className="profile-button" type="button" onClick={onOpenProfile} aria-label="Open profile">
            <UserRound size={19} />
          </button>
        </div>
      </header>

      <main className="library-main" id="top">
        {ideas.length === 0 ? (
          <EmptyState
            eyebrow="Nothing saved yet"
            title="A quiet place for ideas."
            description="Save the links, images, hooks, and passing thoughts that may become your next video."
            action={
              <Button icon={<Plus size={18} />} onClick={onSaveIdea}>
                Save your first idea
              </Button>
            }
          />
        ) : (
          <>
            <section className="library-intro">
              <div>
                <p className="eyebrow">Shared visual memory</p>
                <h1>Your creative field.</h1>
              </div>
              <p>{ideas.length} {ideas.length === 1 ? "idea" : "ideas"} held here, ready when you are.</p>
            </section>
            <IdeaGrid ideas={ideas} onOpen={onOpenIdea} />
          </>
        )}
      </main>
    </AppShell>
  );
}
