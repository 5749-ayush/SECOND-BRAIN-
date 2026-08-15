import { useMemo, useState } from "react";
import { AccessGate } from "../features/auth/AccessGate";
import { AuthProvider, useAuth } from "../features/auth/AuthProvider";
import { LibraryScreen } from "../features/ideas/LibraryScreen";
import { IdeaComposer } from "../features/ideas/IdeaComposer";
import { IdeaDetail } from "../features/ideas/IdeaDetail";
import { useIdeas } from "../features/ideas/useIdeas";
import { createIdea, deleteIdea, requestIdeaEnrichment, updateIdea } from "../features/ideas/ideaRepository";
import { updateIdeaMedia } from "../features/ideas/ideaRepository";
import { createImageIdea, removeIdeaImage, uploadIdeaImage } from "../features/ideas/imageUpload";
import { useCategories } from "../features/categories/useCategories";
import { createCategory } from "../features/categories/categoryRepository";
import { queryIdeas } from "../domain/libraryQuery";
import type { Idea, IdeaInput } from "../domain/idea";
import type { LibraryQuery } from "../domain/libraryQuery";
import { ProfileSettings } from "../features/auth/ProfileSettings";

function SecuredWorkspace() {
  const { access, isSigningIn, signInWithGoogle, signOutUser, user } = useAuth();
  const authorized = access.status === "authorized" && Boolean(user);
  const { ideas, loading, error } = useIdeas(authorized);
  const categories = useCategories(authorized);
  const [composerOpen, setComposerOpen] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [query, setQuery] = useState<LibraryQuery>({
    text: "",
    categoryIds: [],
    sourceTypes: [],
    filmDateState: "any",
    sort: "newest",
    today: new Date().toISOString().slice(0, 10)
  });
  const visibleIdeas = useMemo(() => queryIdeas(ideas, query), [ideas, query]);
  const activeSelectedIdea = selectedIdea
    ? ideas.find((idea) => idea.id === selectedIdea.id) ?? selectedIdea
    : null;

  const createNewCategory = (name: string) => {
    if (!user) return Promise.reject(new Error("Sign in is required."));
    return createCategory(name, user.uid);
  };

  const saveNewIdea = async (input: IdeaInput) => {
    if (!user) throw new Error("Sign in is required.");
    const names = input.categoryIds
      .map((id) => categories.find((category) => category.id === id)?.name)
      .filter((name): name is string => Boolean(name));
    const ideaId = await createIdea(input, user.uid, names);
    if (input.kind === "link") {
      void requestIdeaEnrichment(ideaId).catch(() => undefined);
    }
  };

  const saveImageIdea = async (input: IdeaInput, file: File) => {
    if (!user) throw new Error("Sign in is required.");
    const names = input.categoryIds
      .map((id) => categories.find((category) => category.id === id)?.name)
      .filter((name): name is string => Boolean(name));
    await createImageIdea(input, file, user.uid, names);
  };

  const saveSelectedIdea = async (updates: Partial<IdeaInput>) => {
    if (!user || !activeSelectedIdea) throw new Error("No idea is selected.");
    const nextCategoryIds = updates.categoryIds ?? activeSelectedIdea.categoryIds;
    const names = nextCategoryIds
      .map((id) => categories.find((category) => category.id === id)?.name)
      .filter((name): name is string => Boolean(name));
    await updateIdea(activeSelectedIdea.id, updates, user.uid, names);
  };

  const deleteSelectedIdea = async () => {
    if (!activeSelectedIdea) return;
    await removeIdeaImage(activeSelectedIdea.customImagePath).catch(() => undefined);
    await deleteIdea(activeSelectedIdea.id);
    setSelectedIdea(null);
  };

  const replaceSelectedImage = async (file: File) => {
    if (!activeSelectedIdea || !user) return;
    const previousPath = activeSelectedIdea.customImagePath;
    const uploaded = await uploadIdeaImage({ ideaId: activeSelectedIdea.id, file });
    await updateIdeaMedia(activeSelectedIdea.id, uploaded, user.uid);
    await removeIdeaImage(previousPath).catch(() => undefined);
  };

  const retrySelectedMetadata = async () => {
    if (!activeSelectedIdea) return;
    await requestIdeaEnrichment(activeSelectedIdea.id);
  };

  return (
    <AccessGate
      state={access}
      onSignIn={signInWithGoogle}
      onSignOut={signOutUser}
      isSigningIn={isSigningIn}
    >
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
          onOpenProfile={() => setProfileOpen(true)}
        />
        <IdeaComposer
          open={composerOpen}
          categories={categories}
          onClose={() => setComposerOpen(false)}
          onCreateIdea={saveNewIdea}
          onCreateImageIdea={saveImageIdea}
          onCreateCategory={createNewCategory}
        />
        {activeSelectedIdea && (
          <IdeaDetail
            idea={activeSelectedIdea}
            categories={categories}
            onClose={() => setSelectedIdea(null)}
            onSave={saveSelectedIdea}
            onDelete={deleteSelectedIdea}
            onCreateCategory={createNewCategory}
            onReplaceImage={replaceSelectedImage}
            onRetryMetadata={retrySelectedMetadata}
          />
        )}
        {access.status === "authorized" && user && (
          <ProfileSettings
            open={profileOpen}
            member={access.member}
            user={user}
            onClose={() => setProfileOpen(false)}
            onSignOut={signOutUser}
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
