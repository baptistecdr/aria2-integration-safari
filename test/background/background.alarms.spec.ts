import { describe, expect, it, vi } from "vitest";
import { ALARM_NAME, listenerOnAlarm } from "@/background/background";

describe("Alarm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets empty badge text if no active downloads", async () => {
    const alarm = { name: ALARM_NAME } as browser.alarms.Alarm;

    await listenerOnAlarm(alarm);

    expect(browser.action.setBadgeText).toHaveBeenCalledWith({ text: "" });
  });

  it("does nothing if alarm name does not match", async () => {
    const alarm = { name: "other-alarm" } as browser.alarms.Alarm;

    await listenerOnAlarm(alarm);

    expect(browser.action.setBadgeText).not.toHaveBeenCalled();
    expect(browser.action.setBadgeBackgroundColor).not.toHaveBeenCalled();
  });
});
