import { describe, it, expect } from "vitest";
import { isPhotoGateExempt } from "./ProfilePhotoGate";
describe("photo gate exemptions", () => {
  it("lets admins' pages and sign-in through", () => { expect(isPhotoGateExempt("/admin/users")).toBe(true); expect(isPhotoGateExempt("/login")).toBe(true); });
  it("blocks normal pages", () => { expect(isPhotoGateExempt("/home")).toBe(false); expect(isPhotoGateExempt("/administrator")).toBe(false); });
});
