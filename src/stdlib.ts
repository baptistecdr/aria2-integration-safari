import reBasenamePosix from "@stdlib/regexp-basename-posix";
import reBasenameWindows from "@stdlib/regexp-basename-windows";

function isWindowsPath(filepath: string): boolean {
  const windowsPathRegex = /^[a-zA-Z]:\\/;
  return windowsPathRegex.test(filepath);
}

function basename(filepath: string): string {
  const result = isWindowsPath(filepath) ? reBasenameWindows().exec(filepath) : reBasenamePosix().exec(filepath);
  if (result === null || result.length !== 2) {
    return filepath;
  }
  return result[1];
}

export default basename;
