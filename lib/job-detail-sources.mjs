/** @param {unknown} value */
export function jobDetailSourceUrl(value) {
  if (typeof value !== "string" || value.length > 1000) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    const host = url.hostname.replace(/^www\./u, "");
    const path = url.pathname.replace(/\/$/u, "");
    if (host === "shixiseng.com" && /^\/intern\/inn_[a-z0-9]+$/u.test(path)) return `https://www.shixiseng.com${path}`;
    if (host === "nowcoder.com" && /^\/jobs\/detail\/\d{1,12}$/u.test(path)) return `https://www.nowcoder.com${path}`;
  } catch {}
  return null;
}
