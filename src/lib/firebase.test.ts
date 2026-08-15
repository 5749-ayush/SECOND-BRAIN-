const firebaseMocks = vi.hoisted(() => ({
  app: { name: "second-brain-test" },
  initializeApp: vi.fn(),
  getFunctions: vi.fn(),
  connectFunctionsEmulator: vi.fn()
}));

vi.mock("firebase/app", () => ({
  initializeApp: firebaseMocks.initializeApp
}));

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(() => ({})),
  connectAuthEmulator: vi.fn(),
  GoogleAuthProvider: class {
    setCustomParameters() {}
  }
}));

vi.mock("firebase/firestore", () => ({
  getFirestore: vi.fn(() => ({})),
  connectFirestoreEmulator: vi.fn()
}));

vi.mock("firebase/functions", () => ({
  getFunctions: firebaseMocks.getFunctions,
  connectFunctionsEmulator: firebaseMocks.connectFunctionsEmulator
}));

vi.mock("firebase/storage", () => ({
  getStorage: vi.fn(() => ({})),
  connectStorageEmulator: vi.fn()
}));

describe("Firebase callable configuration", () => {
  it("routes browser callables to the same Mumbai region as the deployed functions", async () => {
    firebaseMocks.initializeApp.mockReturnValue(firebaseMocks.app);
    firebaseMocks.getFunctions.mockReturnValue({});

    await import("./firebase");

    expect(firebaseMocks.getFunctions).toHaveBeenCalledWith(firebaseMocks.app, "asia-south1");
  });
});
