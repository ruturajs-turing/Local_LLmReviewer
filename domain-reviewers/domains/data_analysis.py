"""Domain reviewer for Data Analysis tasks."""

from base_reviewer import BaseReviewer


class DataAnalysisReviewer(BaseReviewer):
    domain_name = "data-analysis"
    domain_display = "Data Analysis"

    def domain_qq_prompt(self) -> str:
        return """DATA ANALYSIS — Question Quality Checks:
- Is the input dataset clearly described (schema, format, location)?
- Are the analysis questions/goals specific and unambiguous?
- Are expected output formats defined (tables, charts, summary statistics)?
- Are numeric precision requirements stated?
- Are column names, data types, and missing value handling rules specified?
CRITICAL: Data analysis tasks must specify the exact analysis to perform. Vague instructions like "analyze the data" → qq ≤ 4."""

    def domain_tq_prompt(self) -> str:
        return """DATA ANALYSIS — Test Quality Checks:
- Do tests verify computed statistical values (means, counts, aggregations)?
- Are numeric precision tolerances appropriate?
- Do tests check output format compliance (CSV columns, JSON keys)?
- Are edge cases tested (empty groups, null values, ties)?
- Do assertions use approximate equality for floating-point results?
- Is test logic non-repetitive (not duplicated across test functions)?
CRITICAL: Tests that only check "output file has 5 columns" without verifying ANY computed values → tq ≤ 4.
REPETITIVE LOGIC CHECK: The client flagged "Test logic repetitive" in data-analysis.
If multiple test functions contain copy-pasted assertion patterns, flag as warning."""

    def domain_tc_prompt(self) -> str:
        return """DATA ANALYSIS — Test Coverage Checks:
- Is every requested analysis/metric tested with actual computed values?
- Are aggregation results verified (sums, averages, counts)?
- Are filtering/grouping operations tested?
- Are sorting/ranking operations verified?
- Are visualization outputs tested if requested?
- Does coverage extend beyond basic happy-path scenarios?
CRITICAL: If instruction asks to "compute metric X" and tests don't assert the value of X → tc ≤ 3.
COVERAGE SCOPE: The client flagged "coverage insufficient" — tests should go beyond
the happy path to include edge cases (empty groups, null values, boundary conditions)."""

    def calibration_examples(self) -> str:
        return """DOMAIN CALIBRATION — Data Analysis (1 task flagged by client):

REAL CLIENT SCORES (use these as your scoring anchor — match these closely):
- warehouse-inventory-reconciliation-medium → qq=6, tq=4, tc=4 (avg=4.67, CRITICAL)
  "~10 out of 16 tests execute the exact same logic (comparing sorted(flagged_skus)) — massive test duplication; no value diversity"
  IMPORTANT: Even if each test checks a different field, if the ASSERTION PATTERN is the same
  (e.g., sorted(actual) == sorted(expected) repeated 10+ times), that is DUPLICATED test logic.
  Tests that mirror a single ground-truth implementation ≠ independent verification.
  This task MUST score tq ≤ 4 and tc ≤ 4 due to massive test duplication.

KEY PATTERNS TO DETECT:
1. REPETITIVE TEST LOGIC — multiple test functions with copy-pasted assertion patterns → tq ≤ 4
   Count unique assertion patterns. If >60% of tests share the same pattern → tq -2
2. No edge case coverage (empty groups, null values, ties, boundary) → tc ≤ 4
3. Tests check output structure (column count, file format) without computed values → tc ≤ 4
4. Aggregation results not verified (sums, averages, counts unchecked) → tc -1
5. Filtering/grouping operations not tested separately → tc -1

TEST DUPLICATION DETECTION:
If you see N test functions that all do essentially:
  assert sorted(result["some_field"]) == sorted(expected)
...with just different field names or slight variations, the test suite is DUPLICATED.
- >60% same pattern → tq ≤ 4
- >80% same pattern → tq ≤ 3
This is not genuine coverage — it's the same check repeated.

SCORING GUIDE:
- tq=4: Massive test duplication (>60% same assertion pattern)
- tc=4: No edge cases, repetitive checks
- tc=6: Some diversity but missing boundary/null/empty cases
- tc=7+: Diverse assertions covering edge cases with actual computed values"""
