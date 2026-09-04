-- QAQC Tracker demo dataset
-- Prerequisite: create at least one user through the application first.
-- Records are attributed to the earliest profile; no fake auth UUID is used.

do $$
declare
  seed_user_id uuid;
  seed_project_id uuid := '10000000-0000-4000-8000-000000000001';
begin
  select id into seed_user_id from public.profiles order by created_at asc limit 1;

  if seed_user_id is null then
    raise exception 'Create an application user before running 002_seed.sql.';
  end if;

  insert into public.projects (id, name, project_code, client, location, description, start_date, target_completion_date, status, created_by)
  values (seed_project_id, 'IST Data Center Expansion', 'IST-DCX-01', 'Example Client', 'Istanbul, Türkiye', 'Tier III data center expansion including two new data halls, MEP infrastructure, and commissioning.', '2025-01-15', '2026-12-18', 'Active', seed_user_id)
  on conflict (id) do update set name = excluded.name, project_code = excluded.project_code, client = excluded.client, location = excluded.location;

  insert into public.inspections (id, inspection_number, project_id, inspection_type, discipline, area, description, inspector, responsible_company, planned_inspection_date, actual_inspection_date, status, result, comments, created_by) values
    ('20000000-0000-4000-8000-000000000001', 'INS-EL-0248', seed_project_id, 'Installation Inspection', 'Electrical', 'Data Hall B / Row 06', 'Busway tap-off installation and torque verification', 'Mert Aydin', 'Voltatek MEP', current_date + 2, null, 'Requested', null, null, seed_user_id),
    ('20000000-0000-4000-8000-000000000002', 'INS-ME-0192', seed_project_id, 'Pressure Test', 'Mechanical', 'Chiller Yard', 'CHW primary loop hydrostatic pressure test', 'Selin Kaya', 'Therma Systems', current_date + 1, null, 'In Progress', null, null, seed_user_id),
    ('20000000-0000-4000-8000-000000000003', 'INS-FA-0087', seed_project_id, 'Functional Test', 'Fire Alarm', 'Data Hall A', 'VESDA sampling pipe and detector functional test', 'Can Demir', 'SafeCore', current_date, current_date, 'Passed', 'Accepted', 'Functional test accepted.', seed_user_id),
    ('20000000-0000-4000-8000-000000000004', 'INS-CM-0061', seed_project_id, 'Pre-commissioning', 'Commissioning', 'UPS Room 2', 'UPS battery string pre-energization checks', 'Ece Arslan', 'PowerGrid Ltd.', current_date + 3, null, 'Planned', null, null, seed_user_id),
    ('20000000-0000-4000-8000-000000000005', 'INS-BMS-0114', seed_project_id, 'Point-to-point Test', 'BMS', 'Plant Room L2', 'AHU sensor and actuator point-to-point verification', 'Baris Koc', 'ControlWorks', current_date - 3, current_date - 3, 'Failed', 'Rejected', 'Two temperature sensors out of calibration.', seed_user_id)
  on conflict (id) do nothing;

  insert into public.ncrs (id, ncr_number, project_id, title, description, discipline, area, severity, responsible_company, assigned_person, date_raised, due_date, status, root_cause, corrective_action, created_by) values
    ('30000000-0000-4000-8000-000000000001', 'NCR-EL-0042', seed_project_id, 'Busway support spacing exceeds approved detail', 'Support spacing measured at 2.1 m against 1.5 m approved maximum.', 'Electrical', 'Data Hall B / Row 04', 'High', 'Voltatek MEP', 'Kerem Sahin', current_date - 12, current_date - 3, 'Corrective Action', 'Installation team used superseded coordination drawing.', 'Add approved intermediate supports and submit torque records.', seed_user_id),
    ('30000000-0000-4000-8000-000000000002', 'NCR-ME-0038', seed_project_id, 'CHW flange coating damaged', 'Factory coating damage identified on multiple flanges after installation.', 'Mechanical', 'Chiller Yard', 'Medium', 'Therma Systems', 'Derya Tekin', current_date - 8, current_date + 2, 'Under Review', null, null, seed_user_id),
    ('30000000-0000-4000-8000-000000000003', 'NCR-AR-0021', seed_project_id, 'Fire-rated wall penetration unsealed', 'Cable penetration left without approved firestop system.', 'Architectural', 'Electrical Room L1', 'Critical', 'Anka Construction', 'Ozan Aksoy', current_date - 5, current_date - 1, 'Open', null, null, seed_user_id),
    ('30000000-0000-4000-8000-000000000004', 'NCR-BMS-0017', seed_project_id, 'Sensor calibration certificates missing', 'Calibration records unavailable for installed temperature sensors.', 'BMS', 'Plant Room L2', 'Medium', 'ControlWorks', 'Emre Gunes', current_date - 3, current_date + 4, 'Ready for Inspection', 'Supplier document package incomplete.', 'Upload valid certificates and re-check serial numbers.', seed_user_id),
    ('30000000-0000-4000-8000-000000000005', 'NCR-FA-0009', seed_project_id, 'Detector identification mismatch', 'Loop addresses did not match approved cause and effect matrix.', 'Fire Alarm', 'Data Hall A', 'High', 'SafeCore', 'Sena Yilmaz', current_date - 20, current_date - 11, 'Closed', 'Labels printed from an outdated schedule.', 'Re-addressed detectors and updated as-built matrix.', seed_user_id)
  on conflict (id) do nothing;

  insert into public.punch_items (id, punch_number, project_id, area, discipline, description, responsible_company, assigned_person, priority, due_date, status, created_by) values
    ('40000000-0000-4000-8000-000000000001', 'PL-EL-0189', seed_project_id, 'UPS Room 2', 'Electrical', 'Install missing circuit identification labels on DB-UPS-2A.', 'Voltatek MEP', 'Kerem Sahin', 'High', current_date + 1, 'In Progress', seed_user_id),
    ('40000000-0000-4000-8000-000000000002', 'PL-ME-0154', seed_project_id, 'Chiller Yard', 'Mechanical', 'Touch up damaged coating on CHW pipe supports.', 'Therma Systems', 'Derya Tekin', 'Medium', current_date + 3, 'Open', seed_user_id),
    ('40000000-0000-4000-8000-000000000003', 'PL-AR-0098', seed_project_id, 'Data Hall B', 'Architectural', 'Replace chipped raised floor tile at grid B14.', 'Anka Construction', 'Ozan Aksoy', 'Low', current_date - 1, 'Ready for Verification', seed_user_id),
    ('40000000-0000-4000-8000-000000000004', 'PL-CV-0064', seed_project_id, 'Generator Yard', 'Civil', 'Repair minor plinth edge damage and finish coating.', 'Anka Construction', 'Ozan Aksoy', 'Low', current_date - 8, 'Closed', seed_user_id)
  on conflict (id) do nothing;

  insert into public.documents (id, document_number, title, project_id, discipline, document_type, revision, status, file_path, uploaded_by) values
    ('50000000-0000-4000-8000-000000000001', 'IST-DCX-EL-MSP-0042', 'Data Hall B Busway Installation Method Statement', seed_project_id, 'Electrical', 'Method Statement', 'C02', 'Approved with Comments', null, seed_user_id),
    ('50000000-0000-4000-8000-000000000002', 'IST-DCX-ME-ITP-0018', 'Chilled Water Pressure Testing ITP', seed_project_id, 'Mechanical', 'ITP', 'B01', 'Under Review', null, seed_user_id),
    ('50000000-0000-4000-8000-000000000003', 'IST-DCX-CM-PRC-0007', 'UPS Pre-energization Procedure', seed_project_id, 'Commissioning', 'Procedure', 'A03', 'Approved', null, seed_user_id)
  on conflict (id) do nothing;

  insert into public.notifications (user_id, title, message, type, related_entity_type, related_entity_id)
  select seed_user_id, 'Overdue critical NCR', 'NCR-AR-0021 is overdue and requires immediate attention.', 'overdue', 'ncr', '30000000-0000-4000-8000-000000000003'
  where not exists (select 1 from public.notifications where user_id = seed_user_id and related_entity_id = '30000000-0000-4000-8000-000000000003');
end $$;
