-- Additive import metadata; existing records are not rewritten.
alter table public.trafo_degisim add column if not exists import_hash text;
alter table public.trafo_degisim add column if not exists import_row integer;
create unique index if not exists trafo_import_once2026 on public.trafo_degisim(import_hash,import_row) where import_hash is not null;

create or replace function public.trafo_import2026(incoming jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare item jsonb; n integer:=0; fingerprint text; inserted_count integer:=0; rec public.trafo_degisim%rowtype;
begin
 if auth.uid() is null or private.current_app_role() not in ('admin','editor') then raise insufficient_privilege; end if;
 if jsonb_typeof(incoming) is distinct from 'array' or jsonb_array_length(incoming)=0 or jsonb_array_length(incoming)>5000 then raise invalid_parameter_value using message='1–5000 satır gerekli'; end if;
 fingerprint:=md5(incoming::text);perform pg_advisory_xact_lock(hashtextextended(fingerprint,0));
 if exists(select 1 from public.trafo_degisim where import_hash=fingerprint) then return jsonb_build_object('inserted',0,'already_imported',true); end if;
 for item in select value from jsonb_array_elements(incoming) loop
  n:=n+1;
  if coalesce(item->>'yil','') !~ '^20[0-9]{2}$' or nullif(trim(item->>'ilce'),'') is null or nullif(trim(item->>'degisim_nedeni'),'') is null or coalesce(nullif(trim(item->>'tr'),''),nullif(trim(item->>'trafo_id'),''),nullif(trim(item->>'lokasyon_id'),'')) is null then raise invalid_parameter_value using message='Eksik alan: satır '||n; end if;
  rec:=jsonb_populate_record(null::public.trafo_degisim,item||jsonb_build_object('id',nextval(pg_get_serial_sequence('public.trafo_degisim','id')),'import_hash',fingerprint,'import_row',n,'created_at',clock_timestamp(),'updated_at',clock_timestamp()));
  if rec.tarih is not null then rec.yil:=extract(year from rec.tarih)::int;rec.ay:=(array['OCAK','ŞUBAT','MART','NİSAN','MAYIS','HAZİRAN','TEMMUZ','AĞUSTOS','EYLÜL','EKİM','KASIM','ARALIK'])[extract(month from rec.tarih)::int]; end if;
  if rec.ay is null or rec.ay<>all(array['OCAK','ŞUBAT','MART','NİSAN','MAYIS','HAZİRAN','TEMMUZ','AĞUSTOS','EYLÜL','EKİM','KASIM','ARALIK']) then raise invalid_parameter_value using message='Geçersiz ay: satır '||n; end if;
  insert into public.trafo_degisim select rec.*;inserted_count:=inserted_count+1;
 end loop;
 return jsonb_build_object('inserted',inserted_count,'already_imported',false);
end; $$;
revoke all on function public.trafo_import2026(jsonb) from public,anon;
grant execute on function public.trafo_import2026(jsonb) to authenticated;

create or replace function public.trafo_restore2026(incoming jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare rows jsonb; logs jsonb; brands jsonb; table_name text;
begin
 if current_user <> 'service_role' then raise insufficient_privilege; end if;
 rows:=coalesce(incoming->'tables'->'trafo_degisim',incoming->'trafo_degisim');logs:=coalesce(incoming->'tables'->'trafo_audit_log',incoming->'audit_logs','[]'::jsonb);brands:=incoming->'tables'->'trafo_markalari';
 if jsonb_typeof(rows) is distinct from 'array' or jsonb_array_length(rows)=0 or jsonb_typeof(logs) is distinct from 'array' then raise invalid_parameter_value using message='Geçersiz veya boş yedek'; end if;
 lock table public.trafo_degisim,public.trafo_audit_log in exclusive mode;
 delete from public.trafo_degisim;
 insert into public.trafo_degisim select * from jsonb_populate_recordset(null::public.trafo_degisim,rows);
 delete from public.trafo_audit_log;
 insert into public.trafo_audit_log select * from jsonb_populate_recordset(null::public.trafo_audit_log,logs);
 if brands is not null then
  if jsonb_typeof(brands)<>'array' then raise invalid_parameter_value; end if;
  delete from public.trafo_markalari;insert into public.trafo_markalari select * from jsonb_populate_recordset(null::public.trafo_markalari,brands);
 end if;
 for table_name in select unnest(array['trafo_degisim','trafo_audit_log','trafo_markalari']) loop
  execute format('select setval(pg_get_serial_sequence(%L,%L),greatest(coalesce(max(id),0),1),coalesce(max(id),0)>0) from public.%I','public.'||table_name,'id',table_name);
 end loop;
 return jsonb_build_object('trafo',jsonb_array_length(rows),'audit',jsonb_array_length(logs));
end; $$;
revoke all on function public.trafo_restore2026(jsonb) from public,anon,authenticated;
grant execute on function public.trafo_restore2026(jsonb) to service_role;

create or replace function public.trafo_snapshot2026()
returns jsonb language sql security invoker set search_path='' as $$
 select jsonb_build_object('trafo_degisim',(select coalesce(jsonb_agg(t order by t.id),'[]'::jsonb) from public.trafo_degisim t),'trafo_markalari',(select coalesce(jsonb_agg(t order by t.id),'[]'::jsonb) from public.trafo_markalari t),'trafo_audit_log',(select coalesce(jsonb_agg(t order by t.id),'[]'::jsonb) from public.trafo_audit_log t));
$$;
revoke all on function public.trafo_snapshot2026() from public,anon,authenticated;
grant execute on function public.trafo_snapshot2026() to service_role;

create or replace function public.trafo_period_consistency2026()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.tarih is not null then
  new.yil:=extract(year from new.tarih)::integer;
  new.ay:=(array['OCAK','ŞUBAT','MART','NİSAN','MAYIS','HAZİRAN','TEMMUZ','AĞUSTOS','EYLÜL','EKİM','KASIM','ARALIK'])[extract(month from new.tarih)::integer];
 end if;
 return new;
end; $$;
revoke all on function public.trafo_period_consistency2026() from public,anon;
drop trigger if exists trafo_period_consistency2026 on public.trafo_degisim;
create trigger trafo_period_consistency2026 before insert or update on public.trafo_degisim for each row execute function public.trafo_period_consistency2026();
