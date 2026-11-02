const J=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{"Content-Type":"application/json"}});
export async function onRequestPost({request,env}){
try{
if(!env.AI)return J({error:"IA non activée sur Cloudflare (binding AI manquant)."},500);
const u=new Uint8Array(await request.arrayBuffer());let bin="";
for(let i=0;i<u.length;i+=8192)bin+=String.fromCharCode.apply(null,u.subarray(i,i+8192));
const url="data:image/jpeg;base64,"+btoa(bin);
const r=await env.AI.run("@cf/google/gemma-4-26b-a4b-it",{messages:[
{role:"system",content:'Tu es nutritionniste. Tu analyses la photo d\'un repas. Réponds UNIQUEMENT par un tableau JSON, sans autre texte. Chaque élément : {"n":"nom de l\'aliment en français","g":grammes estimés,"k":kcal totales de cette portion,"p":protéines totales en g de cette portion}. Ajoute huile ou sauce si probable.'},
{role:"user",content:[{type:"text",text:"Estime les aliments de ce plat."},{type:"image_url",image_url:{url}}]}],max_tokens:700});
let t=r&&r.choices&&r.choices[0]&&r.choices[0].message?r.choices[0].message.content:(r&&r.response)||"";
if(Array.isArray(t))t=t.map(x=>x.text||"").join("");
const m=String(t).match(/\[[\s\S]*\]/);
if(!m)return J({error:"Réponse illisible de l'IA."},502);
const items=JSON.parse(m[0]).map(x=>({n:String(x.n||"Aliment"),g:Math.round(+x.g||100),k:Math.round(+x.k||0),p:Math.round((+x.p||0)*10)/10}));
return J({items})}catch(e){return J({error:String(e).slice(0,200)},500)}}
