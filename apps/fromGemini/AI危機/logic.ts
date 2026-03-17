import type {
  AiUsageLevel,
  DiagnosticNarrative,
  DiagnosticResult,
  JobMaster,
  JobMasterRecord,
  Percentage,
  ReskillingUrgency,
  RiskLevel,
  Score,
  UserSurvey,
  ValueWithConfidence,
} from "./types";

const CURRENT_YEAR = 2026;
const DEADLINE_YEAR = 2030;

type NumericLike = number | string | undefined | null;

const VOLATILITY_MAP: Array<{ keywords: string[]; factor: number }> = [
  { keywords: ["IT", "SaaS", "ソフトウェア", "金融", "保険", "事務"], factor: 1.5 },
  { keywords: ["販売", "接客", "コールセンター", "小売", "物流"], factor: 1.25 },
  { keywords: ["専門職", "メディア", "教育"], factor: 1.0 },
  { keywords: ["建設", "公共", "現場作業", "インフラ"], factor: 0.7 },
  { keywords: ["医療", "介護", "保育"], factor: 0.8 },
];

const CATEGORY_SKILL_MAP: Record<string, string[]> = {
  "事務": ["AI業務設計", "業務改善", "顧客折衝", "データ品質管理"],
  IT: ["要件定義", "AI協働開発", "プロダクト設計", "セキュリティ運用"],
  "専門職": ["高信頼説明力", "監査視点", "複雑案件対応", "対人交渉"],
  "現場作業": ["設備保全", "安全管理", "現場監督", "複合機械オペレーション"],
  "医療・介護": ["高度対人支援", "ケア設計", "多職種連携", "記録DX"],
  "販売・接客": ["高単価提案", "顧客関係構築", "店舗運営", "CRM運用"],
};

export function normalizeInput(input: unknown): number {
  if (typeof input === "number") {
    if (input >= 1 && input <= 5) {
      return clamp(input / 5, 0.2, 1);
    }
    if (input > 0 && input <= 1) {
      return clamp(input, 0.2, 1);
    }
    if (input > 1 && input <= 100) {
      return clamp(input / 100, 0.2, 1);
    }
  }

  if (typeof input === "string") {
    const normalized = input.trim().toLowerCase();
    const usageMap: Record<AiUsageLevel, number> = {
      none: 0.2,
      basic: 0.4,
      intermediate: 0.7,
      advanced: 1,
    };
    if (normalized in usageMap) {
      return usageMap[normalized as AiUsageLevel];
    }
    const maybeNumber = Number(normalized);
    if (!Number.isNaN(maybeNumber)) {
      return normalizeInput(maybeNumber);
    }
  }

  return 0.2;
}

export function getMarketVolatility(label: string): number {
  const target = label.trim();
  const found = VOLATILITY_MAP.find((entry) =>
    entry.keywords.some((keyword) => target.includes(keyword))
  );
  return found?.factor ?? 1;
}

export function generateScaryCopy(risk: number, yearsLeft: number): Pick<DiagnosticNarrative, "warningLabel" | "scaryCopy"> {
  if (risk >= 0.85) {
    return {
      warningLabel: "即時避難",
      scaryCopy:
        `その仕事は安全地帯ではありません。AI導入が本格化した瞬間、今の担当範囲はまとめて圧縮される可能性があります。推定余命は${yearsLeft.toFixed(1)}年で、準備を先送りする余地はほぼありません。`,
    };
  }

  if (risk >= 0.7) {
    return {
      warningLabel: "レッドゾーン",
      scaryCopy:
        `市場はもう待ってくれません。今は役職や社歴で守られていても、業務そのものが薄くなれば席は残りません。放置コストのほうが学習コストより高い段階です。`,
    };
  }

  if (risk >= 0.5) {
    return {
      warningLabel: "要警戒",
      scaryCopy:
        `直ちに消える仕事ではありませんが、今の延長線だけでは防御力が足りません。数年後に評価されるのは作業量ではなく、AIを使って何を増幅できるかです。`,
    };
  }

  return {
    warningLabel: "監視継続",
    scaryCopy:
      "現時点では防御要素があります。ただし安心ではありません。AIに置き換わりにくい領域を意図的に伸ばせなければ、低リスク職種でも後追いで圧縮が始まります。",
  };
}

export function suggestPath(survey: UserSurvey, job: JobMasterRecord, risk: number): string[] {
  const category = job.category ?? job.industryName ?? job.industry_name ?? "その他";
  const taskList = dedupeStrings([
    ...(survey.jobContext.mainTasks ?? []),
    ...(survey.jobContext.main_tasks ?? []),
    ...(job.typicalTasks ?? []),
    ...(job.typical_tasks ?? []),
  ]);
  const routineHeavyTasks = taskList.filter((task) => {
    const target = task.toLowerCase();
    return ["入力", "集計", "作成", "確認", "転記", "定型", "報告", "書類"].some((keyword) =>
      target.includes(keyword)
    );
  });

  const baseSkills = CATEGORY_SKILL_MAP[category] ?? ["顧客理解", "問題設定", "AI活用設計"];
  const taskBasedSkills = routineHeavyTasks.slice(0, 2).map((task) => `「${task}」を自動化前提で再設計する力`);
  const jobSuggested = dedupeStrings([...(job.suggestedSkills ?? []), ...(job.suggested_skills ?? [])]).slice(0, 3);

  const advice = generateAdvice(job.jobCode ?? job.job_code ?? "");
  const suggestions = dedupeStrings([advice.now, advice.threeMonths, advice.sixMonths, ...taskBasedSkills, ...jobSuggested, ...baseSkills]);
  if (risk >= 0.75) {
    return suggestions.slice(0, 4).map((item) => `${item}を90日以内に着手`);
  }
  return suggestions.slice(0, 4);
}

export function generateAdvice(jobId: string): { now: string; threeMonths: string; sixMonths: string } {
  const code = jobId.toUpperCase();
  if (code.startsWith("OFF")) {
    return {
      now: "Excel作業を捨て、AIエージェントの構築スキルを学ぶ",
      threeMonths: "定型業務を自動化し、例外対応と顧客折衝へ時間を移す",
      sixMonths: "部門横断でAI運用の設計責任を担う",
    };
  }
  if (code.startsWith("IT")) {
    return {
      now: "コード記述量より、AIへ設計指示を出すシステムデザイン力を磨く",
      threeMonths: "AI協働の開発標準を作り、品質責任を可視化する",
      sixMonths: "上流工程の意思決定と事業責任へ軸足を移す",
    };
  }
  if (code.startsWith("SAL")) {
    return {
      now: "AIによる顧客分析を武器に、心理的交渉が必要な商談へ集中する",
      threeMonths: "高単価案件の勝ちパターンをテンプレート化する",
      sixMonths: "顧客戦略の設計者として売上責任を担う",
    };
  }
  return {
    now: "代替される工程と価値を生む工程を切り分ける",
    threeMonths: "AI活用で削れた時間を対人・上流タスクに再配分する",
    sixMonths: "AIを使う側として成果責任を持つポジションへ移る",
  };
}

export function calculateSurvivalScore(userSurvey: UserSurvey, jobMaster: JobMaster): DiagnosticResult {
  const matchedJob = findJob(userSurvey, jobMaster);
  if (!matchedJob) {
    throw new Error("Selected job code was not found in JobMaster.");
  }

  const baseRisk = clamp01(
    pickNumber(
      matchedJob.baseReplacementRate,
      matchedJob.base_replacement_rate,
      matchedJob.replacementBaseline?.aiReplacementRate,
      0.5
    )
  );

  const routineTaskRatio = clamp01(
    pickNumber(
      userSurvey.jobContext.taskComposition.routineTaskRatio,
      userSurvey.jobContext.taskComposition.routine_task_ratio,
      matchedJob.automationExposure?.routineWorkRatio,
      0.5
    )
  );

  const aiSkillScore = normalizeInput(
    pickDefined(
      userSurvey.aiReadiness.aiSkillLevel,
      userSurvey.aiReadiness.ai_skill_level,
      userSurvey.aiReadiness.currentAiUsageLevel,
      "none"
    )
  );

  const marketVolatility = getMarketVolatility(
    matchedJob.category ?? matchedJob.industryName ?? matchedJob.industry_name ?? "その他"
  );

  const resistanceShield = clamp01(calculateResistanceShield(matchedJob, userSurvey));
  const replacementRateCore = (baseRisk * routineTaskRatio) / (1 + aiSkillScore * 0.2);
  const adjustedRisk = clamp(replacementRateCore * marketVolatility * (1 - resistanceShield * 0.2), 0.02, 0.99);

  const age = userSurvey.profile.age ?? 35;
  const escapeIndex = clamp((age - 45) / 20, 0, 1);
  const lifespanByFormula = (10 / (Math.max(adjustedRisk, 0.03) * 1.5)) * (1 - age / 100);
  const careerLifespanYears = Math.max(0.3, lifespanByFormula);
  const deadlineYears = Math.max(0.5, DEADLINE_YEAR - CURRENT_YEAR);
  const currentIncome = userSurvey.profile.annualIncome ?? matchedJob.incomeBenchmark?.annualMedian ?? 5000000;
  const futureIncome = Math.round(currentIncome * (1 - adjustedRisk));

  const aiReplacementRate = round2(adjustedRisk);
  const aiReadinessScore = Math.round(aiSkillScore * 100);
  const resilienceScore = Math.round(clamp01(1 - adjustedRisk + resistanceShield * 0.35) * 100);
  const survivalScore = Math.round(clamp01((careerLifespanYears / deadlineYears) * (1 - adjustedRisk * 0.35)) * 100);
  const reskillingPriorityScore = Math.round(clamp01(adjustedRisk * 0.8 + marketVolatility / 2 - aiSkillScore * 0.25) * 100);
  const incomeMaintenanceProbability = Math.round(
    clamp01((1 - adjustedRisk) * 0.75 + aiSkillScore * 0.15 + resistanceShield * 0.1) * 100
  );

  const warning = generateScaryCopy(adjustedRisk, careerLifespanYears);
  const suggestedPath = suggestPath(userSurvey, matchedJob, adjustedRisk);

  return {
    resultId: buildId("result"),
    calculatedAt: new Date().toISOString(),
    surveyId: userSurvey.surveyId,
    matchedJob: {
      jobCode: matchedJob.jobCode ?? matchedJob.job_code ?? userSurvey.selectedJobCode,
      jobTitle: matchedJob.jobTitle ?? matchedJob.job_title ?? "Unknown Job",
      industryName: matchedJob.industryName ?? matchedJob.industry_name ?? "Unknown Industry",
    },
    metrics: {
      aiReplacementRate,
      careerLifespanYears: round2(careerLifespanYears),
      incomeMaintenanceProbability,
      resilienceScore,
      aiReadinessScore,
      reskillingPriorityScore,
      survivalScore,
      escapeIndex: Math.round(escapeIndex * 100),
    },
    levels: {
      replacementRiskLevel: toRiskLevel(adjustedRisk),
      reskillingUrgency: toReskillingUrgency(adjustedRisk),
    },
    factorBreakdown: {
      baselineAutomationRisk: withConfidence(baseRisk, 0.82),
      jobSpecificResistance: withConfidence(1 - resistanceShield, 0.7),
      userTaskAdjustment: withConfidence(routineTaskRatio, 0.78),
      aiReadinessAdjustment: withConfidence(1 / (1 + aiSkillScore * 0.2), 0.8),
      marketAdjustment: withConfidence(Math.min(1, marketVolatility / 1.5), 0.75),
    },
    scenarioForecasts: {
      byYear: buildForecast(adjustedRisk, careerLifespanYears, marketVolatility),
    },
    narrative: {
      warningLabel: warning.warningLabel,
      scaryCopy: warning.scaryCopy,
      summary: `${buildSummary(matchedJob, adjustedRisk, careerLifespanYears)} 5年後の想定年収は約${futureIncome.toLocaleString("ja-JP")}円。`,
      strongestDefenseFactors: buildDefenseFactors(matchedJob, userSurvey),
      mainRiskFactors: buildRiskFactors(matchedJob, routineTaskRatio, marketVolatility),
      recommendedActions: suggestedPath,
    },
    sourceSnapshot: {
      jobMasterVersion: jobMaster.version,
      modelVersion: "gpt-5.4-survival-logic-v1",
    },
  };
}

function calculateResistanceShield(job: JobMasterRecord, survey: UserSurvey): number {
  const jobResistance = average([
    job.aiResistance?.physicalWorkRatio,
    job.aiResistance?.emotionalLaborRatio,
    job.aiResistance?.tacitKnowledgeRatio,
    job.aiResistance?.ambiguityHandlingRatio,
    job.aiResistance?.creativeProblemSolvingRatio,
    job.aiResistance?.relationshipDependencyRatio,
    job.aiResistance?.trustRequirementRatio,
    job.aiResistance?.legalEthicalAccountabilityRatio,
  ]);

  const userDefense = average([
    survey.selfAssessment.communicationStrength,
    survey.selfAssessment.empathyStrength,
    survey.selfAssessment.manualSkillStrength,
    survey.selfAssessment.creativityStrength,
    survey.selfAssessment.leadershipStrength,
    survey.selfAssessment.domainExpertiseStrength,
  ].map((value) => normalizeInput(value)));

  return clamp(jobResistance * 0.7 + userDefense * 0.3, 0, 1);
}

function buildForecast(risk: number, yearsLeft: number, marketVolatility: number) {
  const rows = [];
  for (let year = CURRENT_YEAR; year <= DEADLINE_YEAR; year += 1) {
    const distance = year - CURRENT_YEAR;
    const annualRisk = clamp(risk * Math.pow(1 + (marketVolatility - 1) * 0.28 + 0.03, distance), 0.02, 0.99);
    const annualIncomeProbability = Math.round(clamp01((1 - annualRisk) * 0.95) * 100);
    rows.push({
      year,
      estimatedReplacementRate: round2(annualRisk),
      estimatedIncomeMaintenanceProbability: annualIncomeProbability,
    });
  }
  if (rows.length > 0) {
    rows[0].estimatedIncomeMaintenanceProbability = Math.max(
      rows[0].estimatedIncomeMaintenanceProbability,
      Math.round(clamp01(yearsLeft / Math.max(1, DEADLINE_YEAR - CURRENT_YEAR)) * 100)
    );
  }
  return rows;
}

function buildSummary(job: JobMasterRecord, risk: number, yearsLeft: number): string {
  const title = job.jobTitle ?? job.job_title ?? "この職種";
  if (risk >= 0.8) {
    return `${title}は、AIの補助対象ではなく削減対象に回る危険が高い職種です。今の担当業務を温存したまま生き残るのは難しく、余命はおよそ${yearsLeft.toFixed(1)}年です。`;
  }
  if (risk >= 0.6) {
    return `${title}は、今後数年で評価軸が大きく変わる職種です。作業者のままでは厳しく、AIを管理する側へ移れなければ収入維持は不安定になります。`;
  }
  return `${title}にはまだ防御余地があります。ただし安全ではなく、AIに代替されにくい責任領域へ寄せ続けることが前提です。`;
}

function buildDefenseFactors(job: JobMasterRecord, survey: UserSurvey): string[] {
  const factors = [];
  if ((job.aiResistance?.emotionalLaborRatio ?? 0) >= 0.5) {
    factors.push("感情労働の比率が高く、完全自動化しにくい");
  }
  if ((job.aiResistance?.physicalWorkRatio ?? 0) >= 0.5) {
    factors.push("物理環境への即応が必要で、汎用AIだけでは代替しにくい");
  }
  if (normalizeInput(survey.selfAssessment.domainExpertiseStrength) >= 0.7) {
    factors.push("専門知識の蓄積があり、単純な代替では置き換わりにくい");
  }
  if (normalizeInput(survey.selfAssessment.leadershipStrength) >= 0.7) {
    factors.push("調整と意思決定の責任を持てる点が防御要素になる");
  }
  return factors.length ? factors : ["現時点で明確な防御要素は限定的"]; 
}

function buildRiskFactors(job: JobMasterRecord, routineTaskRatio: number, marketVolatility: number): string[] {
  const factors = [];
  const tasks = dedupeStrings([...(job.typicalTasks ?? []), ...(job.typical_tasks ?? [])]);
  if (routineTaskRatio >= 0.6) {
    factors.push("定型業務の比率が高く、最初に圧縮されやすい");
  }
  if (marketVolatility >= 1.3) {
    factors.push("業界全体のAI導入速度が速く、猶予が短い");
  }
  if ((job.baseReplacementRate ?? job.base_replacement_rate ?? 0) >= 0.8) {
    factors.push("職種そのものの基礎代替率が高い");
  }
  if (tasks.some((task) => ["書類", "入力", "集計", "処理", "確認"].some((keyword) => task.includes(keyword)))) {
    factors.push("書類処理中心の仕事はAIに吸収されやすい");
  }
  return factors.length ? factors : ["代替圧力はあるが一気に置換される構造ではない"];
}

function findJob(userSurvey: UserSurvey, jobMaster: JobMaster): JobMasterRecord | undefined {
  const selected = userSurvey.selectedJobCode ?? userSurvey.selected_job_code;
  return jobMaster.jobs.find((job) => job.jobCode === selected || job.job_code === selected);
}

function toRiskLevel(risk: number): RiskLevel {
  if (risk >= 0.8) return "critical";
  if (risk >= 0.6) return "high";
  if (risk >= 0.35) return "medium";
  return "low";
}

function toReskillingUrgency(risk: number): ReskillingUrgency {
  if (risk >= 0.8) return "emergency";
  if (risk >= 0.6) return "act-now";
  if (risk >= 0.35) return "prepare";
  return "watch";
}

function withConfidence(value: number, confidence: number): ValueWithConfidence {
  return {
    value: round2(value),
    confidence: round2(confidence),
  };
}

function average(values: Array<number | undefined>): number {
  const filtered = values.filter((value): value is number => typeof value === "number" && !Number.isNaN(value));
  if (filtered.length === 0) {
    return 0;
  }
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}

function dedupeStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function pickNumber(...values: NumericLike[]): number {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return 0;
}

function pickDefined<T>(...values: Array<T | undefined | null>): T | undefined {
  return values.find((value): value is T => value !== undefined && value !== null);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function round2(value: number): Percentage | Score {
  return Math.round(value * 100) / 100;
}

function buildId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}