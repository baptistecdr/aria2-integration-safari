const TORRENT_LIKE = /\.(torrent|meta4|metalink)$/;

// Whether aria2 should add the file as a torrent or a metalink instead of downloading it.
export function isTorrentLike(urlOrFilename: string | undefined): boolean {
  return urlOrFilename !== undefined && TORRENT_LIKE.test(urlOrFilename);
}
