
create table settings (id integer primary key check(id=1), currency text not null default 'NZD' check(currency ~ '^[A-Z]{3}$'));
insert into settings values(1,'NZD');
create table entities (id uuid primary key default gen_random_uuid(), code text unique not null, name text not null, currency text not null check(currency ~ '^[A-Z]{3}$'), owner text not null);
create table periods (id uuid primary key default gen_random_uuid(), code text unique not null check(code ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'), name text not null, due_on date not null, status text not null default 'open' check(status in ('open','locked')), reviewed_by text, review_note text);
create table group_accounts (id uuid primary key default gen_random_uuid(), code text unique not null, name text not null, kind text not null check(kind in ('revenue','expense','asset','liability','equity')), rate_kind text not null check(rate_kind in ('average','closing','historical')), intercompany boolean not null default false);
create table accounts (id uuid primary key default gen_random_uuid(), entity_id uuid not null references entities(id), code text not null, name text not null, group_id uuid references group_accounts(id), unique(entity_id,code));
create table imports (id uuid primary key default gen_random_uuid(), entity_id uuid not null references entities(id), scenario text not null check(scenario in ('actual','budget')), digest text not null, source_name text not null, source_text text not null, source_ref text not null, actor text not null, retain_until date not null, unique(entity_id,scenario,digest));
create table balances (id uuid primary key default gen_random_uuid(), account_id uuid not null references accounts(id), period_id uuid not null references periods(id), scenario text not null check(scenario in ('actual','budget')), amount numeric(20,2), import_id uuid references imports(id), unique(account_id,period_id,scenario));
create table rates (id uuid primary key default gen_random_uuid(), entity_id uuid not null references entities(id), period_id uuid not null references periods(id), kind text not null check(kind in ('average','closing','historical')), rate numeric(20,8) not null check(rate>0), source_ref text not null, unique(entity_id,period_id,kind));
create table submissions (id uuid primary key default gen_random_uuid(), entity_id uuid not null references entities(id), period_id uuid not null references periods(id), source_ref text not null, reconciled_by text not null, note text not null, unique(entity_id,period_id));
create table journals (id uuid primary key default gen_random_uuid(), code text unique not null, name text not null, period_id uuid not null references periods(id), status text not null default 'draft' check(status in ('draft','posted')), source_ref text not null, prepared_by text not null, reviewed_by text);
create table journal_lines (id uuid primary key default gen_random_uuid(), journal_id uuid not null references journals(id), group_id uuid not null references group_accounts(id), entity_id uuid not null references entities(id), amount numeric(20,2) not null check(amount<>0));
create table actions (id uuid primary key default gen_random_uuid(), code text unique not null, name text not null, period_id uuid not null references periods(id), owner text not null, due_on date not null, status text not null default 'open' check(status in ('open','done')), result text not null default '');
create table activity (id uuid primary key default gen_random_uuid(), name text not null, actor text not null, detail jsonb not null);
create function stamp_update() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
do $$ declare t text; begin
 foreach t in array array['entities','periods','group_accounts','accounts','imports','balances','rates','submissions','journals','journal_lines','actions','activity'] loop
 execute format('alter table %I add column created_at timestamptz not null default now(), add column updated_at timestamptz not null default now()',t);
 execute format('create trigger stamp before update on %I for each row execute function stamp_update()',t);
 execute format('alter table %I enable row level security',t);
 execute format('revoke all on %I from public',t);
 end loop;
end $$;
alter table settings enable row level security;
revoke all on settings from public;
create view translated_balances as
select b.id,b.period_id,p.code period,b.scenario,e.id entity_id,e.code entity,e.currency,a.code account,a.name account_name,g.id group_id,g.code group_code,g.name group_name,g.kind,g.intercompany,g.rate_kind,b.amount local_amount,
 case when e.currency=s.currency then 1::numeric else r.rate end rate,
 round(b.amount * case when e.currency=s.currency then 1::numeric else r.rate end,2) base_amount
from balances b join periods p on p.id=b.period_id join accounts a on a.id=b.account_id join entities e on e.id=a.entity_id cross join settings s
left join group_accounts g on g.id=a.group_id left join rates r on r.entity_id=e.id and r.period_id=p.id and r.kind=g.rate_kind;
create view group_results as
with contributions as (
 select period_id,period,scenario,group_id,group_code,group_name,kind,base_amount from translated_balances
 union all
 select p.id,p.code,'actual',g.id,g.code,g.name,g.kind,l.amount from journal_lines l join journals j on j.id=l.journal_id join periods p on p.id=j.period_id join group_accounts g on g.id=l.group_id where j.status='posted'
)
select period_id,period,scenario,group_id,group_code,group_name,kind,case when count(*) filter(where base_amount is null)>0 then null else sum(base_amount) end base_amount,
 count(*) filter(where base_amount is null) missing_values from contributions group by period_id,period,scenario,group_id,group_code,group_name,kind;
create view entity_readiness as
select p.id period_id,p.code period,p.due_on,p.status,e.id entity_id,e.code entity,e.owner,
 count(t.id) filter(where t.scenario='actual') actual_rows,
 count(t.id) filter(where t.scenario='actual' and (t.group_id is null or t.base_amount is null)) incomplete_rows,
 s.reconciled_by,s.source_ref
from periods p cross join entities e left join translated_balances t on t.period_id=p.id and t.entity_id=e.id left join submissions s on s.period_id=p.id and s.entity_id=e.id
group by p.id,p.code,p.due_on,p.status,e.id,e.code,e.owner,s.reconciled_by,s.source_ref;
create view intercompany_review as
select t.period_id,t.period,t.entity,t.group_code,t.group_name,
 case when count(*) filter(where t.base_amount is null)>0 then null else sum(t.base_amount) end base_amount
from translated_balances t where t.scenario='actual' and t.intercompany group by t.period_id,t.period,t.entity,t.group_code,t.group_name;
