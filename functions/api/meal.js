const MODEL="@cf/google/gemma-4-26b-a4b-it";
const J=(o,s=200)=>new Response(JSON.stringify(o,null,2),{status:s,headers:{"Content-Type":"application/json; charset=utf-8"}});
const SYS='Tu es nutritionniste. On te montre la photo d\'un repas. Réponds UNIQUEMENT par un tableau JSON, sans texte avant ni après, sans balises de code. Chaque élément : {"n":"nom de l\'aliment en français","g":grammes estimés (nombre),"k":kcal totales de cette portion (nombre),"p":protéines totales en g de cette portion (nombre)}. Ajoute l\'huile ou la sauce si probable.';
function textOf(r){
if(r==null)return"";if(typeof r==="string")return r;
const m=r.choices&&r.choices[0]&&r.choices[0].message;
let t=m?m.content:(r.response!==undefined?r.response:(r.result&&r.result.response));
if(Array.isArray(t))t=t.map(x=>(x&&x.text)||"").join("");
if((t==null||t==="")&&m&&m.reasoning_content)t=m.reasoning_content;
if(t&&typeof t==="object")t=JSON.stringify(t);
return t==null?"":String(t)}
function parseItems(t){
t=t.replace(/```[a-z]*/gi,"");
let arr=null;
const a=t.indexOf("["),b=t.lastIndexOf("]");
if(a>=0&&b>a){try{arr=JSON.parse(t.slice(a,b+1))}catch(e){}}
if(!arr){const c=t.indexOf("{"),d=t.lastIndexOf("}");if(c>=0&&d>c){try{const o=JSON.parse(t.slice(c,d+1));arr=o.items||o.aliments||o.foods||(Array.isArray(o)?o:[o])}catch(e){}}}
if(!Array.isArray(arr))return null;
const num=v=>{const x=parseFloat(String(v).replace(",","."));return isFinite(x)?x:0};
const out=arr.map(x=>({n:String(x.n||x.name||x.nom||x.aliment||"Aliment"),g:Math.round(num(x.g??x.grams??x.grammes??x.quantite)||100),k:Math.round(num(x.k??x.kcal??x.calories)),p:Math.round(num(x.p??x.protein??x.proteines??x.protéines)*10)/10}));
return out.length?out:null}
async function run(env,messages){
try{return await env.AI.run(MODEL,{messages,max_completion_tokens:1500,temperature:.2,chat_template_kwargs:{enable_thinking:false}})}
catch(e1){try{return await env.AI.run(MODEL,{messages,max_tokens:1500})}catch(e2){throw new Error(String(e2&&e2.message||e2))}}}
export async function onRequestGet({env}){
try{if(!env.AI)return J({ok:false,erreur:"Le branchement AI est introuvable sur ce déploiement."},500);
const r=await run(env,[{role:"user",content:"Réponds seulement : OK"}]);
return J({ok:true,modele:MODEL,reponse:textOf(r).slice(0,200)})}
catch(e){return J({ok:false,modele:MODEL,erreur:String(e&&e.message||e).slice(0,400)},500)}}
export async function onRequestPost({request,env}){
try{
if(!env.AI)return J({error:"Le branchement AI est introuvable sur ce déploiement (Cloudflare, Settings, Bindings)."},500);
const u=new Uint8Array(await request.arrayBuffer());
if(!u.length)return J({error:"Photo vide."},400);
let bin="";for(let i=0;i<u.length;i+=8192)bin+=String.fromCharCode.apply(null,u.subarray(i,i+8192));
const url="data:image/jpeg;base64,"+btoa(bin);
const r=await run(env,[{role:"system",content:SYS},{role:"user",content:[{type:"text",text:"Estime les aliments de ce plat."},{type:"image_url",image_url:{url}}]}]);
const t=textOf(r),items=parseItems(t);
if(!items)return J({error:"Réponse illisible de l'IA : "+(t.slice(0,160)||"(vide)")},502);
return J({items})}
catch(e){return J({error:String(e&&e.message||e).slice(0,300)},500)}}
