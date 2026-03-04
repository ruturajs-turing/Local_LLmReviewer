"""Domain reviewer for Model Training tasks."""

from base_reviewer import BaseReviewer


class ModelTrainingReviewer(BaseReviewer):
    domain_name = "model-training"
    domain_display = "Model Training"

    def domain_qq_prompt(self) -> str:
        return """MODEL TRAINING — Question Quality Checks:
- Is the training objective clearly defined?
- Are dataset specifications complete (format, size, split ratios)?
- Are hyperparameter requirements stated?
- Are evaluation criteria and thresholds defined?
- Are training infrastructure requirements clear (GPU, memory)?
- Are convergence criteria or epoch limits specified?
CRITICAL: Model training tasks must define measurable success criteria. "Train a model" without specifying what "good" means → qq ≤ 5."""

    def domain_tq_prompt(self) -> str:
        return """MODEL TRAINING — Test Quality Checks:
- Do tests verify the trained model meets performance thresholds?
- Are tests loading the model and running inference?
- Do tests check training artifacts (loss curves, checkpoints)?
- Are tests verifying training was actually performed (not just pre-trained model copied)?
- Are reproducibility checks present?
CRITICAL: Tests that only check "model file exists" and "can be loaded" without performance validation → tq ≤ 5."""

    def domain_tc_prompt(self) -> str:
        return """MODEL TRAINING — Test Coverage Checks:
- Is model performance verified with actual metrics (accuracy, loss, etc.)?
- Are training artifacts checked (logs, checkpoints)?
- Are data loading and preprocessing steps verified?
- Are convergence metrics tested?
- Are output predictions tested on sample data?
CRITICAL: If instruction says "train to accuracy > 0.9" but tests only check model structure → tc ≤ 3."""

    def calibration_examples(self) -> str:
        return """DOMAIN CALIBRATION — Model Training (2 tasks flagged by client):

REAL CLIENT SCORES (use these as your scoring anchor):
- latent-dirichlet-allocation-medium → qq=8, tq=4, tc=4 (avg=5.33, SERIOUS)
  "Deterministic algorithm (fixed seed + data) but tests don't verify any specific computed values — topic distributions, word assignments, perplexity all unchecked"
- pca-analysis-medium → qq=7, tq=5, tc=5 (avg=5.67, SERIOUS)
  "30 tests verify structure and basic mathematical properties but don't verify any specific values; reconstruction error threshold of <20 is too lenient"

KEY PATTERNS TO DETECT:
1. Structure-only testing (file exists, loads, has keys/columns) without value verification → tq ≤ 5, tc ≤ 5
2. Deterministic computation (fixed seed) but no specific value assertions → tq ≤ 4
3. Performance thresholds too lenient (e.g., reconstruction error < 20 when < 5 is appropriate) → tq -1
4. Missing training artifact verification (loss curve, convergence, checkpoints) → tc -1
5. No prediction quality testing (just "model loads successfully") → tc ≤ 4
6. Tests count is high but substance is low (30 tests all checking structure) → tq adjusted by substance, not count

DETERMINISM CHECK:
If the task uses a fixed random seed AND fixed dataset, the output is DETERMINISTIC.
Tests MUST assert exact computed values in this case. If they don't:
→ tq ≤ 4 (the computation is reproducible but unchecked)

THRESHOLD LENIENCY CHECK:
If tests have numeric thresholds, assess whether they are scientifically appropriate:
- Reconstruction error < 20 for PCA on small data → too lenient (should be < 5)
- Accuracy > 0.5 for supervised learning → borderline (should be > 0.7+ for most tasks)
- Loss < 10.0 → usually too lenient

SCORING GUIDE:
- tq=4: Fixed-seed deterministic task with zero specific value assertions
- tq=5: Some structural checks + basic mathematical properties, no specific values
- tc=4: No specific computed values verified
- tc=5: Some values verified but thresholds too lenient or missing edge cases
- tc=7+: Specific values verified with tight thresholds + edge cases"""
