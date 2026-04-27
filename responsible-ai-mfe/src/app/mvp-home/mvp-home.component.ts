/** SPDX-License-Identifier: MIT
Copyright 2024 - 2025 Infosys Ltd.
"Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE."
*/
import { Component } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { urlList } from '../urlList';

interface DatasetOption {
  label: string;
  datasetName: string;
  datasetFileName: string;
  datasetAssetPath: string;
  modelName: string;
  modelFileName: string;
  modelAssetPath: string;
  taskType: string;
  targetDataType: string;
  targetClassifier: string;
}

interface ClassifierOptionGroup {
  label: string;
  options: Array<{
    value: string;
    normalizedClassifier: string;
  }>;
}

interface ClassifierModelAsset {
  classifierLabel: string;
  normalizedClassifier: string;
  modelFileName: string;
  modelAssetPath: string;
}

interface FairnessPresetConfig {
  label: string;
  favorableOutcome: string;
  protectedAttributesInput: string;
  privilegedGroupsInput: string;
  predLabel?: string;
}

interface FairnessDatasetOption {
  key: string;
  label: string;
  datasetName: string;
  datasetFileName: string;
  datasetAssetPath: string;
  hiddenModelLabel: string;
  presets: {
    PRETRAIN: FairnessPresetConfig;
    POSTTRAIN?: FairnessPresetConfig;
  };
}

interface FairnessMethodOption {
  value: string;
  label: string;
}

interface ApiConfig {
  workbenchData: string;
  workbenchModel: string;
  workbenchAddData: string;
  workbenchAddModel: string;
  batchGeneration: string;
  explainMethods: string;
  explainGet: string;
  explainReport: string;
  fairnessReport: string;
  fairnessDownload: string;
  securityApplicableAttacks: string;
  securityValidateAttackRun: string;
  securityReport: string;
  downloadWorkReport: string;
}

interface ExplainabilityRow {
  prediction: string;
  inputRow: Array<{ featureName: string; featureValue: string | number }>;
  explanation: Array<{ featureName: string; importanceScore: number }>;
}

interface ExplainabilityMethodCard {
  methodName: string;
  methodDescription: string;
  rows: ExplainabilityRow[];
}

interface TenetRunStatus {
  name: string;
  state: 'success' | 'error' | 'running';
  message: string;
  batchId?: number | null;
}

@Component({
  selector: 'app-mvp-home',
  templateUrl: './mvp-home.component.html',
  styleUrls: ['./mvp-home.component.css'],
})
export class MvpHomeComponent {
  readonly tabNames: Array<'Explainability' | 'Fairness' | 'Robustness'> = [
    'Explainability',
    'Fairness',
    'Robustness',
  ];
  private readonly fixedDatasetAssetPath = 'assets/dataset/banking_loan_training.csv';
  private readonly fixedDatasetFileName = 'banking_loan_training.csv';
  private readonly fixedDatasetName = 'banking_loan_training';
  private readonly defaultRobustnessAttacks: string[] = [
    'ProjectedGradientDescentTabular',
    'FastGradientMethod',
    'Deepfool',
    'CarliniL2Method',
  ];
  private readonly fallbackApiConfig: ApiConfig = {
    workbenchData: 'http://localhost:30020/v1/workbench/data',
    workbenchModel: 'http://localhost:30020/v1/workbench/model',
    workbenchAddData: 'http://localhost:30020/v1/workbench/adddata',
    workbenchAddModel: 'http://localhost:30020/v1/workbench/addmodel',
    batchGeneration: 'http://localhost:30020/v1/workbench/batchgeneration',
    explainMethods: 'http://localhost:8002/rai/v1/explainability/methods/get',
    explainGet: 'http://localhost:8002/rai/v1/explainability/explanation/get',
    explainReport: 'http://localhost:8002/rai/v1/explainability/report/generate',
    fairnessReport: 'http://localhost:8000/api/v1/fairness/wrapper/batchId',
    fairnessDownload: 'http://localhost:8000/api/v1/fairness/wrapper/download',
    securityApplicableAttacks: 'http://localhost:30023/rai/v1/security_workbench/attack',
    securityValidateAttackRun: 'http://localhost:30023/rai/v1/security_workbench/validateattackrun',
    securityReport: 'http://localhost:30023/rai/v1/security_workbench/runallattacks',
    downloadWorkReport: 'http://localhost:30021/v1/report/downloadreport',
  };
  private readonly remoteConfigHostKeywords: string[] = ['rai-toolkit-dev.az.ad.idemo-ppc.com'];

  apiConfig: ApiConfig = this.fallbackApiConfig;
  activeTab: 'Explainability' | 'Fairness' | 'Robustness' = 'Explainability';
  datasetOptions: DatasetOption[] = [];

  selectedDataset = '';
  selectedModel = '';
  selectedEvaluations: string[] = [];
  uploadedTargetClassifier = 'LogisticRegression';
  readonly classifierModelAssets: ClassifierModelAsset[] = [
    {
      classifierLabel: 'LogisticRegression',
      normalizedClassifier: 'SklearnClassifier',
      modelFileName: 'sklearn_logistic_regression_f3ca733a.joblib',
      modelAssetPath: 'assets/modelsList/sklearn_logistic_regression_f3ca733a.joblib'
    },
    {
      classifierLabel: 'RandomForestClassifier',
      normalizedClassifier: 'SklearnClassifier',
      modelFileName: 'sklearn_random_forest_befd3c93.joblib',
      modelAssetPath: 'assets/modelsList/sklearn_random_forest_befd3c93.joblib'
    }
  ];
  readonly classifierOptionGroups: ClassifierOptionGroup[] = [
    {
      label: 'Scikit-learn Classifiers',
      options: [
        { value: 'LogisticRegression', normalizedClassifier: 'SklearnClassifier' },
        { value: 'RandomForestClassifier', normalizedClassifier: 'SklearnClassifier' }
      ]
    }
  ];
  readonly fairnessDatasetOptions: FairnessDatasetOption[] = [
    {
      key: 'fairness-banking-loan',
      label: 'Banking Loan Fairness Dataset',
      datasetName: 'banking_loan_predictions',
      datasetFileName: 'banking_loan_predictions.csv',
      datasetAssetPath: 'assets/dataset/fairnessDatasets/banking_loan_predictions.csv',
      hiddenModelLabel: 'LogisticRegression',
      presets: {
        PRETRAIN: {
          label: 'approved',
          favorableOutcome: '1',
          protectedAttributesInput: 'gender',
          privilegedGroupsInput: 'M',
        },
        POSTTRAIN: {
          label: 'approved',
          favorableOutcome: '1',
          protectedAttributesInput: 'gender',
          privilegedGroupsInput: 'M',
          predLabel: 'pred_label',
        },
      },
    },
    {
      key: 'fairness-insurance-claims',
      label: 'Insurance Claims Fairness Dataset',
      datasetName: 'insurance_claims_predictions',
      datasetFileName: 'insurance_claims_predictions.csv',
      datasetAssetPath: 'assets/dataset/fairnessDatasets/insurance_claims_predictions.csv',
      hiddenModelLabel: 'LogisticRegression',
      presets: {
        PRETRAIN: {
          label: 'suspected_fraud',
          favorableOutcome: '1',
          protectedAttributesInput: 'region',
          privilegedGroupsInput: 'North',
        },
        POSTTRAIN: {
          label: 'suspected_fraud',
          favorableOutcome: '1',
          protectedAttributesInput: 'region',
          privilegedGroupsInput: 'North',
          predLabel: 'pred_label',
        },
      },
    },
  ];
  readonly fairnessMethodOptionsByBiasType: Record<'PRETRAIN' | 'POSTTRAIN', FairnessMethodOption[]> = {
    PRETRAIN: [
      { value: 'ALL', label: 'ALL (All Metrics)' },
      { value: 'STATISTICAL-PARITY-DIFFERENCE', label: 'Statistical Parity Difference' },
      { value: 'DISPARATE-IMPACT', label: 'Disparate Impact' },
      {
        value: 'SMOOTHED_EMPIRICAL_DIFFERENTIAL_FAIRNESS',
        label: 'Smoothed Empirical Differential Fairness',
      },
      { value: 'CONSISTENCY', label: 'Consistency' },
    ],
    POSTTRAIN: [
      { value: 'ALL', label: 'ALL (All Metrics)' },
      { value: 'STATISTICAL_PARITY', label: 'Statistical Parity' },
      { value: 'DISPARATE_IMPACT', label: 'Disparate Impact' },
      { value: 'FOUR_FIFTHS_RULE', label: 'Four Fifths Rule' },
      { value: 'COHEN_D', label: 'Cohen D' },
      { value: 'EQUAL_OPPORTUNITY_DIFFERENCE', label: 'Equal Opportunity Difference' },
      { value: 'FALSE_POSITIVE_RATE_DIFFERENCE', label: 'False Positive Rate Difference' },
      { value: 'FALSE_NEGATIVE_RATE_DIFFERENCE', label: 'False Negative Rate Difference' },
      { value: 'TRUE_NEGATIVE_RATE_DIFFERENCE', label: 'True Negative Rate Difference' },
      { value: 'AVERAGE_ODDS_DIFFERENCE', label: 'Average Odds Difference' },
      { value: 'ACCURACY_DIFFERENCE', label: 'Accuracy Difference' },
      { value: 'Z_TEST_DIFFERENCE', label: 'Z Test Difference' },
      { value: 'ABROCA', label: 'ABROCA' },
    ],
  };
  selectedFairnessDatasetKey = 'fairness-banking-loan';

  explainSampleLimit = 3;
  showExplainPreview = false;
  includeGlobalKernelExplainer = false;

  fairnessBiasType = 'PRETRAIN';
  fairnessMethodType = 'ALL';
  fairnessTaskType = 'CLASSIFICATION';
  fairnessLabel = '';
  fairnessPredLabel = 'labels_pred';
  fairnessFavorableOutcome = '1';
  fairnessProtectedAttributesInput = '';
  fairnessPrivilegedGroupsInput = '';
  fairnessMitigationType = 'AUDIT';
  fairnessMitigationTechnique = '';

  robustnessAttackOptions: string[] = [...this.defaultRobustnessAttacks];
  selectedRobustnessAttacks: string[] = [this.defaultRobustnessAttacks[0]];

  datasetColumns: string[] = [];

  evaluationInProgress = false;
  currentStepMessage = '';
  evaluationError = '';
  evaluationSuccess = '';
  reportStatus = '';
  tenetRunStatuses: TenetRunStatus[] = [];

  explainabilityCards: ExplainabilityMethodCard[] = [];
  generatedBatchByTenet: Record<string, number | null> = {
    Explainability: null,
    Fairness: null,
    Robustness: null,
  };
  selectedDownloadTenet = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.selectedModel = this.getSelectedClassifierModelAsset()?.modelFileName || '';
    this.applyFairnessPreset();
    void this.loadFixedDatasetColumns();
    void this.refreshRobustnessAttackOptions();
    this.loadApiConfigFromAdmin();
  }

  get canEvaluate(): boolean {
    if (this.evaluationInProgress) {
      return false;
    }
    if (this.activeTab === 'Robustness') {
      return (
        this.buildExplainabilityDatasetOption() !== null &&
        this.selectedRobustnessAttacks.length > 0
      );
    }
    if (this.activeTab === 'Explainability') {
      return this.buildExplainabilityDatasetOption() !== null;
    }
    return this.validateFairnessInputs(false);
  }

  get shouldShowEvaluateButton(): boolean {
    if (this.evaluationInProgress) {
      return true;
    }
    return this.canEvaluate;
  }

  get isExplainabilityTab(): boolean {
    return this.activeTab === 'Explainability';
  }

  get isFairnessTab(): boolean {
    return this.activeTab === 'Fairness';
  }

  get isRobustnessTab(): boolean {
    return this.activeTab === 'Robustness';
  }

  get availableDownloadTenets(): string[] {
    return Object.keys(this.generatedBatchByTenet).filter(
      (tenetName) => Number(this.generatedBatchByTenet[tenetName]) > 0
    );
  }

  get canDownloadReport(): boolean {
    return !this.evaluationInProgress && this.availableDownloadTenets.length > 0;
  }

  get fairnessMethodOptions(): FairnessMethodOption[] {
    return (
      this.fairnessMethodOptionsByBiasType[this.fairnessBiasType as 'PRETRAIN' | 'POSTTRAIN'] ||
      this.fairnessMethodOptionsByBiasType.PRETRAIN
    );
  }

  get shouldShowDownloadTenetPicker(): boolean {
    return !this.evaluationInProgress && this.availableDownloadTenets.length > 1;
  }

  onUploadedMetaChange(): void {
    this.selectedModel = this.getSelectedClassifierModelAsset()?.modelFileName || '';
    this.resetEvaluationState();
    void this.refreshRobustnessAttackOptions();
  }

  setActiveTab(tabName: 'Explainability' | 'Fairness' | 'Robustness'): void {
    this.activeTab = tabName;
    this.resetEvaluationState();
    if (tabName === 'Fairness') {
      this.applyFairnessPreset();
      return;
    }
    if (tabName === 'Robustness') {
      void this.refreshRobustnessAttackOptions();
    }
  }

  onFairnessDatasetChange(): void {
    this.applyFairnessPreset();
    void this.loadFairnessDatasetColumns();
    this.resetEvaluationState();
  }

  onFairnessBiasTypeChange(): void {
    this.normalizeFairnessMethodType();
    this.applyFairnessPreset();
    this.resetEvaluationState();
  }

  onDatasetChange(datasetLabel: string): void {
    const selectedDatasetOption = this.datasetOptions.find(
      (datasetOption) => datasetOption.label === datasetLabel
    );
    this.selectedModel = selectedDatasetOption?.modelFileName || '';
    this.resetEvaluationState();
    void this.loadDatasetColumnsForSelectedOption(selectedDatasetOption);
    void this.loadRobustnessAttackOptions(selectedDatasetOption);
  }

  onEvaluationToggle(evaluationType: string, isChecked: boolean): void {
    if (isChecked && !this.selectedEvaluations.includes(evaluationType)) {
      let nextSelections = [...this.selectedEvaluations, evaluationType];
      if (evaluationType === 'Fairness') {
        nextSelections = nextSelections.filter(
          (selectedEvaluation) => selectedEvaluation !== 'Explainability'
        );
      }
      this.selectedEvaluations = nextSelections;
      if (evaluationType === 'Robustness') {
        void this.refreshRobustnessAttackOptions();
      }
      return;
    }

    if (!isChecked) {
      this.selectedEvaluations = this.selectedEvaluations.filter(
        (selectedEvaluation) => selectedEvaluation !== evaluationType
      );
    }
  }

  onRobustnessAttackToggle(attackName: string, isChecked: boolean): void {
    this.resetEvaluationState();
    if (isChecked && !this.selectedRobustnessAttacks.includes(attackName)) {
      this.selectedRobustnessAttacks = [...this.selectedRobustnessAttacks, attackName];
      return;
    }
    if (!isChecked) {
      this.selectedRobustnessAttacks = this.selectedRobustnessAttacks.filter(
        (selectedAttack) => selectedAttack !== attackName
      );
    }
  }



  async onEvaluateModel(): Promise<void> {
    if (!this.canEvaluate) {
      return;
    }

    const selectedDatasetOption =
      this.activeTab === 'Fairness'
        ? this.buildFairnessDatasetOption()
        : this.buildExplainabilityDatasetOption();
    if (!selectedDatasetOption) {
      this.evaluationError = 'Dataset or classifier configuration is not available for evaluation.';
      return;
    }

    if (!this.validateFairnessInputsIfNeeded()) {
      return;
    }

    this.evaluationInProgress = true;
    this.evaluationError = '';
    this.evaluationSuccess = '';
    this.reportStatus = '';
    this.currentStepMessage = 'Preparing dataset and model files...';
    this.explainabilityCards = [];
    this.generatedBatchByTenet = {
      Explainability: null,
      Fairness: null,
      Robustness: null,
    };
    this.selectedDownloadTenet = '';
    this.tenetRunStatuses = [];

    try {
      const userId = this.getLoggedInUser();
      const selectedModelAsset =
        this.activeTab === 'Fairness'
          ? this.getFairnessModelAsset(selectedDatasetOption)
          : this.getSelectedClassifierModelAsset();
      if (!selectedModelAsset) {
        throw new Error('Choose a supported classifier before evaluation.');
      }
      const datasetFile = await this.fetchAssetFile(
        selectedDatasetOption.datasetAssetPath,
        selectedDatasetOption.datasetFileName,
        'text/csv'
      );
      const modelFile = await this.fetchAssetFile(
        selectedModelAsset.modelAssetPath,
        selectedModelAsset.modelFileName,
        'application/octet-stream'
      );
      const detectedTargetLabel = await this.detectTargetLabel(datasetFile);
      if (!this.fairnessLabel.trim()) {
        this.fairnessLabel = detectedTargetLabel;
      }

      this.currentStepMessage = 'Registering dataset in toolkit workbench...';
      await this.ensureDatasetExists(userId, selectedDatasetOption, datasetFile, detectedTargetLabel);

      this.currentStepMessage = 'Registering model in toolkit workbench...';
      await this.ensureModelExists(userId, selectedDatasetOption, modelFile);

      this.currentStepMessage = 'Resolving model and dataset IDs...';
      const { selectedDatasetInfo, selectedModelInfo } = await this.resolveRegisteredAssets(
        userId,
        selectedDatasetOption
      );

      if (!selectedDatasetInfo?.dataId || !selectedModelInfo?.modelId) {
        throw new Error('Model or dataset registration lookup failed.');
      }

      const datasetId = selectedDatasetInfo.dataId;
      const modelId = selectedModelInfo.modelId;
      const runErrors: string[] = [];
      const runSuccess: string[] = [];

      if (this.activeTab === 'Explainability') {
        try {
          await this.runExplainabilityFlow(userId, datasetId, modelId, selectedDatasetOption);
          runSuccess.push('Explainability');
        } catch (error: any) {
          runErrors.push(`Explainability: ${this.resolveErrorMessage(error)}`);
          this.setTenetStatus('Explainability', 'error', this.resolveErrorMessage(error));
        }
      } else if (this.activeTab === 'Robustness') {
        try {
          await this.runRobustnessFlow(userId, datasetId, modelId, selectedDatasetOption);
          runSuccess.push('Robustness');
        } catch (error: any) {
          runErrors.push(`Robustness: ${this.resolveErrorMessage(error)}`);
          this.setTenetStatus('Robustness', 'error', this.resolveErrorMessage(error));
        }
      } else if (this.activeTab === 'Fairness') {
        try {
          await this.runFairnessFlow(userId, datasetId, modelId, detectedTargetLabel, selectedDatasetOption);
          runSuccess.push('Fairness');
        } catch (error: any) {
          runErrors.push(`Fairness: ${this.resolveErrorMessage(error)}`);
          this.setTenetStatus('Fairness', 'error', this.resolveErrorMessage(error));
        }
      }

      this.updateDownloadSelection();

      if (runSuccess.length > 0) {
        this.evaluationSuccess = `${runSuccess.join(', ')} evaluation completed.`;
      }
      if (runErrors.length > 0) {
        this.evaluationError = runErrors.join(' | ');
      }
      if (runSuccess.length === 0 && runErrors.length > 0) {
        throw new Error(this.evaluationError || 'No selected tenet completed successfully.');
      }
    } catch (error: any) {
      this.evaluationError = this.resolveErrorMessage(error);
    } finally {
      this.currentStepMessage = '';
      this.evaluationInProgress = false;
    }
  }

  async onDownloadReport(): Promise<void> {
    if (this.evaluationInProgress) {
      return;
    }

    const tenetToDownload = this.selectedDownloadTenet || this.availableDownloadTenets[0];
    const batchId = tenetToDownload ? this.generatedBatchByTenet[tenetToDownload] : null;
    if (!tenetToDownload || !batchId) {
      this.evaluationError = 'No generated batch found to download report.';
      return;
    }

    try {
      if (tenetToDownload === 'Fairness') {
        await this.downloadFairnessReport(batchId);
      } else {
        await this.downloadWorkbenchReport(batchId, tenetToDownload.toLowerCase());
      }
    } catch (error: any) {
      this.evaluationError = this.resolveErrorMessage(error, 'Report download failed.');
    }
  }

  private async runExplainabilityFlow(
    userId: string,
    datasetId: number,
    modelId: number,
    selectedDatasetOption: DatasetOption
  ): Promise<void> {
    this.setTenetStatus('Explainability', 'running', 'Fetching applicable methods...');
    this.currentStepMessage = 'Fetching applicable explainability methods...';
    const applicableMethodsResponse: any = await firstValueFrom(
      this.http.post(this.apiConfig.explainMethods, {
        modelId,
        datasetId,
        scope: null,
      })
    );

    const applicableMethods: string[] = Array.isArray(applicableMethodsResponse?.methods)
      ? applicableMethodsResponse.methods
      : [];

    if (applicableMethods.length === 0) {
      throw new Error('No explainability method was returned for this model/dataset pair.');
    }

    const preferredMethods = this.getPreferredExplainMethods(
      applicableMethods,
      this.includeGlobalKernelExplainer
    );
    const hasKernelMethod = preferredMethods.some((item) => item.method === 'KERNEL-EXPLAINER');
    const limeOnlyMethods = preferredMethods.filter((item) => item.method !== 'KERNEL-EXPLAINER');
    const canRetryWithoutKernel = hasKernelMethod && limeOnlyMethods.length > 0;

    let methodsUsedForRun = preferredMethods;
    let explainBatchId: number | null = null;
    let reportMessage = '';
    let fallbackNote = '';

    try {
      const explainRunResponse = await this.generateExplainabilityBatchAndReport(
        userId,
        datasetId,
        modelId,
        selectedDatasetOption,
        methodsUsedForRun
      );
      explainBatchId = explainRunResponse.batchId;
      reportMessage = explainRunResponse.reportMessage;
    } catch (error: any) {
      if (!canRetryWithoutKernel || !this.isRecoverableKernelFailure(error)) {
        throw error;
      }

      this.currentStepMessage = 'Kernel explainer failed. Retrying with LIME only...';
      methodsUsedForRun = limeOnlyMethods;
      const explainRunResponse = await this.generateExplainabilityBatchAndReport(
        userId,
        datasetId,
        modelId,
        selectedDatasetOption,
        methodsUsedForRun
      );
      explainBatchId = explainRunResponse.batchId;
      reportMessage = explainRunResponse.reportMessage;
      fallbackNote =
        ' Kernel explainer was skipped because the explain service became unstable for this run.';
    }

    this.generatedBatchByTenet['Explainability'] = explainBatchId;

    let previewMessage = '';
    this.explainabilityCards = [];

    if (this.showExplainPreview) {
      try {
        this.currentStepMessage = 'Loading sample explanations...';
        const safeSampleLimit = this.getSafeExplainSampleLimit();
        const explainResults: ExplainabilityMethodCard[] = [];

        for (const selectedMethod of methodsUsedForRun) {
          const explainResponse: any = await firstValueFrom(
            this.http.post(this.apiConfig.explainGet, {
              modelId,
              datasetId,
              preprocessorId: null,
              scope: selectedMethod.scope,
              method: selectedMethod.method,
              sampleLimit: safeSampleLimit,
            })
          );
          explainResults.push(...this.mapExplainResponseToCards(explainResponse, safeSampleLimit));
        }

        this.explainabilityCards = explainResults;
        if (explainResults.length === 0) {
          previewMessage = ' Report is ready, but no preview rows were returned by the service.';
        }
      } catch (previewError: any) {
        previewMessage = ` Report is ready. Preview could not be loaded (${this.resolveErrorMessage(
          previewError
        )}).`;
      }
    } else {
      previewMessage = ' Preview is off for faster run.';
    }

    const finalReportMessage = `${reportMessage}${fallbackNote}${previewMessage}`.trim();
    this.reportStatus = finalReportMessage;
    this.setTenetStatus('Explainability', 'success', finalReportMessage, explainBatchId);
  }

  private async generateExplainabilityBatchAndReport(
    userId: string,
    datasetId: number,
    modelId: number,
    selectedDatasetOption: DatasetOption,
    methodsToRun: Array<{ method: string; scope: string }>
  ): Promise<{ batchId: number; reportMessage: string }> {
    this.currentStepMessage = 'Generating explainability batch...';
    const batchGenerationResponse: any = await firstValueFrom(
      this.http.post(this.apiConfig.batchGeneration, {
        userId,
        title: `MVP Explainability - ${selectedDatasetOption.datasetName}`,
        modelId,
        dataId: datasetId,
        tenetName: ['Explainability'],
        appExplanationMethods: methodsToRun.map((item) => item.method),
      })
    );

    const explainBatch = this.extractBatchByTenet(batchGenerationResponse, 1.1);
    const explainBatchId = Number(explainBatch?.BatchId || 0);
    if (!explainBatchId) {
      throw new Error('Batch was created without a valid BatchId for explainability.');
    }

    this.currentStepMessage = 'Generating explainability report...';
    const explainReportResponse: any = await firstValueFrom(
      this.http.post(this.apiConfig.explainReport, { batchId: explainBatchId })
    );
    const reportMessage =
      explainReportResponse?.status === 'SUCCESS'
        ? 'Explainability report generated successfully.'
        : explainReportResponse?.message || 'Explainability report generation returned non-success.';

    return {
      batchId: explainBatchId,
      reportMessage,
    };
  }

  private isRecoverableKernelFailure(error: any): boolean {
    const statusCode = Number(error?.status || 0);
    const message = this.resolveErrorMessage(error, '').toLowerCase();
    const rawErrorText = String(error?.error || '').toLowerCase();

    const hasNetworkResetSignal =
      message.includes('unknown error') ||
      message.includes('connection reset') ||
      message.includes('err_connection_reset') ||
      rawErrorText.includes('connection reset');

    return statusCode === 0 || hasNetworkResetSignal;
  }

  private async runFairnessFlow(
    userId: string,
    datasetId: number,
    modelId: number,
    detectedTargetLabel: string,
    selectedDatasetOption: DatasetOption
  ): Promise<void> {
    this.currentStepMessage = 'Generating fairness batch...';
    this.setTenetStatus('Fairness', 'running', 'Preparing fairness payload...');

    const protectedAttributes = this.splitCsvInput(this.fairnessProtectedAttributesInput);
    if (protectedAttributes.length === 0) {
      throw new Error('Fairness needs at least one protected attribute.');
    }

    const privilegedGroups = this.parseNestedGroups(this.fairnessPrivilegedGroupsInput);
    const normalizedPrivilegedGroups =
      privilegedGroups.length > 0
        ? privilegedGroups
        : protectedAttributes.map(() => []);

    const fairnessPayload: any = {
      userId,
      title: `MVP Fairness - ${selectedDatasetOption.datasetName}`,
      modelId,
      dataId: datasetId,
      tenetName: ['Fairness'],
      biasType: this.fairnessBiasType,
      methodType: this.fairnessMethodType,
      taskType: this.fairnessTaskType,
      label: this.fairnessLabel.trim() || detectedTargetLabel,
      favorableOutcome: this.fairnessFavorableOutcome.trim() || '1',
      protectedAttribute: protectedAttributes,
      privilegedGroup: normalizedPrivilegedGroups,
      mitigationType: this.fairnessMitigationType,
      mitigationTechnique: this.fairnessMitigationTechnique,
    };
    if (this.fairnessBiasType === 'POSTTRAIN' && this.fairnessPredLabel.trim()) {
      fairnessPayload.predLabel = this.fairnessPredLabel.trim();
    }

    const batchGenerationResponse: any = await firstValueFrom(
      this.http.post(this.apiConfig.batchGeneration, fairnessPayload)
    );
    const fairnessBatch = this.extractBatchByTenet(batchGenerationResponse, 2.2);
    const fairnessBatchId = fairnessBatch?.BatchId || null;
    this.generatedBatchByTenet['Fairness'] = fairnessBatchId;

    if (!fairnessBatchId) {
      throw new Error('Fairness batch was not generated.');
    }

    this.currentStepMessage = 'Running fairness analysis...';
    await firstValueFrom(
      this.http.post(this.apiConfig.fairnessReport, { Batch_id: fairnessBatchId })
    );

    this.reportStatus = 'Fairness run submitted. You can download once generation finishes.';
    this.setTenetStatus(
      'Fairness',
      'success',
      'Fairness analysis triggered successfully.',
      fairnessBatchId
    );
  }

  private async runRobustnessFlow(
    userId: string,
    datasetId: number,
    modelId: number,
    selectedDatasetOption: DatasetOption
  ): Promise<void> {
    this.currentStepMessage = 'Generating robustness batch...';
    this.setTenetStatus('Robustness', 'running', 'Preparing robustness payload...');

    const effectiveAttacks =
      this.selectedRobustnessAttacks && this.selectedRobustnessAttacks.length > 0
        ? this.selectedRobustnessAttacks
        : [this.defaultRobustnessAttacks[0]];

    const robustnessPayload: any = {
      userId,
      title: `MVP Robustness - ${selectedDatasetOption.datasetName}`,
      modelId,
      dataId: datasetId,
      tenetName: ['Security'],
      appAttacks: effectiveAttacks,
    };

    const batchGenerationResponse: any = await firstValueFrom(
      this.http.post(this.apiConfig.batchGeneration, robustnessPayload)
    );
    const robustnessBatch = this.extractBatchByTenet(batchGenerationResponse, 3.3);
    const robustnessBatchId = robustnessBatch?.BatchId || null;
    this.generatedBatchByTenet['Robustness'] = robustnessBatchId;

    if (!robustnessBatchId) {
      throw new Error('Robustness batch was not generated.');
    }

    this.currentStepMessage = 'Validating model compatibility for robustness...';
    this.setTenetStatus('Robustness', 'running', 'Checking model and runtime compatibility...');
    const validationPayload = new FormData();
    validationPayload.append('batchId', String(robustnessBatchId));
    const validationResponse: any = await firstValueFrom(
      this.http.post(this.apiConfig.securityValidateAttackRun, validationPayload)
    );
    if (validationResponse?.status !== 'SUCCESS') {
      throw new Error(
        this.stringifyErrorCandidate(validationResponse?.message) ||
          'Robustness compatibility validation failed.'
      );
    }

    this.currentStepMessage = 'Running robustness attacks...';
    const requestPayload = new FormData();
    requestPayload.append('batchId', String(robustnessBatchId));
    await firstValueFrom(this.http.post(this.apiConfig.securityReport, requestPayload));

    this.reportStatus = 'Robustness run submitted. You can download once generation finishes.';
    this.setTenetStatus(
      'Robustness',
      'success',
      'Robustness analysis triggered successfully.',
      robustnessBatchId
    );
  }

  private async loadApiConfigFromAdmin(): Promise<void> {
    try {
      const savedConfig = localStorage.getItem('res');
      if (savedConfig) {
        const parsedSavedConfig = JSON.parse(savedConfig);
        if (parsedSavedConfig?.result) {
          this.apiConfig = this.resolveRuntimeApiConfig(this.buildApiConfig(parsedSavedConfig.result));
          return;
        }
      }

      const latestConfig: any = await firstValueFrom(this.http.get(urlList.masterurl));
      if (latestConfig?.result) {
        localStorage.setItem('res', JSON.stringify(latestConfig));
        this.apiConfig = this.resolveRuntimeApiConfig(this.buildApiConfig(latestConfig.result));
      } else {
        this.apiConfig = this.resolveRuntimeApiConfig(this.fallbackApiConfig);
      }
    } catch (_error) {
      this.apiConfig = this.resolveRuntimeApiConfig(this.fallbackApiConfig);
    }
  }

  private buildApiConfig(configResult: any): ApiConfig {
    const workbenchBase = configResult?.Workbench || 'http://localhost:30020';
    const explainabilityBase = configResult?.Explainability_Demo || 'http://localhost:8002';
    const fairnessBase = configResult?.Fairness || 'http://localhost:8000';
    const securityWrapperBase = configResult?.SecurityWrapper || 'http://localhost:30023';
    const securityWorkbenchBase = configResult?.SecurityWorkbench || securityWrapperBase;
    const reportBase = configResult?.WorkbenchReport || 'http://localhost:30021';

    return {
      workbenchData: this.joinUrl(workbenchBase, configResult?.Workbench_Data || '/v1/workbench/data'),
      workbenchModel: this.joinUrl(workbenchBase, configResult?.Workbench_Model || '/v1/workbench/model'),
      workbenchAddData: this.joinUrl(
        workbenchBase,
        configResult?.Workbench_AddData || '/v1/workbench/adddata'
      ),
      workbenchAddModel: this.joinUrl(
        workbenchBase,
        configResult?.Workbench_AddModel || '/v1/workbench/addmodel'
      ),
      batchGeneration: this.joinUrl(
        workbenchBase,
        configResult?.BatchGeneration || '/v1/workbench/batchgeneration'
      ),
      explainMethods: this.joinUrl(
        explainabilityBase,
        configResult?.ExplainWorkMethods || '/rai/v1/explainability/methods/get'
      ),
      explainGet: this.joinUrl(explainabilityBase, '/rai/v1/explainability/explanation/get'),
      explainReport: this.joinUrl(
        explainabilityBase,
        configResult?.ExplainGenReport || '/rai/v1/explainability/report/generate'
      ),
      fairnessReport: this.joinUrl(
        fairnessBase,
        configResult?.FairGenReport || '/api/v1/fairness/wrapper/batchId'
      ),
      fairnessDownload: this.joinUrl(
        fairnessBase,
        configResult?.FairnessWrapDownload || '/api/v1/fairness/wrapper/download'
      ),
      securityApplicableAttacks: this.joinUrl(
        securityWrapperBase,
        configResult?.security_applicableAttack || '/rai/v1/security_workbench/attack'
      ),
      securityValidateAttackRun: this.joinUrl(
        securityWorkbenchBase,
        configResult?.SecurityValidateAttackRun || '/rai/v1/security_workbench/validateattackrun'
      ),
      securityReport: this.joinUrl(
        securityWorkbenchBase,
        configResult?.SecurityReport || '/rai/v1/security_workbench/runallattacks'
      ),
      downloadWorkReport: this.joinUrl(
        reportBase,
        configResult?.DownloadWorkReport || '/v1/report/downloadreport'
      ),
    };
  }

  private joinUrl(baseUrl: string, pathOrUrl: string): string {
    if (!pathOrUrl) {
      return baseUrl;
    }
    if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
      return pathOrUrl;
    }

    const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const normalizedPath = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
    return `${normalizedBase}${normalizedPath}`;
  }

  private getLoggedInUser(): string {
    const localUser = localStorage.getItem('userid');
    if (!localUser) {
      return 'admin';
    }

    try {
      const parsedUser = JSON.parse(localUser);
      if (typeof parsedUser === 'string' && parsedUser.trim()) {
        return parsedUser.trim();
      }
      if (typeof parsedUser === 'number') {
        return String(parsedUser);
      }
      if (parsedUser && typeof parsedUser === 'object') {
        const candidateKeys = ['userid', 'userId', 'username', 'userName', 'email'];
        for (const key of candidateKeys) {
          const candidateValue = (parsedUser as any)?.[key];
          if (typeof candidateValue === 'string' && candidateValue.trim()) {
            return candidateValue.trim();
          }
        }
      }
      return 'admin';
    } catch (_error) {
      return localUser.trim() || 'admin';
    }
  }

  private async fetchAssetFile(
    assetPath: string,
    outputFileName: string,
    defaultMimeType: string
  ): Promise<File> {
    const response = await fetch(encodeURI(this.resolveAssetUrl(assetPath)));
    if (!response.ok) {
      throw new Error(`Unable to fetch ${outputFileName} from assets.`);
    }

    const assetBlob = await response.blob();
    const mimeType = assetBlob.type || defaultMimeType;
    return new File([assetBlob], outputFileName, { type: mimeType });
  }

  private resolveAssetUrl(assetPath: string): string {
    if (!assetPath) {
      return '';
    }
    if (assetPath.startsWith('http://') || assetPath.startsWith('https://')) {
      return assetPath;
    }

    const configuredMfeHost = (urlList?.homefilepathurl || '').trim();
    if (configuredMfeHost) {
      const normalizedHost = configuredMfeHost.endsWith('/')
        ? configuredMfeHost.slice(0, -1)
        : configuredMfeHost;
      const normalizedPath = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
      return `${normalizedHost}${normalizedPath}`;
    }

    return assetPath;
  }

  private resolveRuntimeApiConfig(candidateConfig: ApiConfig): ApiConfig {
    if (!this.shouldForceLocalApiConfig()) {
      return candidateConfig;
    }

    if (
      this.containsKnownRemoteHost(candidateConfig) ||
      this.containsExternalEndpointsForLocalRuntime(candidateConfig)
    ) {
      return this.fallbackApiConfig;
    }

    return candidateConfig;
  }

  private shouldForceLocalApiConfig(): boolean {
    const runtimeHost = window.location.hostname || '';
    return this.isLocalHostName(runtimeHost);
  }

  private containsKnownRemoteHost(config: ApiConfig): boolean {
    const endpoints = this.getAllApiEndpoints(config);
    return endpoints.some((endpointUrl) =>
      this.remoteConfigHostKeywords.some((hostKeyword) => endpointUrl.includes(hostKeyword))
    );
  }

  private containsExternalEndpointsForLocalRuntime(config: ApiConfig): boolean {
    const endpoints = this.getAllApiEndpoints(config);
    return endpoints.some((endpointUrl) => {
      try {
        const parsedUrl = new URL(endpointUrl);
        return !this.isLocalHostName(parsedUrl.hostname);
      } catch (_error) {
        return false;
      }
    });
  }

  private getAllApiEndpoints(config: ApiConfig): string[] {
    return [
      config.workbenchData,
      config.workbenchModel,
      config.workbenchAddData,
      config.workbenchAddModel,
      config.batchGeneration,
      config.explainMethods,
      config.explainGet,
      config.explainReport,
      config.fairnessReport,
      config.fairnessDownload,
      config.securityApplicableAttacks,
      config.securityValidateAttackRun,
      config.securityReport,
      config.downloadWorkReport,
    ];
  }

  private isLocalHostName(hostName: string): boolean {
    return hostName === 'localhost' || hostName === '127.0.0.1' || hostName === '0.0.0.0';
  }

  private async detectTargetLabel(datasetFile: File): Promise<string> {
    try {
      const csvHeaderSample = await datasetFile.slice(0, 8192).text();
      const columns = this.extractCsvColumns(csvHeaderSample);

      if (columns.length === 0) {
        return 'TARGET';
      }

      const preferredColumns = ['TARGET', 'target', 'label', 'Label', 'class', 'Class', 'y'];
      const matchedPreferredColumn = preferredColumns.find((columnName) =>
        columns.includes(columnName)
      );

      if (matchedPreferredColumn) {
        return matchedPreferredColumn;
      }

      return columns[columns.length - 1];
    } catch (_error) {
      return 'TARGET';
    }
  }

  private extractCsvColumns(csvText: string): string[] {
    const firstRow = csvText.split(/\r?\n/).find((line) => line.trim().length > 0) || '';
    return this.parseCsvLine(firstRow).map((columnName) =>
      columnName.replace(/^["']|["']$/g, '').trim()
    );
  }

  private parseCsvLine(csvLine: string): string[] {
    const parsedColumns: string[] = [];
    let currentValue = '';
    let insideQuotes = false;

    for (let index = 0; index < csvLine.length; index += 1) {
      const currentChar = csvLine[index];
      if (currentChar === '"') {
        insideQuotes = !insideQuotes;
        continue;
      }

      if (currentChar === ',' && !insideQuotes) {
        parsedColumns.push(currentValue);
        currentValue = '';
        continue;
      }

      currentValue += currentChar;
    }

    parsedColumns.push(currentValue);
    return parsedColumns;
  }

  private async ensureDatasetExists(
    userId: string,
    selectedDatasetOption: DatasetOption,
    datasetFile: File,
    targetLabel: string
  ): Promise<void> {
    const existingDatasets = await this.getAllDatasets(userId);
    if (this.findDatasetRecord(existingDatasets, selectedDatasetOption)) {
      return;
    }

    const payload = {
      dataFileName: selectedDatasetOption.datasetName,
      dataType: selectedDatasetOption.targetDataType,
      groundTruthClassNames: null,
      groundTruthClassLabel: targetLabel,
    };

    const datasetFormData = new FormData();
    datasetFormData.append('userId', userId);
    datasetFormData.append('Payload', JSON.stringify(payload));
    datasetFormData.append('DataFile', datasetFile);

    const response = await firstValueFrom(this.http.post(this.apiConfig.workbenchAddData, datasetFormData));
    if (typeof response === 'string' && response.toLowerCase().includes('failed')) {
      throw new Error(response);
    }
  }

  private async ensureModelExists(
    userId: string,
    selectedDatasetOption: DatasetOption,
    modelFile: File
  ): Promise<void> {
    const existingModels = await this.getAllModels(userId);
    if (this.findModelRecord(existingModels, selectedDatasetOption)) {
      return;
    }

    const payload = {
      modelName: selectedDatasetOption.modelName,
      targetDataType: selectedDatasetOption.targetDataType,
      taskType: selectedDatasetOption.taskType,
      targetClassifier: selectedDatasetOption.targetClassifier,
      useModelApi: 'No',
      modelEndPoint: 'NA',
      data: 'NA',
      prediction: 'NA',
      imageClassificationTypes: 'binary classification',
    };

    const modelFormData = new FormData();
    modelFormData.append('userId', userId);
    modelFormData.append('Payload', JSON.stringify(payload));
    modelFormData.append('ModelFile', modelFile);

    const response = await firstValueFrom(this.http.post(this.apiConfig.workbenchAddModel, modelFormData));
    if (typeof response === 'string' && response.toLowerCase().includes('failed')) {
      throw new Error(response);
    }
  }

  private async getAllDatasets(userId: string): Promise<any[]> {
    const requestBody = new FormData();
    requestBody.append('userId', userId);
    const response: any = await firstValueFrom(this.http.post(this.apiConfig.workbenchData, requestBody));
    return Array.isArray(response) ? response : [];
  }

  private async getAllModels(userId: string): Promise<any[]> {
    const requestBody = new FormData();
    requestBody.append('userId', userId);
    const response: any = await firstValueFrom(this.http.post(this.apiConfig.workbenchModel, requestBody));
    return Array.isArray(response) ? response : [];
  }

  private getPreferredExplainMethods(
    availableMethods: string[],
    includeGlobalKernel = false
  ): Array<{ method: string; scope: string }> {
    const selectedMethods: Array<{ method: string; scope: string }> = [];

    if (availableMethods.includes('LIME-TABULAR')) {
      selectedMethods.push({ method: 'LIME-TABULAR', scope: 'LOCAL' });
    }

    if (includeGlobalKernel && availableMethods.includes('KERNEL-EXPLAINER')) {
      selectedMethods.push({ method: 'KERNEL-EXPLAINER', scope: 'GLOBAL' });
    }

    if (selectedMethods.length > 0) {
      return selectedMethods;
    }

    return availableMethods.slice(0, 1).map((methodName) => ({
      method: methodName,
      scope: methodName.includes('KERNEL') ? 'GLOBAL' : 'LOCAL',
    }));
  }

  private mapExplainResponseToCards(
    explainResponse: any,
    rowLimit = 3
  ): ExplainabilityMethodCard[] {
    const explanationItems = Array.isArray(explainResponse?.explanation)
      ? explainResponse.explanation
      : [];

    return explanationItems.map((explanationItem: any) => {
      const candidateRows =
        explanationItem?.featureImportance ||
        explanationItem?.shapImportanceText ||
        explanationItem?.attributionsText ||
        explanationItem?.anchor ||
        explanationItem?.timeSeriesForecast ||
        explanationItem?.shapValues ||
        [];

      const normalizedRows: ExplainabilityRow[] = Array.isArray(candidateRows)
        ? candidateRows.map((row: any) => ({
            prediction: row?.modelPrediction || '-',
            inputRow: Array.isArray(row?.inputRow) ? row.inputRow : [],
            explanation: Array.isArray(row?.explanation) ? row.explanation : [],
          }))
          .slice(0, rowLimit)
        : [];

      return {
        methodName: explanationItem?.methodName || 'Explainability',
        methodDescription: explanationItem?.methodDescription || '',
        rows: normalizedRows,
      };
    });
  }

  private async resolveRegisteredAssets(
    userId: string,
    selectedDatasetOption: DatasetOption
  ): Promise<{ selectedDatasetInfo: any; selectedModelInfo: any }> {
    const maxAttempts = 5;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const [allDatasets, allModels] = await Promise.all([
        this.getAllDatasets(userId),
        this.getAllModels(userId),
      ]);
      const selectedDatasetInfo = this.findDatasetRecord(allDatasets, selectedDatasetOption);
      const selectedModelInfo = this.findModelRecord(allModels, selectedDatasetOption);

      if (selectedDatasetInfo?.dataId && selectedModelInfo?.modelId) {
        return { selectedDatasetInfo, selectedModelInfo };
      }

      await this.sleep(900);
    }

    throw new Error('Model or dataset registration lookup failed.');
  }

  private findDatasetRecord(datasetRecords: any[], selectedDatasetOption: DatasetOption): any | null {
    const expectedName = this.normalizeRecordValue(selectedDatasetOption.datasetName);
    const expectedFileName = this.normalizeRecordValue(selectedDatasetOption.datasetFileName);
    const expectedStem = expectedFileName.replace(/\.[^.]+$/, '');

    const matchedRecord = datasetRecords.find((datasetRecord: any) => {
      const datasetName = this.normalizeRecordValue(datasetRecord?.dataSetName);
      const fileName = this.normalizeRecordValue(datasetRecord?.fileName);
      const fileStem = fileName.replace(/\.[^.]+$/, '');

      return (
        datasetName === expectedName ||
        fileName === expectedFileName ||
        fileStem === expectedStem ||
        datasetName === expectedStem
      );
    });
    return matchedRecord || null;
  }

  private findModelRecord(modelRecords: any[], selectedDatasetOption: DatasetOption): any | null {
    const expectedName = this.normalizeRecordValue(selectedDatasetOption.modelName);
    const expectedFileName = this.normalizeRecordValue(selectedDatasetOption.modelFileName);
    const expectedStem = expectedFileName.replace(/\.[^.]+$/, '');

    const matchedRecord = modelRecords.find((modelRecord: any) => {
      if (!this.isUsableModelRecord(modelRecord)) {
        return false;
      }

      const modelName = this.normalizeRecordValue(modelRecord?.modelName);
      const fileName = this.normalizeRecordValue(modelRecord?.fileName);
      const fileStem = fileName.replace(/\.[^.]+$/, '');

      return (
        modelName === expectedName ||
        fileName === expectedFileName ||
        fileStem === expectedStem ||
        modelName === expectedStem
      );
    });
    return matchedRecord || null;
  }

  private isUsableModelRecord(modelRecord: any): boolean {
    if (!modelRecord || !modelRecord.modelId) {
      return false;
    }

    const requiredFields = ['useModelApi', 'taskType', 'targetDataType', 'targetClassifier'];
    return requiredFields.every((fieldName) => {
      const fieldValue = String(modelRecord?.[fieldName] || '').trim();
      return fieldValue.length > 0;
    });
  }

  private normalizeRecordValue(value: any): string {
    return String(value || '')
      .trim()
      .toLowerCase();
  }

  private sleep(milliseconds: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, milliseconds);
    });
  }

  private getSafeExplainSampleLimit(): number {
    const sampleLimit = Math.round(Number(this.explainSampleLimit));
    if (!Number.isFinite(sampleLimit)) {
      return 3;
    }
    return Math.max(1, Math.min(25, sampleLimit));
  }

  getTopExplanations(
    explanations: Array<{ featureName: string; importanceScore: number }>,
    limit = 8
  ): Array<{ featureName: string; importanceScore: number }> {
    if (!Array.isArray(explanations) || explanations.length === 0) {
      return [];
    }

    return [...explanations]
      .filter((item) => item?.featureName)
      .sort(
        (left, right) =>
          Math.abs(Number(right?.importanceScore || 0)) - Math.abs(Number(left?.importanceScore || 0))
      )
      .slice(0, limit);
  }

  getMaxAbsoluteImportance(
    explanations: Array<{ featureName: string; importanceScore: number }>
  ): number {
    if (!Array.isArray(explanations) || explanations.length === 0) {
      return 1;
    }

    const maxValue = explanations.reduce((currentMax, explanationItem) => {
      const numericValue = Math.abs(Number(explanationItem?.importanceScore || 0));
      return numericValue > currentMax ? numericValue : currentMax;
    }, 0);
    return maxValue > 0 ? maxValue : 1;
  }

  getBarWidth(score: number, maxAbsoluteScore: number): number {
    if (!maxAbsoluteScore || maxAbsoluteScore <= 0) {
      return 0;
    }

    const scoreRatio = Math.abs(Number(score || 0)) / maxAbsoluteScore;
    return Math.min(100, Math.max(7, scoreRatio * 100));
  }

  formatImportance(score: number): string {
    const numericValue = Number(score);
    return Number.isFinite(numericValue) ? numericValue.toFixed(4) : '-';
  }

  formatFeatureValue(value: string | number): string {
    if (value === null || value === undefined) {
      return '-';
    }

    const formattedValue = String(value);
    if (!formattedValue.trim()) {
      return '-';
    }

    return formattedValue.length > 40 ? `${formattedValue.slice(0, 37)}...` : formattedValue;
  }

  getFeatureValueTitle(value: string | number): string {
    if (value === null || value === undefined) {
      return '';
    }

    return String(value);
  }

  private async loadDatasetColumnsForSelectedOption(
    selectedDatasetOption?: DatasetOption
  ): Promise<void> {
    if (!selectedDatasetOption) {
      await this.loadFixedDatasetColumns();
      return;
    }

    try {
      const datasetFile = await this.fetchAssetFile(
        selectedDatasetOption.datasetAssetPath,
        selectedDatasetOption.datasetFileName,
        'text/csv'
      );
      const csvHeaderSample = await datasetFile.slice(0, 8192).text();
      this.datasetColumns = this.extractCsvColumns(csvHeaderSample);
      if (!this.fairnessProtectedAttributesInput && this.datasetColumns.length > 1) {
        const suggested = this.datasetColumns.find((columnName) => columnName !== this.fairnessLabel);
        this.fairnessProtectedAttributesInput = suggested || '';
      }
    } catch (_error) {
      this.datasetColumns = [];
    }
  }

  private async loadFixedDatasetColumns(): Promise<void> {
    try {
      const datasetFile = await this.fetchAssetFile(
        this.fixedDatasetAssetPath,
        this.fixedDatasetFileName,
        'text/csv'
      );
      const csvHeaderSample = await datasetFile.slice(0, 8192).text();
      this.datasetColumns = this.extractCsvColumns(csvHeaderSample);
      if (!this.fairnessProtectedAttributesInput && this.datasetColumns.length > 1) {
        const suggested = this.datasetColumns.find((columnName) => columnName !== this.fairnessLabel);
        this.fairnessProtectedAttributesInput = suggested || '';
      }
    } catch (_error) {
      this.datasetColumns = [];
    }
  }

  private async loadRobustnessAttackOptions(selectedDatasetOption?: DatasetOption): Promise<void> {
    if (!selectedDatasetOption) {
      this.robustnessAttackOptions = [...this.defaultRobustnessAttacks];
      this.selectedRobustnessAttacks = [this.defaultRobustnessAttacks[0]];
      return;
    }

    try {
      const requestPayload = new FormData();
      requestPayload.append('TargetClassifier', selectedDatasetOption.targetClassifier);
      requestPayload.append('TargetDataType', selectedDatasetOption.targetDataType);

      const attacksResponse: any = await firstValueFrom(
        this.http.post(this.apiConfig.securityApplicableAttacks, requestPayload)
      );
      const extractedAttacks = this.extractAttackNames(attacksResponse);
      if (extractedAttacks.length > 0) {
        this.robustnessAttackOptions = extractedAttacks;
        this.selectedRobustnessAttacks = this.selectedRobustnessAttacks.filter((selectedAttack) =>
          extractedAttacks.includes(selectedAttack)
        );
        if (this.selectedRobustnessAttacks.length === 0) {
          this.selectedRobustnessAttacks = [extractedAttacks[0]];
        }
      } else {
        this.robustnessAttackOptions = [...this.defaultRobustnessAttacks];
        this.selectedRobustnessAttacks = [this.defaultRobustnessAttacks[0]];
      }
    } catch (_error) {
      this.robustnessAttackOptions = [...this.defaultRobustnessAttacks];
      this.selectedRobustnessAttacks = [this.defaultRobustnessAttacks[0]];
    }
  }

  private async refreshRobustnessAttackOptions(): Promise<void> {
    const selectedDatasetOption = this.buildExplainabilityDatasetOption();
    await this.loadRobustnessAttackOptions(selectedDatasetOption || undefined);
  }

  private buildExplainabilityDatasetOption(): DatasetOption | null {
    const selectedModelAsset = this.getSelectedClassifierModelAsset();
    if (!selectedModelAsset) {
      return null;
    }

    const modelFileName = selectedModelAsset.modelFileName;
    const modelName = `${this.stripExtension(modelFileName)}_mvp_home`;

    return {
      label: `${this.fixedDatasetName}::${modelName}`,
      datasetName: this.fixedDatasetName,
      datasetFileName: this.fixedDatasetFileName,
      datasetAssetPath: this.fixedDatasetAssetPath,
      modelName,
      modelFileName,
      modelAssetPath: selectedModelAsset.modelAssetPath,
      taskType: 'CLASSIFICATION',
      targetDataType: 'Tabular',
      targetClassifier: selectedModelAsset.normalizedClassifier,
    };
  }

  private buildFairnessDatasetOption(): DatasetOption | null {
    const fairnessDatasetOption = this.getSelectedFairnessDatasetOption();
    const selectedModelAsset = this.getFairnessModelAsset();
    if (!fairnessDatasetOption || !selectedModelAsset) {
      return null;
    }

    const modelFileName = selectedModelAsset.modelFileName;
    const modelName = `${this.stripExtension(modelFileName)}_fairness_hidden`;

    return {
      label: `${fairnessDatasetOption.datasetName}::${this.fairnessBiasType.toLowerCase()}`,
      datasetName: fairnessDatasetOption.datasetName,
      datasetFileName: fairnessDatasetOption.datasetFileName,
      datasetAssetPath: fairnessDatasetOption.datasetAssetPath,
      modelName,
      modelFileName,
      modelAssetPath: selectedModelAsset.modelAssetPath,
      taskType: 'CLASSIFICATION',
      targetDataType: 'Tabular',
      targetClassifier: selectedModelAsset.normalizedClassifier,
    };
  }

  private getSelectedFairnessDatasetOption(): FairnessDatasetOption | null {
    return (
      this.fairnessDatasetOptions.find(
        (fairnessDatasetOption) => fairnessDatasetOption.key === this.selectedFairnessDatasetKey
      ) || null
    );
  }

  private getFairnessModelAsset(selectedDatasetOption?: FairnessDatasetOption | DatasetOption | null): ClassifierModelAsset | null {
    const hiddenModelLabel =
      (selectedDatasetOption as FairnessDatasetOption | null)?.hiddenModelLabel || 'LogisticRegression';
    return (
      this.classifierModelAssets.find(
        (classifierModelAsset) => classifierModelAsset.classifierLabel === hiddenModelLabel
      ) || null
    );
  }

  private applyFairnessPreset(): void {
    const fairnessDatasetOption = this.getSelectedFairnessDatasetOption();
    if (!fairnessDatasetOption) {
      return;
    }

    const preset =
      fairnessDatasetOption.presets[this.fairnessBiasType as 'PRETRAIN' | 'POSTTRAIN'] ||
      fairnessDatasetOption.presets.PRETRAIN;

    this.fairnessLabel = preset.label;
    this.fairnessFavorableOutcome = preset.favorableOutcome;
    this.fairnessProtectedAttributesInput = preset.protectedAttributesInput;
    this.fairnessPrivilegedGroupsInput = preset.privilegedGroupsInput;
    this.fairnessPredLabel = preset.predLabel || 'labels_pred';
    this.normalizeFairnessMethodType();
  }

  private normalizeFairnessMethodType(): void {
    const allowedMethods = this.fairnessMethodOptions.map((methodOption) => methodOption.value);
    if (!allowedMethods.includes(this.fairnessMethodType)) {
      this.fairnessMethodType = allowedMethods[0] || 'ALL';
    }
  }

  private async loadFairnessDatasetColumns(): Promise<void> {
    const fairnessDatasetOption = this.getSelectedFairnessDatasetOption();
    if (!fairnessDatasetOption) {
      this.datasetColumns = [];
      return;
    }

    try {
      const datasetFile = await this.fetchAssetFile(
        fairnessDatasetOption.datasetAssetPath,
        fairnessDatasetOption.datasetFileName,
        'text/csv'
      );
      const csvHeaderSample = await datasetFile.slice(0, 8192).text();
      this.datasetColumns = this.extractCsvColumns(csvHeaderSample);
    } catch (_error) {
      this.datasetColumns = [];
    }
  }

  private getSelectedClassifierModelAsset(): ClassifierModelAsset | null {
    const normalizedSelection = String(this.uploadedTargetClassifier || '').trim().toUpperCase();
    const matchedAsset = this.classifierModelAssets.find(
      (classifierModelAsset) =>
        classifierModelAsset.classifierLabel.toUpperCase() === normalizedSelection
    );

    if (matchedAsset) {
      return matchedAsset;
    }

    return null;
  }

  private resolveTargetClassifier(rawClassifier: string): string {
    const normalized = String(rawClassifier || '').trim();
    if (!normalized) {
      return 'SklearnClassifier';
    }

    const configuredClassifier = this.classifierOptionGroups
      .reduce(
        (allOptions, classifierGroup) => allOptions.concat(classifierGroup.options),
        [] as Array<{ value: string; normalizedClassifier: string }>
      )
      .find((classifierOption) => classifierOption.value.toUpperCase() === normalized.toUpperCase());

    if (configuredClassifier) {
      return configuredClassifier.normalizedClassifier;
    }

    const upperValue = normalized.toUpperCase();
    const supportedClassifierIds = new Set([
      'SKLEARNCLASSIFIER',
      'SKLEARNAPICLASSIFIER',
      'KERASCLASSIFIER',
      'TENSORFLOWCLASSIFIER',
      'PYTORCHFASTERRCNN',
      'PYTORCHCLASSIFIER',
      'XGBOOSTCLASSIFIER',
      'CATBOOSTCLASSIFIER',
    ]);

    if (supportedClassifierIds.has(upperValue)) {
      return normalized;
    }

    // Map common scikit-learn algorithm names to the workbench/security classifier id.
    return 'SklearnClassifier';
  }

  private stripExtension(fileName: string): string {
    return String(fileName || '').replace(/\.[^.]+$/, '');
  }

  private extractAttackNames(payload: any): string[] {
    const attackNames = new Set<string>();

    const collectNames = (value: any): void => {
      if (value === null || value === undefined) {
        return;
      }
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) {
          attackNames.add(trimmed);
        }
        return;
      }
      if (Array.isArray(value)) {
        value.forEach((item) => collectNames(item));
        return;
      }
      if (typeof value === 'object') {
        const candidateKeys = ['attackName', 'attack', 'name', 'method'];
        for (const key of candidateKeys) {
          if (typeof value[key] === 'string' && value[key].trim()) {
            attackNames.add(value[key].trim());
          }
        }
        Object.values(value).forEach((nestedValue) => collectNames(nestedValue));
      }
    };

    collectNames(payload);
    return Array.from(attackNames);
  }

  private validateFairnessInputsIfNeeded(): boolean {
    return this.validateFairnessInputs(true);
  }

  private validateFairnessInputs(updateErrorState: boolean): boolean {
    if (this.activeTab !== 'Fairness') {
      return true;
    }
    if (!this.fairnessProtectedAttributesInput.trim()) {
      if (updateErrorState) {
        this.evaluationError =
          'Fairness requires protected attribute input (for example: gender).';
      }
      return false;
    }
    if (!this.fairnessLabel.trim()) {
      if (updateErrorState) {
        this.evaluationError = 'Fairness requires a label column.';
      }
      return false;
    }
    if (this.fairnessBiasType === 'POSTTRAIN' && !this.fairnessPredLabel.trim()) {
      if (updateErrorState) {
        this.evaluationError = 'Post-train fairness requires a prediction label column.';
      }
      return false;
    }
    return true;
  }

  private splitCsvInput(rawValue: string): string[] {
    return String(rawValue || '')
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  private parseNestedGroups(rawValue: string): string[][] {
    const normalized = String(rawValue || '').trim();
    if (!normalized) {
      return [];
    }

    return normalized
      .split(';')
      .map((groupText) =>
        groupText
          .split(',')
          .map((item) => item.trim())
          .filter((item) => item.length > 0)
      )
      .filter((group) => group.length > 0);
  }

  private extractBatchByTenet(batchGenerationResponse: any, tenetId: number): any | null {
    if (!Array.isArray(batchGenerationResponse)) {
      return null;
    }
    return (
      batchGenerationResponse.find((batchItem: any) => Number(batchItem?.TenetId) === tenetId) ||
      batchGenerationResponse[0] ||
      null
    );
  }

  private setTenetStatus(
    tenetName: string,
    state: 'success' | 'error' | 'running',
    message: string,
    batchId?: number | null
  ): void {
    const existingIndex = this.tenetRunStatuses.findIndex((item) => item.name === tenetName);
    const statusPayload: TenetRunStatus = {
      name: tenetName,
      state,
      message,
      batchId: batchId ?? undefined,
    };
    if (existingIndex >= 0) {
      this.tenetRunStatuses[existingIndex] = statusPayload;
      return;
    }
    this.tenetRunStatuses = [...this.tenetRunStatuses, statusPayload];
  }

  private updateDownloadSelection(): void {
    const availableTenets = this.availableDownloadTenets;
    if (availableTenets.length === 0) {
      this.selectedDownloadTenet = '';
      return;
    }
    if (!availableTenets.includes(this.selectedDownloadTenet)) {
      this.selectedDownloadTenet = availableTenets[0];
    }
  }

  private async downloadWorkbenchReport(batchId: number, filePrefix: string): Promise<void> {
    const body = new URLSearchParams();
    body.set('batchId', String(batchId));
    const response: any = await firstValueFrom(
      this.http.post(this.apiConfig.downloadWorkReport, body.toString(), {
        observe: 'response',
        responseType: 'blob',
        headers: new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' }),
      })
    );

    const reportBlob = response?.body as Blob;
    if (!reportBlob || !(await this.isZipBlob(reportBlob))) {
      const errorText = reportBlob ? await reportBlob.text() : '';
      throw new Error(
        this.extractDownloadErrorMessage(
          errorText,
          'Report download returned an invalid archive. The report may not have finished generating.'
        )
      );
    }

    let generatedFileName = `${filePrefix}_report_batch_${batchId}.zip`;
    const contentDisposition = response?.headers?.get('Content-Disposition');
    if (contentDisposition && contentDisposition.includes('filename=')) {
      const downloadedName = contentDisposition.split('filename=')[1].trim().replace(/"/g, '');
      if (downloadedName) {
        generatedFileName = downloadedName;
      }
    }

    this.downloadBlob(reportBlob, generatedFileName);
  }

  private async downloadFairnessReport(batchId: number): Promise<void> {
    const response: any = await firstValueFrom(
      this.http.post(this.apiConfig.fairnessDownload, { Batch_id: batchId }, {
        responseType: 'blob',
        observe: 'response',
      })
    );

    let fileName = `fairness_report_batch_${batchId}.zip`;
    const contentDisposition = response?.headers?.get('Content-Disposition');
    if (contentDisposition && contentDisposition.includes('filename=')) {
      const downloadedName = contentDisposition.split('filename=')[1].trim().replace(/"/g, '');
      const hasGenericName = downloadedName.toLowerCase() === 'report.zip';
      if (!hasGenericName) {
        fileName = downloadedName;
      }
    }

    this.downloadBlob(response.body, fileName);
  }

  private downloadBlob(blobContent: Blob, fileName: string): void {
    const blobUrl = window.URL.createObjectURL(blobContent);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = blobUrl;
    downloadAnchor.download = fileName;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    window.URL.revokeObjectURL(blobUrl);
  }

  private resolveErrorMessage(error: any, fallbackMessage = 'Evaluation failed.'): string {
    const statusCode = Number(error?.status);
    const statusText = String(error?.statusText || '').trim();
    const requestUrl = String(error?.url || '').trim();
    const serviceLabel = this.getServiceLabelFromUrl(requestUrl);

    // Angular network/CORS failures often surface as ProgressEvent { isTrusted: true } with status 0.
    if (
      statusCode === 0 ||
      (error?.error && typeof error.error === 'object' && (error.error as any).isTrusted === true)
    ) {
      const endpointLabel = requestUrl || this.apiConfig.securityReport;
      return `Network error while contacting ${serviceLabel} (${endpointLabel}). Verify the corresponding service container is running and reachable.`;
    }

    const candidates = [
      error?.error?.detail,
      error?.error?.message,
      error?.error?.errors,
      error?.error?.non_field_errors,
      error?.error,
      error?.message,
      statusText,
      error,
    ];

    for (const candidate of candidates) {
      const parsed = this.stringifyErrorCandidate(candidate);
      if (parsed) {
        return parsed;
      }
    }

    return fallbackMessage;
  }

  private getServiceLabelFromUrl(requestUrl: string): string {
    const normalizedUrl = (requestUrl || '').toLowerCase();
    if (normalizedUrl.includes('/fairness/')) {
      return 'fairness service';
    }
    if (normalizedUrl.includes('/security/')) {
      return 'security service';
    }
    if (normalizedUrl.includes('/explainability/')) {
      return 'explainability service';
    }
    return 'evaluation service';
  }

  private stringifyErrorCandidate(candidate: any): string {
    if (candidate === null || candidate === undefined) {
      return '';
    }

    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (!trimmed || trimmed === '[object Object]') {
        return '';
      }
      const lowered = trimmed.toLowerCase();
      if (lowered === 'none' || lowered === 'null' || lowered === 'undefined') {
        return '';
      }
      return trimmed;
    }

    if (Array.isArray(candidate)) {
      const values = candidate
        .map((item) => this.stringifyErrorCandidate(item))
        .filter((item) => item.length > 0);
      return values.join(' | ');
    }

    if (typeof candidate === 'object') {
      const objectCandidate = candidate as Record<string, any>;
      const preferredKeys = ['detail', 'message', 'error', 'msg', 'title'];
      for (const key of preferredKeys) {
        const parsed = this.stringifyErrorCandidate(objectCandidate[key]);
        if (parsed) {
          return parsed;
        }
      }

      try {
        const serialized = JSON.stringify(candidate);
        return serialized && serialized !== '{}' ? serialized : '';
      } catch (_error) {
        return '';
      }
    }

    return String(candidate);
  }

  private async isZipBlob(blobContent: Blob): Promise<boolean> {
    if (!blobContent || blobContent.size < 4) {
      return false;
    }

    const headerBytes = new Uint8Array(await blobContent.slice(0, 4).arrayBuffer());
    return (
      headerBytes[0] === 0x50 &&
      headerBytes[1] === 0x4b &&
      [0x03, 0x05, 0x07].includes(headerBytes[2])
    );
  }

  private extractDownloadErrorMessage(errorText: string, fallbackMessage: string): string {
    const normalizedText = String(errorText || '').trim();
    if (!normalizedText) {
      return fallbackMessage;
    }

    try {
      const parsedPayload = JSON.parse(normalizedText);
      return this.stringifyErrorCandidate(parsedPayload) || fallbackMessage;
    } catch (_error) {
      return normalizedText.length > 240
        ? `${normalizedText.slice(0, 237)}...`
        : normalizedText;
    }
  }

  private resetEvaluationState(): void {
    this.evaluationError = '';
    this.evaluationSuccess = '';
    this.reportStatus = '';
    this.currentStepMessage = '';
    this.tenetRunStatuses = [];
    this.explainabilityCards = [];
    this.generatedBatchByTenet = {
      Explainability: null,
      Fairness: null,
      Robustness: null,
    };
    this.selectedDownloadTenet = '';
  }
}
