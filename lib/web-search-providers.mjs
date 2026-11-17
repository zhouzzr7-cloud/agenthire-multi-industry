export const searchProviderLabels = Object.freeze({
  deepseek: "DeepSeek",
  bocha: "博查",
  perplexity: "Perplexity",
  tavily: "Tavily",
  brave: "Brave Search",
  exa: "Exa",
});

/**
 * @param {unknown} value
 * @returns {value is keyof typeof searchProviderLabels}
 */
export function isSearchProvider(value) {
  return typeof value === "string" && Object.hasOwn(searchProviderLabels, value);
}
