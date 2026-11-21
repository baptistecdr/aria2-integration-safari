import { beforeEach, describe, expect, it, vi } from "vitest";
import { formatCookies, getCookies } from "@/platform/cookies";

describe("Cookies", () => {
  function createCookie(name: string, value: string): browser.cookies.Cookie {
    return {
      domain: "domain",
      firstPartyDomain: "firstPartyDomain",
      hostOnly: false,
      httpOnly: false,
      path: "path",
      sameSite: "strict",
      secure: false,
      session: false,
      storeId: "storeId",
      name: name,
      value: value,
    };
  }

  it("should format cookies", () => {
    const cookies = [createCookie("name1", "value1"), createCookie("name2", "value2")];

    const formattedCookies = formatCookies(cookies);

    expect(formattedCookies).toEqual("name1=value1;name2=value2;");
  });

  describe("getCookies", () => {
    const url = "https://example.com/file.zip";

    beforeEach(() => {
      vi.mocked(browser.cookies.getAll)
        .mockReset()
        .mockResolvedValue([createCookie("name1", "value1")]);
    });

    it("should ask the cookies of the URL in the given cookie store", async () => {
      const cookies = await getCookies(url, "container-1");

      expect(browser.cookies.getAll).toHaveBeenCalledWith({ url, storeId: "container-1" });
      expect(cookies).toEqual("name1=value1;");
    });

    it("should use the default cookie store when none is given", async () => {
      await getCookies(url);

      expect(browser.cookies.getAll).toHaveBeenCalledWith({ url, storeId: undefined });
    });
  });
});
