// Pas du jour : le Raccourci iPhone envoie le nombre de pas, Alcide le relit.
// Demande une liaison KV nommée STEPS (Pages > Settings > Bindings > KV namespace).
const H={"content-type":"application/json; charset=utf-8","cache-control":"no-store","access-control-allow-origin":"*"};
const J=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:H});
export async function onRequest({request,env}){
  if(request.method==="OPTIONS")return new Response(null,{headers:{...H,"access-control-allow-headers":"content-type"}});
  if(!env.STEPS)return J({error:"Liaison KV STEPS manquante"},500);
  const u=new URL(request.url),t=(u.searchParams.get("t")||"").trim();
  if(!/^[A-Za-z0-9_-]{16,64}$/.test(t))return J({error:"code invalide"},400);
  const key="s:"+t;
  let n=u.searchParams.get("n");
  if(n===null&&request.method==="POST"){try{const b=await request.json();n=b.n}catch(e){}}
  if(n!==null&&n!==undefined&&n!==""){
    const v=Math.round(parseFloat(String(n).replace(",",".")));
    if(!(v>=0&&v<200000))return J({error:"nombre invalide"},400);
    const o={n:v,ts:Date.now()};
    await env.STEPS.put(key,JSON.stringify(o),{expirationTtl:60*60*24*3});
    return J(o);
  }
  const raw=await env.STEPS.get(key);
  return J(raw?JSON.parse(raw):{n:null,ts:null});
}
