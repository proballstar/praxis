export type Table={id:string;capacity:number;x:number;y:number};
export type Employee={id:string;name:string;role:'server'|'cook';active:boolean};
export type Party={id:string;name:string;size:number;time:number;status:'reserved'|'waiting'|'seated'|'done';table?:string;server?:string;end?:number;order?:'queued'|'cooking'|'served'};
export type State={now:number;tables:Table[];employees:Employee[];parties:Party[];history:{size:number;minutes:number}[];log:string[]};
export type Assignment={party:string;table:string;server:string;start:number;end:number;reason:string};
export const clock=(n:number)=>`${Math.floor(n/60)%12||12}:${String(n%60).padStart(2,'0')} ${n>=720?'PM':'AM'}`;
export const duration=(s:State,size:number)=>{const h=s.history.filter(h=>Math.abs(h.size-size)<=1);return h.length?Math.round(h.reduce((a,b)=>a+b.minutes,0)/h.length):size>=5?100:75};
export function sample():State{return {now:1125,tables:[2,2,4,4,4,4,6,6,2,4].map((capacity,i)=>({id:`T${String(i+1).padStart(2,'0')}`,capacity,x:i%3,y:Math.floor(i/3)})),employees:[['s1','Alex','server'],['s2','Jamie','server'],['s3','Morgan','server'],['c1','Sam','cook'],['c2','River','cook']].map(([id,name,role])=>({id,name,role:role as Employee['role'],active:true})),history:[{size:2,minutes:65},{size:2,minutes:75},{size:4,minutes:80},{size:4,minutes:90},{size:6,minutes:95},{size:6,minutes:105}],parties:[{id:'p1',name:'Bennett',size:4,time:1065,status:'seated',table:'T03',server:'s1',end:1150,order:'served'},{id:'p2',name:'Williams',size:6,time:1050,status:'seated',table:'T07',server:'s2',end:1140,order:'served'},{id:'p3',name:'Chen',size:2,time:1100,status:'seated',table:'T01',server:'s3',end:1170,order:'cooking'},{id:'p4',name:'Martinez',size:4,time:1110,status:'seated',table:'T05',server:'s1',end:1195,order:'queued'},{id:'p5',name:'Thompson',size:2,time:1125,status:'waiting'},{id:'p6',name:'Davis',size:4,time:1140,status:'reserved'},{id:'p7',name:'Anderson',size:6,time:1170,status:'reserved'},{id:'p8',name:'Wilson',size:6,time:1230,status:'reserved'},{id:'p9',name:'Patel',size:2,time:1185,status:'reserved'},{id:'p10',name:'Robinson',size:4,time:1200,status:'reserved'}],log:['Service opened · 6:45 PM']}}
// Deterministic rolling-horizon planner. Commitments are inserted first and never moved.
export function optimize(s:State){
 const servers=s.employees.filter(e=>e.role==='server'&&e.active);const slots:Record<string,{start:number;end:number}[]>={};const loads:Record<string,number>={};s.tables.forEach(t=>slots[t.id]=[]);servers.forEach(e=>loads[e.id]=0);
 s.parties.filter(p=>p.status==='seated').forEach(p=>{if(p.table&&slots[p.table])slots[p.table].push({start:s.now,end:Math.max(s.now+5,p.end||s.now+duration(s,p.size))});if(p.server&&loads[p.server]!==undefined)loads[p.server]+=p.size});
 const assignments:Assignment[]=[];const unassigned:string[]=[];
 // Protect reservations before allocating arrivals; delay is allowed but overlap never is.
 const pending=s.parties.filter(p=>p.status==='reserved'||p.status==='waiting').sort((a,b)=>(a.status==='reserved'?0:1)-(b.status==='reserved'?0:1)||a.time-b.time||a.id.localeCompare(b.id));
 for(const p of pending){let best:Assignment|undefined;let score=Infinity;if(!servers.length){unassigned.push(p.id);continue}const d=duration(s,p.size);for(const t of s.tables.filter(t=>t.capacity>=p.size)){for(let start=(p.status==='waiting'?s.now:Math.max(s.now,p.time));start<=(p.status==='waiting'?s.now:Math.max(s.now,p.time))+180;start+=5){if(slots[t.id].some(b=>start<b.end&&start+d>b.start))continue;const server=[...servers].sort((a,b)=>loads[a.id]-loads[b.id]||a.id.localeCompare(b.id))[0];const cost=(start-Math.max(s.now,p.time))*10+(t.capacity-p.size)*3+loads[server.id]*2;if(cost<score){score=cost;best={party:p.id,table:t.id,server:server.id,start,end:start+d,reason:`Fits ${p.size} guests · ${d} min historical dining estimate · protects existing commitments`}}break}}
 if(best){assignments.push(best);slots[best.table].push(best);loads[best.server]+=p.size}else unassigned.push(p.id);
 }
 const wait=assignments.filter(a=>s.parties.find(p=>p.id===a.party)?.status==='waiting').reduce((n,a)=>n+a.start-s.now,0);const conflicts=assignments.filter(a=>a.start>Math.max(s.now,s.parties.find(p=>p.id===a.party)!.time)).length+unassigned.length;const kitchen=s.parties.filter(p=>p.status==='seated'&&p.order!=='served').reduce((n,p)=>n+p.size,0);const capacity=s.employees.filter(e=>e.role==='cook'&&e.active).length*12;
 return {assignments,unassigned,wait,conflicts,loads,kitchen,capacity};
}
export type Action={type:'checkin'|'seat'|'depart'|'delay'|'order';id:string}|{type:'walkin';name:string;size:number;time?:number}|{type:'advance'}|{type:'callout';id:string};
export function act(state:State,a:Action):State{const s=structuredClone(state);const p='id'in a?s.parties.find(p=>p.id===a.id):undefined;
 if(a.type==='advance')s.now+=5;
 if(a.type==='walkin'){if(!Number.isInteger(a.size)||a.size<1||a.size>20||!a.name.trim())throw Error('Enter a name and a party size from 1 to 20.');s.parties.push({id:`p-${Date.now()}-${s.parties.length}`,name:a.name.trim(),size:a.size,time:a.time??s.now,status:a.time&&a.time>s.now?'reserved':'waiting'})}
 if(a.type==='callout'){const e=s.employees.find(e=>e.id===a.id);if(!e)throw Error('Employee not found');e.active=!e.active;}
 if(a.type==='checkin'&&p?.status==='reserved')p.status='waiting';
 if(a.type==='seat'){if(p?.status!=='waiting')throw Error('Check in this party first.');const r=optimize(s).assignments.find(r=>r.party===p.id);if(!r||r.start>s.now)throw Error('No feasible table is available yet.');Object.assign(p,{status:'seated',table:r.table,server:r.server,end:r.end,order:'queued'})}
 if(a.type==='depart'&&p?.status==='seated')p.status='done';
 if(a.type==='delay'&&p?.status==='seated')p.end=Math.max(s.now,p.end||s.now)+30;
 if(a.type==='order'&&p?.status==='seated')p.order=p.order==='queued'?'cooking':'served';
 s.log.unshift(`${clock(s.now)} · ${a.type==='advance'?'Clock advanced 5 minutes':a.type}${p?' · '+p.name:''}`);return s;
}
export function disrupt(s:State,kind='early'){let next=structuredClone(s);if(kind==='early'){next=act(next,{type:'delay',id:'p2'});next=act(next,{type:'checkin',id:'p7'});const p=next.parties.find(p=>p.id==='p7');if(p)p.time=next.now;}else if(kind==='server')next=act(next,{type:'callout',id:'s2'});else next=act(next,{type:'walkin',name:'Walk-in party',size:4});return next}
