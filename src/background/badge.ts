import type { BackgroundContext } from "@/background/context";

export const ALARM_NAME = "set-badge";
const ALARM_INTERVAL_SECONDS = 5;
const BADGE_COLOR = "#666666";

export function scheduleBadgeUpdates() {
  browser.alarms.create(ALARM_NAME, { periodInMinutes: ALARM_INTERVAL_SECONDS / 60 });
}

// Shows the number of active downloads of every server in the badge.
export function createBadgeUpdater({ store, connections }: BackgroundContext) {
  return async (alarm: browser.alarms.Alarm) => {
    if (alarm.name !== ALARM_NAME) {
      return;
    }
    await store.ready();
    const numActives = await Promise.all(
      connections.all().map(async ([, aria2]) => {
        try {
          return (await aria2.getGlobalStat()).numActive;
        } catch {
          // An unreachable server must not prevent the others from being counted.
          return 0;
        }
      }),
    );
    const totalActive = numActives.reduce((sum, numActive) => sum + numActive, 0);
    await browser.action.setBadgeText({ text: totalActive ? totalActive.toString(10) : "" });
    await browser.action.setBadgeBackgroundColor({ color: BADGE_COLOR });
  };
}
