# TB 2.0 — Client Feedback: All Flagged Task Reviews

**Total Tasks Reviewed:** 294
**Low Score / Flagged Tasks:** 50
**Filter Criteria:** Any dimension (question_quality / test_quality / test_cover) <= 5, or three-dimension average <= 6

---

## Summary

### By Severity

| Severity | Count |
|----------|:-----:|
| Critical | 13 |
| Serious | 27 |
| Moderate | 10 |
| **Total** | **50** |

### By Batch

| Batch | Low Score Count | Total Count | Low Score Ratio |
|-------|:---------------:|:-----------:|:---------------:|
| Tencent_TB2_Week01_91 | 22 | 91 | 24.18% |
| Tencent_TB2_Week2_123 | 22 | 123 | 17.89% |
| Tencent_TB2_Week3_80 | 6 | 80 | 7.50% |

### By Domain

| Domain | Flagged Count |
|--------|:------------:|
| games-development | 11 |
| frontend-development | 10 |
| scientific-computing | 5 |
| machine-learning | 3 |
| algorithm-design | 3 |
| mathematics | 2 |
| model-training | 2 |
| personal-assistant | 2 |
| security | 2 |
| data-science | 2 |
| Build-and-Deployment | 1 |
| data-analysis | 1 |
| ui-ux-optimization | 1 |
| software-engineering | 1 |
| data-querying | 1 |
| file-system | 1 |
| system-administration | 1 |
| data-preprocessing | 1 |

### Top Problem Patterns

| # | Pattern | Approx Count | Description |
|---|---------|:------------:|-------------|
| 1 | No rendering/browser tests | 20 | Frontend/UI tasks have zero browser-based rendering tests; 70% rely on pure text matching |
| 2 | Insufficient test scenarios / edge cases | 11 | Most game tasks use only 1 input dataset; hardcoded values can pass all tests |
| 3 | Contradictory instructions / data mismatch | 8 | Instruction.md contradicts the actual data provided |
| 4 | Format-only validation without value verification | 7 | Core computational logic is not tested; correct format alone passes all tests |
| 5 | Overly loose tolerances / meaningless tests | 4 | Thresholds are too lenient or test logic is meaningless |
| 6 | Bugs in test code itself | 3 | Python operator precedence errors, dead code, empty assertions, etc. |

---

## All 50 Flagged Tasks — Complete Client Reviews

---

### #1. mahjong-medium

| Field | Value |
|-------|-------|
| **Task Name** | 97c21df4-ede3-4983-aa5b-c121cc93909f-terminal-bench-mahjong-medium |
| **Batch** | Tencent_TB2_Week01_91 |
| **Domain** | games-development |
| **Difficulty** | medium |
| **Question Quality (qq)** | 4 |
| **Test Quality (tq)** | 3 |
| **Test Coverage (tc)** | 3 |
| **Average Score** | 3.33 |
| **Severity** | critical |

**Problem Tags:**
- Insufficient test scenarios / edge cases
- Poor question quality / contradictory description
- Low test quality
- Insufficient test coverage

**Problem Detail:**
Scenario 1 correct answer (DECLARE_MAHJONG) is completely unverified; instruction claims ALLOW_PUNG=false but actual value is true; tests contain dead code

---

### #2. model-score-instability-debug-medium

| Field | Value |
|-------|-------|
| **Task Name** | 30eb949b-c9bc-4563-92db-08ef17c21dea-terminal-bench-model-score-instability-debug-medium |
| **Batch** | Tencent_TB2_Week01_91 |
| **Domain** | machine-learning |
| **Difficulty** | medium |
| **Question Quality (qq)** | 6 |
| **Test Quality (tq)** | 2 |
| **Test Coverage (tc)** | 2 |
| **Average Score** | 3.33 |
| **Severity** | critical |

**Problem Tags:**
- Low test quality
- Insufficient test coverage

**Problem Detail:**
Tests only check output file format; running echo '{"score":0.5}' > result.json passes all tests

---

### #3. cicd-build-failure-diagnosis-medium

| Field | Value |
|-------|-------|
| **Task Name** | 52b7adae-f40c-4389-9f18-36f44e98840d-terminal-bench-cicd-build-failure-diagnosis-medium |
| **Batch** | Tencent_TB2_Week2_123 |
| **Domain** | Build-and-Deployment |
| **Difficulty** | medium |
| **Question Quality (qq)** | 4 |
| **Test Quality (tq)** | 3 |
| **Test Coverage (tc)** | 3 |
| **Average Score** | 3.33 |
| **Severity** | critical |

**Problem Tags:**
- Poor question quality / contradictory description
- Low test quality
- Insufficient test coverage

**Problem Detail:**
Both the question and tests are severely inadequate

---

### #4. chess-best-move-medium

| Field | Value |
|-------|-------|
| **Task Name** | 03ca7278-90d2-4beb-8ee7-4fcd205eade1-terminal-bench-chess-best-move-medium |
| **Batch** | Tencent_TB2_Week01_91 |
| **Domain** | games-development |
| **Difficulty** | easy |
| **Question Quality (qq)** | 4 |
| **Test Quality (tq)** | 5 |
| **Test Coverage (tc)** | 3 |
| **Average Score** | 4.0 |
| **Severity** | critical |

**Problem Tags:**
- Insufficient test scenarios / edge cases
- Poor question quality / contradictory description
- Low test quality
- Insufficient test coverage

**Problem Detail:**
Case 1 and Case 2 use the same FEN (Scholar's Mate); only tests one-move checkmate; no promotion, en passant, or deep search tests

---

### #5. typescript-props-generator-medium

| Field | Value |
|-------|-------|
| **Task Name** | 43993261-1281-4b57-a3eb-d3bf6267f2b2-terminal-bench-typescript-props-generator-medium |
| **Batch** | Tencent_TB2_Week01_91 |
| **Domain** | frontend-development |
| **Difficulty** | medium |
| **Question Quality (qq)** | 6 |
| **Test Quality (tq)** | 4 |
| **Test Coverage (tc)** | 3 |
| **Average Score** | 4.33 |
| **Severity** | critical |

**Problem Tags:**
- No rendering/browser tests
- Low test quality
- Insufficient test coverage

**Problem Detail:**
test_typescript_compiles is dead code (no tsc environment available); multiple tests have no assertions

---

### #6. board-siege-medium

| Field | Value |
|-------|-------|
| **Task Name** | 0c64091a-34ff-45b2-a117-2ff66a36b410-terminal-bench-board-siege-medium |
| **Batch** | Tencent_TB2_Week01_91 |
| **Domain** | games-development |
| **Difficulty** | medium |
| **Question Quality (qq)** | 4 |
| **Test Quality (tq)** | 6 |
| **Test Coverage (tc)** | 3 |
| **Average Score** | 4.33 |
| **Severity** | critical |

**Problem Tags:**
- Insufficient test scenarios / edge cases
- Poor question quality / contradictory description
- Insufficient test coverage

**Problem Detail:**
Single 12x12 board; hardcoding {"captures":[7]} passes all tests; rules don't clarify whether diagonal captures are included

---

### #7. warehouse-inventory-reconciliation-medium

| Field | Value |
|-------|-------|
| **Task Name** | 6f82a4b1-3c2e-4f9a-8d1b-9e4a7c5f2d8a-terminal-bench-warehouse-inventory-reconciliation-medium |
| **Batch** | Tencent_TB2_Week01_91 |
| **Domain** | data-analysis |
| **Difficulty** | medium |
| **Question Quality (qq)** | 6 |
| **Test Quality (tq)** | 4 |
| **Test Coverage (tc)** | 4 |
| **Average Score** | 4.67 |
| **Severity** | critical |

**Problem Tags:**
- Low test quality
- Insufficient test coverage

**Problem Detail:**
~10 out of 16 tests execute the exact same logic (comparing sorted(flagged_skus))

---

### #8. churn-model-debug-medium

| Field | Value |
|-------|-------|
| **Task Name** | abe97442-b384-4c8f-9869-9583c0000446-terminal-bench-churn-model-debug-medium |
| **Batch** | Tencent_TB2_Week3_80 |
| **Domain** | machine-learning |
| **Difficulty** | medium |
| **Question Quality (qq)** | 5 |
| **Test Quality (tq)** | 5 |
| **Test Coverage (tc)** | 4 |
| **Average Score** | 4.67 |
| **Severity** | critical |

**Problem Tags:**
- Poor question quality / contradictory description
- Low test quality
- Insufficient test coverage

**Problem Detail:**
Instruction contradicts data in multiple places: says to use features listed in experiment configuration but the config file has no feature list; says data contains train/valid/test split column but CSV has no such column

---

### #9. number-theory-explorer-medium

| Field | Value |
|-------|-------|
| **Task Name** | 0bcfaa5b-a94f-4c37-a682-5bbc83a324a0-terminal-bench-number-theory-explorer-medium |
| **Batch** | Tencent_TB2_Week3_80 |
| **Domain** | mathematics |
| **Difficulty** | medium |
| **Question Quality (qq)** | 7 |
| **Test Quality (tq)** | 4 |
| **Test Coverage (tc)** | 3 |
| **Average Score** | 4.67 |
| **Severity** | critical |

**Problem Tags:**
- Low test quality
- Insufficient test coverage

**Problem Detail:**
All 9 output files with number theory calculations only verify format and sorting, never verify any computed values

---

### #10. timeline-widget-medium

| Field | Value |
|-------|-------|
| **Task Name** | a7c3e1f4-8b2d-4e6a-9f0c-5d3b1a2e4c6f-terminal-bench-timeline-widget-medium |
| **Batch** | Tencent_TB2_Week01_91 |
| **Domain** | frontend-development |
| **Difficulty** | medium |
| **Question Quality (qq)** | 7 |
| **Test Quality (tq)** | 4 |
| **Test Coverage (tc)** | 4 |
| **Average Score** | 5.0 |
| **Severity** | critical |

**Problem Tags:**
- No rendering/browser tests
- Low test quality
- Insufficient test coverage

**Problem Detail:**
test_js_dark_theme only checks that 'dark' and 'class' appear somewhere in the JS code

---

### #11. dead-css-finder-medium

| Field | Value |
|-------|-------|
| **Task Name** | a0837436-239a-4efe-a93b-5a3a75c9491e-terminal-bench-dead-css-finder-medium |
| **Batch** | Tencent_TB2_Week01_91 |
| **Domain** | ui-ux-optimization |
| **Difficulty** | medium |
| **Question Quality (qq)** | 7 |
| **Test Quality (tq)** | 4 |
| **Test Coverage (tc)** | 4 |
| **Average Score** | 5.0 |
| **Severity** | critical |

**Problem Tags:**
- No rendering/browser tests
- Low test quality
- Insufficient test coverage

**Problem Detail:**
Multiple test functions end with 'pass' and have no assertions; empty output can pass all tests

---

### #12. kanban-board-hard

| Field | Value |
|-------|-------|
| **Task Name** | 93afb2f6-42d8-43e6-ba01-1ae32a0da2d0-terminal-bench-kanban-board-hard |
| **Batch** | Tencent_TB2_Week2_123 |
| **Domain** | frontend-development |
| **Difficulty** | hard |
| **Question Quality (qq)** | 6 |
| **Test Quality (tq)** | 4 |
| **Test Coverage (tc)** | 5 |
| **Average Score** | 5.0 |
| **Severity** | critical |

**Problem Tags:**
- No rendering/browser tests
- Low test quality
- Insufficient test coverage

**Problem Detail:**
Drag-and-drop, WIP limits, and filtering are completely unverified; test_wip_handling passes as long as code contains 'wip' or 'limit'

---

### #13. rummikub-medium

| Field | Value |
|-------|-------|
| **Task Name** | ff5016e5-a26d-4cb4-8d97-05acd0f66594-terminal-bench-rummikub-medium |
| **Batch** | Tencent_TB2_Week2_123 |
| **Domain** | games-development |
| **Difficulty** | medium |
| **Question Quality (qq)** | 5 |
| **Test Quality (tq)** | 6 |
| **Test Coverage (tc)** | 4 |
| **Average Score** | 5.0 |
| **Severity** | critical |

**Problem Tags:**
- Insufficient test scenarios / edge cases
- Poor question quality / contradictory description
- Insufficient test coverage

**Problem Detail:**
All scenarios have solutions (no DRAW); all optimal solutions are runs (no groups); empty hand and other edge cases are missing

---

### #14. dashboard-cards-medium

| Field | Value |
|-------|-------|
| **Task Name** | 2a959660-4369-404f-bd24-70742b83b7b8-terminal-bench-dashboard-cards-medium |
| **Batch** | Tencent_TB2_Week01_91 |
| **Domain** | frontend-development |
| **Difficulty** | hard |
| **Question Quality (qq)** | 6 |
| **Test Quality (tq)** | 4 |
| **Test Coverage (tc)** | 6 |
| **Average Score** | 5.33 |
| **Severity** | serious |

**Problem Tags:**
- No rendering/browser tests
- Low test quality

**Problem Detail:**
Python operator precedence bug causes incorrect test logic

---

### #15. responsive-nav-menu-medium

| Field | Value |
|-------|-------|
| **Task Name** | 2cfa9efc-e3c4-4003-89b8-92b727863d73-terminal-bench-responsive-nav-menu-medium |
| **Batch** | Tencent_TB2_Week01_91 |
| **Domain** | frontend-development |
| **Difficulty** | medium |
| **Question Quality (qq)** | 7 |
| **Test Quality (tq)** | 5 |
| **Test Coverage (tc)** | 4 |
| **Average Score** | 5.33 |
| **Severity** | serious |

**Problem Tags:**
- No rendering/browser tests
- Low test quality
- Insufficient test coverage

**Problem Detail:**
Responsive layout only checks for keywords; no actual breakpoint verification

---

### #16. form-wizard-medium

| Field | Value |
|-------|-------|
| **Task Name** | e22fd026-be4e-48ba-8942-1d1f5faa2ec5-terminal-bench-form-wizard-medium |
| **Batch** | Tencent_TB2_Week01_91 |
| **Domain** | frontend-development |
| **Difficulty** | medium |
| **Question Quality (qq)** | 7 |
| **Test Quality (tq)** | 4 |
| **Test Coverage (tc)** | 5 |
| **Average Score** | 5.33 |
| **Severity** | serious |

**Problem Tags:**
- No rendering/browser tests
- Low test quality
- Insufficient test coverage

**Problem Detail:**
All 189 tests are static text analysis; assert 'admin' in js is sufficient to pass

---

### #17. decision-tree-classifier-training-medium

| Field | Value |
|-------|-------|
| **Task Name** | 4a297212-c02a-4c04-aedd-46bdef9ee495-terminal-bench-decision-tree-classifier-training-medium |
| **Batch** | Tencent_TB2_Week01_91 |
| **Domain** | model-training |
| **Difficulty** | medium |
| **Question Quality (qq)** | 8 |
| **Test Quality (tq)** | 4 |
| **Test Coverage (tc)** | 4 |
| **Average Score** | 5.33 |
| **Severity** | serious |

**Problem Tags:**
- Low test quality
- Insufficient test coverage

**Problem Detail:**
Deterministic algorithm (fixed seed + data) but tests don't verify any specific computed values

---

### #18. time-travel-deterministic-debugger-medium

| Field | Value |
|-------|-------|
| **Task Name** | 1b536e19-524e-42db-b1ed-aa2119e455be-terminal-bench-time-travel-deterministic-debugger-medium |
| **Batch** | Tencent_TB2_Week2_123 |
| **Domain** | software-engineering |
| **Difficulty** | medium |
| **Question Quality (qq)** | 6 |
| **Test Quality (tq)** | 5 |
| **Test Coverage (tc)** | 5 |
| **Average Score** | 5.33 |
| **Severity** | serious |

**Problem Tags:**
- Low test quality
- Insufficient test coverage

**Problem Detail:**
Insufficient test coverage

---

### #19. data-table-medium

| Field | Value |
|-------|-------|
| **Task Name** | 032b39e1-b28d-4c3b-8aaf-22d3047acf50-terminal-bench-data-table-medium |
| **Batch** | Tencent_TB2_Week01_91 |
| **Domain** | frontend-development |
| **Difficulty** | medium |
| **Question Quality (qq)** | 7 |
| **Test Quality (tq)** | 5 |
| **Test Coverage (tc)** | 5 |
| **Average Score** | 5.67 |
| **Severity** | serious |

**Problem Tags:**
- No rendering/browser tests
- Low test quality
- Insufficient test coverage

**Problem Detail:**
test_search_filters_all_columns only checks that JS contains 'filter' and 'search'

---

### #20. binary-classification-evaluation-medium

| Field | Value |
|-------|-------|
| **Task Name** | 378315ae-84f4-44c6-aecc-18127aecaccb-terminal-bench-binary-classification-evaluation-medium |
| **Batch** | Tencent_TB2_Week01_91 |
| **Domain** | machine-learning |
| **Difficulty** | hard |
| **Question Quality (qq)** | 4 |
| **Test Quality (tq)** | 7 |
| **Test Coverage (tc)** | 6 |
| **Average Score** | 5.67 |
| **Severity** | serious |

**Problem Tags:**
- Poor question quality / contradictory description

**Problem Detail:**
CSV column names described in instruction.md do not match the actual data at all

---

### #21. thermal-diffusivity-fit-medium

| Field | Value |
|-------|-------|
| **Task Name** | 74514900-792f-4470-b6b4-6926157e5898-terminal-bench-thermal-diffusivity-fit-medium |
| **Batch** | Tencent_TB2_Week01_91 |
| **Domain** | scientific-computing |
| **Difficulty** | medium |
| **Question Quality (qq)** | 7 |
| **Test Quality (tq)** | 5 |
| **Test Coverage (tc)** | 5 |
| **Average Score** | 5.67 |
| **Severity** | serious |

**Problem Tags:**
- Low test quality
- Insufficient test coverage

**Problem Detail:**
No absolute RMSE threshold; test_result_is_deterministic_on_disk reads the same file twice (meaningless test)

---

### #22. heat-diffusion-simulation-hard

| Field | Value |
|-------|-------|
| **Task Name** | d75a3226-42ce-4a4e-87f7-91ac37a212b4-terminal-bench-heat-diffusion-simulation-hard |
| **Batch** | Tencent_TB2_Week01_91 |
| **Domain** | scientific-computing |
| **Difficulty** | hard |
| **Question Quality (qq)** | 7 |
| **Test Quality (tq)** | 5 |
| **Test Coverage (tc)** | 5 |
| **Average Score** | 5.67 |
| **Severity** | serious |

**Problem Tags:**
- Low test quality
- Insufficient test coverage

**Problem Detail:**
Out of 49 sensors, only 3 are verified (6% coverage); energy tolerance of ±1000 is too loose

---

### #23. calendar-conflict-detection-medium

| Field | Value |
|-------|-------|
| **Task Name** | c7e2a9f4-8d3b-4a1c-b5e6-2f9d8c4a7e3b-terminal-bench-calendar-conflict-detection-medium |
| **Batch** | Tencent_TB2_Week2_123 |
| **Domain** | data-querying |
| **Difficulty** | medium |
| **Question Quality (qq)** | 7 |
| **Test Quality (tq)** | 5 |
| **Test Coverage (tc)** | 5 |
| **Average Score** | 5.67 |
| **Severity** | serious |

**Problem Tags:**
- Low test quality
- Insufficient test coverage

**Problem Detail:**
Insufficient test coverage

---

### #24. phantom-backup-coverage-audit-medium

| Field | Value |
|-------|-------|
| **Task Name** | 2b94c9b9-24bf-4bf1-a0a9-d6d1f7e768cb-terminal-bench-phantom-backup-coverage-audit-medium |
| **Batch** | Tencent_TB2_Week2_123 |
| **Domain** | file-system |
| **Difficulty** | medium |
| **Question Quality (qq)** | 7 |
| **Test Quality (tq)** | 6 |
| **Test Coverage (tc)** | 4 |
| **Average Score** | 5.67 |
| **Severity** | serious |

**Problem Tags:**
- Insufficient test coverage

**Problem Detail:**
Insufficient test coverage

---

### #25. cascade-dominion-hard

| Field | Value |
|-------|-------|
| **Task Name** | 48b1a938-4129-481d-bbb3-bbeec2639a1a-terminal-bench-cascade-dominion-hard |
| **Batch** | Tencent_TB2_Week2_123 |
| **Domain** | games-development |
| **Difficulty** | hard |
| **Question Quality (qq)** | 5 |
| **Test Quality (tq)** | 7 |
| **Test Coverage (tc)** | 5 |
| **Average Score** | 5.67 |
| **Severity** | serious |

**Problem Tags:**
- Insufficient test scenarios / edge cases
- Poor question quality / contradictory description
- Insufficient test coverage

**Problem Detail:**
Only 1 board (15x15); no small boards, no cascade chains, no all-same-type pieces, and other edge cases missing

---

### #26. rpg-battle-engine-medium

| Field | Value |
|-------|-------|
| **Task Name** | 8a3f2c1b-5e4d-4b9a-8c7e-1d2f3a4b5c6d-terminal-bench-rpg-battle-engine-medium |
| **Batch** | Tencent_TB2_Week2_123 |
| **Domain** | games-development |
| **Difficulty** | medium |
| **Question Quality (qq)** | 7 |
| **Test Quality (tq)** | 5 |
| **Test Coverage (tc)** | 5 |
| **Average Score** | 5.67 |
| **Severity** | serious |

**Problem Tags:**
- Insufficient test scenarios / edge cases
- Low test quality
- Insufficient test coverage

**Problem Detail:**
Tests have inter-test state dependencies; damage formula and healing mechanics are not verified

---

### #27. email-triage-planner-medium

| Field | Value |
|-------|-------|
| **Task Name** | 069e64b7-0921-4958-ba3b-7d0ee2650dac-terminal-bench-email-triage-planner-medium |
| **Batch** | Tencent_TB2_Week2_123 |
| **Domain** | personal-assistant |
| **Difficulty** | medium |
| **Question Quality (qq)** | 7 |
| **Test Quality (tq)** | 5 |
| **Test Coverage (tc)** | 5 |
| **Average Score** | 5.67 |
| **Severity** | serious |

**Problem Tags:**
- Low test quality
- Insufficient test coverage

**Problem Detail:**
Insufficient test coverage

---

### #28. protein-structure-pipeline-debugging-medium

| Field | Value |
|-------|-------|
| **Task Name** | 63f7aedb-f3a5-492c-a5cb-f533da6a0436-terminal-bench-protein-structure-pipeline-debugging-medium |
| **Batch** | Tencent_TB2_Week2_123 |
| **Domain** | scientific-computing |
| **Difficulty** | easy |
| **Question Quality (qq)** | 6 |
| **Test Quality (tq)** | 5 |
| **Test Coverage (tc)** | 6 |
| **Average Score** | 5.67 |
| **Severity** | serious |

**Problem Tags:**
- Low test quality

**Problem Detail:**
Insufficient test coverage

---

### #29. user-account-audit-medium

| Field | Value |
|-------|-------|
| **Task Name** | ed878636-2328-45a9-885b-0fe63bbbcb6a-terminal-bench-user-account-audit-medium |
| **Batch** | Tencent_TB2_Week2_123 |
| **Domain** | system-administration |
| **Difficulty** | medium |
| **Question Quality (qq)** | 7 |
| **Test Quality (tq)** | 5 |
| **Test Coverage (tc)** | 5 |
| **Average Score** | 5.67 |
| **Severity** | serious |

**Problem Tags:**
- Low test quality
- Insufficient test coverage

**Problem Detail:**
Insufficient test coverage

---

### #30. pca-analysis-medium

| Field | Value |
|-------|-------|
| **Task Name** | 4d0b3859-bc04-479e-9f85-9c0ea1a0d4dc-terminal-bench-pca-analysis-medium |
| **Batch** | Tencent_TB2_Week3_80 |
| **Domain** | model-training |
| **Difficulty** | medium |
| **Question Quality (qq)** | 7 |
| **Test Quality (tq)** | 5 |
| **Test Coverage (tc)** | 5 |
| **Average Score** | 5.67 |
| **Severity** | serious |

**Problem Tags:**
- Low test quality
- Insufficient test coverage

**Problem Detail:**
30 tests verify structure and basic mathematical properties but don't verify any specific values; reconstruction error threshold of <20 is too lenient

---

### #31. appointment-scheduler-medium

| Field | Value |
|-------|-------|
| **Task Name** | d08234e1-54a3-4bdd-b431-f61715f7b8ed-terminal-bench-appointment-scheduler-medium |
| **Batch** | Tencent_TB2_Week01_91 |
| **Domain** | frontend-development |
| **Difficulty** | medium |
| **Question Quality (qq)** | 7 |
| **Test Quality (tq)** | 5 |
| **Test Coverage (tc)** | 6 |
| **Average Score** | 6.0 |
| **Severity** | serious |

**Problem Tags:**
- No rendering/browser tests
- Low test quality

**Problem Detail:**
No interactive behavior tests; no time conflict detection verification

---

### #32. wordle-feedback-generator-medium

| Field | Value |
|-------|-------|
| **Task Name** | 6a08d38d-e37b-45cd-ae30-cb6118d6ca98-terminal-bench-wordle-feedback-generator-medium |
| **Batch** | Tencent_TB2_Week01_91 |
| **Domain** | games-development |
| **Difficulty** | easy |
| **Question Quality (qq)** | 7 |
| **Test Quality (tq)** | 7 |
| **Test Coverage (tc)** | 4 |
| **Average Score** | 6.0 |
| **Severity** | serious |

**Problem Tags:**
- Insufficient test scenarios / edge cases
- Insufficient test coverage

**Problem Detail:**
All 5 secret words have no repeated letters; missing all-GREEN, all-GRAY, and repeated-letter edge cases

---

### #33. expense-report-generator-medium

| Field | Value |
|-------|-------|
| **Task Name** | 02275911-547a-4513-b4a7-448f58c1b8b2-terminal-bench-expense-report-generator-medium |
| **Batch** | Tencent_TB2_Week01_91 |
| **Domain** | personal-assistant |
| **Difficulty** | medium |
| **Question Quality (qq)** | 7 |
| **Test Quality (tq)** | 6 |
| **Test Coverage (tc)** | 5 |
| **Average Score** | 6.0 |
| **Severity** | serious |

**Problem Tags:**
- Insufficient test coverage

**Problem Detail:**
Expense rule edge cases (e.g., over-limit approvals, cross-category aggregation) are not covered

---

### #34. computational-reproducibility-investigation-medium

| Field | Value |
|-------|-------|
| **Task Name** | e1a957bd-ceeb-40ef-bec7-3e7a7959cd11-terminal-bench-computational-reproducibility-investigation-medium |
| **Batch** | Tencent_TB2_Week01_91 |
| **Domain** | scientific-computing |
| **Difficulty** | medium |
| **Question Quality (qq)** | 6 |
| **Test Quality (tq)** | 6 |
| **Test Coverage (tc)** | 6 |
| **Average Score** | 6.0 |
| **Severity** | serious |

**Problem Tags:**
- Overall score borderline low

**Problem Detail:**
Tolerances are too lenient; insufficient coverage

---

### #35. maritime-ais-signal-forensics-medium

| Field | Value |
|-------|-------|
| **Task Name** | 3a59c03b-3093-4f61-8b93-70386bedfab5-terminal-bench-maritime-ais-signal-forensics-medium |
| **Batch** | Tencent_TB2_Week01_91 |
| **Domain** | security |
| **Difficulty** | medium |
| **Question Quality (qq)** | 8 |
| **Test Quality (tq)** | 5 |
| **Test Coverage (tc)** | 5 |
| **Average Score** | 6.0 |
| **Severity** | serious |

**Problem Tags:**
- Low test quality
- Insufficient test coverage

**Problem Detail:**
test_transformation_key_present accepts any hexadecimal value instead of verifying the correct XOR key

---

### #36. intrusion-scanner-hard

| Field | Value |
|-------|-------|
| **Task Name** | b8f3c9d2-7a41-4e5b-9c8d-3f2e1a6b4d5c-terminal-bench-intrusion-scanner-hard |
| **Batch** | Tencent_TB2_Week2_123 |
| **Domain** | algorithm-design |
| **Difficulty** | hard |
| **Question Quality (qq)** | 5 |
| **Test Quality (tq)** | 7 |
| **Test Coverage (tc)** | 6 |
| **Average Score** | 6.0 |
| **Severity** | serious |

**Problem Tags:**
- Poor question quality / contradictory description

**Problem Detail:**
Question description is weak/insufficient

---

### #37. regional-fleet-telemetry-mileage-calculation-hard

| Field | Value |
|-------|-------|
| **Task Name** | 25a047bd-044d-4e4f-8ae1-2e72f2e7f02f-terminal-bench-regional-fleet-telemetry-mileage-calculation-hard |
| **Batch** | Tencent_TB2_Week2_123 |
| **Domain** | data-science |
| **Difficulty** | medium |
| **Question Quality (qq)** | 6 |
| **Test Quality (tq)** | 7 |
| **Test Coverage (tc)** | 5 |
| **Average Score** | 6.0 |
| **Severity** | serious |

**Problem Tags:**
- Insufficient test coverage

**Problem Detail:**
Insufficient test coverage

---

### #38. vanilla-to-react-typescript-medium

| Field | Value |
|-------|-------|
| **Task Name** | 7ac8278c-01d6-4c0d-9e8a-63ecde9449f3-terminal-bench-vanilla-to-react-typescript-medium |
| **Batch** | Tencent_TB2_Week2_123 |
| **Domain** | frontend-development |
| **Difficulty** | medium |
| **Question Quality (qq)** | 7 |
| **Test Quality (tq)** | 6 |
| **Test Coverage (tc)** | 5 |
| **Average Score** | 6.0 |
| **Severity** | serious |

**Problem Tags:**
- No rendering/browser tests
- Insufficient test coverage

**Problem Detail:**
No rendering/browser tests

---

### #39. monte-carlo-integration-medium

| Field | Value |
|-------|-------|
| **Task Name** | 32222665-8e6e-4b42-b87c-3ed1992439ee-terminal-bench-monte-carlo-integration-medium |
| **Batch** | Tencent_TB2_Week2_123 |
| **Domain** | scientific-computing |
| **Difficulty** | medium |
| **Question Quality (qq)** | 6 |
| **Test Quality (tq)** | 6 |
| **Test Coverage (tc)** | 6 |
| **Average Score** | 6.0 |
| **Severity** | serious |

**Problem Tags:**
- Overall score borderline low

**Problem Detail:**
Insufficient test coverage

---

### #40. self-referential-adversarial-system-reconstruction-medium

| Field | Value |
|-------|-------|
| **Task Name** | 3b60b71b-9fb6-4aed-bfb1-24e39a3223f2-terminal-bench-self-referential-adversarial-system-reconstruction-medium |
| **Batch** | Tencent_TB2_Week3_80 |
| **Domain** | algorithm-design |
| **Difficulty** | medium |
| **Question Quality (qq)** | 4 |
| **Test Quality (tq)** | 7 |
| **Test Coverage (tc)** | 7 |
| **Average Score** | 6.0 |
| **Severity** | serious |

**Problem Tags:**
- Poor question quality / contradictory description

**Problem Detail:**
Instruction asks to reconstruct state space and operators from traces, but spec.json already provides complete operator definitions; entropy mechanism doesn't match the actual spec definition

---

### #41. othello-style-grid-capture-medium

| Field | Value |
|-------|-------|
| **Task Name** | d852d0a3-2a8e-49e9-8486-5075fcf96139-terminal-bench-othello-style-grid-capture-medium |
| **Batch** | Tencent_TB2_Week01_91 |
| **Domain** | games-development |
| **Difficulty** | medium |
| **Question Quality (qq)** | 7 |
| **Test Quality (tq)** | 7 |
| **Test Coverage (tc)** | 5 |
| **Average Score** | 6.33 |
| **Severity** | moderate |

**Problem Tags:**
- Insufficient test scenarios / edge cases
- Insufficient test coverage

**Problem Detail:**
Missing zero-capture, single-row, long-chain, and all-same-color edge cases

---

### #42. adversarial-temporal-hypergraph-medium

| Field | Value |
|-------|-------|
| **Task Name** | a9e7f629-dc0a-4ac8-bb64-294a93ef42d1-terminal-bench-adversarial-temporal-hypergraph-medium |
| **Batch** | Tencent_TB2_Week2_123 |
| **Domain** | algorithm-design |
| **Difficulty** | medium |
| **Question Quality (qq)** | 7 |
| **Test Quality (tq)** | 7 |
| **Test Coverage (tc)** | 5 |
| **Average Score** | 6.33 |
| **Severity** | moderate |

**Problem Tags:**
- Insufficient test coverage

**Problem Detail:**
Insufficient test coverage

---

### #43. data-visualization-dashboard-hard

| Field | Value |
|-------|-------|
| **Task Name** | 2ac62265-c751-4b74-a041-b52e29fd1610-terminal-bench-data-visualization-dashboard-hard |
| **Batch** | Tencent_TB2_Week2_123 |
| **Domain** | frontend-development |
| **Difficulty** | hard |
| **Question Quality (qq)** | 7 |
| **Test Quality (tq)** | 5 |
| **Test Coverage (tc)** | 7 |
| **Average Score** | 6.33 |
| **Severity** | moderate |

**Problem Tags:**
- No rendering/browser tests
- Low test quality

**Problem Detail:**
No rendering/browser tests; DOM parsing is present but interactive behavior is not verified

---

### #44. turn-grid-war-medium

| Field | Value |
|-------|-------|
| **Task Name** | 133195de-e208-4655-ad5d-eb5d44ff9624-terminal-bench-turn-grid-war-medium |
| **Batch** | Tencent_TB2_Week2_123 |
| **Domain** | games-development |
| **Difficulty** | medium |
| **Question Quality (qq)** | 7 |
| **Test Quality (tq)** | 7 |
| **Test Coverage (tc)** | 5 |
| **Average Score** | 6.33 |
| **Severity** | moderate |

**Problem Tags:**
- Insufficient test scenarios / edge cases
- Insufficient test coverage

**Problem Detail:**
Missing out-of-bounds movement, combo chain trigger cap, weakened status stacking, and other edge cases

---

### #45. dockside-arbitrage-medium

| Field | Value |
|-------|-------|
| **Task Name** | 21fafbb2-5225-46d6-a13c-519159088909-terminal-bench-dockside-arbitrage-medium |
| **Batch** | Tencent_TB2_Week2_123 |
| **Domain** | games-development |
| **Difficulty** | medium |
| **Question Quality (qq)** | 7 |
| **Test Quality (tq)** | 7 |
| **Test Coverage (tc)** | 5 |
| **Average Score** | 6.33 |
| **Severity** | moderate |

**Problem Tags:**
- Insufficient test scenarios / edge cases
- Insufficient test coverage

**Problem Detail:**
Only 1 dataset; missing dense-arrival tie, idle dock, all-rejected, and other scenarios

---

### #46. carcassonne-game-hard

| Field | Value |
|-------|-------|
| **Task Name** | 62fd4a7b-de7d-4970-ad25-d677e2b7ff30-terminal-bench-carcassonne-game-hard |
| **Batch** | Tencent_TB2_Week2_123 |
| **Domain** | games-development |
| **Difficulty** | hard |
| **Question Quality (qq)** | 7 |
| **Test Quality (tq)** | 7 |
| **Test Coverage (tc)** | 5 |
| **Average Score** | 6.33 |
| **Severity** | moderate |

**Problem Tags:**
- Insufficient test scenarios / edge cases
- Insufficient test coverage

**Problem Detail:**
Only 1 board state; penalty threshold boundaries, all meeples used up, and other scenarios are not tested

---

### #47. matrix-operations-linear-algebra-medium

| Field | Value |
|-------|-------|
| **Task Name** | 5ce102f4-16b6-48c8-885a-85cc62cbc060-terminal-bench-matrix-operations-linear-algebra-medium |
| **Batch** | Tencent_TB2_Week2_123 |
| **Domain** | mathematics |
| **Difficulty** | medium |
| **Question Quality (qq)** | 7 |
| **Test Quality (tq)** | 7 |
| **Test Coverage (tc)** | 5 |
| **Average Score** | 6.33 |
| **Severity** | moderate |

**Problem Tags:**
- Insufficient test coverage

**Problem Detail:**
Insufficient test coverage

---

### #48. federated-learning-dp-gradient-clipping-aggregation-hard

| Field | Value |
|-------|-------|
| **Task Name** | e9c8cd3b-2947-4ef0-bd6f-1334526091e4-terminal-bench-federated-learning-dp-gradient-clipping-aggregation-hard |
| **Batch** | Tencent_TB2_Week3_80 |
| **Domain** | data-science |
| **Difficulty** | hard |
| **Question Quality (qq)** | 5 |
| **Test Quality (tq)** | 7 |
| **Test Coverage (tc)** | 7 |
| **Average Score** | 6.33 |
| **Severity** | moderate |

**Problem Tags:**
- Poor question quality / contradictory description

**Problem Detail:**
Key validation rules are implicit; critical requirements are scattered across three files

---

### #49. firewall-rule-audit-medium

| Field | Value |
|-------|-------|
| **Task Name** | 43ce7f17-557e-4ec7-9e6f-0dd752a9db1e-terminal-bench-firewall-rule-audit-medium |
| **Batch** | Tencent_TB2_Week3_80 |
| **Domain** | security |
| **Difficulty** | medium |
| **Question Quality (qq)** | 8 |
| **Test Quality (tq)** | 5 |
| **Test Coverage (tc)** | 6 |
| **Average Score** | 6.33 |
| **Severity** | moderate |

**Problem Tags:**
- Low test quality

**Problem Detail:**
Core algorithm (classifying rules as shadow/conflict/redundant) is completely untested; labeling all rules as 'none' passes as long as the format is correct

---

### #50. ecommerce-transaction-reconciliation-hard

| Field | Value |
|-------|-------|
| **Task Name** | 62e85496-e65c-41ae-92f8-7f8071cc53de-terminal-bench-ecommerce-transaction-reconciliation-hard |
| **Batch** | Tencent_TB2_Week2_123 |
| **Domain** | data-preprocessing |
| **Difficulty** | hard |
| **Question Quality (qq)** | 5 |
| **Test Quality (tq)** | 8 |
| **Test Coverage (tc)** | 9 |
| **Average Score** | 7.33 |
| **Severity** | moderate |

**Problem Tags:**
- Poor question quality / contradictory description

**Problem Detail:**
Question description is weak/insufficient

---

## Quick Reference Table

| # | Short Name | Domain | qq | tq | tc | Avg | Severity | Problem Detail |
|---|-----------|--------|:--:|:--:|:--:|:---:|----------|----------------|
| 1 | mahjong-medium | games-development | 4 | 3 | 3 | 3.33 | critical | Scenario 1 correct answer (DECLARE_MAHJONG) is completely unverified; instruction claims ALLOW_PUNG=false but actual value is true; tests contain dead code |
| 2 | model-score-instability-debug-medium | machine-learning | 6 | 2 | 2 | 3.33 | critical | Tests only check output file format; running echo '{"score":0.5}' > result.json passes all tests |
| 3 | cicd-build-failure-diagnosis-medium | Build-and-Deployment | 4 | 3 | 3 | 3.33 | critical | Both the question and tests are severely inadequate |
| 4 | chess-best-move-medium | games-development | 4 | 5 | 3 | 4.0 | critical | Case 1 and Case 2 use the same FEN (Scholar's Mate); only tests one-move checkmate; no promotion, en passant, or deep search tests |
| 5 | typescript-props-generator-medium | frontend-development | 6 | 4 | 3 | 4.33 | critical | test_typescript_compiles is dead code (no tsc environment available); multiple tests have no assertions |
| 6 | board-siege-medium | games-development | 4 | 6 | 3 | 4.33 | critical | Single 12x12 board; hardcoding {"captures":[7]} passes all tests; rules don't clarify whether diagonal captures are included |
| 7 | warehouse-inventory-reconciliation-medium | data-analysis | 6 | 4 | 4 | 4.67 | critical | ~10 out of 16 tests execute the exact same logic (comparing sorted(flagged_skus)) |
| 8 | churn-model-debug-medium | machine-learning | 5 | 5 | 4 | 4.67 | critical | Instruction contradicts data in multiple places: says to use features listed in experiment configuration but the config file has no feature list; says data contains train/valid/test split column but CSV has no such column |
| 9 | number-theory-explorer-medium | mathematics | 7 | 4 | 3 | 4.67 | critical | All 9 output files with number theory calculations only verify format and sorting, never verify any computed values |
| 10 | timeline-widget-medium | frontend-development | 7 | 4 | 4 | 5.0 | critical | test_js_dark_theme only checks that 'dark' and 'class' appear somewhere in the JS code |
| 11 | dead-css-finder-medium | ui-ux-optimization | 7 | 4 | 4 | 5.0 | critical | Multiple test functions end with 'pass' and have no assertions; empty output can pass all tests |
| 12 | kanban-board-hard | frontend-development | 6 | 4 | 5 | 5.0 | critical | Drag-and-drop, WIP limits, and filtering are completely unverified; test_wip_handling passes as long as code contains 'wip' or 'limit' |
| 13 | rummikub-medium | games-development | 5 | 6 | 4 | 5.0 | critical | All scenarios have solutions (no DRAW); all optimal solutions are runs (no groups); empty hand and other edge cases are missing |
| 14 | dashboard-cards-medium | frontend-development | 6 | 4 | 6 | 5.33 | serious | Python operator precedence bug causes incorrect test logic |
| 15 | responsive-nav-menu-medium | frontend-development | 7 | 5 | 4 | 5.33 | serious | Responsive layout only checks for keywords; no actual breakpoint verification |
| 16 | form-wizard-medium | frontend-development | 7 | 4 | 5 | 5.33 | serious | All 189 tests are static text analysis; assert 'admin' in js is sufficient to pass |
| 17 | decision-tree-classifier-training-medium | model-training | 8 | 4 | 4 | 5.33 | serious | Deterministic algorithm (fixed seed + data) but tests don't verify any specific computed values |
| 18 | time-travel-deterministic-debugger-medium | software-engineering | 6 | 5 | 5 | 5.33 | serious | Insufficient test coverage |
| 19 | data-table-medium | frontend-development | 7 | 5 | 5 | 5.67 | serious | test_search_filters_all_columns only checks that JS contains 'filter' and 'search' |
| 20 | binary-classification-evaluation-medium | machine-learning | 4 | 7 | 6 | 5.67 | serious | CSV column names described in instruction.md do not match the actual data at all |
| 21 | thermal-diffusivity-fit-medium | scientific-computing | 7 | 5 | 5 | 5.67 | serious | No absolute RMSE threshold; test_result_is_deterministic_on_disk reads the same file twice (meaningless test) |
| 22 | heat-diffusion-simulation-hard | scientific-computing | 7 | 5 | 5 | 5.67 | serious | Out of 49 sensors, only 3 are verified (6% coverage); energy tolerance of ±1000 is too loose |
| 23 | calendar-conflict-detection-medium | data-querying | 7 | 5 | 5 | 5.67 | serious | Insufficient test coverage |
| 24 | phantom-backup-coverage-audit-medium | file-system | 7 | 6 | 4 | 5.67 | serious | Insufficient test coverage |
| 25 | cascade-dominion-hard | games-development | 5 | 7 | 5 | 5.67 | serious | Only 1 board (15x15); no small boards, no cascade chains, no all-same-type pieces, and other edge cases missing |
| 26 | rpg-battle-engine-medium | games-development | 7 | 5 | 5 | 5.67 | serious | Tests have inter-test state dependencies; damage formula and healing mechanics are not verified |
| 27 | email-triage-planner-medium | personal-assistant | 7 | 5 | 5 | 5.67 | serious | Insufficient test coverage |
| 28 | protein-structure-pipeline-debugging-medium | scientific-computing | 6 | 5 | 6 | 5.67 | serious | Insufficient test coverage |
| 29 | user-account-audit-medium | system-administration | 7 | 5 | 5 | 5.67 | serious | Insufficient test coverage |
| 30 | pca-analysis-medium | model-training | 7 | 5 | 5 | 5.67 | serious | 30 tests verify structure and basic mathematical properties but don't verify any specific values; reconstruction error threshold of <20 is too lenient |
| 31 | appointment-scheduler-medium | frontend-development | 7 | 5 | 6 | 6.0 | serious | No interactive behavior tests; no time conflict detection verification |
| 32 | wordle-feedback-generator-medium | games-development | 7 | 7 | 4 | 6.0 | serious | All 5 secret words have no repeated letters; missing all-GREEN, all-GRAY, and repeated-letter edge cases |
| 33 | expense-report-generator-medium | personal-assistant | 7 | 6 | 5 | 6.0 | serious | Expense rule edge cases (e.g., over-limit approvals, cross-category aggregation) are not covered |
| 34 | computational-reproducibility-investigation-medium | scientific-computing | 6 | 6 | 6 | 6.0 | serious | Tolerances are too lenient; insufficient coverage |
| 35 | maritime-ais-signal-forensics-medium | security | 8 | 5 | 5 | 6.0 | serious | test_transformation_key_present accepts any hexadecimal value instead of verifying the correct XOR key |
| 36 | intrusion-scanner-hard | algorithm-design | 5 | 7 | 6 | 6.0 | serious | Question description is weak/insufficient |
| 37 | regional-fleet-telemetry-mileage-calculation-hard | data-science | 6 | 7 | 5 | 6.0 | serious | Insufficient test coverage |
| 38 | vanilla-to-react-typescript-medium | frontend-development | 7 | 6 | 5 | 6.0 | serious | No rendering/browser tests |
| 39 | monte-carlo-integration-medium | scientific-computing | 6 | 6 | 6 | 6.0 | serious | Insufficient test coverage |
| 40 | self-referential-adversarial-system-reconstruction-medium | algorithm-design | 4 | 7 | 7 | 6.0 | serious | Instruction asks to reconstruct state space and operators from traces, but spec.json already provides complete operator definitions; entropy mechanism doesn't match the actual spec definition |
| 41 | othello-style-grid-capture-medium | games-development | 7 | 7 | 5 | 6.33 | moderate | Missing zero-capture, single-row, long-chain, and all-same-color edge cases |
| 42 | adversarial-temporal-hypergraph-medium | algorithm-design | 7 | 7 | 5 | 6.33 | moderate | Insufficient test coverage |
| 43 | data-visualization-dashboard-hard | frontend-development | 7 | 5 | 7 | 6.33 | moderate | No rendering/browser tests; DOM parsing is present but interactive behavior is not verified |
| 44 | turn-grid-war-medium | games-development | 7 | 7 | 5 | 6.33 | moderate | Missing out-of-bounds movement, combo chain trigger cap, weakened status stacking, and other edge cases |
| 45 | dockside-arbitrage-medium | games-development | 7 | 7 | 5 | 6.33 | moderate | Only 1 dataset; missing dense-arrival tie, idle dock, all-rejected, and other scenarios |
| 46 | carcassonne-game-hard | games-development | 7 | 7 | 5 | 6.33 | moderate | Only 1 board state; penalty threshold boundaries, all meeples used up, and other scenarios are not tested |
| 47 | matrix-operations-linear-algebra-medium | mathematics | 7 | 7 | 5 | 6.33 | moderate | Insufficient test coverage |
| 48 | federated-learning-dp-gradient-clipping-aggregation-hard | data-science | 5 | 7 | 7 | 6.33 | moderate | Key validation rules are implicit; critical requirements are scattered across three files |
| 49 | firewall-rule-audit-medium | security | 8 | 5 | 6 | 6.33 | moderate | Core algorithm (classifying rules as shadow/conflict/redundant) is completely untested; labeling all rules as 'none' passes as long as the format is correct |
| 50 | ecommerce-transaction-reconciliation-hard | data-preprocessing | 5 | 8 | 9 | 7.33 | moderate | Question description is weak/insufficient |
