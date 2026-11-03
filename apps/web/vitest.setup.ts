import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock scrollIntoView for jsdom
if (typeof Element !== "undefined") {
  Element.prototype.scrollIntoView = vi.fn();
}

