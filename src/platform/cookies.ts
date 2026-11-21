export function formatCookies(cookies: browser.cookies.Cookie[]) {
  return cookies.reduce((acc, cookie) => {
    return `${acc}${cookie.name}=${cookie.value};`;
  }, "");
}

// Returns the cookies to send with a request to the URL, as a Cookie header value.
export async function getCookies(url: string, cookieStoreID?: string): Promise<string> {
  return formatCookies(await browser.cookies.getAll({ url, storeId: cookieStoreID }));
}
