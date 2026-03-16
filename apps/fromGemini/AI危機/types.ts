export type ISODateString = string;
export type JobCode = string;
export type IndustryCode = string;
export type Percentage = number;
export type Score = number;

export type EmploymentType =
  | "full-time"
  | "contract"
  | "temporary"
  | "freelance"
  | "part-time"
  | "other";

export type CompanySize =
  | "micro"
  | "small"
  | "medium"
  | "large"
  | "enterprise"
  | "public";

export type AiUsageLevel = "none" | "basic" | "intermediate" | "advanced";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type ReskillingUrgency = "watch" | "prepare" | "act-now" | "emergency";

export interface ValueWithConfidence {
  value: number;
  confidence: number;
}

export interface AiResistanceParameters {
  physicalWorkRatio: Percentage;
  manualDexterityRatio: Percentage;
  onSiteWorkRatio: Percentage;
  faceToFaceInteractionRatio: Percentage;
  emotionalLaborRatio: Percentage;
  relationshipDependencyRatio: Percentage;
  tacitKnowledgeRatio: Percentage;
  ambiguityHandlingRatio: Percentage;
  creativeProblemSolvingRatio: Percentage;
  situationalAdaptationRatio: Percentage;
  environmentVariabilityRatio: Percentage;
  safetyCriticalityRatio: Percentage;
  legalEthicalAccountabilityRatio: Percentage;
  trustRequirementRatio: Percentage;
  negotiationPersuasionRatio: Percentage;
  leadershipCoordinationRatio: Percentage;
}

export interface AutomationExposureParameters {
  routineWorkRatio: Percentage;
  digitalWorkRatio: Percentage;
  structuredDataDependencyRatio: Percentage;
  documentProcessingRatio: Percentage;
  ruleBasedDecisionRatio: Percentage;
  remoteExecutionFeasibility: Percentage;
  outputStandardizationRatio: Percentage;
}

export interface IncomeBenchmark {
  currency: "JPY";
  annualMedian: number;
  annualP25: number;
  annualP75: number;
}

export interface JobMasterRecord {
  jobCode: JobCode;
  job_code?: JobCode;
  jobTitle: string;
  job_title?: string;
  industryCode: IndustryCode;
  industry_code?: IndustryCode;
  industryName: string;
  industry_name?: string;
  category?: string;
  description: string;
  typicalTasks: string[];
  typical_tasks?: string[];
  requiredSkills: string[];
  required_skills?: string[];
  baseReplacementRate?: Percentage;
  base_replacement_rate?: Percentage;
  baseCareerLifespanYears?: number;
  base_career_lifespan_years?: number;
  suggestedSkills?: string[];
  suggested_skills?: string[];
  replacementBaseline: {
    aiReplacementRate: Percentage;
    careerLifespanYears: number;
  };
  automationExposure: AutomationExposureParameters;
  aiResistance: AiResistanceParameters;
  incomeBenchmark: IncomeBenchmark;
  marketSignals: {
    laborShortageLevel: Score;
    domesticDemandOutlook: Score;
    globalOffshorability: Score;
    regulationBarrierLevel: Score;
    licensingBarrierLevel: Score;
  };
  references?: {
    source: string;
    updatedAt: ISODateString;
  }[];
}

export interface JobMaster {
  version: string;
  generatedAt: ISODateString;
  totalJobs: number;
  jobs: JobMasterRecord[];
}

export interface UserSurvey {
  surveyId: string;
  submittedAt: ISODateString;
  selectedJobCode: JobCode;
  selected_job_code?: JobCode;
  profile: {
    age?: number;
    employmentType: EmploymentType;
    companySize?: CompanySize;
    annualIncome?: number;
    yearsOfExperience: number;
    managementExperienceYears?: number;
  };
  jobContext: {
    mainTasks: string[];
    main_tasks?: string[];
    taskComposition: {
      physicalWorkRatio: Percentage;
      deskWorkRatio: Percentage;
      customerInteractionRatio: Percentage;
      managementCoordinationRatio: Percentage;
      creativeWorkRatio: Percentage;
      routineTaskRatio?: Percentage;
      routine_task_ratio?: Percentage;
    };
    workEnvironmentVariability: Score;
    remoteWorkAvailability: Score;
    complianceResponsibilityLevel: Score;
    decisionMakingDiscretionLevel: Score;
  };
  aiReadiness: {
    currentAiUsageLevel: AiUsageLevel;
    aiSkillLevel?: Score | AiUsageLevel;
    ai_skill_level?: Score | AiUsageLevel;
    weeklyAiUsageHours: number;
    toolCountInUse: number;
    promptDesignConfidence: Score;
    automationImplementationExperience: Score;
    reskillingIntent: Score;
  };
  selfAssessment: {
    communicationStrength: Score;
    empathyStrength: Score;
    manualSkillStrength: Score;
    creativityStrength: Score;
    leadershipStrength: Score;
    domainExpertiseStrength: Score;
  };
}

export interface RiskFactorBreakdown {
  baselineAutomationRisk: ValueWithConfidence;
  jobSpecificResistance: ValueWithConfidence;
  userTaskAdjustment: ValueWithConfidence;
  aiReadinessAdjustment: ValueWithConfidence;
  marketAdjustment: ValueWithConfidence;
}

export interface DiagnosticNarrative {
  warningLabel?: string;
  scaryCopy?: string;
  summary: string;
  strongestDefenseFactors: string[];
  mainRiskFactors: string[];
  recommendedActions: string[];
}

export interface DiagnosticResult {
  resultId: string;
  calculatedAt: ISODateString;
  surveyId: string;
  matchedJob: {
    jobCode: JobCode;
    jobTitle: string;
    industryName: string;
  };
  metrics: {
    aiReplacementRate: Percentage;
    careerLifespanYears: number;
    incomeMaintenanceProbability: Percentage;
    resilienceScore: Score;
    aiReadinessScore: Score;
    reskillingPriorityScore: Score;
    survivalScore?: Score;
    escapeIndex?: Score;
  };
  levels: {
    replacementRiskLevel: RiskLevel;
    reskillingUrgency: ReskillingUrgency;
  };
  factorBreakdown: RiskFactorBreakdown;
  scenarioForecasts: {
    byYear: Array<{
      year: number;
      estimatedReplacementRate: Percentage;
      estimatedIncomeMaintenanceProbability: Percentage;
    }>;
  };
  narrative: DiagnosticNarrative;
  sourceSnapshot: {
    jobMasterVersion: string;
    modelVersion: string;
  };
}

export interface DiagnosticPayload {
  jobMaster: JobMaster;
  userSurvey: UserSurvey;
  diagnosticResult: DiagnosticResult;
}