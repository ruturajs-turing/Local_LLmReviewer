"""Domain reviewer for Mathematics tasks."""

from base_reviewer import BaseReviewer


class MathematicsReviewer(BaseReviewer):
    domain_name = "mathematics"
    domain_display = "Mathematics"

    def domain_qq_prompt(self) -> str:
        return """MATHEMATICS — Question Quality Checks:
- Is the mathematical problem precisely defined with all variables and constraints?
- Are formulas written unambiguously (operator precedence, domain of functions)?
- Are input/output formats specified with precision requirements?
- Are edge cases part of the problem statement (division by zero, overflow)?
- Is the expected mathematical rigor level clear (exact vs approximate)?
CRITICAL: Mathematical tasks demand extreme precision in problem statements. Any ambiguity in formulas or definitions → qq ≤ 6."""

    def domain_tq_prompt(self) -> str:
        return """MATHEMATICS — Test Quality Checks:
- Do tests verify NUMERICAL CORRECTNESS of computed results?
- Are tolerances appropriate for floating-point comparisons?
- Do tests use exact values for integer/rational arithmetic?
- Are known mathematical identities used to validate results?
- Do tests check edge cases (zero, negative, very large numbers)?
CRITICAL: Tests that only verify output FORMAT (JSON structure, file exists) without checking numerical values → tq ≤ 4. This is the #1 failure mode in mathematics tasks."""

    def domain_tc_prompt(self) -> str:
        return """MATHEMATICS — Test Coverage Checks:
- Is every mathematical computation result verified with its actual value?
- Are ALL formulas from instruction.md tested with known inputs?
- Are boundary conditions tested (zero, infinity, undefined)?
- Are special cases tested (identity elements, degenerate cases)?
- If multiple mathematical operations are required, is each one tested?
CRITICAL: If instruction asks "compute the GCD, LCM, and prime factorization" and tests only check output has 3 keys → tc ≤ 3. EVERY mathematical result must be value-verified."""

    def calibration_examples(self) -> str:
        return """DOMAIN CALIBRATION — Mathematics (2 tasks flagged by client):

REAL CLIENT SCORES (use these as your scoring anchor):
- number-theory-explorer-medium → qq=7, tq=4, tc=3 (avg=4.67, CRITICAL)
  "All 9 output files with number theory calculations only verify format and sorting, never verify any computed values"
  This is the CANONICAL example of format-only testing: instruction was clear (qq=7), but
  tests only checked JSON structure/key names — ZERO numerical value assertions.
- combinatorics-puzzle-medium → qq=7, tq=7, tc=5 (avg=6.33, MODERATE)
  "Insufficient test coverage — edge case scenarios for boundary conditions not tested"

KEY PATTERNS TO DETECT:
1. Format-only testing (JSON keys exist, file is valid format) without value assertions → tq ≤ 4, tc ≤ 3
2. Sorting/ordering tests without checking the sorted VALUES → tc -2
3. Missing boundary conditions (zero, infinity, undefined, overflow) → tc -1
4. No exact-value assertions for integer/rational arithmetic → tq -2
5. Inappropriate tolerances for floating-point math (too loose or too tight) → tq -1
6. Not testing all requested computations (e.g., asks GCD+LCM+factorization, tests only GCD) → tc proportional reduction

FORMAT-ONLY DETECTION RULE:
If tests contain patterns like:
  assert "key" in result  |  assert isinstance(result, dict)  |  assert len(result) == N
WITHOUT any patterns like:
  assert result["value"] == 42  |  assert abs(result - expected) < tol
Then the tests are FORMAT-ONLY → tq ≤ 4, tc ≤ 3.

SCORING GUIDE:
- tq=4: Tests verify structure/format only, zero numerical assertions
- tc=3: No computed values verified at all
- tc=5: Some values verified but missing edge cases
- tc=7+: All computations verified with exact values + boundary conditions"""
