import { describe, expect, it, vi } from "vitest";
import { NATIVE_MESSAGE_SYNC_OPTIONS, sendOptionsToNativeApp } from "@/platform/native-app";

describe("sendOptionsToNativeApp", () => {
  it("sends the serialized options as a syncOptions message", async () => {
    browser.runtime.sendNativeMessage = vi.fn().mockResolvedValue({ ok: true });

    await sendOptionsToNativeApp('{"servers":{}}');

    expect(browser.runtime.sendNativeMessage).toHaveBeenCalledWith(expect.any(String), { type: NATIVE_MESSAGE_SYNC_OPTIONS, options: '{"servers":{}}' });
  });

  it("propagates the error when the native app is unreachable", async () => {
    browser.runtime.sendNativeMessage = vi.fn().mockRejectedValue(new Error("unavailable"));

    await expect(sendOptionsToNativeApp("{}")).rejects.toThrow("unavailable");
  });
});
