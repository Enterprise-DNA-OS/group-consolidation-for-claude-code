
insert into entities(id,code,name,currency,owner) values
('10000000-0000-4000-8000-000000000001','NZ','Kauri Distribution NZ','NZD','Aroha'),
('10000000-0000-4000-8000-000000000002','AU','Kauri Distribution AU','AUD','Tui') on conflict do nothing;
insert into periods(id,code,name,due_on) values('20000000-0000-4000-8000-000000000001','2026-09','September management close',current_date-3),('20000000-0000-4000-8000-000000000002','2026-10','October management close',current_date+7) on conflict do nothing;
insert into group_accounts(id,code,name,kind,rate_kind,intercompany) values
('30000000-0000-4000-8000-000000000001','SALES','External sales','revenue','average',false),
('30000000-0000-4000-8000-000000000002','COST','Operating costs','expense','average',false),
('30000000-0000-4000-8000-000000000003','IC-SALES','Intercompany sales','revenue','average',true),
('30000000-0000-4000-8000-000000000004','IC-COST','Intercompany purchases','expense','average',true),
('30000000-0000-4000-8000-000000000005','CASH','Cash','asset','closing',false),
('30000000-0000-4000-8000-000000000006','CAPITAL','Capital','equity','historical',false) on conflict do nothing;
insert into accounts(id,entity_id,code,name,group_id) select
('40000000-0000-4000-8000-'||lpad((n*10+x)::text,12,'0'))::uuid,e.id,a.code,a.name,g.id from
(values (1,'NZ'),(2,'AU')) en(n,entity) join entities e on e.code=en.entity cross join
(values (1,'400','Sales','SALES'),(2,'500','Costs','COST'),(3,'410','Intercompany sales','IC-SALES'),(4,'510','Intercompany purchases','IC-COST'),(5,'100','Bank','CASH'),(6,'300','Capital','CAPITAL')) a(x,code,name,grp) join group_accounts g on g.code=a.grp on conflict do nothing;
insert into rates(entity_id,period_id,kind,rate,source_ref) select e.id,p.id,k,1.10,'Fictional demonstration rate' from entities e cross join periods p cross join unnest(array['average','closing','historical']) k where e.code='AU' and p.code='2026-09' on conflict do nothing;
insert into balances(account_id,period_id,scenario,amount) select a.id,p.id,'actual',v.amount from
(values ('NZ','400',-100000),('NZ','500',70000),('NZ','410',-11000),('NZ','510',0),('NZ','100',51000),('NZ','300',-10000),('AU','400',-80000),('AU','500',60000),('AU','410',0),('AU','510',10000),('AU','100',20000),('AU','300',-10000)) v(entity,account,amount)
join entities e on e.code=v.entity join accounts a on a.entity_id=e.id and a.code=v.account cross join periods p where p.code='2026-09' on conflict do nothing;
insert into balances(account_id,period_id,scenario,amount) select a.id,p.id,'actual',case when a.code='400' then -85000 else null end from accounts a join entities e on e.id=a.entity_id cross join periods p where p.code='2026-10' and e.code='AU' and a.code in ('400','500') on conflict do nothing;
insert into balances(account_id,period_id,scenario,amount) select b.account_id,b.period_id,'budget',b.amount*1.05 from balances b join periods p on p.id=b.period_id where b.scenario='actual' and p.code='2026-09' on conflict do nothing;
insert into submissions(entity_id,period_id,source_ref,reconciled_by,note) select e.id,p.id,'Fictional source ledger September','Aroha','Demo debit-positive amounts and closing balances checked' from entities e cross join periods p where e.code='NZ' and p.code='2026-09' on conflict do nothing;
insert into journals(id,code,name,period_id,source_ref,prepared_by) select '50000000-0000-4000-8000-000000000001','ELIM-SEP','Remove internal September sales',p.id,'Fictional matching ledger evidence','Aroha' from periods p where p.code='2026-09' on conflict do nothing;
insert into journal_lines(id,journal_id,group_id,entity_id,amount) select
('60000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,j.id,g.id,e.id,v.amount from (values(1,'NZ','IC-SALES',11000),(2,'AU','IC-COST',-11000))v(n,entity,grp,amount) join entities e on e.code=v.entity join group_accounts g on g.code=v.grp cross join journals j where j.code='ELIM-SEP' on conflict do nothing;
insert into actions(code,name,period_id,owner,due_on) select 'REVIEW-AU','Reconcile Australian source balances',p.id,'Tui',current_date-2 from periods p where p.code='2026-09' on conflict do nothing;
