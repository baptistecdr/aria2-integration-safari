import Aria2 from "@baptistecdr/aria2";
import { captureURL } from "@/aria2-extension";
import ExtensionOptions from "@/models/extension-options";
import { type GlobalStat, parseGlobalStat } from "@/popup/models/global-stat";

export const CONTEXT_MENUS_PARENT_ID = "aria2-integration";
export const ALARM_NAME = "set-badge";
const ALARM_INTERVAL_SECONDS = 5;

let connections: Record<string, Aria2> = {};

export function createConnections(extensionOptions: ExtensionOptions) {
  const conns: Record<string, Aria2> = {};
  for (const [key, server] of Object.entries(extensionOptions.servers)) {
    conns[key] = new Aria2(server);
  }
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
  for (const [id, server] of Object.entries(extensionOptions.servers)) {
    browser.contextMenus?.create({
      title: `${server.name}`,
      parentId: CONTEXT_MENUS_PARENT_ID,
      id,
      contexts: ["link", "selection"],
    });
  }
}

async function createSingleServerContextMenus(extensionOptions: ExtensionOptions) {
  await browser.contextMenus?.removeAll();
  for (const [id] of Object.entries(extensionOptions.servers)) {
    browser.contextMenus?.create({
      title: browser.i18n.getMessage("contextMenusTitle"),
      id,
      contexts: ["link", "selection"],
    });
  }
}

export async function createContextMenus(extensionOptions: ExtensionOptions) {
  if (Object.keys(extensionOptions.servers).length === 1) {
    await createSingleServerContextMenus(extensionOptions);
  } else if (Object.keys(extensionOptions.servers).length > 1) {
    await createExtensionContextMenus(extensionOptions);
    await createServersContextMenus(extensionOptions);
  } else {
    await browser.contextMenus.removeAll();
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

export function formatCookies(cookies: browser.cookies.Cookie[]) {
  return cookies.reduce((acc, cookie) => {
    return `${acc}${cookie.name}=${cookie.value};`;
  }, "");
}

async function getCookies(url: string, cookieStoreID?: string): Promise<string> {
  return formatCookies(await browser.cookies.getAll({ url, storeId: cookieStoreID }));
}

export function getSelectedUrls(onClickData: browser.menus.OnClickData): string[] {
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
  for (const url of urls) {
    captureURL(connection, server, url, referer, cookies, !!tab?.incognito);
  }
});

async function getGlobalStat(aria2server: Aria2): Promise<GlobalStat> {
  const globalStat = await aria2server.call("getGlobalStat", [], {});
  return parseGlobalStat(globalStat);
}

browser.alarms.create(ALARM_NAME, {
  periodInMinutes: ALARM_INTERVAL_SECONDS / 60,
});

browser.alarms.onAlarm.addListener(listenerOnAlarm);

export async function listenerOnAlarm(alarm: browser.alarms.Alarm) {
  if (alarm.name === ALARM_NAME) {
    const numActives = Object.values(connections).map(async (server) => {
      const globalStat = await getGlobalStat(server);
      return globalStat.numActive;
    });
    const totalActive = await Promise.all(numActives).then((n) => n.reduce((partialSum, a) => partialSum + a, 0));
    browser.action.setBadgeText({
      text: totalActive ? totalActive.toString(10) : "",
    });
    browser.action.setBadgeBackgroundColor({
      color: "#666666",
    });
  }
}
