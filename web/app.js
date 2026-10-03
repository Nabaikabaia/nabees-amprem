// ============================================
//  Obfuscated by Nabees Tech
//  Domain: git.nabees.online
//  WhatsApp: https://whatsapp.com/channel/0029VawtjOXJpe8X3j3NCZ3j
//  Protected - Do not redistribute
// ============================================
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.171.0/build/three.module.js';
const root=document.querySelector('#scene');
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,.1,100);camera.position.z=7;
const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);root.appendChild(renderer.domElement);
const group=new THREE.Group();scene.add(group);
const geo=new THREE.IcosahedronGeometry(2.25,3);const mat=new THREE.MeshBasicMaterial({color:0xd9ff42,wireframe:true,transparent:true,opacity:.16});const mesh=new THREE.Mesh(geo,mat);group.add(mesh);
const geo2=new THREE.IcosahedronGeometry(1.55,2);const mat2=new THREE.MeshBasicMaterial({color:0xffffff,wireframe:true,transparent:true,opacity:.08});const mesh2=new THREE.Mesh(geo2,mat2);group.add(mesh2);
const points=new THREE.BufferGeometry();const count=850;const arr=new Float32Array(count*3);for(let i=0;i<count*3;i++)arr[i]=(Math.random()-.5)*18;points.setAttribute('position',new THREE.BufferAttribute(arr,3));const pm=new THREE.PointsMaterial({color:0xd9ff42,size:.018,transparent:true,opacity:.6});const stars=new THREE.Points(points,pm);scene.add(stars);
let mx=0,my=0;addEventListener('pointermove',e=>{mx=(e.clientX/innerWidth-.5);my=(e.clientY/innerHeight-.5)});
function tick(){requestAnimationFrame(tick);mesh.rotation.x+=.0018;mesh.rotation.y+=.0027;mesh2.rotation.x-=.0012;mesh2.rotation.y-=.0018;group.rotation.y+=(mx*.35-group.rotation.y)*.015;group.rotation.x+=(-my*.22-group.rotation.x)*.015;stars.rotation.y+=.00025;renderer.render(scene,camera)}tick();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
const state=document.querySelector('#apiState');const setResult=(id,msg)=>document.querySelector(id).textContent=msg;
document.querySelector('#send').onclick=()=>{const email=document.querySelector('#email').value.trim();if(!email||!email.includes('@'))return setResult('#sendResult','Enter a valid email address.');setResult('#sendResult','Frontend ready. The original auth request is preserved in lib/auth.js; this static UI does not proxy credentials.');state.innerHTML='<i></i> READY / LOCAL UI'};
document.querySelector('#verify').onclick=()=>{const link=document.querySelector('#link').value.trim();setResult('#verifyResult',link?'Link/code captured. Use the original Node runtime to execute verification without changing its API connection.':'Paste a link or code first.')};
document.querySelector('#refresh').onclick=()=>setResult('#sessionResult','Refresh remains handled by the existing refresh-token implementation in lib/auth.js.');
document.querySelector('#inspect').onclick=()=>setResult('#sessionResult','Flow: magic link → verify → refresh → local sessions. Premium remains the repository stub.');
