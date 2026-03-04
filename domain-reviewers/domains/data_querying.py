"""Domain reviewer for Data Querying tasks."""

from base_reviewer import BaseReviewer


class DataQueryingReviewer(BaseReviewer):
    domain_name = "data-querying"
    domain_display = "Data Querying"

    def domain_qq_prompt(self) -> str:
        return """DATA QUERYING — Question Quality Checks:
- Is the database schema/data source clearly described?
- Are the queries/questions specific and unambiguous?
- Are expected output formats defined (column names, ordering, precision)?
- Is the query language/tool specified or left flexible?
- Are join relationships and data semantics explained?
CRITICAL: Querying tasks must specify exact expected results format. Ambiguous column names or implicit sort orders → qq ≤ 5."""

    def domain_tq_prompt(self) -> str:
        return """DATA QUERYING — Test Quality Checks:
- Do tests verify query RESULTS with actual values?
- Are result set sizes verified?
- Are column data types and formats checked?
- Are ordering requirements tested?
- Do tests handle null/empty result sets?
CRITICAL: Tests that only run "query succeeds without error" without checking results → tq ≤ 3."""

    def domain_tc_prompt(self) -> str:
        return """DATA QUERYING — Test Coverage Checks:
- Is every required query/question tested with expected results?
- Are aggregation results verified with actual values?
- Are filtering conditions tested (WHERE clauses)?
- Are join results verified?
- Are edge cases tested (empty tables, null joins)?
CRITICAL: If instruction asks 5 queries and tests only verify 3 → tc ≤ 6."""

    def calibration_examples(self) -> str:
        return """DOMAIN CALIBRATION — Data Querying (1 task flagged by client):

REAL CLIENT SCORES (use these as your scoring anchor):
- sql-migration-audit-medium → qq=7, tq=5, tc=5 (avg=5.67, SERIOUS)
  "Insufficient test coverage — query results not verified with actual values"

KEY PATTERNS TO DETECT:
1. Tests verify "query succeeds" without checking results → tq ≤ 3
2. Tests check row count but not actual values → tq ≤ 5, tc ≤ 5
3. Tests check output format (valid CSV/JSON) without row content → tc ≤ 4
4. Missing edge cases (empty result sets, NULL joins, no-match filters) → tc -1
5. Sort order not verified when specified → tc -1
6. Aggregation values not asserted (SUM, AVG, COUNT unchecked) → tc -1

RESULT VERIFICATION HIERARCHY:
Level 1: Query doesn't error → tq ≤ 3
Level 2: Output file exists and is valid format → tc ≤ 4
Level 3: Row count matches → tc ≤ 5
Level 4: Key values in rows match expected → tc ≤ 7
Level 5: Full row-level verification with edge cases → tc 8+

SCORING GUIDE:
- tc=4: Only format/structure checked
- tc=5: Row count verified but not content
- tc=7+: Full value-level verification + edge cases"""
