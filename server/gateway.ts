import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const EXPECTED_HASH="9bbec8bde1003fa567b3246ae1c981c8eb551508225361dfeacee5d839795bb2";
Deno.serve(async(req:Request)=>{
  const headers={"Content-Type":"application/json","Cache-Control":"no-store"};
  if(req.method!=="POST")return new Response('{"error":"Method not allowed"}',{status:405,headers});
  const token=req.headers.get("Authorization")?.replace(/^Bearer /,"")||"";
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token)))).map(b=>b.toString(16).padStart(2,"0")).join("");
  if(hash!==EXPECTED_HASH)return new Response('{"error":"Unauthorized"}',{status:401,headers});
  try{
    const raw=await req.text();if(raw.length>1000000)throw new Error();
    const body=JSON.parse(raw);
    if(typeof body.path!=="string"||!(/^(ci_(?:enquiries|panel_owner)\?|rpc\/ci_take_rate$)/.test(body.path))||body.path.includes("#")||body.path.includes("..")||!["GET","POST","PATCH","DELETE"].includes(body.method))throw new Error();
    const result=await fetch(Deno.env.get("SUPABASE_URL")+"/rest/v1/"+body.path,{method:body.method,headers:{apikey:Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,Authorization:"Bearer "+Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),"Content-Type":"application/json",...(body.prefer?{Prefer:body.prefer}:{})},...(body.body?{body:body.body}:{})});
    return new Response(result.status===204?null:await result.text(),{status:result.status,headers});
  }catch{return new Response('{"error":"Invalid gateway request"}',{status:400,headers});}
});
