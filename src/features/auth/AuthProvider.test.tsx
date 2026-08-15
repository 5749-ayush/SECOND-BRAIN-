import { describe, expect, it } from "vitest";
import { isMobileOrTouchDevice } from "./AuthProvider";

describe("AuthProvider mobile detection", () => {
  it("detects mobile user agents", () => {
    const originalNavigator = globalThis.navigator;

    try {
      Object.defineProperty(globalThis, "navigator", {
        value: {
          userAgent:
            "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
          vendor: "Google Inc."
        },
        configurable: true,
        writable: true
      });

      expect(isMobileOrTouchDevice()).toBe(true);
    } finally {
      Object.defineProperty(globalThis, "navigator", {
        value: originalNavigator,
        configurable: true,
        writable: true
      });
    }
  });

  it("identifies standard desktop browser without touch as non-mobile", () => {
    const originalNavigator = globalThis.navigator;

    try {
      Object.defineProperty(globalThis, "navigator", {
        value: {
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          vendor: "Google Inc.",
          maxTouchPoints: 0
        },
        configurable: true,
        writable: true
      });

      expect(isMobileOrTouchDevice()).toBe(false);
    } finally {
      Object.defineProperty(globalThis, "navigator", {
        value: originalNavigator,
        configurable: true,
        writable: true
      });
    }
  });
});
