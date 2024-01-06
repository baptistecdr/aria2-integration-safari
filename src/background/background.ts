// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import Aria2 from "aria2";
import type { Cookies, Menus } from "webextension-polyfill";
import browser from "webextension-polyfill";
import { captureURL } from "../models/aria2-extension";
import ExtensionOptions from "../models/extension-options";

const CONTEXT_MENUS_PARENT_ID = "aria2-integration";

let connections: Record<string, Aria2> = {};

function createConnections(extensionOptions: ExtensionOptions) {
  const conns: Record<string, Aria2> = {};
  Object.entries(extensionOptions.servers).forEach(([key, server]) => {
    conns[key] = new Aria2(server);
  });
  return conns;
}

async function createExtensionContextMenus(extensionOptions: ExtensionOptions) {
  await browser.contextMenus?.removeAll();
  if (Object.keys(extensionOptions.servers).length > 0) {
    browser.contextMenus?.create({
      title: browser.i18n.getMessage("contextMenusTitle"),
      id: CONTEXT_MENUS_PARENT_ID,
      contexts: ["link", "selection"],
    });
  }
}

async function createServersContextMenus(extensionOptions: ExtensionOptions) {
  Object.entries(extensionOptions.servers).forEach(([id, server]) => {
    browser.contextMenus?.create({
      title: `${server.name}`,
      parentId: CONTEXT_MENUS_PARENT_ID,
      id,
      contexts: ["link", "selection"],
    });
  });
}

async function createSingleServerContextMenus(extensionOptions: ExtensionOptions) {
  await browser.contextMenus?.removeAll();
  Object.entries(extensionOptions.servers).forEach(([id]) => {
    browser.contextMenus?.create({
      title: browser.i18n.getMessage("contextMenusTitle"),
      id,
      contexts: ["link", "selection"],
    });
  });
}

async function createContextMenus(extensionOptions: ExtensionOptions) {
  if (Object.keys(extensionOptions.servers).length === 1) {
    await createSingleServerContextMenus(extensionOptions);
  } else if (Object.keys(extensionOptions.servers).length > 1) {
    await createExtensionContextMenus(extensionOptions);
    await createServersContextMenus(extensionOptions);
  }
}

ExtensionOptions.fromStorage().then(async (extensionOptions) => {
  connections = createConnections(extensionOptions);
  await createContextMenus(extensionOptions);
});

browser.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    await browser.runtime.openOptionsPage();
  }
});

browser.storage.onChanged.addListener(async (changes) => {
  if (changes.options) {
    const extensionOptions = await ExtensionOptions.fromStorage();
    connections = createConnections(extensionOptions);
    await createContextMenus(extensionOptions);
  }
});

function formatCookies(cookies: Cookies.Cookie[]) {
  return cookies.reduce((acc, cookie) => {
    return `${acc}${cookie.name}=${cookie.value};`;
  }, "");
}

async function getCookies(url: string, cookieStoreID?: string): Promise<string> {
  return formatCookies(await browser.cookies.getAll({ url, storeId: cookieStoreID }));
}

function getSelectedUrls(onClickData: Menus.OnClickData): string[] {
  if (onClickData.linkUrl) {
    return [onClickData.linkUrl];
  }
  if (onClickData.selectionText) {
    return onClickData.selectionText.split(/\s+/);
  }
  return [];
}

browser.contextMenus?.onClicked.addListener(async (info, tab) => {
  const extensionOptions = await ExtensionOptions.fromStorage();
  const connection = connections[info.menuItemId];
  const server = extensionOptions.servers[info.menuItemId];

  const urls = getSelectedUrls(info);
  const referer = tab?.url ?? "";
  const cookies = await getCookies(referer, tab?.cookieStoreId);
  urls.forEach((url) => {
    captureURL(connection, server, url, referer, cookies);
  });
});
