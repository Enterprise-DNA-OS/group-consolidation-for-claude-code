import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {migrate} from './migrate.mjs';
import {seed} from './seed.mjs';
import {run,commands,periodHeader} from './group.mjs';
import {parseCsv} from './lib/csv.mjs';
const temp=mkdtempSync(path.join(os.tmpdir(),'group-test-'));
process.env.DATA_DIR=path.join(temp,'db');process.env.OUTPUT_DIR=temp;
process.env.DATABASE_URL=process.env.TEST_DATABASE_URL||'';
let db=await getDb(),checks=0;const covered=new Set();
const check=(v,msg)=>{assert.ok(v,msg);checks++;};
const call=async(cmd,...args)=>{covered.add(cmd);return run(db,[cmd,...args]);};
const fails=async(cmd,args,pattern)=>{await assert.rejects(()=>call(cmd,...args),pattern);checks++;};
const actor='--actor=Tester';
const p='--period=2026-09';
const fixture=path.join(REPO_ROOT,'tests/fixtures/calxa.csv');
const imp=(entity,file=fixture)=>['calxa',`--entity=${entity}`,`--file=${file}`,'--scenario=actual','--basis=closing-balances','--sign=debit-positive','--source=Fictional source',actor];
try{
 if(process.env.TEST_DATABASE_URL){const r=await db.query("select to_regclass('public.entities') existing");check(!r[0].existing,'TEST_DATABASE_URL must be an empty disposable database');}
 await migrate(db);check((await migrate(db)).ran.length===0,'migration idempotent');await seed(db);await seed(db);check((await call('entities')).length===2,'seed idempotent');
 for(const cmd of commands.slice(0,18))check(await call(cmd,p),`read ${cmd}`);
 check((await call('profit',p)).find(x=>x.scenario==='actual').profit_amount==='52000.00','translation and signed profit');
 check((await call('rate-gaps','--period=2026-10')).length===1,'missing FX visible');
 check((await call('group-results','--period=2026-10')).every(x=>x.base_amount===null),'unknown not zero');
 await fails('lock-period',[p,actor,'--note=review'],/Period blocked/);
 await fails('post-journal',['--journal=ELIM-SEP','--actor=Aroha'],/different reviewer/);
 await call('post-journal','--journal=ELIM-SEP',actor);await fails('add-line',['--journal=ELIM-SEP','--group=COST','--entity=NZ','--amount=1',actor],/Posted/);
 const result=await call('group-results',p);check(result.find(x=>x.group_code==='IC-SALES'&&x.scenario==='actual').base_amount==='0.00','elimination removes internal sales');
 check((await call('profit',p)).find(x=>x.scenario==='actual').profit_amount==='52000.00','balanced elimination preserves profit');
 await call('reconcile',p,'--entity=AU','--source=ledger','--note=Balances and scope checked',actor);
 await call('complete-action','--action=REVIEW-AU','--result=Checked against source ledger',actor);
 check((await call('compliance',p)).length===0,'review cleared');
 await call('lock-period',p,'--note=Reviewed source pack',actor);
 await fails('set-rate',[p,'--entity=AU','--kind=average','--rate=1.2','--source=test',actor],/locked/);
 await fails('map-account',['--entity=NZ','--account=400','--group=SALES',actor],/locked/);
 await fails('add-entity',['--code=NEW','--name=New','--currency=NZD','--owner=Test',actor],/locked/);
 await call('reopen-period',p,'--reason=Recheck source',actor);
 await call('set-rate',p,'--entity=AU','--kind=average','--rate=1.1','--source=Approved period rate',actor);
 check((await call('compliance',p)).some(x=>x.rule==='REVIEW'),'rate change clears signoff');
 await call('add-entity','--code=TEST','--name=Test Group','--currency=NZD','--owner=Review',actor);
 await call('add-entity','--code=TEST2','--name=Test Group Two','--currency=NZD','--owner=Review',actor);
 await fails('reconcile',[p,'--entity=test group','--source=s','--note=n',actor],/Ambiguous/);
 await fails('reconcile',[p,'--entity=TEST','--source=s','--note=n',actor],/actual/);
 await call('add-period','--code=2026-11','--name=November','--due=2026-12-05',actor);
 await fails('add-period',['--code=2026-13','--name=Bad','--due=2026-12-05',actor],/YYYY/);
 await call('add-group-account','--code=OTHER','--name=Other costs','--kind=expense','--rate-kind=average',actor);
 await call('import',...imp('TEST'),'--dry-run');check((await db.query("select * from accounts where entity_id=(select id from entities where code='TEST')")).length===0,'dry-run rolls back');
 await fails('import',imp('TEST',path.join(REPO_ROOT,'tests/fixtures/bad.csv')),/plain number/);
 check((await db.query('select * from imports')).length===0,'bad import rolls back raw receipt');
 await call('import',...imp('TEST'));check((await call('import',...imp('TEST')))[0].unchanged,'identical import idempotent');
 let modified=path.join(temp,'modified.csv');writeFileSync(modified,readFileSync(fixture,'utf8').replace('-100.10','-101.10'));
 await fails('import',imp('TEST',modified),/never overwrite/);check((await db.query('select * from imports')).length===1,'changed import rollback');
 for(const [account,group] of [['400','SALES'],['500','COST'],['100','CASH']])await call('map-account','--entity=test',`--account=${account}`,`--group=${group}`,actor);
 await call('reconcile',p,'--entity=TEST','--source=Fictional ledger','--note=Source reconciled',actor);
 await call('add-journal',p,'--code=J2','--name=Test adjustment','--source=Working paper',actor);
 await call('add-line','--journal=J2','--group=OTHER','--entity=NZ','--amount=10.01',actor);
 await fails('post-journal',['--journal=J2','--actor=Reviewer'],/balance/);
 await call('add-line','--journal=J2','--group=COST','--entity=AU','--amount=-10.01',actor);
 await call('post-journal','--journal=J2','--actor=Reviewer');
 await call('add-action',p,'--code=TEST-ACTION','--name=<script>alert(1)</script>','--owner=Test','--due=2026-10-20',actor);
 await call('complete-action','--action=TEST-ACTION','--result=Checked',actor);
 await fails('add-action',[p,'--code=NO','--name=No','--owner=Test','--due=2026-02-30',actor],/Invalid/);
 await fails('add-line',['--journal=J2','--entity=NZ','--group=COST','--amount=0.001',actor],/Posted/);
 const pack=await call('draft-pack',p);check(readFileSync(pack[0].file,'utf8').includes('Group management pack'),'draft renders');
 const exp=await call('export',`--dir=${path.join(temp,'exports')}`);const backup=JSON.parse(readFileSync(exp[0].file));check(backup.records.imports[0].source_text.includes('Account Number'),'export retains source CSV');check(backup.records.activity.length>10,'actor audit exported');
 check(Object.keys(backup.records).length===13,'all domain records exported');
 for(const header of ['2026 Sep','Sep 2026','2026-Sep','Sep-2026','2026/09','09/2026','2026-09','09-2026'])check(periodHeader(header)==='2026-09',header);
 check(parseCsv('\ufeffa,b\r\n"line\ntext","say ""yes"""')[0].b==='say "yes"','CSV quotes and BOM');
 assert.throws(()=>parseCsv('a,a\n1,2'),/unique/);checks++;
 assert.throws(()=>parseCsv('a,b\n"bad,2'),/unclosed/);checks++;
 await db.query('select 1');
 await call('revise-balance',p,'--entity=TEST','--account=400','--scenario=actual','--amount=-101.10','--reason=Correct source export','--source=Revised ledger',actor);
 check((await call('compliance',p)).some(x=>x.rule==='REVIEW'&&x.record==='TEST'),'revision clears source review');
 check((await call('history')).some(x=>x.name==='balance-revision'&&x.detail.before.amount==='-100.10'),'revision preserves previous amount');
 await call('reverse-journal','--journal=J2','--code=REV-J2','--reason=Correction','--source=Review note',actor);
 await call('post-journal','--journal=REV-J2','--actor=Reviewer');
 check((await call('journals')).find(x=>x.code==='REV-J2').balance_amount==='0.00','reversal is balanced');
 for(const [name,content,pattern] of [
 ['units','Account Number,Business Unit Name,2026 Sep\n400,Branch,1\n',/organisation totals/],
 ['duplicate','Account Number,2026 Sep,Sep-2026\n400,1,1\n',/Duplicate month/],
 ['column','Account Number,Unrecognised,2026 Sep\n400,x,1\n',/Unsupported/],
 ['duplicate-row','Account Number,2026 Sep\n400,1\n400,2\n',/Duplicate account/],
 ['precision','Account Number,2026 Sep\n400,0.001\n',/plain number/]]){
 const f=path.join(temp,name+'.csv');writeFileSync(f,content);await fails('import',imp('TEST2',f),pattern);
 }
 check((await call('profit',p)).every(x=>x.profit_amount===null),'missing entity withholds total profit');
 const coveredCommands=[...covered];check(commands.every(c=>covered.has(c)),'every CLI command exercised');
 await db.close();db=null;
 const child=(script,args=[],extra={})=>spawnSync(process.execPath,[path.join(REPO_ROOT,'scripts',script),...args],{cwd:REPO_ROOT,env:{...process.env,...extra},encoding:'utf8'});
 for(const script of ['view.mjs','docs.mjs']){const res=child(script);check(res.status===0,res.stderr);}
 check(readFileSync(path.join(temp,'docs-out/management-pack',readdirSync(path.join(temp,'docs-out/management-pack'))[0]),'utf8').includes('&lt;script&gt;'),'document HTML escapes record text');
 const cli=child('group.mjs',['entities','--json']);check(cli.status===0&&JSON.parse(cli.stdout).length===4,'machine CLI');
 const ambiguity=child('group.mjs',['reconcile',p,'--entity=Test Group','--source=s','--note=n',actor,'--json']);check(ambiguity.status===1&&JSON.parse(ambiguity.stderr).error.includes('Ambiguous'),'ambiguous CLI exits one with candidates');
 const bad=child('group.mjs',['unknown','--json']);check(bad.status===1&&JSON.parse(bad.stderr).error.includes('Unknown command'),'unknown CLI exits one');
 for(const script of ['seed.mjs','demo.mjs']){const res=child(script,[],{DATABASE_URL:'postgres://unreachable.invalid/no'});check(res.status!==0&&res.stderr.includes('refuses DATABASE_URL'),'demo refuses server URL before connection');}
 console.log(`PASS: ${checks} checks; all ${coveredCommands.length} CLI commands; ${process.env.TEST_DATABASE_URL?'PostgreSQL':'PGlite'}`);
}finally{await db?.close();if(!process.env.TEST_DATABASE_URL)rmSync(temp,{recursive:true,force:true});}
