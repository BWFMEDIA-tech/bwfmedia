import { describe, expect, it } from "vitest";
import { IOS_KEYBOARD_MIN_HEIGHT, isSoftwareKeyboardOpen } from "./mobile-keyboard";

describe("isSoftwareKeyboardOpen", () => {
  it("detects the iOS keyboard when the visual viewport shrinks well below the layout viewport", () => {
    // iPhone: layout 812, visible 460 with the keyboard open
    expect(isSoftwareKeyboardOpen(812, 460)).toBe(true);
  });

  it("ignores Safari toolbar show/hide, which only moves the viewport by ~50-90px", () => {
    expect(isSoftwareKeyboardOpen(812, 740)).toBe(false);
    expect(isSoftwareKeyboardOpen(812, 812 - IOS_KEYBOARD_MIN_HEIGHT)).toBe(false);
  });

  it("reports closed when both viewports match (keyboard dismissed)", () => {
    expect(isSoftwareKeyboardOpen(812, 812)).toBe(false);
  });
});
