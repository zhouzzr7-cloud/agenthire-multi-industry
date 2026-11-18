const campusJobHosts = new Set([
  "zccareer.zufe.edu.cn", "jy.usx.edu.cn", "job.hdu.edu.cn", "jyb.cjlu.edu.cn",
  "job.zcmu.edu.cn", "job.zyufl.edu.cn", "jxdxsjy.jx.edu.cn",
]);

export function isCampusJobHost(host) {
  return campusJobHosts.has(host);
}

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
    if (isCampusJobHost(host) && /^\/job\/view\/id\/\d{1,12}$/u.test(path)) return `https://${host}${path}`;
  } catch {}
  return null;
}
