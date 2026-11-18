export function aiSearchHref(query:string|null,section?:"web"){
  const term=query?.trim();
  if(!term||term.length>240)return null;
  return `/jobs/?${new URLSearchParams({ai:term})}${section==="web"?"#web-results-heading":""}`;
}

export function withAiSearchQuery(href:string,query?:string){
  if(!query)return href;
  return `${href}${href.includes("?")?"&":"?"}${new URLSearchParams({ai:query})}`;
}
