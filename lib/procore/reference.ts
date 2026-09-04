import classifications from '@/data/procore/classifications.json';
import assignedWorkflows from '@/data/procore/assigned-workflows.json';
import currentWorkflowSteps from '@/data/procore/current-workflow-steps.json';
import disciplines from '@/data/procore/disciplines.json';
import documentTypes from '@/data/procore/document-types.json';
import eas6bClassifications from '@/data/procore/eas6b-classifications.json';
import eas6bDisciplines from '@/data/procore/eas6b-disciplines.json';
import eas6bFileTypes from '@/data/procore/eas6b-file-types.json';
import eas6bLevels from '@/data/procore/eas6b-levels.json';
import eas6bOriginators from '@/data/procore/eas6b-originators.json';
import eas6bPlanAreas from '@/data/procore/eas6b-plan-areas.json';
import eas6bSegmentRules from '@/data/procore/eas6b-segment-rules.json';
import eas6bVolumes from '@/data/procore/eas6b-volumes.json';
import locations from '@/data/procore/locations.json';
import namingClassificationSlots from '@/data/procore/naming-classification-slots.json';
import namingLocationSlots from '@/data/procore/naming-location-slots.json';
import namingRules from '@/data/procore/naming-rules.json';
import numberingRules from '@/data/procore/numbering-rules.json';
import originators from '@/data/procore/originators.json';
import projectStages from '@/data/procore/project-stages.json';
import projects from '@/data/procore/projects.json';
import procorePatternComparison from '@/data/procore/procore-pattern-comparison.json';
import revisionPatterns from '@/data/procore/revision-patterns.json';
import statuses from '@/data/procore/statuses.json';
import volumesSystems from '@/data/procore/volumes-systems.json';
import workflowStatuses from '@/data/procore/workflow-statuses.json';
import type { Eas6bMasterCode, Eas6bNamingConvention, ProcoreMasterCode, ProcoreNamingRules, ProcoreNumberingRule, ProcorePatternComparison, ProcoreProjectCode } from '@/types/procore';

export const procoreReference = {
  projects: projects as ProcoreProjectCode[],
  documentTypes: documentTypes as ProcoreMasterCode[],
  disciplines: disciplines as ProcoreMasterCode[],
  originators: originators as ProcoreMasterCode[],
  volumesSystems: volumesSystems as ProcoreMasterCode[],
  locations: locations as ProcoreMasterCode[],
  namingLocationSlots: namingLocationSlots as ProcoreMasterCode[],
  classifications: classifications as ProcoreMasterCode[],
  namingClassificationSlots: namingClassificationSlots as ProcoreMasterCode[],
  statuses: statuses as ProcoreMasterCode[],
  revisionPatterns: revisionPatterns as ProcoreMasterCode[],
  projectStages: projectStages as ProcoreMasterCode[],
  workflowStatuses: workflowStatuses as ProcoreMasterCode[],
  currentWorkflowSteps: currentWorkflowSteps as ProcoreMasterCode[],
  assignedWorkflows: assignedWorkflows as ProcoreMasterCode[],
  numberingRules: numberingRules as ProcoreNumberingRule[],
  namingRules: namingRules as ProcoreNamingRules,
  eas6b: eas6bSegmentRules as Eas6bNamingConvention,
  eas6bFileTypes: eas6bFileTypes as Eas6bMasterCode[],
  eas6bDisciplines: eas6bDisciplines as Eas6bMasterCode[],
  eas6bLevels: eas6bLevels as Eas6bMasterCode[],
  eas6bPlanAreas: eas6bPlanAreas as Eas6bMasterCode[],
  eas6bVolumes: eas6bVolumes as Eas6bMasterCode[],
  eas6bClassifications: eas6bClassifications as Eas6bMasterCode[],
  eas6bOriginators: eas6bOriginators as Eas6bMasterCode[],
  patternComparison: procorePatternComparison as ProcorePatternComparison,
};

export function referenceLabel(items: ProcoreMasterCode[], code: string | null | undefined) {
  if (!code) return '—';
  return items.find((item) => item.code === code)?.label ?? code;
}

export function officialReferenceLabel(items: Eas6bMasterCode[], code: string | null | undefined) {
  if (!code) return '—';
  return items.find((item) => item.code === code)?.label ?? code;
}
