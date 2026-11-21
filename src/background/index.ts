// Composition root of the background script: creates the services and registers every listener.
import { createBadgeUpdater, scheduleBadgeUpdates } from "@/background/badge";
import { createConnections } from "@/background/connections";
import type { BackgroundContext } from "@/background/context";
import { createContextMenuClickHandler, keepContextMenusInSync } from "@/background/context-menus";
import { keepNativeAppInSync } from "@/background/native-sync";
import { createOptionsStore } from "@/services/options-store";

const store = createOptionsStore();
const context: BackgroundContext = { store, connections: createConnections(store) };

// Listeners must be registered synchronously, at the top level: the browser may start the background script only to
// dispatch one of these events, and dispatches it right after this script runs. Handlers wait for the options themselves.
browser.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    await browser.runtime.openOptionsPage();
  }
});
browser.contextMenus?.onClicked.addListener(createContextMenuClickHandler(context));
browser.alarms.onAlarm.addListener(createBadgeUpdater(context));

scheduleBadgeUpdates();
keepContextMenusInSync(store);
keepNativeAppInSync(store);
