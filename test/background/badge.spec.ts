import { beforeEach, describe, expect, it, vi } from "vitest";
import { ALARM_NAME, createBadgeUpdater, scheduleBadgeUpdates } from "@/background/badge";
import type { Connections } from "@/background/connections";
import { Server } from "@/domain/server";
import { type Aria2Client, createAria2Client } from "@/services/aria2-client";
import { fakeOptionsStore } from "../helpers/fake-options-store";

function globalStat(numActive: number) {
  return { downloadSpeed: "0", uploadSpeed: "0", numActive: `${numActive}`, numWaiting: "0", numStopped: "0", numStoppedTotal: "0" };
}

// A real client whose RPC calls are answered by `call`.
function fakeAria2(call: (method: string) => Promise<unknown>) {
  const rpc = { call: vi.fn(call), multicall: vi.fn() };
  return Object.assign(createAria2Client({}, rpc), { rpc });
}

function connectionsOf(...entries: [Server, Aria2Client][]): Connections {
  return { get: vi.fn(), all: () => entries };
}

describe("Badge", () => {
  const alarm = { name: ALARM_NAME } as browser.alarms.Alarm;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("schedules the badge updates", () => {
    scheduleBadgeUpdates();

    expect(browser.alarms.create).toHaveBeenCalledWith(ALARM_NAME, { periodInMinutes: 5 / 60 });
  });

  it("sets empty badge text if no active downloads", async () => {
    await createBadgeUpdater({ store: fakeOptionsStore(), connections: connectionsOf() })(alarm);

    expect(browser.action.setBadgeText).toHaveBeenCalledWith({ text: "" });
    expect(browser.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: "#666666" });
  });

  it("does nothing if alarm name does not match", async () => {
    await createBadgeUpdater({ store: fakeOptionsStore(), connections: connectionsOf() })({ name: "other-alarm" } as browser.alarms.Alarm);

    expect(browser.action.setBadgeText).not.toHaveBeenCalled();
    expect(browser.action.setBadgeBackgroundColor).not.toHaveBeenCalled();
  });

  it("shows the number of active downloads of every server", async () => {
    const connections = connectionsOf([Server.create(), fakeAria2(async () => globalStat(2))], [Server.create(), fakeAria2(async () => globalStat(3))]);

    await createBadgeUpdater({ store: fakeOptionsStore(), connections })(alarm);

    expect(browser.action.setBadgeText).toHaveBeenCalledWith({ text: "5" });
  });

  it("still counts the other servers when one is unreachable", async () => {
    const connections = connectionsOf(
      [Server.create(), fakeAria2(async () => Promise.reject(new Error("unreachable")))],
      [Server.create(), fakeAria2(async () => globalStat(1))],
    );

    await createBadgeUpdater({ store: fakeOptionsStore(), connections })(alarm);

    expect(browser.action.setBadgeText).toHaveBeenCalledWith({ text: "1" });
  });
});
