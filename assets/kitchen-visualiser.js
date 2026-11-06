const root=document.querySelector('[data-kitchen-visualiser]');
if(root){
const palette={ivory:{name:'Warm ivory',color:'#e8dfcc'},stone:{name:'Sand beige',color:'#c6bca6'},white:{name:'Soft white',color:'#eeeae2'},sage:{name:'Sage green',color:'#9cae9c'},charcoal:{name:'Charcoal',color:'#444c49'},terracotta:{name:'Terracotta',color:'#ba7658'}};
const defaults={wall:'sage',floor:'stone',wallType:'ceramic',floorType:'porcelain',wallSize:'metro',floorSize:'600',grout:'tonal',layout:'horizontal',cabinet:'oak'};
const sizes={metro:[.2,.1],square:[.15,.15],large:[.6,.3]};
const types={ceramic:'Glazed ceramic',porcelain:'Stone-effect porcelain',marble:'Marble-effect porcelain',terrazzo:'Terrazzo-effect porcelain',wood:'Wood-effect porcelain'};
let state={...defaults},saved=null,previewing=false,engine=null;
const $=q=>root.querySelector(q),status=$('[data-status]'),launch=$('[data-launch]'),start=$('[data-start]'),quote=$('[data-design-quote]');
function summary(s){const w=sizes[s.wallSize];return `${palette[s.wall].name} ${types[s.wallType]} splashback, ${Math.round(w[0]*1000)} × ${Math.round(w[1]*1000)} mm; ${palette[s.floor].name} ${types[s.floorType]} floor, ${s.floorSize==='plank'?'900 × 150':s.floorSize==='1200'?'1200 × 600':s.floorSize+' × '+s.floorSize} mm; ${s.grout} grout; ${s.layout} splashback; ${s.cabinet} cabinets`;}
function update(){
 for(const type of ['wall','floor']){root.querySelectorAll(`[data-${type}]`).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset[type]===state[type])));$(`[data-${type}-name]`).textContent=palette[state[type]].name;}
 for(const k of ['wallType','floorType','wallSize','floorSize','grout','layout','cabinet'])$(`[data-control="${k}"]`).value=state[k];
 quote.dataset.inspiration='Kitchen 3D design: '+summary(state)+'. Indicative room: 3.6 × 3.2 m. Please discuss suitable tiles and a quotation.';
 if(engine)engine.update(state);
}
function change(k,v){state[k]=v;previewing=false;$('[data-compare]').textContent='View saved look';update();status.textContent='Current look: '+summary(state)+'.';}
for(const type of ['wall','floor'])for(const [id,p] of Object.entries(palette)){
 const b=document.createElement('button');b.type='button';b.dataset[type]=id;b.style.setProperty('--swatch',p.color);b.title=p.name;b.setAttribute('aria-label',type+' tiles: '+p.name);b.addEventListener('click',()=>change(type,id));$(`[data-${type}-swatches]`).append(b);
}
for(const el of root.querySelectorAll('[data-control]'))el.addEventListener('change',()=>change(el.dataset.control,el.value));
$('[data-save]').addEventListener('click',()=>{saved={...state};$('[data-compare]').disabled=false;status.textContent='Look saved for this visit. Change the tiles, then compare your two designs.';});
let current=null;
$('[data-compare]').addEventListener('click',()=>{if(!saved)return;if(!previewing){current={...state};state={...saved};previewing=true;}else{state={...current};previewing=false;}update();$('[data-compare]').textContent=previewing?'Back to current look':'View saved look';status.textContent=previewing?'Showing your saved look.':'Showing your current look.';});
$('[data-reset]').addEventListener('click',()=>{state={...defaults};previewing=false;update();$('[data-compare]').textContent='View saved look';engine?.view('perspective');status.textContent='Original design and camera restored.';});
for(const b of root.querySelectorAll('[data-view]'))b.addEventListener('click',()=>engine?.view(b.dataset.view));
start.addEventListener('click',async()=>{
 start.disabled=true;start.textContent='Opening your kitchen…';
 try{
 const THREE=await import('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js');
 engine=buildScene(THREE,$('[data-stage]'));engine.update(state);launch.hidden=true;$('[data-scene-tools]').hidden=false;status.textContent='3D ready. Drag to rotate, pinch or scroll to zoom. Arrow keys rotate; + and − zoom.';
 }catch(e){start.disabled=false;start.textContent='Try opening 3D again';status.textContent='The 3D view could not load. Please check your connection or try a browser with WebGL enabled. You can still select finishes and request a quote.';}
});
update();
// A projected canvas renderer keeps the same 3D geometry interactive on devices
// that cannot create a WebGL context. It renders on demand, never in an idle loop.
function canvasRenderer(T){
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas unavailable');
 let width=1,height=1,ratio=1;const light=new T.Vector3(.4,.8,.6).normalize();
 return {domElement:canvas,shadowMap:{},setPixelRatio(v){ratio=Math.min(v,1.5);},setClearColor(){},setSize(w,h){width=w;height=h;canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);},render(scene,camera){
 scene.updateMatrixWorld();camera.updateMatrixWorld();const vp=new T.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse),triangles=[];
 scene.traverse(mesh=>{if(!mesh.isMesh||!mesh.visible)return;const geo=mesh.geometry;if(geo.type==='BoxGeometry'){const d=geo.parameters;if([d.width,d.height,d.depth].filter(n=>n>1.04).length>=2)return;}const pos=geo.attributes.position,uv=geo.attributes.uv,idx=geo.index;const n=idx?idx.count:pos.count,mvp=new T.Matrix4().multiplyMatrices(vp,mesh.matrixWorld),normalMatrix=new T.Matrix3().getNormalMatrix(mesh.matrixWorld);
 for(let i=0;i<n;i+=geo.type==='BoxGeometry'?6:3){let mat=mesh.material;if(Array.isArray(mat)){const group=geo.groups.find(g=>i>=g.start&&i<g.start+g.count);mat=mat[group?.materialIndex||0];}if(!mat||mat.isShadowMaterial||mat.opacity===0)continue;
 const ids=[0,1,2].map(k=>idx?idx.getX(i+k):i+k),p=ids.map(j=>new T.Vector3().fromBufferAttribute(pos,j).applyMatrix4(mvp));if(p.some(v=>v.z < -1||v.z>1))continue;
 const pts=p.map(v=>[(v.x*.5+.5)*width,(-v.y*.5+.5)*height]);let polygon=pts;if(geo.type==='BoxGeometry'){const d=new T.Vector3().fromBufferAttribute(pos,idx.getX(i+4)).applyMatrix4(mvp);polygon=[pts[0],pts[1],[(d.x*.5+.5)*width,(-d.y*.5+.5)*height],pts[2]];}const area=(pts[1][0]-pts[0][0])*(pts[2][1]-pts[0][1])-(pts[1][1]-pts[0][1])*(pts[2][0]-pts[0][0]);if(mat.side!==T.DoubleSide&&area>=0)continue;if(Math.abs(area)<.02)continue;
 const a=new T.Vector3().fromBufferAttribute(pos,ids[0]),b=new T.Vector3().fromBufferAttribute(pos,ids[1]),c=new T.Vector3().fromBufferAttribute(pos,ids[2]),normal=b.sub(a).cross(c.sub(a)).normalize().applyMatrix3(normalMatrix).normalize();
 triangles.push({pts,polygon,z:(p[0].z+p[1].z+p[2].z)/3,mat,shade:.72+.28*Math.max(0,normal.dot(light)),uv:uv?ids.map(j=>[uv.getX(j),uv.getY(j)]):null});}
 });
 triangles.sort((a,b)=>b.z-a.z);ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height);
 for(const t of triangles){const p=t.pts;ctx.save();ctx.globalAlpha=t.mat.transparent?t.mat.opacity:1;ctx.beginPath();ctx.moveTo(...p[0]);for(const point of t.polygon.slice(1))ctx.lineTo(...point);ctx.closePath();ctx.fillStyle=t.mat.color?.getStyle()||'#d7d9d0';ctx.fill();if(!t.mat.transparent&&!t.mat.map){ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=.5;ctx.stroke();}
 const image=t.mat.map?.image;if(image&&t.uv){ctx.clip();const u=t.uv.map(([x,y])=>[x*image.width,(1-y)*image.height]),den=u[0][0]*(u[1][1]-u[2][1])+u[1][0]*(u[2][1]-u[0][1])+u[2][0]*(u[0][1]-u[1][1]);if(Math.abs(den)>.01){const solve=axis=>[(p[0][axis]*(u[1][1]-u[2][1])+p[1][axis]*(u[2][1]-u[0][1])+p[2][axis]*(u[0][1]-u[1][1]))/den,(p[0][axis]*(u[2][0]-u[1][0])+p[1][axis]*(u[0][0]-u[2][0])+p[2][axis]*(u[1][0]-u[0][0]))/den,(p[0][axis]*(u[1][0]*u[2][1]-u[2][0]*u[1][1])+p[1][axis]*(u[2][0]*u[0][1]-u[0][0]*u[2][1])+p[2][axis]*(u[0][0]*u[1][1]-u[1][0]*u[0][1]))/den];const x=solve(0),y=solve(1);ctx.transform(x[0],y[0],x[1],y[1],x[2],y[2]);ctx.drawImage(image,0,0);}}
 ctx.restore();ctx.save();ctx.globalAlpha=(1-t.shade)*(t.mat.transparent?t.mat.opacity:1);ctx.fillStyle='#142419';ctx.beginPath();ctx.moveTo(...p[0]);for(const point of t.polygon.slice(1))ctx.lineTo(...point);ctx.closePath();ctx.fill();ctx.restore();}
 }};
}

function buildScene(T,host){
 let renderer;try{renderer=new T.WebGLRenderer({antialias:true,alpha:true});}catch{renderer=canvasRenderer(T);}renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.setClearColor(0xeef0e9,0);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Interactive 3D cutaway of a kitchen. Drag or use arrow keys to rotate. Plus and minus zoom.');host.prepend(canvas);
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(38,1,.05,100);let theta=.6,phi=1.03,radius=9.3;const target=new T.Vector3(0,.95,0);
 scene.add(new T.HemisphereLight(0xfffaf1,0x6c7967,2.5));
 const sun=new T.DirectionalLight(0xfff2dd,3.2);sun.position.set(2.8,6,4);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-4,right:4,top:4,bottom:-4,near:.5,far:15});sun.shadow.bias=-.001;scene.add(sun);
 const fill=new T.DirectionalLight(0xffffff,1.4);fill.position.set(-3,3,0);scene.add(fill);
 const solid=(c,rough=.6,metal=0)=>new T.MeshStandardMaterial({color:c,roughness:rough,metalness:metal});
 const white=solid(0xf6f3ea,.25),oak=solid(0x9a7752,.7),metal=solid(0xaea897,.25,.8),black=solid(0x2d3931,.4),base=solid(0xc6ccb9);
 function box(w,h,d,x,y,z,mat,parent=scene){const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 function cyl(rt,rb,h,x,y,z,mat){const m=new T.Mesh(new T.CylinderGeometry(rt,rb,h,24),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);return m;}
 function sphere(x,y,z,sx,sy,sz,mat){const m=new T.Mesh(new T.SphereGeometry(1,24,12),mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;scene.add(m);return m;}
 box(3.76,.15,3.36,0,-.09,0,base);box(3.7,2.55,.09,0,1.275,-1.65,solid(0xe8e4da));box(.09,2.55,3.3,-1.85,1.275,0,solid(0xe8e4da));
 const cabinets=new T.Group();scene.add(cabinets);
 const cabinetMat=solid(0x9a7752,.65);
 // L-shaped base units, doors, handles, stone worktops and wall cupboards.
 box(3.5,.78,.62,0,.49,-1.27,cabinetMat,cabinets);box(.62,.78,1.88,-1.48,.49,.01,cabinetMat,cabinets);
 box(3.62,.055,.7,0,.915,-1.25,white);box(.7,.055,1.98,-1.48,.915,.04,white);
 const seam=solid(0x3a4037),brass=solid(0xa98d52,.27,.72);
 for(let x=-1.46;x<1.75;x+=.58){box(.012,.69,.013,x,.49,-.952,seam);box(.22,.018,.028,x+.27,.77,-.93,brass);}
 for(let z=-.55;z<.91;z+=.56){box(.013,.69,.012,-1.16,.49,z,seam);box(.028,.018,.22,-1.14,.77,z+.26,brass);}
 // Oven, hob and extractor hood.
 box(.55,.56,.025,.92,.51,-.936,black);box(.49,.35,.012,.92,.48,-.918,solid(0x1d2526,.18,.4));box(.4,.025,.035,.92,.73,-.9,metal);
 box(.61,.016,.49,.92,.955,-1.25,black);for(const x of [.77,1.08])for(const z of [-1.39,-1.12])cyl(.095,.095,.009,x,.968,z,metal);
 box(.76,.09,.53,.92,1.76,-1.36,metal);box(.34,.75,.25,.92,2.16,-1.5,metal);
 // Sink and mixer tap on the left return.
 box(.44,.018,.57,-1.47,.952,.04,metal);box(.35,.02,.43,-1.47,.967,.04,solid(0x5c6a68,.25,.6));cyl(.018,.018,.3,-1.7,1.1,.04,metal);box(.22,.025,.025,-1.6,1.25,.04,metal);
 for(const x of [-1.18,-.56,.06]){box(.57,.63,.34,x,1.99,-1.43,cabinetMat,cabinets);box(.16,.016,.025,x,1.74,-1.247,brass);}
 // Compact island, with a pale worktop and two stools.
 box(1.3,.83,.65,.45,.49,.58,cabinetMat,cabinets);box(1.5,.06,.88,.45,.94,.65,white);
 for(const x of [.04,.86]){cyl(.2,.2,.06,x,.63,1.22,oak);for(const dx of [-.12,.12])for(const dz of [-.12,.12])box(.025,.59,.025,x+dx,.31,1.22+dz,black);}
 // A chopping board and small plant keep the scale recognisable.
 box(.36,.025,.22,-.45,.965,-1.25,oak);cyl(.075,.055,.14,-1.47,1.02,.73,solid(0xb9a787));for(let i=0;i<6;i++){const a=i*2.4;sphere(-1.47+Math.cos(a)*.06,1.17+i*.012,.73+Math.sin(a)*.06,.04,.1,.025,solid(0x607b46));}
 const surfaces=new T.Group();scene.add(surfaces);let textures=[],mats=[];
 function texture(p,grout){const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');ctx.fillStyle=p.color;ctx.fillRect(0,0,256,256);let seed=8;const rand=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
 for(let i=0;i<4200;i++){ctx.fillStyle=`rgba(${rand()>.5?'255,255,255':'40,40,30'},${p.kind==='plain'?.018:.04})`;ctx.fillRect(rand()*256,rand()*256,rand()*4+1,1);}
 if(p.kind==='marble')for(let j=0;j<6;j++){ctx.beginPath();let x=rand()*320-60;ctx.moveTo(x,0);for(let y=0;y<=280;y+=12){x+=rand()*24-8;ctx.lineTo(x,y);}ctx.strokeStyle='rgba(90,98,91,.2)';ctx.lineWidth=j%2?.9:2.4;ctx.stroke();}
 if(p.kind==='terrazzo')for(let i=0;i<150;i++){const x=rand()*256,y=rand()*256;ctx.fillStyle=['#f5efe0','#8b9489','#bc8c72','#6b756e'][i%4];ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+rand()*11+3,y+3);ctx.lineTo(x+2,y+rand()*10+4);ctx.closePath();ctx.fill();}
 if(p.kind==='wood')for(let i=0;i<95;i++){ctx.strokeStyle=`rgba(65,40,20,${rand()*.18})`;ctx.lineWidth=rand()*2+.4;ctx.beginPath();let x=rand()*256;ctx.moveTo(x,0);for(let y=0;y<=256;y+=16)ctx.lineTo(x+Math.sin(y*.03+i)*3,y);ctx.stroke();}
 ctx.strokeStyle=grout;ctx.lineWidth=2;ctx.strokeRect(0,0,256,256);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;textures.push(t);return t;}
 function update(s){for(const m of [...surfaces.children]){surfaces.remove(m);m.geometry.dispose();}mats.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());mats=[];textures=[];
 const kind=t=>t==='marble'?'marble':t==='terrazzo'?'terrazzo':t==='wood'?'wood':t==='ceramic'?'plain':'stone';const wp={...palette[s.wall],kind:kind(s.wallType)},fp={...palette[s.floor],kind:kind(s.floorType)};cabinetMat.color.set(s.cabinet==='oak'?0x9a7752:s.cabinet==='white'?0xeeeae1:0x304d40);const groutColor=s.grout==='tonal'?new T.Color(wp.color).multiplyScalar(.83):s.grout==='light'?new T.Color('#ece9dd'):new T.Color('#59615a');
 const gm=new T.MeshStandardMaterial({color:groutColor,roughness:1}),fg=new T.MeshStandardMaterial({color:s.grout==='tonal'?new T.Color(fp.color).multiplyScalar(.8):groutColor,roughness:1});mats.push(gm,fg);
 const wm=new T.MeshStandardMaterial({map:texture(wp,groutColor.getStyle()),roughness:wp.kind==='marble'?.28:.65}),fm=new T.MeshStandardMaterial({map:texture(fp,(s.grout==='tonal'?new T.Color(fp.color).multiplyScalar(.8):groutColor).getStyle()),roughness:.78});mats.push(wm,fm);
 box(3.6,.72,.012,0,1.31,-1.594,gm,surfaces);box(.012,.72,2.22,-1.794,1.31,-.49,gm,surfaces);box(3.6,.012,3.2,0,0,0,fg,surfaces);
 let [tw,th]=sizes[s.wallSize];if(s.layout==='vertical')[tw,th]=[th,tw];const gap=.003;
 function grid(width,height,w,h,place,mat){for(let a=0;a<width-.001;a+=w)for(let b=0;b<height-.001;b+=h){const aw=Math.min(w,width-a),bh=Math.min(h,height-b);place(a+aw/2,b+bh/2,Math.max(.004,aw-gap),Math.max(.004,bh-gap),mat);}}
 grid(3.6,.72,tw,th,(a,b,w,h,m)=>box(w,h,.014,a-1.8,b+.95,-1.58,m,surfaces),wm);
 grid(2.22,.72,tw,th,(a,b,w,h,m)=>box(.014,h,w,-1.78,b+.95,a-1.6,m,surfaces),wm);
 const [fw,fh]=s.floorSize==='plank'?[.9,.15]:s.floorSize==='1200'?[1.2,.6]:[Number(s.floorSize)/1000,Number(s.floorSize)/1000];grid(3.6,3.2,fw,fh,(a,b,w,h,m)=>box(w,.014,h,a-1.8,.014,b-1.6,m,surfaces),fm);render();}
 const floor=new T.Mesh(new T.PlaneGeometry(200,200),new T.ShadowMaterial({opacity:.12}));floor.rotation.x=-Math.PI/2;floor.position.y=-.17;floor.receiveShadow=true;scene.add(floor);
 function render(){camera.position.set(target.x+radius*Math.sin(phi)*Math.sin(theta),target.y+radius*Math.cos(phi),target.z+radius*Math.sin(phi)*Math.cos(theta));camera.lookAt(target);renderer.render(scene,camera);}
 function resize(){const {width,height}=host.getBoundingClientRect();renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();render();}new ResizeObserver(resize).observe(host);
 let pointers=new Map(),last=null,dist=0;canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);last=[e.clientX,e.clientY];if(pointers.size===2){const a=[...pointers.values()];dist=Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1]);}});
 canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,[e.clientX,e.clientY]);if(pointers.size===2){const a=[...pointers.values()],d=Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1]);radius=Math.max(5.5,Math.min(12,radius+(dist-d)*.012));dist=d;}else if(last){theta=Math.max(-.12,Math.min(1.48,theta-(e.clientX-last[0])*.006));phi=Math.max(.3,Math.min(1.43,phi-(e.clientY-last[1])*.006));}last=[e.clientX,e.clientY];render();});
 const release=e=>{pointers.delete(e.pointerId);last=null;};canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('wheel',e=>{e.preventDefault();radius=Math.max(5.5,Math.min(12,radius+e.deltaY*.005));render();},{passive:false});
 canvas.addEventListener('keydown',e=>{let used=true;if(e.key==='ArrowLeft')theta-=.08;else if(e.key==='ArrowRight')theta+=.08;else if(e.key==='ArrowUp')phi-=.08;else if(e.key==='ArrowDown')phi+=.08;else if(e.key==='+'||e.key==='=')radius-=.3;else if(e.key==='-')radius+=.3;else used=false;if(used){e.preventDefault();theta=Math.max(-.12,Math.min(1.48,theta));phi=Math.max(.3,Math.min(1.43,phi));radius=Math.max(5.5,Math.min(12,radius));render();}});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();status.textContent='The 3D view was paused by your device. Reload this page to reopen it; you can still request a quote.';});
 resize();return {update,view(which){if(which==='front'){theta=0;phi=1.22;radius=9.1;}else if(which==='overhead'){theta=.45;phi=.32;radius=9.5;}else{theta=.6;phi=1.03;radius=9.3;}render();}};
}
}

