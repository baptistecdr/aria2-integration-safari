import { beforeEach, describe, expect, it, vi } from "vitest";
import { keepNativeAppInSync } from "@/background/native-sync";
import { ExtensionOptions } from "@/domain/extension-options";
import { Server } from "@/domain/server";
import Theme from "@/domain/theme";
import { NATIVE_MESSAGE_SYNC_OPTIONS } from "@/platform/native-app";
import { fakeOptionsStore } from "../helpers/fake-options-store";

describe("Native sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    browser.runtime.sendNativeMessage = vi.fn().mockResolvedValue({ ok: true });
  });

  it("sends the serialized options to the native app once they are loaded", async () => {
    const options = ExtensionOptions.create({ servers: { server1: Server.create({ uuid: "server1" }) } });

    keepNativeAppInSync(fakeOptionsStore(options));

    await vi.waitFor(() => expect(browser.runtime.sendNativeMessage).toHaveBeenCalledTimes(1));
    expect(browser.runtime.sendNativeMessage).toHaveBeenCalledWith(expect.any(String), {
      type: NATIVE_MESSAGE_SYNC_OPTIONS,
      options: ExtensionOptions.serialize(options),
    });
  });

  it("sends the options again whenever they change", async () => {
    const store = fakeOptionsStore();
    keepNativeAppInSync(store);
    await vi.waitFor(() => expect(browser.runtime.sendNativeMessage).toHaveBeenCalledTimes(1));

    const changed = await store.update((options) => ExtensionOptions.withOverrides(options, { theme: Theme.Dark }));

    await vi.waitFor(() => expect(browser.runtime.sendNativeMessage).toHaveBeenCalledTimes(2));
    expect(browser.runtime.sendNativeMessage).toHaveBeenLastCalledWith(expect.any(String), {
      type: NATIVE_MESSAGE_SYNC_OPTIONS,
      options: ExtensionOptions.serialize(changed),
    });
  });

  it("logs the error and keeps syncing when the native app is unreachable", async () => {
    browser.runtime.sendNativeMessage = vi.fn().mockRejectedValueOnce(new Error("unavailable")).mockResolvedValue({ ok: true });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const store = fakeOptionsStore();

    keepNativeAppInSync(store);
    await vi.waitFor(() => expect(consoleError).toHaveBeenCalled());
    await store.update((options) => ExtensionOptions.withOverrides(options, { theme: Theme.Dark }));

    await vi.waitFor(() => expect(browser.runtime.sendNativeMessage).toHaveBeenCalledTimes(2));
  });
});
