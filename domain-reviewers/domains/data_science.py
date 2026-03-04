"""Domain reviewer for Data Science tasks."""

from base_reviewer import BaseReviewer


class DataScienceReviewer(BaseReviewer):
    domain_name = "data-science"
    domain_display = "Data Science"

    def domain_qq_prompt(self) -> str:
        return """DATA SCIENCE — Question Quality Checks:
- Are all rules, formulas, and constraints explicitly stated in one place?
- Is the dataset schema described with all relevant columns?
- Are evaluation metrics specified with formulas or clear definitions?
- Are hyperparameter requirements stated (if applicable)?
- Is the expected output format (model file, predictions CSV, metrics JSON) defined?
CRITICAL: Data science tasks are the #1 domain for "implicitly scattered rules." All rules MUST be consolidated. If key rules are spread across multiple paragraphs without consolidation → qq ≤ 5."""

    def domain_tq_prompt(self) -> str:
        return """DATA SCIENCE — Test Quality Checks:
- Do tests verify model performance metrics with actual computed values?
- Are statistical results tested with appropriate tolerances?
- Do tests check data pipeline correctness (feature engineering, normalization)?
- Are reproducibility requirements tested (random seed, determinism)?
- Do tests verify the model can make predictions (not just that a file exists)?
CRITICAL: Tests that only check "model.pkl exists" without loading and testing it → tq ≤ 4."""

    def domain_tc_prompt(self) -> str:
        return """DATA SCIENCE — Test Coverage Checks:
- Are all specified metrics computed and verified?
- Is the data pipeline tested end-to-end (load → preprocess → train → predict → evaluate)?
- Are feature engineering steps verified?
- Are model output quality thresholds tested?
- Are edge cases tested (missing features, outliers)?
CRITICAL: If instruction specifies "compute AUC, precision, recall" but tests only check JSON keys exist → tc ≤ 3."""

    def calibration_examples(self) -> str:
        return """DOMAIN CALIBRATION — Data Science (2 tasks flagged by client):

REAL CLIENT SCORES (use these as your scoring anchor):
- customer-segmentation-analysis-medium → qq=6, tq=7, tc=5 (avg=6.0, SERIOUS)
  "Insufficient test coverage — segmentation results not validated against expected cluster assignments"
- federated-learning-dp-gradient-clipping-aggregation-hard → qq=5, tq=7, tc=7 (avg=6.33, MODERATE)
  "Key validation rules are implicit; critical requirements are scattered across three files"

KEY PATTERNS TO DETECT:
1. Rules scattered across multiple files/paragraphs without consolidation → qq ≤ 5
2. Tests don't verify pipeline end-to-end (load → process → model → evaluate) → tc -1
3. Missing feature engineering verification → tc -1
4. Tests check model structure without validating prediction quality → tc ≤ 5
5. Evaluation metrics specified but not asserted with specific values → tc -1
6. No cross-validation or holdout verification → tc -1

RULE SCATTERING CHECK:
Read the instruction carefully. If critical requirements are:
- Scattered across 3+ paragraphs without a consolidated summary → qq -2
- Split across multiple files (instruction + config + data description) → qq -1
- Only mentioned in examples but not in the main requirements → qq -1

SCORING GUIDE:
- qq=5: Rules scattered across multiple files, no consolidation
- qq=6: Rules mostly in one place but some implicit assumptions
- tc=5: Model built but results not validated against expected outcomes
- tc=7+: Full pipeline tested with specific metrics and edge cases"""
