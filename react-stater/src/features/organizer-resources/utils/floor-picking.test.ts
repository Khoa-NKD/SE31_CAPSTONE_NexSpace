import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFloorScene } from './floor-scene-3d.ts';
import { floorProjection, pickFloorResource } from './floor-picking.ts';
const layout = {
 floor:{id:1,name:'Floor',floorNumber:1,status:'PUBLISHED',revision:'test'},
 width:600,height:480,pixelsPerMetre:60,editableLayout:false,
 resources:[{id:7,code:'ROOM',name:'Room',category:'ROOM',posX:120,posY:120,width:240,height:180,rotation:25,status:'ACTIVE',revision:'test'}],decorations:[]
} as const;
test('clicking a rotated 3D room resolves its ID using the renderer camera at multiple angles',()=>{
 const mesh=buildFloorScene(layout as never,600,480,0,false);
 assert.equal(mesh.triangleResources?.length,mesh.vertices.length/27);
 for(const yaw of [0,Math.PI/4,-Math.PI/3]){
 const camera={yaw,elevation:Math.PI/2,zoom:1.5,panX:.1,panY:-.2};
 const p=floorProjection(mesh,camera,1.5);
 const v=[4-p.target[0],.022-p.target[1],3.5-p.target[2]];
 const dot=(a:number[])=>v[0]*a[0]+v[1]*a[1]+v[2]*a[2];
 assert.equal(pickFloorResource(mesh,camera,1.5,dot(p.right)/p.spanX+camera.panX,dot(p.up)/p.spanY+camera.panY),7);
 assert.equal(pickFloorResource(mesh,camera,1.5,2,2),null);
 }
});
test('outer walls follow the saved floor and door opening without changing layout coordinates',()=>{
 const snapshot=JSON.stringify(layout);
 const withDoor={...layout,resources:[],decorations:[{id:'entry',kind:'OTHER',icon:'DOOR',label:'Entry',posX:240,posY:0,width:60,height:6,rotation:0,color:'#90aabb'}]};
 const walls=buildFloorScene(withDoor as never,600,480,0,true);
 const flat=buildFloorScene({...withDoor,decorations:[]} as never,600,480,0,false);
 assert.ok(walls.vertices.length>flat.vertices.length); assert.ok(walls.maxHeight>=2.7);
 for(let i=0;i<walls.vertices.length;i+=9){
  assert.ok(walls.vertices[i]>=-.001&&walls.vertices[i]<=10.001);
  assert.ok(walls.vertices[i+2]>=-.1&&walls.vertices[i+2]<=8.001);
 }
 const wallPaint=[0xe6/255,0xe4/255,0xe1/255];
 for(let i=0;i<walls.vertices.length;i+=27){
  if(!wallPaint.every((c,j)=>Math.abs(walls.vertices[i+6+j]-c)<.0001))continue;
  const centerX=(walls.vertices[i]+walls.vertices[i+9]+walls.vertices[i+18])/3;
  const maxY=Math.max(walls.vertices[i+1],walls.vertices[i+10],walls.vertices[i+19]);
  const minY=Math.min(walls.vertices[i+1],walls.vertices[i+10],walls.vertices[i+19]);
  const maxZ=Math.max(walls.vertices[i+2],walls.vertices[i+11],walls.vertices[i+20]);
  if(centerX>4&&centerX<5&&maxZ<.09&&maxY>0.1)assert.ok(minY>=2.119,'Door opening must not contain a wall below its lintel');
 }
 assert.equal(JSON.stringify(layout),snapshot);
});
