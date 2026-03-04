"""Domain reviewer for Machine Learning tasks."""

from base_reviewer import BaseReviewer


class MachineLearningReviewer(BaseReviewer):
    domain_name = "machine-learning"
    domain_display = "Machine Learning"

    def domain_qq_prompt(self) -> str:
        return """MACHINE LEARNING — Question Quality Checks:
- Is the ML task clearly defined (classification, regression, clustering, etc.)?
- Is the dataset described with schema, size, and location?
- Are evaluation metrics specified with formulas or clear definitions?
- Are hyperparameter constraints stated?
- Are instructions consistent with the provided data (column names, target variable)?
CRITICAL: ML instructions frequently contradict the actual data (wrong column names, wrong target variable). Cross-check instruction against actual dataset schema if available. Contradictions between instruction and data → qq ≤ 5."""

    def domain_tq_prompt(self) -> str:
        return """MACHINE LEARNING — Test Quality Checks:
- Do tests load and test the trained model (not just check file exists)?
- Are prediction quality metrics verified with actual computed values?
- Do tests verify model can make predictions on new data?
- Are data preprocessing steps tested?
- Are tests reproducible (random seeds, determinism)?
CRITICAL: Tests that only check "model.pkl exists and loads" without testing prediction quality → tq ≤ 5."""

    def domain_tc_prompt(self) -> str:
        return """MACHINE LEARNING — Test Coverage Checks:
- Is model training verified (model exists, loads, makes predictions)?
- Are all specified metrics computed and value-checked?
- Is the data pipeline tested (loading, preprocessing, feature engineering)?
- Are model performance thresholds enforced?
- Are edge cases tested (missing features, unseen categories)?
CRITICAL: If instruction says "achieve accuracy > 0.8" but tests only check model file exists → tc ≤ 3."""

    def calibration_examples(self) -> str:
        return """DOMAIN CALIBRATION — Machine Learning (3 tasks flagged by client):

REAL CLIENT SCORES (use these as your scoring anchor):
- churn-model-debug → qq=5, tq=5, tc=4 (avg=4.67, CRITICAL)
  "Instructions contradict the data in multiple places; column names in instruction don't match actual CSV; target variable mislabeled"
- sentiment-analysis-pipeline-medium → qq=6, tq=5, tc=4 (avg=5.0, CRITICAL)
  "Tests only check model loads and has predict method; no accuracy threshold; no edge case inputs (empty text, long text)"
- anomaly-detection-timeseries-hard → qq=7, tq=6, tc=5 (avg=6.0, SERIOUS)
  "Precision/recall thresholds tested but only on one dataset; no adversarial examples; no seasonal pattern test"

KEY PATTERNS TO DETECT:
1. Instruction-data contradictions (column names, target variable, schema mismatch) → qq ≤ 5
2. Tests only check "model exists and loads" without prediction quality → tq ≤ 5
3. No performance threshold assertions (accuracy, F1, AUC) → tc ≤ 4
4. Single dataset testing (no cross-validation or holdout test) → tc -1
5. Missing edge case inputs (empty, adversarial, out-of-distribution) → tc -1
6. No reproducibility check (random seed, determinism) → tq -1

CROSS-CHECK REQUIREMENT:
Always verify: Do the column names, data types, and target variable in instruction.md
match what would actually be in the dataset? If there's ANY contradiction → qq ≤ 5.

SCORING GUIDE:
- qq=5: Instruction contradicts actual data schema
- tq=5: Model existence + basic loading tested, but no quality metrics
- tc=4: No performance thresholds, no edge cases
- tc=7+: Performance thresholds + edge cases + multiple evaluation scenarios"""
