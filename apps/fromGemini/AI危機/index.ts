import jobMasterData from "./job-master.json";
import { calculateSurvivalScore, generateAdvice } from "./logic";
import type { DiagnosticResult, JobMaster, UserSurvey } from "./types";

export { calculateSurvivalScore } from "./logic";
export { generateAdvice } from "./logic";
export type { DiagnosticResult, JobMaster, UserSurvey } from "./types";

export const jobMaster = jobMasterData as JobMaster;

export function runDiagnosis(userSurvey: UserSurvey): DiagnosticResult {
  return calculateSurvivalScore(userSurvey, jobMaster);
}

export const sampleSurvey: UserSurvey = {
  surveyId: "sample-survey-001",
  submittedAt: new Date().toISOString(),
  selectedJobCode: "OFF001",
  profile: {
    age: 32,
    employmentType: "full-time",
    companySize: "medium",
    annualIncome: 4200000,
    yearsOfExperience: 8,
    managementExperienceYears: 0,
  },
  jobContext: {
    mainTasks: ["データ入力", "書類作成", "社内連絡"],
    taskComposition: {
      physicalWorkRatio: 0.1,
      deskWorkRatio: 0.9,
      customerInteractionRatio: 0.2,
      managementCoordinationRatio: 0.1,
      creativeWorkRatio: 0.1,
      routineTaskRatio: 0.9,
    },
    workEnvironmentVariability: 2,
    remoteWorkAvailability: 4,
    complianceResponsibilityLevel: 2,
    decisionMakingDiscretionLevel: 2,
  },
  aiReadiness: {
    currentAiUsageLevel: "basic",
    aiSkillLevel: 2,
    weeklyAiUsageHours: 2,
    toolCountInUse: 1,
    promptDesignConfidence: 2,
    automationImplementationExperience: 1,
    reskillingIntent: 3,
  },
  selfAssessment: {
    communicationStrength: 2,
    empathyStrength: 2,
    manualSkillStrength: 1,
    creativityStrength: 2,
    leadershipStrength: 1,
    domainExpertiseStrength: 2,
  },
};

export function runSampleDiagnosis(): DiagnosticResult {
  return runDiagnosis(sampleSurvey);
}