import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

// In-memory PostgreSQL only. Never reads .env or connects to Supabase.
const db = new PGlite();
const user = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
let assertions = 0;
async function rejects(sql: string, values: unknown[] = []) {
  await assert.rejects(() => db.query(sql, values)); assertions++;
}
async function scalar(sql: string, values: unknown[] = []) {
  const result = await db.query<Record<string, unknown>>(sql, values);
  return Object.values(result.rows[0])[0];
}

try {
  await db.exec(`create role anon; create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
    grant usage on schema auth, public to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;`);
  const migrations = ['001_initial_schema.sql','003_procore_document_register.sql','004_wir_integration.sql','005_wir_pdf_metadata.sql','006_quality_records_v2.sql','007_project_context.sql','008_quality_integrity.sql'];
  for (const file of migrations) {
    // PGlite has core gen_random_uuid; hosted Supabase retains pgcrypto unchanged.
    const sql = readFileSync(`database/${file}`, 'utf8').replace('create extension if not exists pgcrypto;', '');
    await db.exec(sql);
  }
  assert.equal(await scalar('select count(*) from projects'), 0);
  await db.query('insert into auth.users(id,email) values ($1,$2),($3,$4)', [user,'test@example.invalid',other,'other@example.invalid']);
  await db.exec('set role anon');
  for (const table of ['projects','inspections','mir_records','ncrs','sor_records','rrr_records','quality_record_actions','rrr_evidence','record_links']) await rejects(`select * from public.${table}`);
  await rejects("insert into projects(name,project_code,client,location) values ('Unauthorized','BAD','Test','Test')");
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
  await db.exec('set role authenticated');
  await rejects("insert into projects(name,project_code,client,location,created_by) values ('Wrong owner','BAD','Test','Test',$1)", [other]);
  const project = await scalar("insert into projects(name,project_code,client,contractor,consultant,location,created_by) values ('Test project','IL051','Test employer','Test contractor','Test engineer','Test location',$1) returning id", [user]);
  const project2 = await scalar("insert into projects(name,project_code,client,location,created_by) values ('Second','SECOND','Test','Test',$1) returning id", [user]);
  await db.query('update profiles set active_project_id=$1 where id=$2', [project,user]);
  assert.equal(await scalar('select active_project_id from profiles where id=$1',[user]), project);
  await db.query('update profiles set active_project_id=$1 where id=$2', [project2,other]);
  assert.equal(await scalar('select active_project_id from profiles where id=$1',[other]), null);

  const wir = await scalar("insert into inspections(project_id,inspection_number,inspection_type,discipline,area,description,inspector,responsible_company,planned_inspection_date,status,created_by) values ($1,'LEGACY-01','Work','Civil','Test','Test','Tester','Test','2026-09-05','Planned',$2) returning id",[project,user]);
  const mir = await scalar("insert into mir_records(project_id,mir_number,document_code,record_date,discipline,title,material_title,created_by) values ($1,'MIR.0001','IL051-IP-C-MIR.0001-XX-XX-XXXX-SRB','2026-09-05','Civil','Test','Test',$2) returning id",[project,user]);
  const ncr = await scalar("insert into ncrs(project_id,ncr_number,title,description,discipline,area,severity,responsible_company,assigned_person,date_raised,due_date,status,created_by) values ($1,'LEGACY-NCR','Test','Test','Civil','Test','High','Test','Tester','2026-09-05','2026-09-06','Open',$2) returning id",[project,user]);
  const sor = await scalar("insert into sor_records(project_id,sor_number,document_code,record_date,discipline,title,description,created_by) values ($1,'SOR.0001','IL051-IP-C-SOR.0001-XX-XX-XXXX-SRB','2026-09-05','Civil','Test','Test',$2) returning id",[project,user]);
  const rrr = await scalar("insert into rrr_records(project_id,record_number,record_date,discipline,room,title,readiness_stage,room_route,created_by) values ($1,'RRR.000001','2026-09-05','General','TEST-ROOM','Test','Stage 1','Standard Room',$2) returning id",[project,user]);
  assert.equal(await scalar('select count(*) from rrr_readiness_controls where rrr_id=$1',[rrr]),5);
  assert.equal(await scalar('select count(*) from rrr_submission_revisions where rrr_id=$1',[rrr]),1);
  await rejects('update ncrs set project_id=$1 where id=$2',[project2,ncr]);
  await db.query("update inspections set description='Edited legacy WIR' where id=$1",[wir]);
  assert.equal(await scalar('select description from inspections where id=$1',[wir]),'Edited legacy WIR');
  const attendee = await scalar("insert into rrr_attendance(rrr_id,attendance_group,attendee_role) values ($1,'SERBAN','QA/QC') returning id",[rrr]);
  await db.query('update rrr_attendance set attended=true where id=$1',[attendee]);
  assert.equal(await scalar('select attended from rrr_attendance where id=$1',[attendee]),true);
  await db.query("insert into rrr_signatories(rrr_id,role,name) values ($1,'Engineer','Test reviewer')",[rrr]);
  await db.query("insert into rrr_linked_attachments(rrr_id,attachment_type,document_evidence_reference) values ($1,'Metadata only','Test external reference')",[rrr]);
  await rejects("insert into mir_records(project_id,mir_number,document_code,record_date,discipline,title,material_title,created_by) values ($1,'MIR.0001','duplicate','2026-09-05','Civil','Test','Test',$2)",[project,user]);
  await rejects("update rrr_records set record_number='RRR.0001' where id=$1",[rrr]);
  await rejects("update rrr_records set status='Released for Energization' where id=$1",[rrr]);
  await rejects("insert into quality_record_actions(project_id,parent_record_type,parent_record_id,action_description,responsible_person,due_date,created_by) values ($1,'NCR',$2,'Test','Tester','2026-09-06',$3)",[project2,ncr,user]);
  const action = await scalar("insert into quality_record_actions(project_id,parent_record_type,parent_record_id,action_description,responsible_person,due_date,created_by) values ($1,'NCR',$2,'Test','Tester','2026-09-06',$3) returning id",[project,ncr,user]);
  await rejects("update quality_record_actions set status='Closed' where id=$1",[action]);
  await db.query("update quality_record_actions set status='Closed',completion_date='2026-09-05',verification_note='Verified in test' where id=$1",[action]);
  const blocker = await scalar("insert into rrr_open_items(rrr_id,item_number,description,priority,linked_record_type,linked_record_id,reference) values ($1,'1','Test blocker','P1','NCR',$2,'NCR test') returning id",[rrr,ncr]);
  await db.query("insert into rrr_evidence(rrr_id,evidence_type,reference,linked_record_type,linked_record_id) values ($1,'WIR','Test WIR','WIR',$2)",[rrr,wir]);
  await db.query("insert into record_links(project_id,source_record_type,source_record_id,target_record_type,target_record_id,relationship_type,created_by) values ($1,'RRR',$2,'MIR',$3,'Evidence',$4)",[project,rrr,mir,user]);
  await db.query("insert into record_links(project_id,source_record_type,source_record_id,target_record_type,external_reference,relationship_type,created_by) values ($1,'RRR',$2,'MIR','External Procore reference','Evidence',$3)",[project,rrr,user]);
  await db.query('update rrr_readiness_controls set percent_complete=100 where rrr_id=$1',[rrr]);
  const declarations = ['room_complete','no_open_p1_p2_items','declaration_complete','room_secured_under_control','doors_installed_locked','access_retained_by_authorized_person','permit_sleeve_fitted','loto_applied','live_warning_notices_fitted','life_safety_provisions_in_place','cleanliness_dust_control_maintained'].map((f)=>`${f}=true`).join(',');
  await db.query(`update rrr_records set ${declarations},engineer_decision='Verified',cxa_decision='Accepted' where id=$1`,[rrr]);
  await rejects("update rrr_records set status='Released for Commissioning',employer_release='Room Released for Commissioning' where id=$1",[rrr]);
  await db.query("update rrr_open_items set status='Closed' where id=$1",[blocker]);
  await rejects("update rrr_records set status='Released for Commissioning',employer_release=null where id=$1",[rrr]);
  await db.query("update rrr_records set status='Released for Commissioning',employer_release='Room Released for Commissioning' where id=$1",[rrr]);
  await rejects("update rrr_open_items set status='Open' where id=$1",[blocker]);
  await rejects("update rrr_readiness_controls set percent_complete=99 where rrr_id=$1 and control_level like 'RR-4%'",[rrr]);
  await rejects("update rrr_records set status='Released for Energization',employer_release='Released for Energization — L2B Tags Signed Off' where id=$1",[rrr]);
  await db.query("insert into rrr_commissioning_tags(rrr_id,tag_type,cxa_signoff_date,reference) values ($1,'L2B YELLOW TAG','2026-09-05','TEST-TAG')",[rrr]);
  await db.query("update rrr_records set status='Released for Energization',employer_release='Released for Energization — L2B Tags Signed Off',submission_revision='R0.1' where id=$1",[rrr]);
  assert.equal(await scalar('select count(*) from rrr_submission_revisions where rrr_id=$1',[rrr]),2);
  await rejects("update rrr_submission_revisions set source_reason='tamper' where rrr_id=$1",[rrr]);
  await rejects("update rrr_records set submission_revision='R0.0' where id=$1",[rrr]);
  assert.equal(await scalar('select submission_revision from rrr_records where id=$1',[rrr]),'R0.1');
  for (const [table,id] of [['mir_records',mir],['ncrs',ncr],['sor_records',sor],['rrr_records',rrr]] as [string, unknown][]) {
    await db.query(`update ${table} set title='Edited in test' where id=$1`,[id]);
    assert.equal(await scalar(`select title from ${table} where id=$1`,[id]),'Edited in test');
    await db.query(`delete from ${table} where id=$1`,[id]);
    assert.equal(await scalar(`select count(*) from ${table} where id=$1`,[id]),0);
  }
  await db.query('delete from inspections where id=$1',[wir]);
  assert.equal(await scalar('select count(*) from quality_record_actions'),0);
  assert.equal(await scalar('select count(*) from rrr_submission_revisions'),0);
  console.log(`PASS: ${migrations.length} migrations; fresh empty state; first project; profile ownership; five-module CRUD; ${assertions} rejection cases; RRR gates/history; relational cleanup. In-memory PostgreSQL only.`);
} finally { await db.close(); }
