import { expect } from "vitest";
import { NATIVE_MESSAGE_SYNC_OPTIONS, syncOptionsToNativeApp } from "@/background/background";
import { ExtensionOptions } from "@/models/extension-options";
import { Server } from "@/models/server";

describe("Native sync", () => {
  beforeEach(() => {
    browser.runtime.sendNativeMessage = vi.fn().mockResolvedValue({ ok: true });
  });

  it("should send the serialized options to the native app", async () => {
    const extensionOptions = ExtensionOptions.create({ servers: { server1: Server.create({ uuid: "server1" }) } });

    await syncOptionsToNativeApp(extensionOptions);

    expect(browser.runtime.sendNativeMessage).toHaveBeenCalledWith(expect.any(String), {
      type: NATIVE_MESSAGE_SYNC_OPTIONS,
      options: ExtensionOptions.serialize(extensionOptions),
    });
  });

  it("should not throw when the native app is unreachable", async () => {
    browser.runtime.sendNativeMessage = vi.fn().mockRejectedValue(new Error("unavailable"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(syncOptionsToNativeApp(ExtensionOptions.create())).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalled();
  });
});
