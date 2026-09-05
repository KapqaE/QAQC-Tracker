-- Additive integrity revision. Apply after 007_project_context.sql.
-- No existing rows are removed or rewritten. Existing RLS and shared workspace
-- access remain in force; all functions run with the caller's privileges.
begin;

create or replace function public.qaqc_record_project(kind text, record_id uuid)
returns uuid language plpgsql stable security invoker set search_path = public as $$
declare project uuid;
begin
  case kind
    when 'WIR' then select project_id into project from public.inspections where id = record_id;
    when 'MIR' then select project_id into project from public.mir_records where id = record_id;
    when 'NCR' then select project_id into project from public.ncrs where id = record_id;
    when 'SOR' then select project_id into project from public.sor_records where id = record_id;
    when 'RRR' then select project_id into project from public.rrr_records where id = record_id;
    else raise exception 'Unknown quality record type.' using errcode = '23514';
  end case;
  if project is null then raise exception 'Linked quality record is unavailable.' using errcode = '23503'; end if;
  return project;
end $$;

create or replace function public.qaqc_validate_relation()
returns trigger language plpgsql security invoker set search_path = public as $$
declare project uuid;
begin
  if tg_table_name = 'quality_record_actions' then
    project := public.qaqc_record_project(new.parent_record_type, new.parent_record_id);
    if project <> new.project_id then raise exception 'Action and parent must belong to the same project.' using errcode = '23514'; end if;
    if new.status in ('Verified','Closed') and (new.completion_date is null or nullif(btrim(new.verification_note),'') is null) then
      raise exception 'Completed actions require a completion date and verification note.' using errcode = '23514';
    end if;
  elsif tg_table_name = 'record_links' then
    project := public.qaqc_record_project(new.source_record_type, new.source_record_id);
    if project <> new.project_id or (new.target_record_id is not null and public.qaqc_record_project(new.target_record_type, new.target_record_id) <> project) then
      raise exception 'Linked records must belong to the same project.' using errcode = '23514';
    end if;
  else
    project := public.qaqc_record_project('RRR', new.rrr_id);
    if new.linked_record_id is not null then
      if new.linked_record_type is null or public.qaqc_record_project(new.linked_record_type, new.linked_record_id) <> project then
        raise exception 'Linked evidence must belong to the RRR project.' using errcode = '23514';
      end if;
    elsif nullif(btrim(new.reference),'') is null and new.linked_record_type is not null then
      raise exception 'Provide an external reference or a local record ID.' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;

do $$ declare tab text; begin
  foreach tab in array array['quality_record_actions','record_links','rrr_open_items','rrr_evidence'] loop
    execute format('create or replace trigger qaqc_validate_relation before insert or update on public.%I for each row execute function public.qaqc_validate_relation()',tab);
  end loop;
end $$;

create or replace function public.qaqc_assert_rrr_release(rrr_id uuid)
returns void language plpgsql security invoker set search_path = public as $$
declare r public.rrr_records; field text;
begin
  select * into r from public.rrr_records where id = rrr_id for update;
  if not found then return; end if;
  if r.status not in ('Released for Commissioning','Released for Energization') and coalesce(r.employer_release,'') not in ('Room Released for Commissioning','Released for Energization — L2B Tags Signed Off') then return; end if;
  if not exists(select 1 from public.rrr_readiness_controls c where c.rrr_id = r.id and c.control_level like 'RR-4%' and c.percent_complete = 100 and c.open_actions_count = 0)
    or exists(select 1 from public.rrr_readiness_controls c where c.rrr_id = r.id and c.control_level like 'RR-4%' and (c.percent_complete < 100 or c.open_actions_count > 0))
    or exists(select 1 from public.rrr_open_items i where i.rrr_id = r.id and i.priority in ('P1','P2') and i.status <> 'Closed') then
    raise exception 'RRR release blocked: complete RR-4 and close P1/P2 items.' using errcode = '23514';
  end if;
  foreach field in array array['room_complete','no_open_p1_p2_items','declaration_complete','room_secured_under_control','doors_installed_locked','access_retained_by_authorized_person','permit_sleeve_fitted','loto_applied','live_warning_notices_fitted','life_safety_provisions_in_place','cleanliness_dust_control_maintained'] loop
    if (to_jsonb(r)->>field)::boolean is not true then raise exception 'RRR release requires all contractor declarations.' using errcode = '23514'; end if;
  end loop;
  if r.engineer_decision is distinct from 'Verified' or coalesce(r.cxa_decision,'') not in ('Accepted','Accepted with Conditions') then
    raise exception 'RRR release requires separate Engineer verification and CxA acceptance.' using errcode = '23514';
  end if;
  if ((r.status = 'Released for Commissioning' and r.employer_release = 'Room Released for Commissioning') or
    (r.status = 'Released for Energization' and r.employer_release = 'Released for Energization — L2B Tags Signed Off')) is not true then
    raise exception 'Workflow status and Employer release must agree.' using errcode = '23514';
  end if;
  if r.status = 'Released for Energization' and (
    not exists(select 1 from public.rrr_commissioning_tags t where t.rrr_id=r.id and t.tag_type='L2B YELLOW TAG') or
    exists(select 1 from public.rrr_commissioning_tags t where t.rrr_id=r.id and t.tag_type='L2B YELLOW TAG' and (t.cxa_signoff_date is null or nullif(btrim(t.reference),'') is null))) then
    raise exception 'Energization release requires referenced, signed-off L2B tags.' using errcode = '23514';
  end if;
end $$;

create or replace function public.qaqc_rrr_release_guard()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if tg_table_name = 'rrr_records' then perform public.qaqc_assert_rrr_release(new.id);
  else
    if tg_op <> 'INSERT' then perform public.qaqc_assert_rrr_release(old.rrr_id); end if;
    if tg_op <> 'DELETE' then perform public.qaqc_assert_rrr_release(new.rrr_id); end if;
  end if;
  return null;
end $$;

create or replace trigger qaqc_rrr_release_guard after insert or update on public.rrr_records for each row execute function public.qaqc_rrr_release_guard();
do $$ declare tab text; begin
  foreach tab in array array['rrr_readiness_controls','rrr_open_items','rrr_commissioning_tags'] loop
    execute format('create or replace trigger qaqc_rrr_release_guard after insert or update or delete on public.%I for each row execute function public.qaqc_rrr_release_guard()',tab);
  end loop;
end $$;

create or replace function public.qaqc_rrr_history()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.rrr_readiness_controls(rrr_id,control_level,sort_order) values
      (new.id,'RR-1 Construction — Room Readiness / L2A Red Tag',1),
      (new.id,'RR-1 Construction — Pre-Energization Works / L2B',2),
      (new.id,'RR-2 Pre-Commissioning — MCE',3),
      (new.id,'RR-3 Pre-Commissioning — Services',4),
      (new.id,'RR-4 Life Safety & LOTO',5);
  end if;
  if tg_op = 'INSERT' or new.submission_revision is distinct from old.submission_revision then
    insert into public.rrr_submission_revisions(rrr_id,submission_revision,submitted_date,source_reason,revised_by,status,created_by)
      values(new.id,new.submission_revision,case when new.status='Draft' then null else new.record_date end,
      case when tg_op='INSERT' then 'Initial submission' else 'Record resubmission' end,new.requested_by,new.status,auth.uid());
  end if;
  return null;
end $$;
create or replace trigger qaqc_rrr_history after insert or update on public.rrr_records for each row execute function public.qaqc_rrr_history();

-- History is append-only for authenticated clients. Parent deletion still cascades.
revoke update, delete on public.rrr_submission_revisions from authenticated;

-- Moving a parent would invalidate its polymorphic actions/evidence relationships.
-- A project transfer requires an explicit migration workflow, not an ordinary edit.
create or replace function public.qaqc_keep_record_project()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if new.project_id is distinct from old.project_id then
    raise exception 'An existing quality record cannot be moved to another project.' using errcode = '23514';
  end if;
  return new;
end $$;
do $$ declare tab text; begin
  foreach tab in array array['inspections','mir_records','ncrs','sor_records','rrr_records'] loop
    execute format('create or replace trigger qaqc_keep_record_project before update on public.%I for each row execute function public.qaqc_keep_record_project()',tab);
  end loop;
end $$;

create or replace function public.qaqc_record_delete_links()
returns trigger language plpgsql security invoker set search_path = public as $$
declare kind text := tg_argv[0];
begin
  delete from public.quality_record_actions where parent_record_type=kind and parent_record_id=old.id;
  delete from public.record_links where source_record_type=kind and source_record_id=old.id;
  update public.record_links set external_reference=coalesce(external_reference,old.id::text),target_record_id=null where target_record_type=kind and target_record_id=old.id;
  update public.rrr_evidence set linked_record_id=null,reference=coalesce(nullif(reference,''),old.id::text) where linked_record_type=kind and linked_record_id=old.id;
  update public.rrr_open_items set linked_record_id=null,reference=coalesce(nullif(reference,''),old.id::text) where linked_record_type=kind and linked_record_id=old.id;
  return old;
end $$;
create or replace trigger qaqc_record_delete_links before delete on public.inspections for each row execute function public.qaqc_record_delete_links('WIR');
create or replace trigger qaqc_record_delete_links before delete on public.mir_records for each row execute function public.qaqc_record_delete_links('MIR');
create or replace trigger qaqc_record_delete_links before delete on public.ncrs for each row execute function public.qaqc_record_delete_links('NCR');
create or replace trigger qaqc_record_delete_links before delete on public.sor_records for each row execute function public.qaqc_record_delete_links('SOR');
create or replace trigger qaqc_record_delete_links before delete on public.rrr_records for each row execute function public.qaqc_record_delete_links('RRR');

revoke all on function public.qaqc_record_project(text,uuid), public.qaqc_validate_relation(), public.qaqc_assert_rrr_release(uuid), public.qaqc_rrr_release_guard(), public.qaqc_rrr_history(), public.qaqc_record_delete_links() from public, anon;
grant execute on function public.qaqc_record_project(text,uuid), public.qaqc_validate_relation(), public.qaqc_assert_rrr_release(uuid), public.qaqc_rrr_release_guard(), public.qaqc_rrr_history(), public.qaqc_record_delete_links() to authenticated;
revoke all on function public.qaqc_keep_record_project() from public, anon;
grant execute on function public.qaqc_keep_record_project() to authenticated;
commit;
