import "@testing-library/jest-dom/vitest"
import { afterEach, vi } from "vitest"
import { cleanup } from "@testing-library/react"
import React from "react"

afterEach(() => {
  cleanup()
})

// Mock react-konva — renders divs with data attrs reflecting key props.
vi.mock("react-konva", () => {
  const make = (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode; [k: string]: unknown }) => {
      const dataProps: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(props)) {
        if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
          dataProps[`data-${k.toLowerCase()}`] = v;
        }
      }
      return React.createElement("div", { "data-konva": name, ...dataProps }, children);
    };
  return {
    Stage: make("Stage"),
    Layer: make("Layer"),
    Image: make("Image"),
    Rect: make("Rect"),
    Text: make("Text"),
    Transformer: make("Transformer"),
    Group: make("Group"),
  };
});
