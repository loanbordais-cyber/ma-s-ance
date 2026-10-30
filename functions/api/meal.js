const J=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{"Content-Type":"application/json"}});
export async function onRequestPost({request,env}){
try{
if(!env.AI)return J({error:"IA non activée sur Cloudflare (binding AI manquant)."},500);
const buf=await request.arrayBuffer();
const d=await env.AI.run("@cf/llava-hf/llava-1.5-7b-hf",{image:[...new Uint8Array(buf)],prompt:"List every food visible on this plate or bowl, with an estimated weight in grams for each. Be concise.",max_tokens:300});
const desc=d.description||d.response||"";
const r=await env.AI.run("@cf/meta/llama-3.1-8b-instruct",{messages:[{role:"system",content:'You are a nutritionist. Reply ONLY with a JSON array, no other text. Each item: {"n":"food name in French","g":grams,"k":total kcal for that portion,"p":total protein grams for that portion}. Add cooking oil or sauce if likely.'},{role:"user",content:desc}],max_tokens:500});
const m=String(r.response||"").match(/\[[\s\S]*\]/);
if(!m)return J({error:"Réponse illisible de l'IA."},502);
const items=JSON.parse(m[0]).map(x=>({n:String(x.n||"Aliment"),g:Math.round(+x.g||100),k:Math.round(+x.k||0),p:Math.round((+x.p||0)*10)/10}));
return J({items})}catch(e){return J({error:String(e).slice(0,200)},500)}}
