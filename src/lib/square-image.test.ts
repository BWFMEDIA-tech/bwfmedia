import { describe, it, expect } from "vitest";
import { squareCropRect } from "./square-image";
describe("squareCropRect", () => {
  it("centers a wide image", () => expect(squareCropRect(1600, 900)).toEqual({ sx: 350, sy: 0, size: 900 }));
  it("centers a tall image", () => expect(squareCropRect(900, 1600)).toEqual({ sx: 0, sy: 350, size: 900 }));
});
