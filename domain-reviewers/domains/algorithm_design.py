"""Domain reviewer for Algorithm Design tasks."""

from base_reviewer import BaseReviewer


class AlgorithmDesignReviewer(BaseReviewer):
    domain_name = "algorithm-design"
    domain_display = "Algorithm Design"

    def domain_qq_prompt(self) -> str:
        return """ALGORITHM DESIGN — Question Quality Checks:
- Is the algorithmic problem well-defined with clear input/output specification?
- Are constraints (time complexity, space complexity, input size) stated?
- Is the problem statement internally consistent? (self-contradictory statements are common in this domain)
- Are edge cases part of the problem description (empty input, single element, duplicates)?
- Does the prompt avoid prescribing a specific algorithm when multiple approaches work?
- Are example inputs/outputs provided to clarify the expected behavior?
CRITICAL: Self-contradictory problem statements are the #1 issue in this domain. Check every constraint against every example."""

    def domain_tq_prompt(self) -> str:
        return """ALGORITHM DESIGN — Test Quality Checks:
- Do tests verify algorithmic CORRECTNESS, not just output format?
- Are test cases covering multiple input sizes (small, medium, edge)?
- Do tests check for correct handling of edge cases (empty arrays, single elements, all-same values)?
- Are time/space constraints validated if stated in the instruction?
- Do assertions compare actual computed values against expected results?
- Are there parametrized tests across different scenarios?
CRITICAL: Tests that only check output file format without verifying computational results are a major quality issue."""

    def domain_tc_prompt(self) -> str:
        return """ALGORITHM DESIGN — Test Coverage Checks:
- Is the core algorithmic logic tested with value-level assertions?
- Are boundary conditions tested (min/max input sizes, extreme values)?
- If the task involves optimization, do tests verify optimality (not just feasibility)?
- Are tie-breaking rules tested if specified?
- Do tests cover adversarial inputs that would break naive implementations?
CRITICAL: In algorithm tasks, the core computational result MUST be verified. If tests only check "file exists" or "JSON has correct keys" → tc ≤ 3."""

    def calibration_examples(self) -> str:
        return """DOMAIN CALIBRATION — Algorithm Design (3 tasks flagged by client):

REAL CLIENT SCORES (use these as your scoring anchor):
- self-referential-adversarial-system-reconstruction → qq=4, tq=7, tc=7 (avg=6.0)
  "The problem statement is self-contradictory — contains logical paradoxes that make it unsolvable as stated"
- dynamic-programming-knapsack-variant-medium → qq=6, tq=5, tc=4 (avg=5.0, CRITICAL)
  "Tests only verify output format (JSON with 'items' key); no value-level verification of optimal solution; only 1 test case"
- graph-shortest-path-weighted-medium → qq=7, tq=6, tc=5 (avg=6.0, SERIOUS)
  "Tests verify shortest distance but not the actual path; missing disconnected graph and negative cycle edge cases"

KEY PATTERNS TO DETECT:
1. Self-contradictory problem statement (logical paradoxes) → qq ≤ 4
2. Tests verify output format but not algorithmic correctness → tq ≤ 5, tc ≤ 4
3. Only 1 test case for the algorithm → tc ≤ 4
4. Missing edge cases (empty input, single element, all-same, duplicates) → tc -2
5. No optimality verification (feasible but not optimal passes) → tc -1
6. Missing time/space complexity enforcement → tq -1

CONSISTENCY CHECK:
Read every constraint and every example in the problem statement. Flag ANY case where:
- A constraint contradicts an example → qq ≤ 5
- Two constraints contradict each other → qq ≤ 4
- The problem is technically unsolvable as stated → qq ≤ 3

SCORING GUIDE:
- qq=4: Problem is self-contradictory or paradoxical
- qq=6: Mostly clear but some ambiguity in constraints
- qq=7+: Well-defined with clear I/O spec and consistent constraints
- tc=4: Format-only testing, single test case
- tc=5: Value checks but missing edge cases
- tc=7+: Multiple test cases with edge cases and optimality verification"""
