/**
 * TB 2.0 — Rework Tracker (50 Flagged Tasks)
 *
 * HOW TO USE:
 * 1. Open Google Sheets → Extensions → Apps Script
 * 2. Paste this entire script
 * 3. Save → Run "setupReworkTracker"
 * 4. Grant permissions when prompted
 *
 * SHEETS CREATED:
 *   - "Rework Tracker"    → Main tracking sheet with all 50 tasks
 *   - "Dashboard"         → Summary stats (auto-calculated)
 */

function setupReworkTracker() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    ss = SpreadsheetApp.create("TB 2.0 — Rework Batch Tracker");
    SpreadsheetApp.setActiveSpreadsheet(ss);
  }

  setupTrackerSheet_(ss);
  setupDashboard_(ss);

  SpreadsheetApp.getUi().alert(
    "Rework Tracker Ready!\n\n" +
    "50 flagged tasks loaded with Drive links, client feedback, and rework tracking columns.\n\n" +
    "Sheets created:\n" +
    "• Rework Tracker — main tracking sheet\n" +
    "• Dashboard — summary statistics"
  );
}


function setupTrackerSheet_(ss) {
  var sheetName = "Rework Tracker";
  var existing = ss.getSheetByName(sheetName);
  if (existing) ss.deleteSheet(existing);

  var sheet = ss.insertSheet(sheetName, 0);

  // ── Headers ──
  var headers = [
    "#",                        // A
    "Task Name",                // B
    "UUID",                     // C
    "Domain",                   // D
    "Difficulty",               // E
    "qq",                       // F
    "tq",                       // G
    "tc",                       // H
    "Avg",                      // I
    "Severity",                 // J
    "Client Feedback",          // K
    "Original Trainer",         // L
    "Pod Lead (Reviewer)",      // M
    "Original Batch",           // N
    "Drive Link",               // O
    "Labeling Tool Link",       // P
    "Rework Assigned To",       // Q  ← Trainer writes their name
    "Rework Status",            // R  ← Dropdown: 4 options
    "Rework Reason / Notes",    // S  ← Free text
    "Rework Drive Link",        // T  ← New ZIP upload link
    "LLM Review Doc Link",      // U  ← Per-task review .md
    "Reviewer Name",            // V  ← Who reviews the rework
    "Reviewer Status",          // W  ← Dropdown: review status
    "Reviewer Notes",           // X  ← Reviewer feedback
    "Date Assigned",            // Y
    "Date Completed",           // Z
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // ── Task Data (50 tasks) ──
  // Format: [short_name, uuid, domain, difficulty, qq, tq, tc, avg, severity, problem_detail, trainer, reviewer, drive_link, labeling_link, batch]
  var tasks = [
    ["mahjong-medium", "97c21df4-ede3-4983-aa5b-c121cc93909f", "games-development", "medium", 4, 3, 3, 3.33, "critical", "Scenario 1 correct answer (DECLARE_MAHJONG) is completely unverified; instruction claims ALLOW_PUNG=false but actual value is true; tests contain dead code", "Riya Verma", "Hasnain Mubashir", "https://drive.google.com/file/d/1t4ikM-r7RqW4SBa5htUBNs6LTfBSNs19/view?usp=drive_link", "https://labeling-te.turing.com/conversations/32944/view", "Tencent_TB2_Week01_91"],
    ["model-score-instability-debug-medium", "30eb949b-c9bc-4563-92db-08ef17c21dea", "machine-learning", "medium", 6, 2, 2, 3.33, "critical", "Tests only check output file format; running echo '{\"score\":0.5}' > result.json passes all tests", "Amit Jadhav", "Estifanos Gashawtena", "https://drive.google.com/file/d/132gS6icegAIoevdmDRVYrdUsRPgPPS1o/view?usp=drive_link", "https://labeling-te.turing.com/conversations/33083/view", "Tencent_TB2_Week01_91"],
    ["cicd-build-failure-diagnosis-medium", "52b7adae-f40c-4389-9f18-36f44e98840d", "Build-and-Deployment", "medium", 4, 3, 3, 3.33, "critical", "Both the question and tests are severely inadequate", "Zulqarnain Abbas", "Abdullah Chaudhary", "https://drive.google.com/file/d/1T17bcvP_SuHaIYxuQCbMNUo5SddLqKng/view?usp=sharing", "https://labeling-te.turing.com/conversations/33002/view", "Tencent_TB2_Week2_123"],
    ["chess-best-move-medium", "03ca7278-90d2-4beb-8ee7-4fcd205eade1", "games-development", "easy", 4, 5, 3, 4.0, "critical", "Case 1 and Case 2 use the same FEN (Scholar's Mate); only tests one-move checkmate; no promotion, en passant, or deep search tests", "Amir Salih", "Hasnain Mubashir", "https://drive.google.com/file/d/1s8ogsDMksGHFnHd9e92t8w7WMGhoq4rc/view?usp=sharing", "https://labeling-te.turing.com/conversations/32945/view", "Tencent_TB2_Week01_91"],
    ["typescript-props-generator-medium", "43993261-1281-4b57-a3eb-d3bf6267f2b2", "frontend-development", "medium", 6, 4, 3, 4.33, "critical", "test_typescript_compiles is dead code (no tsc environment available); multiple tests have no assertions", "Zachary Kibathi", "Hasnain Mubashir", "https://drive.google.com/file/d/1QPl37D7kmfEcVuwy1nVcYWzwLhqSmFmD/view?usp=drive_link", "https://labeling-te.turing.com/conversations/32977/view", "Tencent_TB2_Week01_91"],
    ["board-siege-medium", "0c64091a-34ff-45b2-a117-2ff66a36b410", "games-development", "medium", 4, 6, 3, 4.33, "critical", "Single 12x12 board; hardcoding {\"captures\":[7]} passes all tests; rules don't clarify whether diagonal captures are included", "Riya Verma", "Hasnain Mubashir", "https://drive.google.com/file/d/1wXAc2gI2J3_2wLdbAIcIRqRZ4ifOgKBR/view?usp=sharing", "https://labeling-te.turing.com/conversations/32950/view", "Tencent_TB2_Week01_91"],
    ["warehouse-inventory-reconciliation-medium", "6f82a4b1-3c2e-4f9a-8d1b-9e4a7c5f2d8a", "data-analysis", "medium", 6, 4, 4, 4.67, "critical", "~10 out of 16 tests execute the exact same logic (comparing sorted(flagged_skus))", "Shivam Shrivastava", "Nikhil Korandla", "https://drive.google.com/file/d/1bo-YhbvUdQ2I8H02hjgwAO7144LbTT5V/view?usp=sharing", "https://labeling-te.turing.com/conversations/33049/view", "Tencent_TB2_Week01_91"],
    ["churn-model-debug-medium", "abe97442-b384-4c8f-9869-9583c0000446", "machine-learning", "medium", 5, 5, 4, 4.67, "critical", "Instruction contradicts data in multiple places: says to use features listed in experiment configuration but the config file has no feature list; says data contains train/valid/test split column but CSV has no such column", "Amit Jadhav", "Estifanos Gashawtena", "https://drive.google.com/file/d/1FtivMUNokrxsPx2Jk2V_-QyAkPBWsbwb/view?usp=drive_link", "https://labeling-te.turing.com/conversations/33087/view", "Tencent_TB2_Week3_80"],
    ["number-theory-explorer-medium", "0bcfaa5b-a94f-4c37-a682-5bbc83a324a0", "mathematics", "medium", 7, 4, 3, 4.67, "critical", "All 9 output files with number theory calculations only verify format and sorting, never verify any computed values", "Arslan Younas", "Estifanos Gashawtena", "https://drive.google.com/file/d/1SpDmrZEo7ZJQTf6bK4YGeMPMNxx85HXw/view?usp=sharing", "https://labeling-te.turing.com/conversations/33127/view", "Tencent_TB2_Week3_80"],
    ["timeline-widget-medium", "a7c3e1f4-8b2d-4e6a-9f0c-5d3b1a2e4c6f", "frontend-development", "medium", 7, 4, 4, 5.0, "critical", "test_js_dark_theme only checks that 'dark' and 'class' appear somewhere in the JS code", "Muhammad Ishmal", "Hasnain Mubashir", "https://drive.google.com/file/d/12gy55N9WEIjCszZUIWY8647yOSGVBENs/view?usp=sharing", "https://labeling-te.turing.com/conversations/32969/view", "Tencent_TB2_Week01_91"],
    ["dead-css-finder-medium", "a0837436-239a-4efe-a93b-5a3a75c9491e", "ui-ux-optimization", "medium", 7, 4, 4, 5.0, "critical", "Multiple test functions end with 'pass' and have no assertions; empty output can pass all tests", "Zachary Kibathi", "Hasnain Mubashir", "https://drive.google.com/file/d/1IHia43QB_V0-JaIE4kTaNqNu8za_993J/view?usp=drive_link", "https://labeling-te.turing.com/conversations/32954/view", "Tencent_TB2_Week01_91"],
    ["kanban-board-hard", "93afb2f6-42d8-43e6-ba01-1ae32a0da2d0", "frontend-development", "hard", 6, 4, 5, 5.0, "critical", "Drag-and-drop, WIP limits, and filtering are completely unverified; test_wip_handling passes as long as code contains 'wip' or 'limit'", "Fenet Shewarega", "Hasnain Mubashir", "https://drive.google.com/file/d/13s1pPxUQH63hQ2Do5dKzIY3J-tBpAosp/view?usp=sharing", "https://labeling-te.turing.com/conversations/32974/view", "Tencent_TB2_Week2_123"],
    ["rummikub-medium", "ff5016e5-a26d-4cb4-8d97-05acd0f66594", "games-development", "medium", 5, 6, 4, 5.0, "critical", "All scenarios have solutions (no DRAW); all optimal solutions are runs (no groups); empty hand and other edge cases are missing", "Riya Verma", "Hasnain Mubashir", "https://drive.google.com/file/d/1_DkBZHUc6lo9y3QB0dAzb6kImB9V9v2g/view?usp=sharing", "https://labeling-te.turing.com/conversations/32953/view", "Tencent_TB2_Week2_123"],
    ["dashboard-cards-medium", "2a959660-4369-404f-bd24-70742b83b7b8", "frontend-development", "hard", 6, 4, 6, 5.33, "serious", "Python operator precedence bug causes incorrect test logic", "Fenet Shewarega", "Hasnain Mubashir", "https://drive.google.com/file/d/1p4jlgTh64r2OnyeYEN2OMVjV1UOqTQFV/view?usp=sharing", "https://labeling-te.turing.com/conversations/32978/view", "Tencent_TB2_Week01_91"],
    ["responsive-nav-menu-medium", "2cfa9efc-e3c4-4003-89b8-92b727863d73", "frontend-development", "medium", 7, 5, 4, 5.33, "serious", "Responsive layout only checks for keywords; no actual breakpoint verification", "Fenet Shewarega", "Hasnain Mubashir", "https://drive.google.com/file/d/1vWlEdbA8A--MmD3MhsCJHWzjM1IxV8nQ/view?usp=sharing", "https://labeling-te.turing.com/conversations/32975/view", "Tencent_TB2_Week01_91"],
    ["form-wizard-medium", "e22fd026-be4e-48ba-8942-1d1f5faa2ec5", "frontend-development", "medium", 7, 4, 5, 5.33, "serious", "All 189 tests are static text analysis; assert 'admin' in js is sufficient to pass", "Muhammad Ishmal", "Hasnain Mubashir", "https://drive.google.com/file/d/1CAtG6mJpZVgyIilaEdYNHWqdt6Ms90Ku/view?usp=sharing", "https://labeling-te.turing.com/conversations/32968/view", "Tencent_TB2_Week01_91"],
    ["decision-tree-classifier-training-medium", "4a297212-c02a-4c04-aedd-46bdef9ee495", "model-training", "medium", 8, 4, 4, 5.33, "serious", "Deterministic algorithm (fixed seed + data) but tests don't verify any specific computed values", "Muhammad Sial", "Estifanos Gashawtena", "https://drive.google.com/file/d/1p8h4jUDX-r3EfTf0-QL16LEzyE5RwdPp/view?usp=drive_link", "https://labeling-te.turing.com/conversations/32871/view", "Tencent_TB2_Week01_91"],
    ["time-travel-deterministic-debugger-medium", "1b536e19-524e-42db-b1ed-aa2119e455be", "software-engineering", "medium", 6, 5, 5, 5.33, "serious", "Insufficient test coverage", "Mentesnot Sibatu", "Tewodros Alemu", "https://drive.google.com/file/d/1ydIGkXwiPA7UB-bWSMix3zwBymBQAuu0/view?usp=drive_link", "https://labeling-te.turing.com/conversations/32936/view", "Tencent_TB2_Week2_123"],
    ["binary-classification-evaluation-medium", "378315ae-84f4-44c6-aecc-18127aecaccb", "machine-learning", "hard", 4, 7, 6, 5.67, "serious", "CSV column names described in instruction.md do not match the actual data at all", "Muhammad Sial", "Estifanos Gashawtena", "https://drive.google.com/file/d/1erfNWlgo9BBvRWTwZYNzpMusvqIT5GMG/view", "https://labeling-te.turing.com/conversations/32870/view", "Tencent_TB2_Week01_91"],
    ["thermal-diffusivity-fit-medium", "74514900-792f-4470-b6b4-6926157e5898", "scientific-computing", "medium", 7, 5, 5, 5.67, "serious", "No absolute RMSE threshold; test_result_is_deterministic_on_disk reads the same file twice (meaningless test)", "Amit Jadhav", "Estifanos Gashawtena", "https://drive.google.com/file/d/1OyHus-Xuc8yRATqbjPSnJLSgbMuzqc40/view?usp=drive_link", "https://labeling-te.turing.com/conversations/33117/view", "Tencent_TB2_Week01_91"],
    ["heat-diffusion-simulation-hard", "d75a3226-42ce-4a4e-87f7-91ac37a212b4", "scientific-computing", "hard", 7, 5, 5, 5.67, "serious", "Out of 49 sensors, only 3 are verified (6% coverage); energy tolerance of ±1000 is too loose", "Muhammad Sial", "Estifanos Gashawtena", "https://drive.google.com/file/d/1qR8EDhA2dO7mTG3mWMgmNScAAjxDBl4a/view", "https://labeling-te.turing.com/conversations/32873/view", "Tencent_TB2_Week01_91"],
    ["calendar-conflict-detection-medium", "c7e2a9f4-8d3b-4a1c-b5e6-2f9d8c4a7e3b", "data-querying", "medium", 7, 5, 5, 5.67, "serious", "Insufficient test coverage", "Shivam Shrivastava", "Nikhil Korandla", "https://drive.google.com/file/d/1OnPpODkZiPDPHYKrz920PdOAA2ZANqCc/view?usp=sharing", "https://labeling-te.turing.com/conversations/33074/view", "Tencent_TB2_Week2_123"],
    ["phantom-backup-coverage-audit-medium", "2b94c9b9-24bf-4bf1-a0a9-d6d1f7e768cb", "file-system", "medium", 7, 6, 4, 5.67, "serious", "Insufficient test coverage", "Om Rajput", "Tewodros Alemu", "https://drive.google.com/file/d/1jQoFEJWDLnsaFQdazSs8oq5_OadoBe8h/view?usp=sharing", "https://labeling-te.turing.com/conversations/32902/view", "Tencent_TB2_Week2_123"],
    ["cascade-dominion-hard", "48b1a938-4129-481d-bbb3-bbeec2639a1a", "games-development", "hard", 5, 7, 5, 5.67, "serious", "Only 1 board (15x15); no small boards, no cascade chains, no all-same-type pieces, and other edge cases missing", "Riya Verma", "Hasnain Mubashir", "https://drive.google.com/file/d/1Zgf09fVQye_Gth7pUg_c9OE9PvpMfYS5/view?usp=sharing", "https://labeling-te.turing.com/conversations/32947/view", "Tencent_TB2_Week2_123"],
    ["rpg-battle-engine-medium", "8a3f2c1b-5e4d-4b9a-8c7e-1d2f3a4b5c6d", "games-development", "medium", 7, 5, 5, 5.67, "serious", "Tests have inter-test state dependencies; damage formula and healing mechanics are not verified", "Zachary Kibathi", "Hasnain Mubashir", "https://drive.google.com/file/d/1Ty2Y_OiZzhAevA24hPPPUzRSLgqtTj21/view?usp=drive_link", "https://labeling-te.turing.com/conversations/32952/view", "Tencent_TB2_Week2_123"],
    ["email-triage-planner-medium", "069e64b7-0921-4958-ba3b-7d0ee2650dac", "personal-assistant", "medium", 7, 5, 5, 5.67, "serious", "Insufficient test coverage", "Zachary Kibathi", "Hasnain Mubashir", "https://drive.google.com/file/d/18BM7J-VLmm2x1pPYX_ybmBoqY9ycDONy/view?usp=drive_link", "https://labeling-te.turing.com/conversations/32895/view", "Tencent_TB2_Week2_123"],
    ["protein-structure-pipeline-debugging-medium", "63f7aedb-f3a5-492c-a5cb-f533da6a0436", "scientific-computing", "easy", 6, 5, 6, 5.67, "serious", "Insufficient test coverage", "Nse-Abasi Etim", "Estifanos Gashawtena", "https://drive.google.com/file/d/1uSDp6eFS5pjgnVfRGIKZy7zqNey968qA/view?usp=sharing", "https://labeling-te.turing.com/conversations/33111/view", "Tencent_TB2_Week2_123"],
    ["user-account-audit-medium", "ed878636-2328-45a9-885b-0fe63bbbcb6a", "system-administration", "medium", 7, 5, 5, 5.67, "serious", "Insufficient test coverage", "Tobi Adebisi", "Tewodros Alemu", "https://drive.google.com/file/d/1vFvBX9TDK6qcfl8nKS5nNvkjzqwh3n4b/view?usp=drive_link", "https://labeling-te.turing.com/conversations/33147/view", "Tencent_TB2_Week2_123"],
    ["pca-analysis-medium", "4d0b3859-bc04-479e-9f85-9c0ea1a0d4dc", "model-training", "medium", 7, 5, 5, 5.67, "serious", "30 tests verify structure and basic mathematical properties but don't verify any specific values; reconstruction error threshold of <20 is too lenient", "Muhammad Sial", "Estifanos Gashawtena", "https://drive.google.com/file/d/1Lr1oVxM8NleAMbNRgytJCbUrcPXH5Ste/view", "https://labeling-te.turing.com/conversations/33107/view", "Tencent_TB2_Week3_80"],
    ["data-table-medium", "032b39e1-b28d-4c3b-8aaf-22d3047acf50", "frontend-development", "medium", 7, 5, 5, 5.67, "serious", "test_search_filters_all_columns only checks that JS contains 'filter' and 'search'", "Fenet Shewarega", "Hasnain Mubashir", "https://drive.google.com/file/d/1TN28hW7_2rJEWc8n_eIk2svxDV5vBuaE/view?usp=sharing", "https://labeling-te.turing.com/conversations/32970/view", "Tencent_TB2_Week01_91"],
    ["appointment-scheduler-medium", "d08234e1-54a3-4bdd-b431-f61715f7b8ed", "frontend-development", "medium", 7, 5, 6, 6.0, "serious", "No interactive behavior tests; no time conflict detection verification", "Fenet Shewarega", "Hasnain Mubashir", "https://drive.google.com/file/d/11lrZJ70aT1Ib_sel8w0spBhnZhfdj-oA/view?usp=sharing", "https://labeling-te.turing.com/conversations/32979/view", "Tencent_TB2_Week01_91"],
    ["wordle-feedback-generator-medium", "6a08d38d-e37b-45cd-ae30-cb6118d6ca98", "games-development", "easy", 7, 7, 4, 6.0, "serious", "All 5 secret words have no repeated letters; missing all-GREEN, all-GRAY, and repeated-letter edge cases", "Riya Verma", "Hasnain Mubashir", "https://drive.google.com/file/d/1czmf6mwfFBOcfa4dnOvJ1Bp1N6MbeD07/view?usp=sharing", "https://labeling-te.turing.com/conversations/32940/view", "Tencent_TB2_Week01_91"],
    ["expense-report-generator-medium", "02275911-547a-4513-b4a7-448f58c1b8b2", "personal-assistant", "medium", 7, 6, 5, 6.0, "serious", "Expense rule edge cases (e.g., over-limit approvals, cross-category aggregation) are not covered", "Zachary Kibathi", "Hasnain Mubashir", "https://drive.google.com/file/d/1dMo9lk_0UlDvCiyrstECerBDlEu2xd6T/view?usp=drive_link", "https://labeling-te.turing.com/conversations/32887/view", "Tencent_TB2_Week01_91"],
    ["computational-reproducibility-investigation-medium", "e1a957bd-ceeb-40ef-bec7-3e7a7959cd11", "scientific-computing", "medium", 6, 6, 6, 6.0, "serious", "Tolerances are too lenient; insufficient coverage", "Nse-Abasi Etim", "Estifanos Gashawtena", "https://drive.google.com/file/d/1B-8jkzlwLnu_SwhGfcYf8ySZmGIt8Sww/view?usp=sharing", "https://labeling-te.turing.com/conversations/33108/view", "Tencent_TB2_Week01_91"],
    ["maritime-ais-signal-forensics-medium", "3a59c03b-3093-4f61-8b93-70386bedfab5", "security", "medium", 8, 5, 5, 6.0, "serious", "test_transformation_key_present accepts any hexadecimal value instead of verifying the correct XOR key", "Opeyemi Odebode", "Tewodros Alemu", "https://drive.google.com/file/d/1JJmkiKnrDxZKtLuaqYLGxdXbxlYfHsrz/view?usp=sharing", "https://labeling-te.turing.com/conversations/33151/view", "Tencent_TB2_Week01_91"],
    ["intrusion-scanner-hard", "b8f3c9d2-7a41-4e5b-9c8d-3f2e1a6b4d5c", "algorithm-design", "hard", 5, 7, 6, 6.0, "serious", "Question description is weak/insufficient", "Daksh Prajapati", "Abdullah Chaudhary", "https://drive.google.com/file/d/1Ay3Bb5MTW4sFCiJ_CDDK3rLO8a0RIRWi/view?usp=sharing", "https://labeling-te.turing.com/conversations/32919/view", "Tencent_TB2_Week2_123"],
    ["regional-fleet-telemetry-mileage-calculation-hard", "25a047bd-044d-4e4f-8ae1-2e72f2e7f02f", "data-science", "medium", 6, 7, 5, 6.0, "serious", "Insufficient test coverage", "Kazim Hussain", "Nikhil Korandla", "https://drive.google.com/file/d/1kT-AexpF8VHncnd5Vu-Z8VFJDRxqoCka/view", "https://labeling-te.turing.com/conversations/33035/view", "Tencent_TB2_Week2_123"],
    ["vanilla-to-react-typescript-medium", "7ac8278c-01d6-4c0d-9e8a-63ecde9449f3", "frontend-development", "medium", 7, 6, 5, 6.0, "serious", "No rendering/browser tests", "Zachary Kibathi", "Hasnain Mubashir", "https://drive.google.com/file/d/13obtRsvZYLAgWL1QfHSImUhE17lp6_gW/view?usp=drive_link", "https://labeling-te.turing.com/conversations/32971/view", "Tencent_TB2_Week2_123"],
    ["monte-carlo-integration-medium", "32222665-8e6e-4b42-b87c-3ed1992439ee", "scientific-computing", "medium", 6, 6, 6, 6.0, "serious", "Insufficient test coverage", "Arslan Younas", "Estifanos Gashawtena", "https://drive.google.com/file/d/1pSrO6QD88PNAV6OcI-Cp0k0i2uAK_eic/view?usp=sharing", "https://labeling-te.turing.com/conversations/33114/view", "Tencent_TB2_Week2_123"],
    ["self-referential-adversarial-system-reconstruction-medium", "3b60b71b-9fb6-4aed-bfb1-24e39a3223f2", "algorithm-design", "medium", 4, 7, 7, 6.0, "serious", "Instruction asks to reconstruct state space and operators from traces, but spec.json already provides complete operator definitions; entropy mechanism doesn't match the actual spec definition", "Mentesnot Sibatu", "Tewodros Alemu", "https://drive.google.com/file/d/1YqZjbVIc02xiJNs2_qZWIr-tPzVmgpD_/view?usp=drive_link", "https://labeling-te.turing.com/conversations/32924/view", "Tencent_TB2_Week3_80"],
    ["othello-style-grid-capture-medium", "d852d0a3-2a8e-49e9-8486-5075fcf96139", "games-development", "medium", 7, 7, 5, 6.33, "moderate", "Missing zero-capture, single-row, long-chain, and all-same-color edge cases", "Riya Verma", "Hasnain Mubashir", "https://drive.google.com/file/d/1Np4hD1--s2xyHHUMpwd4A3T1YpJwuHg5/view?usp=sharing", "https://labeling-te.turing.com/conversations/32941/view", "Tencent_TB2_Week01_91"],
    ["adversarial-temporal-hypergraph-medium", "a9e7f629-dc0a-4ac8-bb64-294a93ef42d1", "algorithm-design", "medium", 7, 7, 5, 6.33, "moderate", "Insufficient test coverage", "Mentesnot Sibatu", "Tewodros Alemu", "https://drive.google.com/file/d/1u7LeMUtVTQ8v7fknpZ_oDfeOentFeHRE/view?usp=drive_link", "https://labeling-te.turing.com/conversations/32920/view", "Tencent_TB2_Week2_123"],
    ["data-visualization-dashboard-hard", "2ac62265-c751-4b74-a041-b52e29fd1610", "frontend-development", "hard", 7, 5, 7, 6.33, "moderate", "No rendering/browser tests; DOM parsing is present but interactive behavior is not verified", "Fenet Shewarega", "Hasnain Mubashir", "https://drive.google.com/file/d/10IisbZVx-bctKoC3ZPuIKWQ7RC8PXGMY/view?usp=sharing", "https://labeling-te.turing.com/conversations/32976/view", "Tencent_TB2_Week2_123"],
    ["turn-grid-war-medium", "133195de-e208-4655-ad5d-eb5d44ff9624", "games-development", "medium", 7, 7, 5, 6.33, "moderate", "Missing out-of-bounds movement, combo chain trigger cap, weakened status stacking, and other edge cases", "Riya Verma", "Hasnain Mubashir", "https://drive.google.com/file/d/1SiIhQ7QOQmlma4tr7HYKljui4esSegLt/view?usp=sharing", "https://labeling-te.turing.com/conversations/32946/view", "Tencent_TB2_Week2_123"],
    ["dockside-arbitrage-medium", "21fafbb2-5225-46d6-a13c-519159088909", "games-development", "medium", 7, 7, 5, 6.33, "moderate", "Only 1 dataset; missing dense-arrival tie, idle dock, all-rejected, and other scenarios", "Riya Verma", "Hasnain Mubashir", "https://drive.google.com/file/d/1J2YGPRU3RSgxSrnYNYQcumco-dxT8WjB/view?usp=sharing", "https://labeling-te.turing.com/conversations/32948/view", "Tencent_TB2_Week2_123"],
    ["carcassonne-game-hard", "62fd4a7b-de7d-4970-ad25-d677e2b7ff30", "games-development", "hard", 7, 7, 5, 6.33, "moderate", "Only 1 board state; penalty threshold boundaries, all meeples used up, and other scenarios are not tested", "Riya Verma", "Hasnain Mubashir", "https://drive.google.com/file/d/1JoQjdzC4pMy_t_5ppU0oAraL-ZqCNg9h/view?usp=sharing", "https://labeling-te.turing.com/conversations/32942/view", "Tencent_TB2_Week2_123"],
    ["matrix-operations-linear-algebra-medium", "5ce102f4-16b6-48c8-885a-85cc62cbc060", "mathematics", "medium", 7, 7, 5, 6.33, "moderate", "Insufficient test coverage", "Muhammad Sial", "Estifanos Gashawtena", "https://drive.google.com/file/d/1q0uWNXGiUZHrD3mi9GNpydXqe8gsHe9F/view?usp=drive_link", "https://labeling-te.turing.com/conversations/33124/view", "Tencent_TB2_Week2_123"],
    ["federated-learning-dp-gradient-clipping-aggregation-hard", "e9c8cd3b-2947-4ef0-bd6f-1334526091e4", "data-science", "hard", 5, 7, 7, 6.33, "moderate", "Key validation rules are implicit; critical requirements are scattered across three files", "Shiva Kumar", "Nikhil Korandla", "https://drive.google.com/file/d/1eAeVys5xPoGpe0Yxq6mCDLbtDfpytFMN/view?usp=sharing", "https://labeling-te.turing.com/conversations/33027/view", "Tencent_TB2_Week3_80"],
    ["firewall-rule-audit-medium", "43ce7f17-557e-4ec7-9e6f-0dd752a9db1e", "security", "medium", 8, 5, 6, 6.33, "moderate", "Core algorithm (classifying rules as shadow/conflict/redundant) is completely untested; labeling all rules as 'none' passes as long as the format is correct", "Tobi Adebisi", "Tewodros Alemu", "https://drive.google.com/file/d/1J3rPtA3EWHIzykqhpnxVeFW0Y0kslPvX/view?usp=drive_link", "https://labeling-te.turing.com/conversations/33156/view", "Tencent_TB2_Week3_80"],
    ["ecommerce-transaction-reconciliation-hard", "62e85496-e65c-41ae-92f8-7f8071cc53de", "data-preprocessing", "hard", 5, 8, 9, 7.33, "moderate", "Question description is weak/insufficient", "Aitzaz Hassan", "Nikhil Korandla", "https://drive.google.com/file/d/1Oh4LN_3XOQC9CgCGgV_51U8g-oPu8Kvy/view?usp=sharing", "https://labeling-te.turing.com/conversations/33057/view", "Tencent_TB2_Week2_123"],
  ];

  // Write data rows
  var dataRows = [];
  for (var i = 0; i < tasks.length; i++) {
    var t = tasks[i];
    dataRows.push([
      i + 1,           // #
      t[0],            // Task Name
      t[1],            // UUID
      t[2],            // Domain
      t[3],            // Difficulty
      t[4],            // qq
      t[5],            // tq
      t[6],            // tc
      t[7],            // Avg
      t[8],            // Severity
      t[9],            // Client Feedback
      t[10],           // Original Trainer
      t[11],           // Pod Lead (Reviewer)
      t[14],           // Original Batch
      t[12],           // Drive Link
      t[13],           // Labeling Tool Link
      "",              // Rework Assigned To (empty - trainer fills)
      "Not Started",   // Rework Status
      "",              // Rework Reason / Notes
      "",              // Rework Drive Link
      "",              // LLM Review Doc Link
      "",              // Reviewer Name
      "",              // Reviewer Status
      "",              // Reviewer Notes
      "",              // Date Assigned
      "",              // Date Completed
    ]);
  }

  sheet.getRange(2, 1, dataRows.length, dataRows[0].length).setValues(dataRows);

  // ── Dropdowns ──

  // Rework Status (col R = 18)
  var reworkStatusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList([
      "Not Started",
      "In Progress",
      "Completed and Fixed",
      "Rework Not Possible",
      "Fixed — Needs Review"
    ], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 18, tasks.length, 1).setDataValidation(reworkStatusRule);

  // Reviewer Status (col W = 23)
  var reviewerStatusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList([
      "Not Reviewed",
      "Under Review",
      "Approved",
      "Sent Back to Rework",
      "Rejected"
    ], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 23, tasks.length, 1).setDataValidation(reviewerStatusRule);

  // Difficulty dropdown (col E = 5)
  var diffRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["easy", "medium", "hard"], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 5, tasks.length, 1).setDataValidation(diffRule);

  // ── Styling ──

  // Header styling
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground("#1a237e");
  headerRange.setFontColor("#ffffff");
  headerRange.setFontWeight("bold");
  headerRange.setFontSize(10);
  headerRange.setWrap(true);
  headerRange.setVerticalAlignment("middle");
  headerRange.setHorizontalAlignment("center");
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(2);

  // Column group colors
  // Scores (F-J) light blue
  sheet.getRange(1, 6, 1, 5).setBackground("#0d47a1");
  // Rework columns (Q-U) green header
  sheet.getRange(1, 17, 1, 5).setBackground("#1b5e20");
  // Reviewer columns (V-X) orange header
  sheet.getRange(1, 22, 1, 3).setBackground("#e65100");
  // Date columns (Y-Z) purple header
  sheet.getRange(1, 25, 1, 2).setBackground("#4a148c");

  // Severity color coding
  for (var r = 0; r < tasks.length; r++) {
    var severity = tasks[r][8];
    var rowNum = r + 2;
    var severityCell = sheet.getRange(rowNum, 10);
    if (severity === "critical") {
      severityCell.setBackground("#ffcdd2").setFontColor("#b71c1c");
    } else if (severity === "serious") {
      severityCell.setBackground("#fff9c4").setFontColor("#f57f17");
    } else {
      severityCell.setBackground("#c8e6c9").setFontColor("#1b5e20");
    }
  }

  // Score color coding (qq, tq, tc)
  for (var r = 0; r < tasks.length; r++) {
    var rowNum = r + 2;
    for (var c = 6; c <= 8; c++) {
      var cell = sheet.getRange(rowNum, c);
      var val = cell.getValue();
      if (val <= 3) {
        cell.setBackground("#ffcdd2");
      } else if (val <= 5) {
        cell.setBackground("#fff9c4");
      } else if (val >= 7) {
        cell.setBackground("#c8e6c9");
      }
    }
  }

  // Alternating row colors for readability
  for (var r = 0; r < tasks.length; r++) {
    if (r % 2 === 1) {
      sheet.getRange(r + 2, 1, 1, headers.length).setBackground("#f5f5f5");
    }
  }

  // Column widths
  sheet.setColumnWidth(1, 35);   // #
  sheet.setColumnWidth(2, 200);  // Task Name
  sheet.setColumnWidth(3, 100);  // UUID (truncated view)
  sheet.setColumnWidth(4, 140);  // Domain
  sheet.setColumnWidth(5, 80);   // Difficulty
  sheet.setColumnWidth(6, 35);   // qq
  sheet.setColumnWidth(7, 35);   // tq
  sheet.setColumnWidth(8, 35);   // tc
  sheet.setColumnWidth(9, 50);   // Avg
  sheet.setColumnWidth(10, 75);  // Severity
  sheet.setColumnWidth(11, 350); // Client Feedback
  sheet.setColumnWidth(12, 140); // Original Trainer
  sheet.setColumnWidth(13, 140); // Pod Lead
  sheet.setColumnWidth(14, 160); // Original Batch
  sheet.setColumnWidth(15, 120); // Drive Link
  sheet.setColumnWidth(16, 120); // Labeling Tool Link
  sheet.setColumnWidth(17, 160); // Rework Assigned To
  sheet.setColumnWidth(18, 150); // Rework Status
  sheet.setColumnWidth(19, 250); // Rework Reason
  sheet.setColumnWidth(20, 120); // Rework Drive Link
  sheet.setColumnWidth(21, 120); // LLM Review Doc
  sheet.setColumnWidth(22, 140); // Reviewer Name
  sheet.setColumnWidth(23, 140); // Reviewer Status
  sheet.setColumnWidth(24, 250); // Reviewer Notes
  sheet.setColumnWidth(25, 110); // Date Assigned
  sheet.setColumnWidth(26, 110); // Date Completed

  // Wrap text for feedback column
  sheet.getRange(2, 11, tasks.length, 1).setWrap(true);
  sheet.getRange(2, 19, tasks.length, 1).setWrap(true);
  sheet.getRange(2, 24, tasks.length, 1).setWrap(true);

  // Date format
  sheet.getRange(2, 25, tasks.length, 2).setNumberFormat("dd-MMM-yyyy");
}


function setupDashboard_(ss) {
  var sheetName = "Dashboard";
  var existing = ss.getSheetByName(sheetName);
  if (existing) ss.deleteSheet(existing);

  var sheet = ss.insertSheet(sheetName);
  var trackerName = "Rework Tracker";

  // Title
  sheet.getRange("A1").setValue("TB 2.0 — Rework Dashboard").setFontSize(16).setFontWeight("bold");
  sheet.getRange("A2").setValue("Auto-calculated from Rework Tracker sheet").setFontColor("#666666");

  // Overall stats
  var stats = [
    ["", ""],
    ["OVERALL STATS", ""],
    ["Total Flagged Tasks", "=COUNTA('" + trackerName + "'!B2:B)"],
    ["Not Started", "=COUNTIF('" + trackerName + "'!R2:R,\"Not Started\")"],
    ["In Progress", "=COUNTIF('" + trackerName + "'!R2:R,\"In Progress\")"],
    ["Completed and Fixed", "=COUNTIF('" + trackerName + "'!R2:R,\"Completed and Fixed\")"],
    ["Rework Not Possible", "=COUNTIF('" + trackerName + "'!R2:R,\"Rework Not Possible\")"],
    ["Fixed — Needs Review", "=COUNTIF('" + trackerName + "'!R2:R,\"Fixed — Needs Review\")"],
    ["", ""],
    ["REVIEWER STATS", ""],
    ["Not Reviewed", "=COUNTIF('" + trackerName + "'!W2:W,\"Not Reviewed\")+COUNTBLANK('" + trackerName + "'!W2:W51)"],
    ["Under Review", "=COUNTIF('" + trackerName + "'!W2:W,\"Under Review\")"],
    ["Approved", "=COUNTIF('" + trackerName + "'!W2:W,\"Approved\")"],
    ["Sent Back to Rework", "=COUNTIF('" + trackerName + "'!W2:W,\"Sent Back to Rework\")"],
    ["Rejected", "=COUNTIF('" + trackerName + "'!W2:W,\"Rejected\")"],
    ["", ""],
    ["BY SEVERITY", ""],
    ["Critical", "=COUNTIF('" + trackerName + "'!J2:J,\"critical\")"],
    ["Serious", "=COUNTIF('" + trackerName + "'!J2:J,\"serious\")"],
    ["Moderate", "=COUNTIF('" + trackerName + "'!J2:J,\"moderate\")"],
    ["", ""],
    ["BY DIFFICULTY", ""],
    ["Easy", "=COUNTIF('" + trackerName + "'!E2:E,\"easy\")"],
    ["Medium", "=COUNTIF('" + trackerName + "'!E2:E,\"medium\")"],
    ["Hard", "=COUNTIF('" + trackerName + "'!E2:E,\"hard\")"],
    ["", ""],
    ["COMPLETION %", ""],
    ["Done (Fixed + Not Possible)", "=IFERROR((COUNTIF('" + trackerName + "'!R2:R,\"Completed and Fixed\")+COUNTIF('" + trackerName + "'!R2:R,\"Rework Not Possible\"))/COUNTA('" + trackerName + "'!B2:B)*100,0)&\"%\""],
  ];

  sheet.getRange(3, 1, stats.length, 2).setValues(stats);

  // Style section headers
  var sectionRows = [4, 11, 18, 23, 28];
  for (var i = 0; i < sectionRows.length; i++) {
    var row = sectionRows[i] + 2;
    sheet.getRange(row, 1, 1, 2).setBackground("#1a237e").setFontColor("#ffffff").setFontWeight("bold");
  }

  sheet.setColumnWidth(1, 250);
  sheet.setColumnWidth(2, 150);

  // Bold value column
  sheet.getRange(3, 2, stats.length, 1).setFontWeight("bold").setHorizontalAlignment("center");
}
