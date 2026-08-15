import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/global.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Application root element was not found.");
}

const applicationRoot = root;

async function renderApplication() {
  const { App } = import.meta.env.VITE_VISUAL_QA === "true"
    ? await import("./app/VisualQaApp")
    : await import("./app/App");

  createRoot(applicationRoot).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

void renderApplication();
