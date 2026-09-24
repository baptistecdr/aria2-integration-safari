import { describe, expect, it } from "vitest";
import i18n from "@/i18n";

describe("i18n", () => {
  it("returns the localized message", () => {
    expect(i18n("serverAdd")).toBe("serverAdd");
    expect(browser.i18n.getMessage).toHaveBeenCalledWith("serverAdd", undefined);
  });

  it("forwards substitutions", () => {
    i18n("addUrlSuccess", "Localhost");
    expect(browser.i18n.getMessage).toHaveBeenCalledWith("addUrlSuccess", "Localhost");
  });
});
