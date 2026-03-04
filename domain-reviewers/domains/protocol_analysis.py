"""Domain reviewer for Protocol Analysis tasks."""

from base_reviewer import BaseReviewer


class ProtocolAnalysisReviewer(BaseReviewer):
    domain_name = "protocol-analysis"
    domain_display = "Protocol Analysis"

    def domain_qq_prompt(self) -> str:
        return """PROTOCOL ANALYSIS — Question Quality Checks:
- Is the protocol being analyzed clearly specified (HTTP, TCP, MQTT, Modbus, etc.)?
- Are the analysis goals defined (audit, forensics, anomaly detection)?
- Are input data formats specified (pcap, CSV logs, binary dumps)?
- Are expected output formats defined (reports, summaries, alerts)?
- Are protocol-specific rules/standards referenced?
CRITICAL: Protocol analysis tasks must define WHAT to look for in protocol data. Vague goals → qq ≤ 5."""

    def domain_tq_prompt(self) -> str:
        return """PROTOCOL ANALYSIS — Test Quality Checks:
- Do tests verify protocol analysis RESULTS (correct classifications, counts)?
- Are tests checking actual values from protocol data (not just format)?
- Do tests cover multiple protocol scenarios (normal, anomalous, edge cases)?
- Are assertions precise about protocol-specific values?
CRITICAL: Tests that only check "report file has correct format" without verifying analysis results → tq ≤ 5."""

    def domain_tc_prompt(self) -> str:
        return """PROTOCOL ANALYSIS — Test Coverage Checks:
- Are all analysis objectives from instruction.md tested?
- Are protocol-specific metrics verified with actual values?
- Are edge cases tested (malformed packets, empty logs)?
- Is the core analysis algorithm tested (not just output format)?
CRITICAL: Protocol analysis requires testing the actual analysis logic, not just output structure."""

    def calibration_examples(self) -> str:
        return """DOMAIN CALIBRATION — Protocol Analysis (0 tasks directly flagged, but cross-cutting patterns apply):

CROSS-CUTTING PATTERNS FROM CLIENT FEEDBACK:
1. "Format-only validation" — tests check report format but not analysis results → tq ≤ 5, tc ≤ 4
2. "Core algorithm untested" (from security domain parallel) — protocol classification
   logic must be tested, not just output structure → tc ≤ 5
3. "Assertions too lenient" — broad regex patterns instead of exact expected values → tq -1

KEY PATTERNS TO DETECT:
- Report file has correct format but analysis values unchecked → tc ≤ 4
- Classification/detection algorithm not tested → tc ≤ 5
- Only one protocol scenario tested → tc ≤ 5
- Missing edge cases (malformed packets, empty logs, encrypted traffic) → tc -1

SCORING GUIDE:
- tc=4: Report format only, no analysis values
- tc=5: Some analysis values checked but single scenario
- tc=7+: Multiple scenarios with value-level verification + edge cases"""
