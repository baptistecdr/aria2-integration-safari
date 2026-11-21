import { describe, expect, it } from "vitest";
import { isTorrentLike } from "@/domain/capture-rules";

describe("isTorrentLike", () => {
  it.each(["https://example.com/file.torrent", "file.meta4", "https://example.com/file.metalink"])("recognizes %s", (name) => {
    expect(isTorrentLike(name)).toBe(true);
  });

  it.each(["https://example.com/file.zip", "file.torrent.zip", "", undefined])("does not recognize %s", (name) => {
    expect(isTorrentLike(name)).toBe(false);
  });
});
