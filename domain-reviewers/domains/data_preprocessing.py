"""Domain reviewer for Data Preprocessing tasks."""

from base_reviewer import BaseReviewer


class DataPreprocessingReviewer(BaseReviewer):
    domain_name = "data-preprocessing"
    domain_display = "Data Preprocessing"

    def domain_qq_prompt(self) -> str:
        return """DATA PREPROCESSING — Question Quality Checks:
- Is the input data format and schema clearly described?
- Are transformation rules explicit (not scattered or implicit)?
- Are output format requirements specified?
- Are handling rules for edge cases stated (nulls, duplicates, encoding)?
- Are column mappings and rename rules documented if applicable?
CRITICAL: Preprocessing tasks often have rules scattered across multiple paragraphs. All transformation rules must be consolidated and explicit."""

    def domain_tq_prompt(self) -> str:
        return """DATA PREPROCESSING — Test Quality Checks:
- Do tests verify actual transformed values, not just output shape?
- Are transformation rules tested individually?
- Do tests cover edge cases (empty rows, special characters, type mismatches)?
- Are data type conversions verified?
- Are null/missing value handling rules tested?
CRITICAL: Tests that only check row count and column names without verifying transformed values → tq ≤ 5."""

    def domain_tc_prompt(self) -> str:
        return """DATA PREPROCESSING — Test Coverage Checks:
- Is every transformation rule from instruction.md tested?
- Are data quality checks verified (deduplication, null handling)?
- Are format conversion results checked with actual values?
- Are join/merge operations verified if applicable?
- Are ordering/sorting rules tested?
CRITICAL: If 5 transformation rules are listed but only 2 are tested → tc ≤ 4."""

    def calibration_examples(self) -> str:
        return """DOMAIN CALIBRATION — Data Preprocessing (1 task flagged by client):

REAL CLIENT SCORES (use these as your scoring anchor):
- ecommerce-transaction-reconciliation-hard → qq=5, tq=8, tc=9 (avg=7.33, MODERATE)
  "Question description is weak/insufficient — tests are excellent but the instruction doesn't clearly define the reconciliation rules"

KEY INSIGHT: This domain can have GREAT tests (tq=8, tc=9) but WEAK questions (qq=5).
The issue is instruction quality, not test quality.

KEY PATTERNS TO DETECT:
1. Transformation rules scattered across paragraphs → qq ≤ 5
2. Rules are implicit ("clean the data" without defining "clean") → qq ≤ 4
3. Tests check output shape (row count, column names) but not transformed values → tc ≤ 4
4. Missing edge cases (nulls, duplicates, encoding issues) → tc -1
5. Instruction says "normalize X" but tests only check X exists → tc ≤ 3

QUESTION QUALITY FOCUS:
For preprocessing, qq is the most likely failure dimension:
- Are ALL transformation rules explicitly listed? Not scattered? Not implicit?
- Is every column mapping/rename rule documented?
- Are edge case handling rules stated (what to do with nulls, duplicates)?

SCORING GUIDE:
- qq=4: Rules implicit or "clean the data" without specifics
- qq=5: Rules scattered across paragraphs, not consolidated
- qq=7+: All rules explicit, consolidated, with edge case handling defined
- tc=4: Output shape checked but no value verification
- tc=7+: All transformation rules individually verified with actual values"""
