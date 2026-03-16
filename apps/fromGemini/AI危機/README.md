# AI危機

このディレクトリの実装は、現状では診断ロジックのライブラリです。実際のエントリーポイントは [index.ts](index.ts) です。

## エントリーポイント

- [index.ts](index.ts)
  - `job-master.json` を読み込みます。
  - `runDiagnosis(userSurvey)` を公開します。
  - `runSampleDiagnosis()` でサンプル実行できます。

## 主要ファイル

- [index.ts](index.ts): 呼び出し入口
- [logic.ts](logic.ts): 診断ロジック本体
- [types.ts](types.ts): 型定義
- [job-master.json](job-master.json): 100業種マスタ

## ユーザーが使う流れ

1. ユーザーがフォームで職種、年齢、経験年数、日々の業務比率、AIスキルを入力する
2. フロントエンドがその入力を `UserSurvey` 形式に整形する
3. `runDiagnosis(userSurvey)` を呼ぶ
4. 返ってきた `DiagnosticResult` を結果画面に表示する

## 最小コード例

```ts
import { runDiagnosis } from "./index";
import type { UserSurvey } from "./types";

const survey: UserSurvey = {
  surveyId: "user-001",
  submittedAt: new Date().toISOString(),
  selectedJobCode: "OFF001",
  profile: {
    age: 29,
    employmentType: "full-time",
    yearsOfExperience: 5,
  },
  jobContext: {
    mainTasks: ["データ入力", "書類作成"],
    taskComposition: {
      physicalWorkRatio: 0.1,
      deskWorkRatio: 0.9,
      customerInteractionRatio: 0.2,
      managementCoordinationRatio: 0.1,
      creativeWorkRatio: 0.1,
      routineTaskRatio: 0.85,
    },
    workEnvironmentVariability: 2,
    remoteWorkAvailability: 4,
    complianceResponsibilityLevel: 2,
    decisionMakingDiscretionLevel: 2,
  },
  aiReadiness: {
    currentAiUsageLevel: "basic",
    aiSkillLevel: 2,
    weeklyAiUsageHours: 3,
    toolCountInUse: 1,
    promptDesignConfidence: 2,
    automationImplementationExperience: 1,
    reskillingIntent: 4,
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

const result = runDiagnosis(survey);
console.log(result);
```

## 実際のUIでの使い方

- 職種選択: `job-master.json` の `jobs` をプルダウンに表示
- 入力フォーム: `routineTaskRatio` や `aiSkillLevel` を質問項目として取得
- 診断ボタン押下: `runDiagnosis` を呼ぶ
- 結果表示: `result.metrics` と `result.narrative` を画面に描画

## 今はまだ無いもの

- ブラウザのフォームUI
- 診断結果ページ
- API化された呼び出し口

つまり、今の段階では「ロジック層はある、ユーザー向け画面はまだない」という状態です。