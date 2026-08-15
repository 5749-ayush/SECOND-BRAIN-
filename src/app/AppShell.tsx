import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <div className="ambient-backdrop" aria-hidden="true">
        <div className="ambient-glow ambient-glow-primary" />
        <div className="ambient-glow ambient-glow-secondary" />
      </div>
      <div className="grain" aria-hidden="true" />
      {children}
    </div>
  );
}
