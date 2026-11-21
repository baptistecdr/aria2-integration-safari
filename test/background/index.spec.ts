import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExtensionOptions } from "@/domain/extension-options";
import browser from "../setupTests";

const SERVER_UUID = "6f1c7a3e-2b4d-4e8f-9a1b-3c5d7e9f1a2b";
const OPTIONS = { servers: { [SERVER_UUID]: { uuid: SERVER_UUID, name: "aria2", host: "127.0.0.1", port: 6800 } } };

type Listener = (...args: any[]) => Promise<void>;

// The listener most recently registered on a browser event by the background script.
function registered(event: { addListener: unknown }): Listener {
  return vi.mocked(event.addListener as (listener: Listener) => void).mock.calls.at(-1)?.[0] as Listener;
}

describe("Background script", () => {
  let resolveStorage: (value: Record<string, unknown>) => void;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    browser.storage.sync.get.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveStorage = resolve;
      }),
    );
    browser.contextMenus.removeAll = vi.fn().mockResolvedValue(undefined);
    browser.contextMenus.create = vi.fn();
    browser.runtime.sendNativeMessage = vi.fn().mockResolvedValue({ ok: true });
  });

  it("registers every listener synchronously, before the options are loaded", async () => {
    await import("@/background/index");

    expect(browser.runtime.onInstalled.addListener).toHaveBeenCalledTimes(1);
    expect(browser.contextMenus.onClicked.addListener).toHaveBeenCalledTimes(1);
    expect(browser.alarms.onAlarm.addListener).toHaveBeenCalledTimes(1);
    expect(browser.alarms.create).toHaveBeenCalledTimes(1);
  });

  it("opens the options page when the extension is installed", async () => {
    browser.runtime.openOptionsPage = vi.fn().mockResolvedValue(undefined);
    await import("@/background/index");

    await registered(browser.runtime.onInstalled)({ reason: "update" });
    expect(browser.runtime.openOptionsPage).not.toHaveBeenCalled();

    await registered(browser.runtime.onInstalled)({ reason: "install" });
    expect(browser.runtime.openOptionsPage).toHaveBeenCalled();
  });

  it("creates the context menus and shares the servers with the native app once the options are loaded", async () => {
    await import("@/background/index");
    expect(browser.contextMenus.create).not.toHaveBeenCalled();
    expect(browser.runtime.sendNativeMessage).not.toHaveBeenCalled();

    resolveStorage({ options: JSON.stringify(OPTIONS) });

    await vi.waitFor(() => expect(browser.contextMenus.create).toHaveBeenCalledWith(expect.objectContaining({ id: SERVER_UUID })));
    await vi.waitFor(() => expect(browser.runtime.sendNativeMessage).toHaveBeenCalledTimes(1));
    expect(browser.runtime.sendNativeMessage).toHaveBeenCalledWith(expect.any(String), {
      type: "syncOptions",
      options: ExtensionOptions.serialize(ExtensionOptions.deserialize(JSON.stringify(OPTIONS))),
    });
  });
});
