"""Domain reviewer for Security tasks."""

from base_reviewer import BaseReviewer


class SecurityReviewer(BaseReviewer):
    domain_name = "security"
    domain_display = "Security"

    def domain_qq_prompt(self) -> str:
        return """SECURITY — Question Quality Checks:
- Is the security scenario clearly described (attack vector, defense mechanism)?
- Are the security rules/policies explicitly defined?
- Are input data formats (logs, configurations, packets) specified?
- Are expected outputs (alerts, reports, patched configs) defined?
- Are false positive/negative handling rules stated?
CRITICAL: Security tasks must define the exact security logic to implement. "Make it secure" → qq ≤ 3."""

    def domain_tq_prompt(self) -> str:
        return """SECURITY — Test Quality Checks:
- Do tests verify the security LOGIC (rules correctly applied)?
- Are tests checking actual security outcomes (threats detected, rules enforced)?
- Do tests cover both positive (attack detected) and negative (benign traffic) cases?
- Are tests verifying correct classification, not just output format?
- Are edge cases tested (ambiguous inputs, boundary rules)?
CRITICAL: Tests that only check "log file has correct format" without verifying security decisions → tq ≤ 5."""

    def domain_tc_prompt(self) -> str:
        return """SECURITY — Test Coverage Checks:
- Is the CORE SECURITY ALGORITHM tested with actual inputs and expected decisions?
- Are all security rules from instruction.md individually tested?
- Are false positives and false negatives tested?
- Are evasion attempts tested if applicable?
- Are edge cases in rule matching tested?
CRITICAL: If the task defines 5 firewall rules but tests only check output file format → tc ≤ 3. The core algorithm (rule evaluation) MUST be tested."""

    def calibration_examples(self) -> str:
        return """DOMAIN CALIBRATION — Security (2 tasks flagged by client):

REAL CLIENT SCORES (use these as your scoring anchor):
- xor-decryption-medium → qq=8, tq=5, tc=5 (avg=6.0, SERIOUS)
  "test_transformation_key_present accepts any hexadecimal value instead of verifying the correct XOR key — incorrect key passes"
- firewall-rule-audit-medium → qq=8, tq=5, tc=6 (avg=6.33, MODERATE)
  "Core algorithm (classifying rules as shadow/conflict/redundant) is completely untested; labeling ALL rules as 'none' passes as long as the format is correct"

KEY PATTERNS TO DETECT:
1. Core security algorithm completely untested (format passes, logic unchecked) → tc ≤ 5
2. Tests accept ANY value instead of the CORRECT value → tq ≤ 5
3. Overly lenient assertions (regex-match broad patterns, accept any hex string) → tq -2
4. Missing adversarial test cases (evasion, false positives, false negatives) → tc -1
5. No rule-evaluation logic testing (all rules labeled 'none' passes) → tc ≤ 4
6. Output format passes but security decisions are never verified → tq ≤ 5

CORE ALGORITHM TEST REQUIREMENT:
Security tasks MUST test the decision-making logic, not just output format.
If you can pass all tests by labeling everything as "none" / "safe" / "benign":
→ The core algorithm is UNTESTED → tc ≤ 5, tq ≤ 5.

ASSERTION SPECIFICITY CHECK:
If tests verify "output contains a hex string" without checking it's the CORRECT hex string:
→ Tests are TOO LENIENT → tq -2

SCORING GUIDE:
- tq=5: Tests accept any value of correct type (any hex, any classification)
- tc=5: Core security logic untested, format-only validation
- tc=6: Some logic tested but missing adversarial/edge cases
- tc=7+: Core algorithm tested with correct expected values + adversarial cases"""
