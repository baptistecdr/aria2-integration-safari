import { describe, expect, it, vi } from "vitest";
import { runLoggingErrors } from "@/services/run-logging-errors";

describe("runLoggingErrors", () => {
  it("returns true when the action succeeds", async () => {
    await expect(runLoggingErrors(async () => "done")).resolves.toBe(true);
  });

  it("logs the error and returns false when the action fails", async () => {
    const error = new Error("boom");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(runLoggingErrors(() => Promise.reject(error))).resolves.toBe(false);

    expect(consoleError).toHaveBeenCalledWith(error);
  });
});
