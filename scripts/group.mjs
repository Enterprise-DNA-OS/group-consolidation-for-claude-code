#!/usr/bin/env node
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {parseCsv,pick} from './lib/csv.mjs';
import {table} from './lib/format.mjs';
import {page,table as htmlTable,writeOut} from './lib/render.mjs';
export const commands=['help','entities','periods','accounts','group-accounts','balances','attention','mapping-gaps','rate-gaps','group-results','profit','budget-variance','intercompany','journals','actions-due','compliance','history','weekly-review','add-entity','add-period','add-group-account','map-account','set-rate','reconcile','add-journal','add-line','post-journal','add-action','complete-action','lock-period','reopen-period','import','export','draft-pack','revise-balance','reverse-journal'];
const reads=new Set(commands.slice(0,18));
export function options(args){const o={_:[]}; for(const a of args){if(!a.startsWith('--')){o._.push(a);continue;}const [k,...v]=a.slice(2).split('=');if(k in o)throw Error(`Repeated option: ${k}`);o[k]=v.length?v.join('='):true;}return o;}
const required=(o,k)=>{if(typeof o[k]!=='string'||!o[k].trim())throw Error(`--${k}=value is required`);return o[k].trim();};
const enumValue=(v,values,label)=>{if(!values.includes(v))throw Error(`${label} must be ${values.join(', ')}`);return v;};
const month=(s)=>{if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(s))throw Error('Period must be YYYY-MM');return s;};
const date=(s)=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||new Date(s+'T00:00:00Z').toISOString().slice(0,10)!==s)throw Error('Invalid calendar date');return s;};
export function amount(s){s=String(s).trim();if(!/^-?\d{1,16}(\.\d{1,2})?$/.test(s))throw Error('Amount must be a plain number with at most two decimal places');return s;}
export function periodHeader(s){s=s.trim();if(/^\d{4}-(0[1-9]|1[0-2])$/.test(s))return s;let parts=s.split(/[ /-]/),y,m;const months=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];if(parts.length!==2)return null;if(/^\d{4}$/.test(parts[0]))[y,m]=parts;else if(/^\d{4}$/.test(parts[1]))[m,y]=parts;else return null;m=/^\d{1,2}$/.test(m)?Number(m):months.indexOf(m.toLowerCase())+1;return m>=1&&m<=12?`${y}-${String(m).padStart(2,'0')}`:null;}
const tables=['settings','entities','periods','group_accounts','accounts','imports','balances','rates','submissions','journals','journal_lines','actions','activity'];
async function resolve(db,t,ref,where='',params=[]){if(!['entities','periods','group_accounts','accounts','journals','actions'].includes(t))throw Error('Unknown reference type');if(!ref)throw Error(`A ${t} reference is required`);const rows=await db.query(`select * from ${t}${where?' where '+where:''}`,params);const exact=rows.filter(r=>r.id===ref||r.code?.toLowerCase()===ref.toLowerCase());const found=exact.length?exact:rows.filter(r=>r.id.startsWith(ref)||r.name?.toLowerCase().includes(ref.toLowerCase()));if(found.length!==1)throw Error(`${found.length?'Ambiguous':'Unknown'} ${t}: ${ref}\n${(found.length?found:rows).map(r=>`${r.code} | ${r.name} | ${r.id}`).join('\n')}`);return found[0];}
async function unlocked(db,p){if(p.status==='locked')throw Error(`Period ${p.code} is locked`);}
async function noLocked(db){if((await db.query("select 1 from periods where status='locked'")).length)throw Error('Reopen locked periods before changing the group scope or account mapping');}
async function invalidate(db,p,entity){await db.query(`delete from submissions where period_id=$1${entity?' and entity_id=$2':''}`,entity?[p,entity]:[p]);}
export async function issues(db,p){
 const out=[];const add=(rule,record,issue)=>out.push({rule,record,issue});
 const ready=await db.query('select * from entity_readiness where period_id=$1 order by entity',[p.id]);
 if(!ready.length)add('SCOPE',p.code,'No entities');
 for(const r of ready){if(Number(r.actual_rows)===0)add('SOURCE',r.entity,'No actual balances');if(Number(r.incomplete_rows))add('DATA',r.entity,`${r.incomplete_rows} unmapped, blank or missing-rate balances`);if(!r.reconciled_by)add('REVIEW',r.entity,'Source not reconciled');}
 for(const j of await db.query("select code from journals where period_id=$1 and status='draft'",[p.id]))add('JOURNAL',j.code,'Elimination journal not reviewed and posted');
 for(const a of await db.query("select code from actions where period_id=$1 and status='open'",[p.id]))add('ACTION',a.code,'Unfinished review action');
 for(const r of await db.query("select entity,sum(local_amount) total from translated_balances where period_id=$1 and scenario='actual' group by entity having abs(sum(local_amount))>0.01",[p.id]))add('BALANCE',r.entity,`Local signed trial balance does not balance: ${r.total}`);
 const total=await db.query("select sum(base_amount) total from group_results where period_id=$1 and scenario='actual'",[p.id]);
 if(total[0]?.total!=null&&Math.abs(Number(total[0].total))>0.01)add('TRANSLATION',p.code,`Group signed balances differ by ${total[0].total}; review currency translation or source scope`);
 return out;
}
async function read(db,cmd,o){
 let p;if(o.period)p=await resolve(db,'periods',o.period);
 const clause=p?' where period_id=$1':'';const params=p?[p.id]:[];
 switch(cmd){
 case 'help':return commands.map(command=>({command}));
 case 'entities':return db.query('select id,code,name,currency,owner from entities order by code');
 case 'periods':return db.query('select id,code,name,due_on,status,reviewed_by from periods order by code');
 case 'accounts':return db.query('select a.id,e.code entity,a.code,a.name,g.code group_code from accounts a join entities e on e.id=a.entity_id left join group_accounts g on g.id=a.group_id order by e.code,a.code');
 case 'group-accounts':return db.query('select * from group_accounts order by code');
 case 'balances':return db.query('select period,scenario,entity,currency,account,group_code,local_amount,rate,base_amount from translated_balances'+clause+' order by period,entity,account,scenario',params);
 case 'attention':return db.query("select period,entity,owner,due_on,actual_rows,incomplete_rows,case when reconciled_by is null then 'Needs source review' else 'Reconciled' end review from entity_readiness where status='open'"+(p?' and period_id=$1':'')+' order by due_on,entity',params);
 case 'mapping-gaps':return db.query('select e.code entity,a.code,a.name from accounts a join entities e on e.id=a.entity_id where a.group_id is null order by e.code,a.code');
 case 'rate-gaps':return db.query('select distinct period,entity,currency,rate_kind from translated_balances where group_id is not null and rate is null'+(p?' and period_id=$1':'')+' order by period,entity,rate_kind',params);
 case 'group-results':return db.query('select period,scenario,group_code,group_name,kind,base_amount,missing_values from group_results'+clause+' order by period,scenario,group_code',params);
 case 'profit':return db.query(`select r.period,r.scenario,case when
 exists(select 1 from translated_balances t where t.period_id=r.period_id and t.scenario=r.scenario and (t.group_id is null or t.base_amount is null))
 or exists(select 1 from entities e where not exists(select 1 from translated_balances t where t.period_id=r.period_id and t.scenario=r.scenario and t.entity_id=e.id))
 then null else -sum(r.base_amount) end profit_amount from group_results r where r.kind in ('revenue','expense') ${p?'and r.period_id=$1':''} group by r.period_id,r.period,r.scenario order by r.period,r.scenario`,params);
 case 'budget-variance':return db.query(`select coalesce(a.period,b.period) period,coalesce(a.group_code,b.group_code) group_code,a.base_amount actual_amount,b.base_amount budget_amount,a.base_amount-b.base_amount variance_amount from (select * from group_results where scenario='actual') a full join (select * from group_results where scenario='budget') b on a.period_id=b.period_id and a.group_id=b.group_id ${p?'where coalesce(a.period_id,b.period_id)=$1':''} order by 1,2`,params);
 case 'intercompany':return db.query('select period,entity,group_code,group_name,base_amount from intercompany_review'+clause+' order by period,entity,group_code',params);
 case 'journals':return db.query('select j.code,j.name,p.code period,j.status,j.prepared_by,j.reviewed_by,count(l.id) lines,sum(l.amount) balance_amount from journals j join periods p on p.id=j.period_id left join journal_lines l on l.journal_id=j.id'+(p?' where j.period_id=$1':'')+' group by j.id,p.code order by j.code',params);
 case 'actions-due':return db.query("select a.code,a.name,a.owner,a.due_on,p.code period from actions a join periods p on p.id=a.period_id where a.status='open'"+(p?' and a.period_id=$1':'')+' order by a.due_on',params);
 case 'compliance':{
 const rows=[];for(const per of p?[p]:await db.query("select * from periods where status='open' order by code"))rows.push(...(await issues(db,per)).map(x=>({period:per.code,...x})));
 for(const i of await db.query("select i.source_name from imports i where i.retain_until < (greatest(i.created_at::date,coalesce((select max((p.code||'-01')::date) from balances b join periods p on p.id=b.period_id where b.import_id=i.id),i.created_at::date)) + interval '7 years')::date"))rows.push({period:'all',rule:'NZ-RECORDS',record:i.source_name,issue:'Retention review date below minimum policy'});return rows;
 }
 case 'history':return db.query('select name,actor,detail,created_at from activity order by created_at,id');
 case 'weekly-review':return {attention:await read(db,'attention',o),intercompany:await read(db,'intercompany',o),actions:await read(db,'actions-due',o),checks:await read(db,'compliance',o)};
 }
}
export async function run(db,args){
 const [cmd='help',...rest]=args;const o=options(rest);
 if(!commands.includes(cmd))throw Error(`Unknown command ${cmd}. Run help.`);
 if(reads.has(cmd))return read(db,cmd,o);
 if(cmd==='export'){
 const dir=path.resolve(required(o,'dir'));mkdirSync(dir,{recursive:true,mode:0o700});const data={format:1,exported_at:new Date().toISOString(),records:{}};
 await db.exec('BEGIN READ ONLY');try{for(const t of tables)data.records[t]=await db.query(`select * from ${t}`);}finally{await db.exec('ROLLBACK');}
 const file=path.join(dir,'group-records.json');writeFileSync(file,JSON.stringify(data,null,2)+'\n',{mode:0o600});return [{file,tables:tables.length}];
 }
 if(cmd==='draft-pack'){
 const p=await resolve(db,'periods',required(o,'period'));await db.exec('BEGIN READ ONLY');try{
 const result=await read(db,'group-results',o),checks=await issues(db,p);const file=writeOut('drafts',`group-pack-${p.code}`,page({title:`Group management pack ${p.code}`,subtitle:'Working review draft. Signed amounts in group currency. Not statutory accounts.',sections:[{title:'Review findings',html:htmlTable(checks)},{title:'Consolidated results',html:htmlTable(result)},{title:'Elimination review',html:htmlTable(await read(db,'journals',o))}]}));return [{file,issues:checks.length}];
 }finally{await db.exec('ROLLBACK');}}
 const actor=required(o,'actor');await db.exec('BEGIN');try{
 // Serialize CLI mutations in both adapters. PostgreSQL protects concurrent operators.
 await db.exec('LOCK TABLE periods IN SHARE ROW EXCLUSIVE MODE');
 let result;let p;if(o.period){p=await resolve(db,'periods',o.period);if(cmd!=='reopen-period')await unlocked(db,p);}
 switch(cmd){
 case 'add-entity':await noLocked(db);result=await db.query('insert into entities(code,name,currency,owner) values($1,$2,$3,$4) returning *',[required(o,'code'),required(o,'name'),required(o,'currency'),required(o,'owner')]);break;
 case 'add-period':result=await db.query('insert into periods(code,name,due_on) values($1,$2,$3) returning *',[month(required(o,'code')),required(o,'name'),date(required(o,'due'))]);break;
 case 'add-group-account':await noLocked(db);result=await db.query('insert into group_accounts(code,name,kind,rate_kind,intercompany) values($1,$2,$3,$4,$5) returning *',[required(o,'code'),required(o,'name'),required(o,'kind'),required(o,'rate-kind'),o.intercompany===true]);break;
 case 'map-account':{
 await noLocked(db);const e=await resolve(db,'entities',required(o,'entity'));const a=await resolve(db,'accounts',required(o,'account'),'entity_id=$1',[e.id]);const g=await resolve(db,'group_accounts',required(o,'group'));result=await db.query('update accounts set group_id=$1 where id=$2 returning *',[g.id,a.id]);await db.query('delete from submissions where entity_id=$1',[e.id]);break;
 }
 case 'set-rate':{
 if(!p)throw Error('--period is required');const e=await resolve(db,'entities',required(o,'entity'));const rate=required(o,'rate');if(!/^\d{1,10}(\.\d{1,8})?$/.test(rate)||Number(rate)<=0)throw Error('Rate must be a positive decimal');if(e.currency===(await db.query('select currency from settings'))[0].currency)throw Error('Group-currency entities always use rate 1');result=await db.query('insert into rates(entity_id,period_id,kind,rate,source_ref) values($1,$2,$3,$4,$5) on conflict(entity_id,period_id,kind) do update set rate=excluded.rate,source_ref=excluded.source_ref returning *',[e.id,p.id,required(o,'kind'),rate,required(o,'source')]);await invalidate(db,p.id,e.id);break;
 }
 case 'reconcile':{
 if(!p)throw Error('--period is required');const e=await resolve(db,'entities',required(o,'entity'));const t=await db.query("select * from translated_balances where entity_id=$1 and period_id=$2 and scenario='actual'",[e.id,p.id]);if(!t.length||t.some(x=>!x.group_id||x.base_amount===null))throw Error('Map every actual account and resolve blank balances and missing rates first');
 result=await db.query('insert into submissions(entity_id,period_id,source_ref,reconciled_by,note) values($1,$2,$3,$4,$5) on conflict(entity_id,period_id) do update set source_ref=excluded.source_ref,reconciled_by=excluded.reconciled_by,note=excluded.note returning *',[e.id,p.id,required(o,'source'),actor,required(o,'note')]);break;
 }
 case 'add-journal':if(!p)throw Error('--period is required');result=await db.query('insert into journals(code,name,period_id,source_ref,prepared_by) values($1,$2,$3,$4,$5) returning *',[required(o,'code'),required(o,'name'),p.id,required(o,'source'),actor]);break;
 case 'add-line':{
 const j=await resolve(db,'journals',required(o,'journal'));const jp=await resolve(db,'periods',j.period_id);await unlocked(db,jp);if(j.status!=='draft')throw Error('Posted journals cannot be edited');const g=await resolve(db,'group_accounts',required(o,'group'));const e=await resolve(db,'entities',required(o,'entity'));result=await db.query('insert into journal_lines(journal_id,group_id,entity_id,amount) values($1,$2,$3,$4) returning *',[j.id,g.id,e.id,amount(required(o,'amount'))]);break;
 }
 case 'post-journal':{
 const j=await resolve(db,'journals',required(o,'journal'));await unlocked(db,await resolve(db,'periods',j.period_id));if(j.status!=='draft')throw Error('Journal already posted');if(j.prepared_by.toLowerCase()===actor.toLowerCase())throw Error('A different reviewer must post the journal');const [v]=await db.query('select count(*) n,sum(amount) total from journal_lines where journal_id=$1',[j.id]);if(Number(v.n)<2||Number(v.total)!==0)throw Error('Journal needs at least two lines and must balance exactly to zero');result=await db.query("update journals set status='posted',reviewed_by=$1 where id=$2 returning *",[actor,j.id]);break;
 }
 case 'add-action':if(!p)throw Error('--period is required');result=await db.query('insert into actions(code,name,period_id,owner,due_on) values($1,$2,$3,$4,$5) returning *',[required(o,'code'),required(o,'name'),p.id,required(o,'owner'),date(required(o,'due'))]);break;
 case 'complete-action':{
 const a=await resolve(db,'actions',required(o,'action'));await unlocked(db,await resolve(db,'periods',a.period_id));if(a.status==='done')throw Error('Action already completed');result=await db.query("update actions set status='done',result=$1 where id=$2 returning *",[required(o,'result'),a.id]);break;
 }
 case 'lock-period':{
 if(!p)throw Error('--period is required');const found=await issues(db,p);if(found.length)throw Error('Period blocked:\n'+found.map(x=>`${x.rule} ${x.record}: ${x.issue}`).join('\n'));result=await db.query("update periods set status='locked',reviewed_by=$1,review_note=$2 where id=$3 returning *",[actor,required(o,'note'),p.id]);break;
 }
 case 'reopen-period':if(!p)throw Error('--period is required');if(p.status!=='locked')throw Error('Period is already open');result=await db.query("update periods set status='open',reviewed_by=null,review_note=$1 where id=$2 returning *",[required(o,'reason'),p.id]);break;
 case 'revise-balance':{
 if(!p)throw Error('--period is required');const e=await resolve(db,'entities',required(o,'entity'));const a=await resolve(db,'accounts',required(o,'account'),'entity_id=$1',[e.id]);const scenario=enumValue(required(o,'scenario'),['actual','budget'],'Scenario');const reason=required(o,'reason'),source=required(o,'source');
 const [old]=await db.query('select * from balances where account_id=$1 and period_id=$2 and scenario=$3',[a.id,p.id,scenario]);if(!old)throw Error('Import the original balance first');
 result=await db.query('update balances set amount=$1 where id=$2 returning *',[amount(required(o,'amount')),old.id]);
 await db.query('insert into activity(name,actor,detail) values($1,$2,$3)',['balance-revision',actor,JSON.stringify({before:old,after:result[0],reason,source})]);await invalidate(db,p.id,e.id);break;
 }
 case 'reverse-journal':{
 const j=await resolve(db,'journals',required(o,'journal'));await unlocked(db,await resolve(db,'periods',j.period_id));if(j.status!=='posted')throw Error('Only posted journals can be reversed');
 const reason=required(o,'reason');result=await db.query('insert into journals(code,name,period_id,source_ref,prepared_by) values($1,$2,$3,$4,$5) returning *',[required(o,'code'),`Reversal of ${j.code}: ${reason}`,j.period_id,`Original ${j.id}. ${required(o,'source')}`,actor]);
 await db.query('insert into journal_lines(journal_id,group_id,entity_id,amount) select $1,group_id,entity_id,-amount from journal_lines where journal_id=$2',[result[0].id,j.id]);break;
 }
 case 'import':result=await importCalxa(db,o,actor);break;
 }
 await db.query('insert into activity(name,actor,detail) values($1,$2,$3)',[cmd,actor,JSON.stringify({options:Object.fromEntries(Object.entries(o).filter(([k])=>!['actor','json'].includes(k))),result:result?.map(x=>({id:x.id,code:x.code}))})]);
 await db.exec(o['dry-run']?'ROLLBACK':'COMMIT');return result;
 }catch(e){await db.exec('ROLLBACK');throw e;}
}
async function importCalxa(db,o,actor){
 if(o._[0]!=='calxa')throw Error('Use import calxa');
 const e=await resolve(db,'entities',required(o,'entity'));const scenario=enumValue(required(o,'scenario'),['actual','budget'],'Scenario');
 enumValue(required(o,'sign'),['debit-positive'],'Sign');enumValue(required(o,'basis'),['closing-balances'],'Balance-sheet basis');
 const file=required(o,'file'),source=required(o,'source'),raw=readFileSync(file,'utf8'),digest=createHash('sha256').update(raw).digest('hex');
 const existing=await db.query('select id from imports where entity_id=$1 and scenario=$2 and digest=$3',[e.id,scenario,digest]);
 if(existing.length)return [{unchanged:true,import_id:existing[0].id}];
 const rows=parseCsv(raw);if(!rows.length)throw Error('CSV contains no records');
 const headers=Object.keys(rows[0]),months=headers.map(h=>[h,periodHeader(h)]).filter(x=>x[1]);if(!months.length)throw Error('No recognised monthly columns');if(new Set(months.map(x=>x[1])).size!==months.length)throw Error('Duplicate month columns');
 const metadata=['account number','account name','account path','business unit number','business unit name','business unit path'];
 const unexpected=headers.filter(h=>!metadata.includes(h.toLowerCase())&&!periodHeader(h));if(unexpected.length)throw Error('Unsupported columns: '+unexpected.join(', '));
 const periodMap=new Map();for(const [h,m] of months){const p=await resolve(db,'periods',m);await unlocked(db,p);periodMap.set(h,p);}
 const [imp]=await db.query("insert into imports(entity_id,scenario,digest,source_name,source_text,source_ref,actor,retain_until) values($1,$2,$3,$4,$5,$6,$7,(current_date+interval '8 years')::date) returning id",[e.id,scenario,digest,path.basename(file),raw,source,actor]);
 let cells=0;const seen=new Set();
 for(const row of rows){
 if(headers.some(h=>h.toLowerCase().startsWith('business unit')&&row[h].trim()))throw Error('Export organisation totals only; business-unit rows require a separate mapping');
 const code=pick(row,'Account Number').trim()||pick(row,'Account Path').trim()||pick(row,'Account Name').trim();const name=pick(row,'Account Name').trim()||code;if(!code)throw Error('An account identifier is required');if(seen.has(code.toLowerCase()))throw Error('Duplicate account row: '+code);seen.add(code.toLowerCase());
 let [a]=await db.query('select * from accounts where entity_id=$1 and code=$2',[e.id,code]);
 if(a&&a.name!==name&&pick(row,'Account Name'))throw Error('Account name changed: '+code);
 if(!a){await noLocked(db);[a]=await db.query('insert into accounts(entity_id,code,name) values($1,$2,$3) returning *',[e.id,code,name]);}
 for(const [h] of months){const p=periodMap.get(h),v=row[h].trim()===''?null:amount(row[h]);const old=await db.query('select id from balances where account_id=$1 and period_id=$2 and scenario=$3',[a.id,p.id,scenario]);if(old.length)throw Error(`Existing balance ${code} ${p.code}: reconcile separately; imports never overwrite`);await db.query('insert into balances(account_id,period_id,scenario,amount,import_id) values($1,$2,$3,$4,$5)',[a.id,p.id,scenario,v,imp.id]);cells++;await invalidate(db,p.id,e.id);}
 }
 await db.query("update imports set retain_until=(greatest(current_date,$1::date)+interval '8 years')::date where id=$2",[months.map(x=>x[1]).sort().at(-1)+'-01',imp.id]);
 return [{import_id:imp.id,accounts:rows.length,periods:months.length,cells,dry_run:!!o['dry-run'],status:'Loaded to review; map accounts and reconcile source before use'}];
}
export function format(result){if(!Array.isArray(result))return Object.entries(result).map(([k,v])=>`${k}\n${format(v)}`).join('\n\n');if(!result.length)return '  (none)';return table(result,Object.keys(result[0]).map(key=>({key,label:key,format:v=>v!==null&&typeof v==='object'?JSON.stringify(v):v})));}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){let db;try{db=await getDb();const result=await run(db,process.argv.slice(2));console.log(process.argv.includes('--json')?JSON.stringify(result,null,2):format(result));}catch(e){if(process.argv.includes('--json'))console.error(JSON.stringify({error:e.message}));else console.error(e.message);process.exitCode=1;}finally{await db?.close();}}
