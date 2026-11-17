import {mkdir,readdir,readFile,writeFile} from "node:fs/promises";
import {extname,join} from "node:path";
import {gzipSync} from "node:zlib";
import {build} from "esbuild";

const types = {
  ".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8",
  ".css":"text/css; charset=utf-8", ".txt":"text/plain; charset=utf-8",
  ".json":"application/json", ".svg":"image/svg+xml", ".ico":"image/x-icon",
  ".woff2":"font/woff2", ".png":"image/png", ".webp":"image/webp",
};
const assets=Object.create(null);

async function scan(dir,relative=""){
  for(const item of await readdir(dir,{withFileTypes:true})){
    const path=join(dir,item.name);
    const key=relative+"/"+item.name;
    if(item.isDirectory())await scan(path,key);
    else if(!item.name.endsWith(".map")){
      assets[key]=[types[extname(item.name)]??"application/octet-stream",gzipSync(await readFile(path)).toString("base64")];
    }
  }
}
await scan("out");
if(!assets["/index.html"]||!assets["/404.html"])throw new Error("Missing expected Next.js pages");
await mkdir("dist/server",{recursive:true});
await mkdir("dist/.openai",{recursive:true});
await build({
  entryPoints:["worker/index.mjs"],outfile:"dist/server/index.js",bundle:true,format:"esm",platform:"browser",
  plugins:[{name:"inline-static-export",setup(plugin){
    plugin.onResolve({filter:/^\.\/assets\.mjs$/},()=>({path:"assets",namespace:"inline-static-export"}));
    plugin.onLoad({filter:/.*/,namespace:"inline-static-export"},()=>({contents:"export default "+JSON.stringify(assets),loader:"js"}));
  }}],
});
await writeFile("dist/.openai/hosting.json",await readFile(".openai/hosting.json"));
