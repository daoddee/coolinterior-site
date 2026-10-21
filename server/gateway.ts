import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2.118.0";
Deno.serve(async(req:Request)=>{
  const headers={"Content-Type":"application/json","Cache-Control":"no-store"};
  if(req.method!=="POST")return new Response('{"error":"Method not allowed"}',{status:405,headers});
  const configuredSecret=(Deno.env.get("PANEL_GATEWAY_SECRET")||"").trim();
  if(configuredSecret.length<32)return new Response('{"error":"Gateway configuration incomplete"}',{status:503,headers});
  const expectedHash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(configuredSecret)))).map(b=>b.toString(16).padStart(2,"0")).join("");
  const token=req.headers.get("Authorization")?.replace(/^Bearer /,"")||"";
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token)))).map(b=>b.toString(16).padStart(2,"0")).join("");
  if(hash!==expectedHash)return new Response('{"error":"Unauthorized"}',{status:401,headers});
  try{
    const raw=await req.text();if(raw.length>1000000)throw new Error();
    const body=JSON.parse(raw);
    if(["storage/sign-upload","storage/verify","storage/sign-read","storage/remove"].includes(body.path)){
      if(body.method!=="POST")throw new Error();
      const input=typeof body.body==="string"?JSON.parse(body.body):body.body;
      const paths=input?.paths;
      if(!Array.isArray(paths)||!paths.length||paths.length>5||new Set(paths).size!==paths.length||paths.some((p:unknown)=>typeof p!=="string"||!(/^[a-f0-9-]{36}\/[a-f0-9-]{36}\.jpg$/i.test(p))))throw new Error();
      const storage=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}}).storage.from("ci-enquiry-photos");
      const output=[];
      if(body.path==="storage/remove"){
        const {error}=await storage.remove(paths);if(error)return new Response('{"error":"Photo removal unavailable"}',{status:503,headers});
        return new Response(JSON.stringify({ok:true}),{headers});
      }
      for(const path of paths){
        if(body.path==="storage/verify"){
          const {data,error}=await storage.download(path);if(error||!data)return new Response('{"error":"Photo upload incomplete"}',{status:409,headers});
          const bytes=new Uint8Array(await data.arrayBuffer());
          if(bytes.length<4||bytes.length>2097152||bytes[0]!==255||bytes[1]!==216||bytes[2]!==255||bytes[bytes.length-2]!==255||bytes[bytes.length-1]!==217)return new Response('{"error":"Invalid photo file"}',{status:400,headers});
          output.push({path,size:bytes.length});
        }else{
          const {data,error}=body.path==="storage/sign-upload"?await storage.createSignedUploadUrl(path,{upsert:false}):await storage.createSignedUrl(path,600);
          if(error||!data)return new Response('{"error":"Photo service unavailable"}',{status:503,headers});
          output.push({path,signedUrl:data.signedUrl});
        }
      }
      return new Response(JSON.stringify(output),{headers});
    }
    if(typeof body.path!=="string"||!(/^(ci_(?:enquiries|panel_owner)\?|rpc\/(?:ci_take_rate|ci_refresh_owner_alerts|ci_owner_alert_summary|ci_owner_alerts_read)$)/.test(body.path))||body.path.includes("#")||body.path.includes("..")||!["GET","POST","PATCH","DELETE"].includes(body.method))throw new Error();
    const result=await fetch(Deno.env.get("SUPABASE_URL")+"/rest/v1/"+body.path,{method:body.method,headers:{apikey:Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,Authorization:"Bearer "+Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),"Content-Type":"application/json",...(body.prefer?{Prefer:body.prefer}:{})},...(body.body?{body:body.body}:{})});
    return new Response(result.status===204?null:await result.text(),{status:result.status,headers});
  }catch{return new Response('{"error":"Invalid gateway request"}',{status:400,headers});}
});
