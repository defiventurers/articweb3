import {build} from 'rolldown';
// Recompile both generated bundles with the same compiler. This removes compiler
// comment/bracing drift without accepting a changed executable bundle.
export async function canonicalBundle(source){
 const id='\0shanshui-parity.cjs';
 const result=await build({input:id,platform:'node',write:false,plugins:[{name:'parity-input',resolveId:input=>input===id?id:null,load:input=>input===id?source:null}],output:{format:'cjs',minify:true}});
 return result.output.find(item=>item.type==='chunk').code;
}
export async function sameExecutableBundle(a,b){return a===b||(await canonicalBundle(a))===(await canonicalBundle(b));}
