"""Domain reviewer for System Administration tasks."""

from base_reviewer import BaseReviewer


class SystemAdministrationReviewer(BaseReviewer):
    domain_name = "system-administration"
    domain_display = "System Administration"

    def domain_qq_prompt(self) -> str:
        return """SYSTEM ADMINISTRATION — Question Quality Checks:
- Is the system configuration/setup task clearly described?
- Are the expected end-state conditions specified?
- Are tool/service versions and compatibility constraints stated?
- Are security/permission requirements specified?
- Are the verification criteria measurable (service running, port open, config correct)?
CRITICAL: Sysadmin tasks must define the desired end-state precisely. "Set up a server" without specifying what should be running → qq ≤ 4."""

    def domain_tq_prompt(self) -> str:
        return """SYSTEM ADMINISTRATION — Test Quality Checks:
- Do tests verify the system is in the correct state (services running, configs applied)?
- Are tests checking actual system behavior (port responds, service answers queries)?
- Do tests verify configuration file contents?
- Are permission/ownership settings tested?
- Are tests robust to timing issues (service startup delays)?
CRITICAL: Tests that only check "config file exists" without verifying service behavior → tq ≤ 5."""

    def domain_tc_prompt(self) -> str:
        return """SYSTEM ADMINISTRATION — Test Coverage Checks:
- Is every specified configuration change verified?
- Are services tested for actual functionality (not just process existence)?
- Are security settings verified?
- Are network configurations tested?
- Are log configurations verified?
CRITICAL: If instruction says "configure nginx with 3 virtual hosts" but tests only check nginx.conf exists → tc ≤ 4."""

    def calibration_examples(self) -> str:
        return """DOMAIN CALIBRATION — System Administration (1 task flagged by client):

REAL CLIENT SCORES (use these as your scoring anchor):
- service-mesh-config-medium → qq=7, tq=5, tc=5 (avg=5.67, SERIOUS)
  "Insufficient test coverage — service behavior not verified, only config file presence"

KEY PATTERNS TO DETECT:
1. Tests check process is running but don't test service responds correctly → tc ≤ 5
2. Tests check config file exists but don't verify config values → tc ≤ 4
3. Security hardening not verified when specified → tc ≤ 5
4. Network configurations not tested (ports, protocols, firewall) → tc -1
5. Service health checks missing (just process presence) → tq -1

SERVICE TESTING HIERARCHY:
Level 1: Config file exists → tc ≤ 4
Level 2: Config file has expected values → tc ≤ 5
Level 3: Service process is running → tc ≤ 6
Level 4: Service responds to requests correctly → tc ≤ 7
Level 5: Full functional test + security + performance → tc 8+

SCORING GUIDE:
- tq=5: Config presence checked but not service behavior
- tc=5: Service running but not functionally verified
- tc=7+: Full service functional testing + security + edge cases"""
