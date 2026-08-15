import { useMemo, useState } from "react";
import { AccessGate } from "../features/auth/AccessGate";
import { AuthProvider, useAuth } from "../features/auth/AuthProvider";
import { LibraryScreen } from "../features/ideas/LibraryScreen";
import { IdeaComposer } from "../features/ideas/IdeaComposer";
import { IdeaDetail } from "../features/ideas/IdeaDetail";
import { useIdeas } from "../features/ideas/useIdeas";
import { createIdea, deleteIdea, updateIdea } from "../features/ideas/ideaRepository";
import { useCategories } from "../features/categories/useCategories";
import { createCategory } from "../features/categories/categoryRepository";
import { queryIdeas } from "../domain/libraryQuery";
import type { Idea, IdeaInput } from "../domain/idea";
import type { LibraryQuery } from "../domain/libraryQuery";

function SecuredWorkspace() {
  const { access, signInWithGoogle, signOutUser } = useAuth();
  const { user } = useAuth();
  const authorized = access.status === "authorized" && Boolean(user);
  const { ideas, loading, error } = useIdeas(authorized);
  const categories = useCategories(authorized);
  const [composerOpen, setComposerOpen] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [query, setQuery] = useState<LibraryQuery>({
    text: "",
    categoryIds: [],
    sourceTypes: [],
    filmDateState: "any",
    sort: "newest",
    today: new Date().toISOString().slice(0, 10)
  });
  const visibleIdeas = useMemo(() => queryIdeas(ideas, query), [ideas, query]);

  const createNewCategory = (name: string) => {
    if (!user) return Promise.reject(new Error("Sign in is required."));
    return createCategory(name, user.uid);
  };

  const saveNewIdea = async (input: IdeaInput) => {
    if (!user) throw new Error("Sign in is required.");
    const names = input.categoryIds
      .map((id) => categories.find((category) => category.id === id)?.name)
      .filter((name): name is string => Boolean(name));
    await createIdea(input, user.uid, names);
  };

  const saveSelectedIdea = async (updates: Partial<IdeaInput>) => {
    if (!user || !selectedIdea) throw new Error("No idea is selected.");
    const nextCategoryIds = updates.categoryIds ?? selectedIdea.categoryIds;
    const names = nextCategoryIds
      .map((id) => categories.find((category) => category.id === id)?.name)
      .filter((name): name is string => Boolean(name));
    await updateIdea(selectedIdea.id, updates, user.uid, names);
  };

  const deleteSelectedIdea = async () => {
    if (!selectedIdea) return;
    await deleteIdea(selectedIdea.id);
    setSelectedIdea(null);
  };

  return (
    <AccessGate state={access} onSignIn={signInWithGoogle} onSignOut={signOutUser}>
      <>
        <LibraryScreen
          ideas={visibleIdeas}
          hasAnyIdeas={ideas.length > 0}
          categories={categories}
          query={query}
          onQueryChange={setQuery}
          loading={loading}
          error={error}
          onOpenIdea={setSelectedIdea}
          onSaveIdea={() => setComposerOpen(true)}
          onOpenProfile={() => undefined}
        />
        <IdeaComposer
          open={composerOpen}
          categories={categories}
          onClose={() => setComposerOpen(false)}
          onCreateIdea={saveNewIdea}
          onCreateCategory={createNewCategory}
        />
        {selectedIdea && (
          <IdeaDetail
            idea={selectedIdea}
            categories={categories}
            onClose={() => setSelectedIdea(null)}
            onSave={saveSelectedIdea}
            onDelete={deleteSelectedIdea}
            onCreateCategory={createNewCategory}
          />
        )}
      </>
    </AccessGate>
  );
}

export function App() {
  return (
    <AuthProvider>
      <SecuredWorkspace />
    </AuthProvider>
  );
}
