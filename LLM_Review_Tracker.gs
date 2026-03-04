/**
 * LLM Review Tracker — Google Apps Script
 * Creates 4 sheets:
 *   1. All Tasks (Excl. Frontend/UI/Games) — 263 tasks, domain-wise
 *   2. Client vs LLM Comparison — 50 flagged tasks with client scores + empty LLM columns
 *   3. Frontend / UI-UX / Games — 42 excluded-domain tasks
 *   4. Dashboard — auto-calculated summary stats
 *
 * Run  setupLLMReviewTracker()  from the script editor.
 */

/* ──────────────────────────── MAIN ──────────────────────────── */

function setupLLMReviewTracker() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    ss = SpreadsheetApp.create("LLM Review Tracker");
    SpreadsheetApp.setActiveSpreadsheet(ss);
  }

  buildSheet1_AllTasks(ss);
  buildSheet2_ClientVsLLM(ss);
  buildSheet3_ExcludedDomains(ss);
  buildSheet4_Dashboard(ss);

  // Remove default "Sheet1" if it still exists
  var def = ss.getSheetByName("Sheet1");
  if (def && ss.getSheets().length > 1) {
    ss.deleteSheet(def);
  }

  SpreadsheetApp.getUi().alert("LLM Review Tracker created successfully with 4 sheets.");
}

/* ──────────────────────── SHEET 1 ──────────────────────── */

function buildSheet1_AllTasks(ss) {
  var sheet = getOrCreateSheet_(ss, "All Tasks (Excl. Frontend/UI/Games)");
  sheet.clear();

  var header = [
    "#", "Task Name", "UUID", "Domain", "Difficulty", "Trainer", "Reviewer",
    "Drive Link",
    "LLM qq", "LLM tq", "LLM tc", "LLM Avg", "Verdict", "Run Date", "Notes"
  ];
  sheet.appendRow(header);

  var data = getMainTasks_();
  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    sheet.appendRow([
      i + 1, r[0], r[1], r[2], r[3], r[4], r[5], r[6],
      "", "", "", "", "", "", ""
    ]);
  }

  formatSheet_(sheet, header.length, data.length + 1);
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(2, 350);
  sheet.setColumnWidth(3, 300);
  sheet.setColumnWidth(8, 250);
}

/* ──────────────────────── SHEET 2 ──────────────────────── */

function buildSheet2_ClientVsLLM(ss) {
  var sheet = getOrCreateSheet_(ss, "Client vs LLM Comparison");
  sheet.clear();

  var header = [
    "#", "Short Name", "Full Task Name", "Domain", "Difficulty", "Severity",
    "Client qq", "Client tq", "Client tc", "Client Avg",
    "Problem Detail", "Problem Tags",
    "LLM qq", "LLM tq", "LLM tc", "LLM Avg", "LLM Verdict",
    "Δ qq", "Δ tq", "Δ tc", "Δ Avg",
    "Match?", "Run Date", "Notes"
  ];
  sheet.appendRow(header);

  var llmScores = getLLMScoresForFlagged_();
  var runDate = "2026-03-05";

  var data = getFlaggedTasks_();
  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    var row = i + 2;
    var shortName = r[0];
    var scores = llmScores[shortName] || null;

    var llmQQ = scores ? scores[0] : "";
    var llmTQ = scores ? scores[1] : "";
    var llmTC = scores ? scores[2] : "";
    var llmAvg = scores ? scores[3] : "";
    var llmVerdict = scores ? scores[4] : "";
    var dateVal = scores ? runDate : "";

    sheet.appendRow([
      i + 1, r[0], r[1], r[2], r[3], r[4],
      r[5], r[6], r[7], r[8],
      r[9], r[10],
      llmQQ, llmTQ, llmTC, llmAvg, llmVerdict,
      "", "", "", "",
      "", dateVal, ""
    ]);

    // Delta formulas: LLM - Client
    sheet.getRange(row, 18).setFormula("=IF(AND(M" + row + "<>\"\",G" + row + "<>\"\"),M" + row + "-G" + row + ",\"\")");
    sheet.getRange(row, 19).setFormula("=IF(AND(N" + row + "<>\"\",H" + row + "<>\"\"),N" + row + "-H" + row + ",\"\")");
    sheet.getRange(row, 20).setFormula("=IF(AND(O" + row + "<>\"\",I" + row + "<>\"\"),O" + row + "-I" + row + ",\"\")");
    sheet.getRange(row, 21).setFormula("=IF(AND(P" + row + "<>\"\",J" + row + "<>\"\"),P" + row + "-J" + row + ",\"\")");

    // Match? — TRUE if abs(delta avg) <= 1
    sheet.getRange(row, 22).setFormula("=IF(U" + row + "=\"\",\"\",IF(ABS(U" + row + ")<=1,\"YES\",\"NO\"))");
  }

  formatSheet_(sheet, header.length, data.length + 1);
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(2, 280);
  sheet.setColumnWidth(3, 400);
  sheet.setColumnWidth(11, 400);
  sheet.setColumnWidth(12, 300);

  // Color-code Match? column
  var matchRange = sheet.getRange(2, 22, data.length, 1);
  var rule1 = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("YES")
    .setBackground("#C6EFCE").setFontColor("#006100")
    .setRanges([matchRange]).build();
  var rule2 = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("NO")
    .setBackground("#FFC7CE").setFontColor("#9C0006")
    .setRanges([matchRange]).build();
  sheet.setConditionalFormatRules([rule1, rule2]);
}

/* ──────────────────────── SHEET 3 ──────────────────────── */

function buildSheet3_ExcludedDomains(ss) {
  var sheet = getOrCreateSheet_(ss, "Frontend / UI-UX / Games");
  sheet.clear();

  var header = [
    "#", "Task Name", "UUID", "Domain", "Difficulty", "Trainer", "Reviewer",
    "Drive Link",
    "LLM qq", "LLM tq", "LLM tc", "LLM Avg", "Verdict", "Run Date", "Notes"
  ];
  sheet.appendRow(header);

  var data = getExcludedTasks_();
  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    sheet.appendRow([
      i + 1, r[0], r[1], r[2], r[3], r[4], r[5], r[6],
      "", "", "", "", "", "", ""
    ]);
  }

  formatSheet_(sheet, header.length, data.length + 1);
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(2, 350);
  sheet.setColumnWidth(3, 300);
  sheet.setColumnWidth(8, 250);
}

/* ──────────────────────── SHEET 4 ──────────────────────── */

function buildSheet4_Dashboard(ss) {
  var sheet = getOrCreateSheet_(ss, "Dashboard");
  sheet.clear();

  var s1 = "'All Tasks (Excl. Frontend/UI/Games)'";
  var s2 = "'Client vs LLM Comparison'";
  var s3 = "'Frontend / UI-UX / Games'";

  sheet.getRange("A1").setValue("LLM Review Tracker — Dashboard").setFontSize(16).setFontWeight("bold");

  // Section 1: All Tasks summary
  sheet.getRange("A3").setValue("Sheet 1: All Tasks (Excl. Frontend/UI/Games)").setFontWeight("bold");
  sheet.getRange("A4").setValue("Total Tasks");
  sheet.getRange("B4").setFormula("=COUNTA(" + s1 + "!B:B)-1");
  sheet.getRange("A5").setValue("Reviewed (has verdict)");
  sheet.getRange("B5").setFormula("=COUNTA(" + s1 + "!M:M)-1");
  sheet.getRange("A6").setValue("Pending");
  sheet.getRange("B6").setFormula("=B4-B5");
  sheet.getRange("A7").setValue("Avg LLM qq");
  sheet.getRange("B7").setFormula("=IFERROR(AVERAGE(" + s1 + "!I2:I),\"\")");
  sheet.getRange("A8").setValue("Avg LLM tq");
  sheet.getRange("B8").setFormula("=IFERROR(AVERAGE(" + s1 + "!J2:J),\"\")");
  sheet.getRange("A9").setValue("Avg LLM tc");
  sheet.getRange("B9").setFormula("=IFERROR(AVERAGE(" + s1 + "!K2:K),\"\")");
  sheet.getRange("A10").setValue("Avg LLM Overall");
  sheet.getRange("B10").setFormula("=IFERROR(AVERAGE(" + s1 + "!L2:L),\"\")");

  // Section 2: Client vs LLM
  sheet.getRange("A12").setValue("Sheet 2: Client vs LLM Comparison (50 Flagged)").setFontWeight("bold");
  sheet.getRange("A13").setValue("Total Flagged");
  sheet.getRange("B13").setFormula("=COUNTA(" + s2 + "!B:B)-1");
  sheet.getRange("A14").setValue("Reviewed");
  sheet.getRange("B14").setFormula("=COUNTA(" + s2 + "!Q:Q)-1");
  sheet.getRange("A15").setValue("Match Count (|Δ Avg| ≤ 1)");
  sheet.getRange("B15").setFormula("=COUNTIF(" + s2 + "!V:V,\"YES\")");
  sheet.getRange("A16").setValue("Mismatch Count");
  sheet.getRange("B16").setFormula("=COUNTIF(" + s2 + "!V:V,\"NO\")");
  sheet.getRange("A17").setValue("Match Rate");
  sheet.getRange("B17").setFormula("=IFERROR(B15/(B15+B16),\"\")");
  sheet.getRange("B17").setNumberFormat("0.0%");
  sheet.getRange("A18").setValue("Avg Client Score");
  sheet.getRange("B18").setFormula("=IFERROR(AVERAGE(" + s2 + "!J2:J),\"\")");
  sheet.getRange("A19").setValue("Avg LLM Score");
  sheet.getRange("B19").setFormula("=IFERROR(AVERAGE(" + s2 + "!P2:P),\"\")");
  sheet.getRange("A20").setValue("Avg Delta");
  sheet.getRange("B20").setFormula("=IFERROR(AVERAGE(" + s2 + "!U2:U),\"\")");

  // Section 3: Excluded domains
  sheet.getRange("A22").setValue("Sheet 3: Frontend / UI-UX / Games").setFontWeight("bold");
  sheet.getRange("A23").setValue("Total Tasks");
  sheet.getRange("B23").setFormula("=COUNTA(" + s3 + "!B:B)-1");
  sheet.getRange("A24").setValue("Reviewed");
  sheet.getRange("B24").setFormula("=COUNTA(" + s3 + "!M:M)-1");

  // Section 4: Domain breakdown counts
  sheet.getRange("A26").setValue("Domain Breakdown (All Tasks sheet)").setFontWeight("bold");
  sheet.getRange("A27").setValue("Domain");
  sheet.getRange("B27").setValue("Count");
  sheet.getRange("C27").setValue("Reviewed");
  sheet.getRange("D27").setValue("Avg LLM Score");
  sheet.getRange("A27:D27").setFontWeight("bold");

  var domains = [
    "Algorithm Design", "Application Development", "Build & Deployment",
    "Data Analysis", "Data Preprocessing", "Data Querying", "Data Science",
    "Debugging", "File Operations", "File System",
    "Machine Learning", "Mathematics", "Model Training",
    "Personal Assistant", "Protocol Analysis", "Scientific Computing",
    "Security", "Software Engineering", "System Administration"
  ];

  for (var i = 0; i < domains.length; i++) {
    var row = 28 + i;
    sheet.getRange(row, 1).setValue(domains[i]);
    sheet.getRange(row, 2).setFormula("=COUNTIF(" + s1 + "!D:D,\"" + domains[i] + "\")");
    sheet.getRange(row, 3).setFormula("=COUNTIFS(" + s1 + "!D:D,\"" + domains[i] + "\"," + s1 + "!M:M,\"<>\")");
    sheet.getRange(row, 4).setFormula("=IFERROR(AVERAGEIF(" + s1 + "!D:D,\"" + domains[i] + "\"," + s1 + "!L:L),\"\")");
  }

  sheet.setColumnWidth(1, 350);
  sheet.setColumnWidth(2, 120);
  sheet.setColumnWidth(3, 120);
  sheet.setColumnWidth(4, 150);
}

/* ──────────────────────── HELPERS ──────────────────────── */

function getOrCreateSheet_(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function formatSheet_(sheet, cols, rows) {
  var headerRange = sheet.getRange(1, 1, 1, cols);
  headerRange.setFontWeight("bold")
    .setBackground("#4472C4")
    .setFontColor("#FFFFFF")
    .setHorizontalAlignment("center");
  sheet.setFrozenRows(1);
  if (rows > 1) {
    var dataRange = sheet.getRange(2, 1, rows - 1, cols);
    dataRange.setBorder(true, true, true, true, true, true);
  }
  sheet.autoResizeColumns(1, Math.min(cols, 8));
}

/* ──────────────────────── DATA ──────────────────────── */

function getMainTasks_() {
  return [
    ["tb-algorithm-design-adversarial-temporal-hypergraph-medium","a9e7f629-dc0a-4ac8-bb64-294a93ef42d1","Algorithm Design","medium","Mentesnot Sibatu","Unknown","https://drive.google.com/file/d/1u7LeMUtVTQ8v7fknpZ_oDfeOentFeHRE/view?usp=drive_link"],
    ["tb-algorithm-design-astar-pathfinding-medium","e7f8a9b0-c1d2-4e3f-8a9b-0c1d2e3f4a5b","Algorithm Design","medium","Zachary Kibathi","Unknown","https://drive.google.com/file/d/1PKkO53JTa8u1PrAySh9FflFQZ0S-U0pT/view?usp=drive_link"],
    ["tb-algorithm-design-build-dependency-graph-scheduler-medium","513bf4b4-4c06-40f2-a795-d3d16329aa89","Algorithm Design","medium","Stephen Kinuthia","Unknown","https://drive.google.com/file/d/1GL-p703PmYENGnW8q7HNE1US19Iwxt5o/view?usp=sharing"],
    ["tb-algorithm-design-cache-policy-medium","b7d3f8a1-9e2c-4b5d-a8f1-3c7e9d2b4a6f","Algorithm Design","medium","Daksh Prajapati","Abdullah Chaudhary","https://drive.google.com/file/d/1qMoe3kS3gtHN5Oqb5Y25JWTfvvGrJzxt/view?usp=sharing"],
    ["tb-algorithm-design-constraint-propagation-scheduler-hard","9e148ce2-5a6a-42e7-9aea-3539fbd8870f","Algorithm Design","hard","Shadaab Rajbarbhuiya","Unknown","https://drive.google.com/file/d/1SU_QK3__M_4bkq7PqprJhgOhfysWlnDv/view?usp=drive_link"],
    ["tb-algorithm-design-dependency-resolver-medium","499488e5-8dd0-44e3-85a2-1de7be69867c","Algorithm Design","medium","Daksh Prajapati","abdullah.c1@turing.com","https://drive.google.com/file/d/1GHcw7d0lgO2cIR9QwNy-NlK4-Srf57wX/view?usp=sharing"],
    ["tb-algorithm-design-intrusion-scanner-hard","b8f3c9d2-7a41-4e5b-9c8d-3f2e1a6b4d5c","Algorithm Design","hard","Daksh Prajapati","abdullah.c1@turing.com","https://drive.google.com/file/d/1Ay3Bb5MTW4sFCiJ_CDDK3rLO8a0RIRWi/view?usp=sharing"],
    ["tb-algorithm-design-investment-portfolio-knapsack-optimizer-hard","0e9a6485-2e97-4b9e-a28e-3a560addde18","Algorithm Design","hard","Muhammad Ishmal","Unknown","https://drive.google.com/file/d/1MdXTL-VBqfCf30DwBPcaWJaotJr8Engb/view?usp=sharing"],
    ["tb-algorithm-design-job-optimization-medium","d53c2230-9c00-4063-9f64-3ae60285535c","Algorithm Design","medium","Daksh Prajapati","abdullah.c1@turing.com","https://drive.google.com/file/d/13LnjbhjbS2hhw8sRjp4EyQkBLmJsIKnP/view?usp=sharing"],
    ["tb-algorithm-design-loading-optimization-medium","b7c3e9f2-4d8a-11ef-9c3e-0242ac120002","Algorithm Design","medium","Daksh Prajapati","Abdullah Chaudhary","https://drive.google.com/file/d/10WxUXiOceOS1nr85gYQbkvvUoZ2Oh8uN/view?usp=sharing"],
    ["tb-algorithm-design-routing-algorithm-debug-medium","542b5691-9615-4f4d-8bac-dedd77219d6f","Algorithm Design","medium","Daksh Prajapati","Abdullah Chaudhary","https://drive.google.com/file/d/1v0PZ50lZGdyS0eTI12Gvh8fnzj0LuLhI/view?usp=sharing"],
    ["tb-algorithm-design-self-referential-adversarial-system-reconstruction-medium","3b60b71b-9fb6-4aed-bfb1-24e39a3223f2","Algorithm Design","medium","Mentesnot Sibatu","Unknown","https://drive.google.com/file/d/1YqZjbVIc02xiJNs2_qZWIr-tPzVmgpD_/view?usp=drive_link"],
    ["tb-algorithm-design-task-scheduler-dependencies-medium","404ea57c-31f7-4854-8bd1-c2fc76ffbdf8","Algorithm Design","medium","Suresh H","Abdullah Chaudhary","https://drive.google.com/file/d/1nGxgbF1yn-QMT8KkV2kni5t4dKnmNLGb/view?usp=drive_link"],
    ["tb-algorithm-design-warehouse-routing-path-costs-medium","9f837dd4-6bf1-412d-9683-8f4934f1ee51","Algorithm Design","medium","Mateeh Ullah","Abdullah Chaudhary","https://drive.google.com/file/d/1C3maTcTqfe40oOJL3LMqrJ6mWG0UjkYn/view?usp=drive_link"],
    ["tb-application-development-app-log-analyzer-medium","4a022b93-97c2-4b37-ad5d-6ae35eb8e3fc","Application Development","medium","Zulqarnain Abbas","Abdullah Chaudhary","https://drive.google.com/file/d/188dW48SCjP5_zH2vKlGSIqGMrMeooL1F/view?usp=sharing"],
    ["tb-application-development-billing-reconciler-medium","9d3f2b8c-2f31-4d1a-9f0a-cedecbe4a91d","Application Development","medium","Suresh H","abdullah.c1@turing.com","https://drive.google.com/file/d/17TYrmCa1CC7BCjucPqrBhlgCQH5sbdoI/view?usp=drive_link"],
    ["tb-application-development-ecommerce-error-trace-analysis-medium","71184b49-996c-4127-86e5-126709f2f9bc","Application Development","medium","Zulqarnain Abbas","Abdullah Chaudhary","https://drive.google.com/file/d/1s3B8a8DgFB_fO4N3Vpix6a4hLjsRmKIt/view?usp=sharing"],
    ["tb-application-development-event-bus-analyzer-hard","e4a71c9d-5f28-4b3e-a196-8d3f72e0","Application Development","hard","Mateeh Ullah","Unknown","https://drive.google.com/file/d/1kqxcHyZuQylQiMfsJ5VMldDRafdK3ZGs/view?usp=sharing"],
    ["tb-application-development-incident-drill-packet-builder-medium","67c4b366-5418-48ce-b73c-180a105ab03a","Application Development","medium","Shadaab Rajbarbhuiya","Abdullah Chaudhary","https://drive.google.com/file/d/1qmQfuj_Sky9eNoISrU7JC6oubiAQ2WQm/view?usp=drive_link"],
    ["tb-application-development-lanterndocs-doc-portal-generator-hard","ec9a2789-5dea-4bc5-9846-442bc6571e7e","Application Development","hard","Shadaab Rajbarbhuiya","abdullah.c1@turing.com","https://drive.google.com/file/d/1CFE8NaVPUbddDW5HQ66sVcDZUnlGJJEw/view?usp=drive_link"],
    ["tb-application-development-legacy-log-analyzer-hard","0ef7007f-4e60-4948-b32e-d4c845667937","Application Development","hard","Zulqarnain Abbas","abdullah.c1@turing.com","https://drive.google.com/file/d/1YbGB18Eqfd_E-sjDY3zSjLbpURryyEnB/view?usp=sharing"],
    ["tb-application-development-maintenance-log-analyzer-medium","783ae207-14bc-40e8-b494-494bb6ea6caf","Application Development","medium","Zulqarnain Abbas","Abdullah Chaudhary","https://drive.google.com/file/d/1kFEDdEWGdpGagXBKuotpeE7BYhhIwJKf/view?usp=sharing"],
    ["tb-application-development-pipeline-transaction-reconciliation-hard","d64cfcc9-786b-458a-95da-1578ba1240ab","Application Development","hard","Opeyemi Odebode","Unknown","https://drive.google.com/file/d/1tkd4suwc2fxCKIleiAeOELvdOF8_ENkk/view?usp=sharing"],
    ["tb-application-development-product-revenue-auditor-medium","58685890-99af-460c-a7fb-5048c7bfc99f","Application Development","medium","Zulqarnain Abbas","Abdullah Chaudhary","https://drive.google.com/file/d/1gcl4DXzV0NK8hRDmc7-Stm7g2jG3Eb4j/view?usp=sharing"],
    ["tb-application-development-release-orchestration-regression-fix-medium","a9080ab4-3d3e-4a21-a841-ed300d045a39","Application Development","medium","Shadaab Rajbarbhuiya","Abdullah Chaudhary","https://drive.google.com/file/d/1JxcJExLFM8jTGcLUAgyYk1VugQoLOZ1u/view?usp=drive_link"],
    ["tb-application-development-release-wave-impact-orchestrator-medium","fc1ce110-337e-4940-bc39-eeb53f987506","Application Development","medium","Shadaab Rajbarbhuiya","Unknown","https://drive.google.com/file/d/1HCtY8dPqJirDK_CbRQTdsiPBumMpOt0R/view?usp=drive_link"],
    ["tb-application-development-service-registry-recovery-medium","8e208e7f-7405-4135-8663-f73e57510c63","Application Development","medium","Mateeh Ullah","abdullah.c1@turing.com","https://drive.google.com/file/d/1bIkpQnWHsOpCILUDGSU92izPRP0CZAEk"],
    ["tb-application-development-webhook-retry-scheduler-medium","e6dc5d60-2c61-4c23-b48c-5986d8860032","Application Development","medium","Shadaab Rajbarbhuiya","Abdullah Chaudhary","https://drive.google.com/file/d/1EGgutxdgehXT3skjITJKdScHNsE6NoSw/view?usp=drive_link"],
    ["tb-build-and-deployment-artifact-signature-budget-gate-medium","dd7106c1-92ca-4ceb-a8c9-65b631096b00","Build & Deployment","medium","Suresh H","Unknown","https://drive.google.com/file/d/1QW6dFxJ2CGRbAk44ofIh3dFS4Cb-DWcU/view?usp=drive_link"],
    ["tb-build-and-deployment-build-artifact-dedup-auditor-medium","4633e8db-f04d-4949-bc89-57329df6a4d6","Build & Deployment","medium","Suresh H","abdullah.c1@turing.com","https://drive.google.com/file/d/1lB7Tb1J_KUpMXQm0cca2fVJq-6KwCImI/view?usp=drive_link"],
    ["tb-build-and-deployment-build-log-root-cause-analyzer-medium","f805adc6-4e44-4053-a38e-f8d135363ea5","Build & Deployment","medium","Shadaab Rajbarbhuiya","Unknown","https://drive.google.com/file/d/1JWYuAdAOCzSYUiWJu9mldwxV-oQkqUwy/view?usp=drive_link"],
    ["tb-build-and-deployment-build-pipeline-run-analyzer-medium","ca940b0f-2557-454f-aa5c-2bb57be86b7c","Build & Deployment","medium","Mateeh Ullah","abdullah.c1@turing.com","https://drive.google.com/file/d/1ZQGTyemUR53fDYWJjf9YLCPkDghiVUb3/view?usp=drive_link"],
    ["tb-build-and-deployment-cicd-build-failure-diagnosis-medium","52b7adae-f40c-4389-9f18-36f44e98840d","Build & Deployment","medium","Zulqarnain Abbas","abdullah.c1@turing.com","https://drive.google.com/file/d/1T17bcvP_SuHaIYxuQCbMNUo5SddLqKng/view?usp=sharing"],
    ["tb-build-and-deployment-container-build-manifest-reconciler-hard","00512870-e79c-4368-8555-543192c41456","Build & Deployment","hard","Mateeh Ullah","Abdullah Chaudhary","https://drive.google.com/file/d/1fk4mugS4Jcu77RkQvZ940LAzsOvR8otN/view?usp=drive_link"],
    ["tb-build-and-deployment-deployment-config-drift-reconciler-medium","5fa929ed-0284-4827-829f-b1f956506bbb","Build & Deployment","medium","Shadaab Rajbarbhuiya","Unknown","https://drive.google.com/file/d/1C2JIdStFmhAO5op3ED2u8ZupA9OUlSJI/view?usp=drive_link"],
    ["tb-build-and-deployment-deployment-db-outage-forensics-medium","3f1a2b9c-8f4e-4d1b-9c2e-5f6a7b8c9d0e","Build & Deployment","medium","Zulqarnain Abbas","Unknown","https://drive.google.com/file/d/1MBuZHn0NmjdQuqeYZotKTtgb7pJh08wE/view?usp=sharing"],
    ["tb-build-and-deployment-deployment-wave-planner-hard","e7f87549-2833-41cb-9f4d-6c22df60548d","Build & Deployment","hard","Mateeh Ullah","Unknown","https://drive.google.com/file/d/12i8DVzFe4X9qXy0wyetzgqicVaB8nZyF/view?usp=sharing"],
    ["tb-build-and-deployment-pipeline-bottleneck-profiler-medium","9ea9db7c-847c-4471-aec8-955d830c40b8","Build & Deployment","medium","Shadaab Rajbarbhuiya","Unknown","https://drive.google.com/file/d/1MI_uRLuE4SGBlmQZX1LyscwAYw-iIsZi/view?usp=drive_link"],
    ["tb-build-and-deployment-pipeline-build-graph-analyzer-medium","f8d474c9-c412-4076-ad10-f92c3529c4e8","Build & Deployment","medium","Shadaab Rajbarbhuiya","Unknown","https://drive.google.com/file/d/1NubJrH-jpSV_Np26SRmGv-vRU-r5ERju/view?usp=drive_link"],
    ["tb-build-and-deployment-pipeline-config-dependency-auditor-medium","a1623fb3-72c6-4003-ad44-de76abd685e4","Build & Deployment","medium","Mateeh Ullah","abdullah.c1@turing.com","https://drive.google.com/file/d/1cS0uNmRDket-3itq6zXi8Y_OvNio6fVh/view?usp=sharing"],
    ["tb-build-and-deployment-release-channel-attestation-gate-medium","8cc3cba7-8690-4810-b0b8-49ae94165b0f","Build & Deployment","medium","Suresh H","Unknown","https://drive.google.com/file/d/1C8PcDDi-VTh9NX6OGZFkX-T89L1bbGg_/view?usp=drive_link"],
    ["tb-build-and-deployment-release-promotion-policy-gatekeeper-hard","4fc26b71-30f3-4ce1-9710-7b1b38f2197b","Build & Deployment","hard","Suresh H","abdullah.c1@turing.com","https://drive.google.com/file/d/1YlNT3VmPovzRO0hoJe87s9Qk8cJXHbBs/view?usp=drive_link"],
    ["tb-data-analysis-ab-test-experiment-audit-medium","7258c5c1-062e-4f50-b65f-c60288aac341","Data Analysis","medium","Mohit Gupta","Unknown","https://drive.google.com/file/d/17LvBV12ZnC35RzAuoOzx4dKkSsXBip6D/view?usp=sharing"],
    ["tb-data-analysis-anomaly-checker-hard","04e08591-1f95-4725-b7f9-d3f8d3442f96","Data Analysis","hard","Aitzaz Hassan","Unknown","https://drive.google.com/file/d/1HEvG5bZBYbLtk4H65SKxlHPu6W4YkpXR/view?usp=sharing"],
    ["tb-data-analysis-fare-capping-compliance-medium","abbde0a1-1e10-4741-8543-c6c434b2ff8b","Data Analysis","medium","Kazim Hussain","Unknown","https://drive.google.com/file/d/1NWMQCf6zW-KAdlH9L877SSBoXoqFPw22/view"],
    ["tb-data-analysis-hospital-readmission-cost-analysis-medium","2d0c1024-a26f-404e-ad67-f48ea3eccb95","Data Analysis","medium","Masoob Alam","Nikhil Korandla","https://drive.google.com/file/d/1ERhkwK1X7yWpeRdOrYuEVVLBxcbC6wCl/view?usp=sharing"],
    ["tb-data-analysis-hotel-revenue-operations-medium","5b789afd-5b71-4c12-b820-733952465625","Data Analysis","medium","Masoob Alam","nikhil.k5@turing.com","https://drive.google.com/file/d/1DO7vE2hq6AtvAyLDbCJx9HEHGGhTWQ4V/view?usp=drive_link"],
    ["tb-data-analysis-insurance-claim-adjudication-hard","d3a1f8e2-7c4b-4e9a-b5d6-1f2a3b4c5d6e","Data Analysis","hard","Shivam Shrivastava","Unknown","https://drive.google.com/file/d/1oSOoE-C7s7zHg_OdANn6Ty-JOxYgmez5/view?usp=sharing"],
    ["tb-data-analysis-olympic-medal-fairness-score-medium","9f8b618d-c6d3-4aa2-a7f6-39374ba6e9d5-terminal-bench-olympic-medal-fairness-score-medium","Data Analysis","medium","Kazim Hussain","nikhil.k5@turing.com","https://drive.google.com/file/d/1W0qdGeZmIq3FuZ4ZoU7L8LaXcREMFwPc/view"],
    ["tb-data-analysis-risk-audit-behavior-analysis-medium","ae25e979-c2e7-4f91-8b6f-80a679d31734","Data Analysis","medium","Mohit Gupta","Unknown","https://drive.google.com/file/d/160okYbNcX5BqFwy6FCJpdYruLlMR4gD_/view?usp=drive_link"],
    ["tb-data-analysis-rolling-window-bug-medium","185dee88-5fe4-42e8-a473-87944ac3bfdf","Data Analysis","medium","Kazim Hussain","Unknown","https://drive.google.com/file/d/13ZucwwfI16sEaYopbaK9mRzfBO7ZP3cD/view"],
    ["tb-data-analysis-saas-mrr-churn-analysis-medium","70c21d44-3402-4f1a-ab1b-12fa95eedc7a","Data Analysis","medium","Masoob Alam","nikhil.k5@turing.com","https://drive.google.com/file/d/1v_11wyLEaJ2CeGOhKm9eT8RpJYIfiWqX/view?usp=sharing"],
    ["tb-data-analysis-scrna-cell-gene-graph-clustering-medium","925074db-4334-4e9b-a962-75f0f03f6273","Data Analysis","medium","Shiva Kumar","Unknown","https://drive.google.com/file/d/1jflhheVvQ9gp5vxPUeCeGqI1XSSDx6nj/view?usp=sharing"],
    ["tb-data-analysis-sensor-time-series-narrative-summarizer-medium","4634efd7-ed4d-4aff-92e2-864266158353","Data Analysis","medium","Aitzaz Hassan","Unknown","https://drive.google.com/file/d/1zFky9rV63SK00Tzpov7etYhg8IHRQ43W/view?usp=sharing"],
    ["tb-data-analysis-temporal-stability-anomaly-analysis-medium","e717855f-0f5d-42e9-adcb-9c8ecc15ed7c","Data Analysis","medium","Mohit Gupta","Unknown","https://drive.google.com/file/d/1ibouEuVkdeGAwXp_OJiQQdrcvu3U7csP/view?usp=drive_link"],
    ["tb-data-analysis-warehouse-inventory-reconciliation-medium","6f82a4b1-3c2e-4f9a-8d1b-9e4a7c5f2d8a","Data Analysis","medium","Shivam Shrivastava","Nikhil Korandla","https://drive.google.com/file/d/1bo-YhbvUdQ2I8H02hjgwAO7144LbTT5V/view?usp=sharing"],
    ["tb-data-preprocessing-clinical-trial-preprocessing-medium","239b2548-cc5f-4eb8-873c-63e7e816a46a","Data Preprocessing","medium","Shivam Shrivastava","nikhil.k5@turing.com","https://drive.google.com/file/d/1u-OU2afJM-H4AX9HJeoahvdMX-sP3HBd/view?usp=sharing"],
    ["tb-data-preprocessing-ecommerce-order-analytics-medium","b91a5a8d-bdd5-40da-bf3d-4a5df436e723","Data Preprocessing","medium","Aitzaz Hassan","Unknown","https://drive.google.com/file/d/1xzhflnQeE5NR2lZKkhjuScmDmL6G2qRJ/view?usp=sharing"],
    ["tb-data-preprocessing-ecommerce-transaction-reconciliation-hard","62e85496-e65c-41ae-92f8-7f8071cc53de","Data Preprocessing","hard","Aitzaz Hassan","Unknown","https://drive.google.com/file/d/1Oh4LN_3XOQC9CgCGgV_51U8g-oPu8Kvy/view?usp=sharing"],
    ["tb-data-preprocessing-employee-directory-merge-medium","9e7c286a-024c-43ad-9977-6d095b456016","Data Preprocessing","medium","Masoob Alam","nikhil.k5@turing.com","https://drive.google.com/file/d/1477Qh4lKGHlTOQBS8p6WU1G0qSxAjTkM/view?usp=drive_link"],
    ["tb-data-preprocessing-employee-performance-preprocessing-medium","a7d8b0cd-2b44-48b1-9354-04f73e9f251a","Data Preprocessing","medium","Shivam Shrivastava","nikhil.k5@turing.com","https://drive.google.com/file/d/1XH7GlHdRY5qPGrRRgL4nJVzgy83VZEKM/view?usp=sharing"],
    ["tb-data-preprocessing-engagement-preprocessing-weighted-ctr-medium","fe6ccb67-f672-451a-bb9c-eb085126ca17","Data Preprocessing","medium","Mohit Gupta","Unknown","https://drive.google.com/file/d/1kuvRFMgQP80kEjx4e-C-R2dQ_5NZZvh0/view?usp=sharing"],
    ["tb-data-preprocessing-fleet-maintenance-mileage-reconciliation-medium","8993f688-829c-46b5-b567-2258634887a3","Data Preprocessing","medium","Masoob Alam","Unknown","https://drive.google.com/file/d/1uNQdQH62Ao9jjqhpKAaPKoOlnLPDcOul/view?usp=sharing"],
    ["tb-data-preprocessing-hospital-patient-data-cleaning-medium","82726791-4456-4e0e-bb97-4cc71c64a7dd","Data Preprocessing","medium","Aitzaz Hassan","Unknown","https://drive.google.com/file/d/13gm5zTxY70Sga4ysk4j6f6o3k0dwWTcw/view?usp=sharing"],
    ["tb-data-preprocessing-iot-sensor-preprocessing-medium","66271a1d-70f7-4538-aef3-4e7e3e193ed0","Data Preprocessing","medium","Mohit Gupta","Unknown","https://drive.google.com/file/d/1njD5zQwpTDXGi1NxaQo9JVs_0-Rf0wOA/view?usp=drive_link"],
    ["tb-data-preprocessing-json-env-interpolation-resolver-hard","e413b3e9-7860-49d0-a782-77fd1e0a8132","Data Preprocessing","hard","Aitzaz Hassan","Unknown","https://drive.google.com/file/d/1Pdv1XwWTU5zdsJkbPOE6CXaCrYLzNcbP/view?usp=sharing"],
    ["tb-data-preprocessing-log-latency-pipeline-medium","6951ee52-2ceb-4792-86da-03d053ce63b9","Data Preprocessing","medium","Mohit Gupta","Unknown","https://drive.google.com/file/d/1q49oi6eiZqlAtwA0nD72KS5T82dYafH9/view?usp=sharing"],
    ["tb-data-preprocessing-multi-branch-payroll-preprocessing-medium","7cf294bc-c004-4c34-8a00-165cc941d091","Data Preprocessing","medium","Masoob Alam","nikhil.k5@turing.com","https://drive.google.com/file/d/1JmVLj7qVfWVLM_T2vs1lFVAwxJgsQw_R/view?usp=sharing"],
    ["tb-data-preprocessing-utility-consumption-preprocessing-medium","2ca9a090-e8d8-45f4-babd-08a3fc08a9ee","Data Preprocessing","medium","Masoob Alam","Unknown","https://drive.google.com/file/d/1Tx2VtkfTigTYDLBVTeOpuSN-1p0isvGS/view?usp=sharing"],
    ["tb-data-preprocessing-warehouse-inventory-rebalancing-medium","7c04c1af-744b-46a9-9a87-a7e666ad0ad0","Data Preprocessing","medium","Masoob Alam","nikhil.k5@turing.com","https://drive.google.com/file/d/1kCUFbJeAejA7og2YZlgSf8LA80-lJaIV/view?usp=sharing"],
    ["tb-data-querying-airport-flight-delay-query-medium","b2f01580-82ca-43ed-a2fd-a71335600250","Data Querying","medium","Aitzaz Hassan","Unknown","https://drive.google.com/file/d/1xGV8jv5ZyGd9c-EpuObIj0GM9dMfeed7/view?usp=sharing"],
    ["tb-data-querying-calendar-conflict-detection-medium","c7e2a9f4-8d3b-4a1c-b5e6-2f9d8c4a7e3b","Data Querying","medium","Shivam Shrivastava","nikhil.k5@turing.com","https://drive.google.com/file/d/1OnPpODkZiPDPHYKrz920PdOAA2ZANqCc/view?usp=sharing"],
    ["tb-data-querying-carrier-logistics-performance-scorecard-medium","6757c4cf-2eb9-4c35-a7f1-13bf804d35cb","Data Querying","medium","Muhammad Labeeb Tariq","Unknown","https://drive.google.com/file/d/1YoX1ZLCo-nTEz2vdA2bX1MDsfKJ8dGKs/view?usp=sharing"],
    ["tb-data-querying-crm-churn-analysis-hard","82d8972e-9a52-4a44-b800-f5b2980ad1c8","Data Querying","hard","Shivam Shrivastava","Nikhil Korandla","https://drive.google.com/file/d/1U-y_sg2WB8gwhuD_Sp2Y78gCQXj_Ra3i/view?usp=sharing"],
    ["tb-data-querying-ecommerce-analytics-query-medium","647aa3e2-34b5-4452-b92a-8c6be0887bf4","Data Querying","medium","Aitzaz Hassan","Unknown","https://drive.google.com/file/d/17XI-Bogri5yHa4jkN8vqlkbyY5mBxGM4/view?usp=sharing"],
    ["tb-data-querying-ecommerce-fulfillment-analysis-medium","ee33fa74-96dd-4ac6-825e-fb71dfba5444","Data Querying","medium","Mohit Gupta","Unknown","https://drive.google.com/file/d/1GzGz2VVXLuN-HHYlFwDSLLHAnp4uNmhy/view?usp=sharing"],
    ["tb-data-querying-expense-flagging-medium","cc4d2e8b-9e3f-4a1c-b5e6-2f9d8c4a7e3b","Data Querying","medium","Shivam Shrivastava","nikhil.k5@turing.com","https://drive.google.com/file/d/1ekiT76fAIydO8YCN91KeOnKdfnxS9dkN/view?usp=sharing"],
    ["tb-data-querying-freight-shipping-invoice-hard","91252c85-5927-4a1f-9538-95bd4efde7fc","Data Querying","hard","Shivam Shrivastava","Unknown","https://drive.google.com/file/d/1rBKjBoMVCc3Y0Cw8z3yLNtcWiCnQSMFI/view?usp=sharing"],
    ["tb-data-querying-library-overdue-fines-medium","8fd08fea-7793-479f-927d-7140121942fc","Data Querying","medium","Masoob Alam","Unknown","https://drive.google.com/file/d/1EpUzcgQlOSzSwbEJZf1z9Dj8RofHB9rb/view?usp=drive_link"],
    ["tb-data-querying-payroll-timesheet-audit-medium","d33a50fe-71a3-4811-a90b-01a89716a027","Data Querying","medium","Masoob Alam","nikhil.k5@turing.com","https://drive.google.com/file/d/1HRIYY-j5OB5M15kB1AiWpYbxo3J_Y6FS/view?usp=drive_link"],
    ["tb-data-querying-security-log-analysis-medium","95814111-cce1-4c50-8438-7e4857ba3abd","Data Querying","medium","Masoob Alam","Nikhil Korandla","https://drive.google.com/file/d/1gKmJdy8ZKxbsscWqbO5DjIRDakWoVJHD/view?usp=drive_link"],
    ["tb-data-querying-subscription-usage-reconciliation-audit-medium","4a9977fe-55da-4bde-ac96-5df757424c3a","Data Querying","medium","Mohit Gupta","Unknown","https://drive.google.com/file/d/1dpguqIX0rmNQMhs63m2Ir-a_2UF4e2_f/view?usp=drive_link"],
    ["tb-data-querying-temporal-drift-ab-test-hard","5e95dd09-3772-4b83-8cc9-c093f2f517f5","Data Querying","hard","Shiva Kumar","Unknown","https://drive.google.com/file/d/1xC9eIkPq8q6pdpNu3r40SuddTFwsnNcU/view?usp=sharing"],
    ["tb-data-querying-transaction-reconciliation-medium","1e6ec402-9efc-4921-9f2b-4c5c2a0a459d","Data Querying","medium","Masoob Alam","nikhil.k5@turing.com","https://drive.google.com/file/d/1aaNrPC0JoA0yOZtuXyNYRayaGoAkB7Zr/view?usp=drive_link"],
    ["tb-data-science-drift-diagnose-recover-medium","555c4d17-d15c-4ed8-bdd3-b80be01ad97a","Data Science","medium","Kazim Hussain","Nikhil Korandla","https://drive.google.com/file/d/1somE9IOGUPk1eMrdCf-wmyY98Nj3MBqD/view"],
    ["tb-data-science-earthquake-catalog-analysis-medium","a50c20ce-1ba9-499a-ae84-b736846761a6","Data Science","medium","Kazim Hussain","nikhil.k5@turing.com","https://drive.google.com/file/d/1-44g-W6V5fFwQzEIkNwiS95w7GaLmLqX/view"],
    ["tb-data-science-federated-learning-dp-gradient-clipping-aggregation-hard","e9c8cd3b-2947-4ef0-bd6f-1334526091e4","Data Science","hard","Shiva Kumar","Unknown","https://drive.google.com/file/d/1eAeVys5xPoGpe0Yxq6mCDLbtDfpytFMN/view?usp=sharing"],
    ["tb-data-science-greenhouse-humidity-drift-detection-medium","c924aba1-e001-4607-80e9-48459d746c0c-terminal-bench-greenhouse-humidity-drift-detection-medium","Data Science","medium","Kazim Hussain","nikhil.k5@turing.com","https://drive.google.com/file/d/1hJOoPtVbVgvgh6ARjRjEZrbOjREUM2hE/view"],
    ["tb-data-science-legacy-servo-filter-response-analysis-medium","1b3232d9-bb93-45b4-9614-55a402905fd9","Data Science","medium","Kazim Hussain","Nikhil Korandla","https://drive.google.com/file/d/14xmYFSkPsI7dZCoohbqGjRKaIaX0Mv1F/view"],
    ["tb-data-science-medical-device-survival-analysis-medium","dc2bcb79-da1b-4267-a631-bbbd0ea4424d","Data Science","medium","Shiva Kumar","Unknown","https://drive.google.com/file/d/1ITSq5QYtkz0TLBCsSRORGyCxjil8AtUl/view?usp=sharing"],
    ["tb-data-science-mobile-value-score-pipeline-medium","fabc9f79-951b-4b1a-ab08-168ed08356f4","Data Science","medium","Kazim Hussain","Unknown","https://drive.google.com/file/d/14TY1uZfLgTNz4cSwimh-AxKeAYdvFTt7/view"],
    ["tb-data-science-pandas-dataframe-cleaner-medium","47fa7286-d034-4ea6-a44e-a40db8f30ba2","Data Science","medium","Aitzaz Hassan","Unknown","https://drive.google.com/file/d/1YsOUKxrAy4-MFKo_ggk-Rvo07MPKE9it/view?usp=sharing"],
    ["tb-data-science-protein-audit-reconciliation-medium","bbfe29f5-3845-40ea-a05b-531563e30c4d","Data Science","medium","Kazim Hussain","nikhil.k5@turing.com","https://drive.google.com/file/d/1Yrvj92KmqQYmTnLIx_U84XYayIh707Yc/view"],
    ["tb-data-science-regional-fleet-telemetry-mileage-calculation-hard","25a047bd-044d-4e4f-8ae1-2e72f2e7f02f","Data Science","hard","Kazim Hussain","nikhil.k5@turing.com","https://drive.google.com/file/d/1kT-AexpF8VHncnd5Vu-Z8VFJDRxqoCka/view"],
    ["tb-data-science-retail-logic-bomb-medium","e9609b99-c690-4cc8-8ff0-3c822aeae407","Data Science","medium","Kazim Hussain","Unknown","https://drive.google.com/file/d/1h-JAtmn3ULovOZhrdTzE4uGsawW250x7/view"],
    ["tb-data-science-revenue-recognition-hard","dbb4435d-61f1-45fe-8ccd-a9c0197b44c9","Data Science","hard","Shivam Shrivastava","Unknown","https://drive.google.com/file/d/1DrvUALXm24Shtotr1_d8WDV3-G_ub_xm/view?usp=sharing"],
    ["tb-data-science-supply-chain-inventory-reconciliation-medium","f2ffb205-03e8-4d19-83d4-3f9a8ebad121","Data Science","medium","Aitzaz Hassan","Unknown","https://drive.google.com/file/d/1-aA3gDdnmc1Xj8zIUxGjiB-cQ1lXSHcR/view?usp=sharing"],
    ["tb-data-science-telecom-modem-failure-prediction-lagging-feature-trap-medium","5daecc42-4e3b-4d27-bf28-971758c81ccc","Data Science","medium","Shiva Kumar","Unknown","https://drive.google.com/file/d/146tcwxGH-GKmc7MoO5P2DWC-OG8_Tl52/view?usp=sharing"],
    ["tb-debugging-connection-pool-forensics-gate-medium","9b260b6a-83a7-4689-9328-132bd5d11b51","Debugging","medium","Suresh H","Unknown","https://drive.google.com/file/d/11sqG3A3LG1Aqi5_unNBYjKejJ7X1s12g/view?usp=drive_link"],
    ["tb-debugging-crash-log-triage-medium","ae2d936e-37c2-4c3a-9adc-ba19fa4420e5","Debugging","medium","Oluwafikayomi Adeleke","tewodros.a@turing.com","https://drive.google.com/file/d/1fFTrAUkxLib2Js_RngyEx04amQOx1gHY/view?usp=sharing"],
    ["tb-debugging-daemon-ci-state-debugger-hard","d9b5c2a1-8e4f-4b3d-a7c8-9e1f2a3b4c5d","Debugging","hard","Zulqarnain Abbas","Unknown","https://drive.google.com/file/d/1E21X4mReWwh5ns0uNn4OQhMcjTZwPbnp/view?usp=sharing"],
    ["tb-debugging-deterministic-replay-event-engine-debugging-medium","9a1677a9-814d-4d45-9fe5-d84f948b28e6","Debugging","medium","Mentesnot Sibatu","Unknown","https://drive.google.com/file/d/1KsdTThWu8XAGYmCLzQO0praV774tVVSS/view?usp=drive_link"],
    ["tb-debugging-distributed-webhook-dispatcher-medium","b7a1f2d4-3e6a-4f53-9a9a-5a2a9f1e7c11","Debugging","medium","Suresh H","abdullah.c1@turing.com","https://drive.google.com/file/d/1wgQ78Ng8VG89wagURcEIWI-sVz7kjAHC/view?usp=drive_link"],
    ["tb-debugging-fix-race-condition-medium","05db3a2c-6ca0-4af9-8724-01e4063abfba","Debugging","medium","Suresh H","abdullah.c1@turing.com","https://drive.google.com/file/d/1okOK61eh95FpzcdFYK2vnUyrSugHJBXu/view?usp=drive_link"],
    ["tb-debugging-fix-refinery-data-integrity-hard","f780fcf5-3e37-48cd-8aaa-ef0a256f92b7","Debugging","hard","Riya Verma","Unknown","https://drive.google.com/file/d/12M1sR204poYUMdCl2flMqmkmoAdC6sgi/view?usp=sharing"],
    ["tb-debugging-graph-repair-medium","757e1e0e-8a02-4b40-a4dd-63b9734dbfce","Debugging","medium","Daksh Prajapati","Unknown","https://drive.google.com/file/d/1DPZkMVW3L0lc_trSj_lX9udOnvJEzVHA/view?usp=sharing"],
    ["tb-debugging-inventory-reconciler-fixer-medium","3a04c5ae-fd4a-4e4e-8dc4-b9a027f5d369","Debugging","medium","Mateeh Ullah","abdullah.c1@turing.com","https://drive.google.com/file/d/1IuhkjgAXiHZy5oT7YWEJkiu4ozgJFLDG/view?usp=sharing"],
    ["tb-debugging-lab-results-report-fixer-medium","f43461df-9f9e-4f4f-be33-55cdb9419f76","Debugging","medium","Mateeh Ullah","Unknown","https://drive.google.com/file/d/1kueVNm1xXABIaUwy5SHmXYtCnTAZTQlp/view?usp=sharing"],
    ["tb-debugging-lease-renewal-journal-replayer-medium","e95e8a1a-ea5c-4434-9ead-77342f7f09e3","Debugging","medium","Suresh H","Unknown","https://drive.google.com/file/d/1GYtveiQZpeLG-nAEw4PhjvBjC6PZNNNV/view?usp=drive_link"],
    ["tb-debugging-log-anomaly-report-fixer-medium","b4e7a2d1-8f3c-4a59-b6e2-1c9d5f0e3a7b","Debugging","medium","Mateeh Ullah","abdullah.c1@turing.com","https://drive.google.com/file/d/1g7gQU1QH8lxt-St1FQ9Qn2TEfh-m3snl/view?usp=drive_link"],
    ["tb-debugging-memory-leak-debugging-medium","b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e","Debugging","medium","Zachary Kibathi","Unknown","https://drive.google.com/file/d/1vIyaJquEoVenKMwfTVm3UxU1JT7SeANe/view?usp=drive_link"],
    ["tb-debugging-structured-bug-report-hard","d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a","Debugging","hard","Zachary Kibathi","Unknown","https://drive.google.com/file/d/1mL3lHEs1XONNvBrOnd9HTBBxOrB9TVca/view?usp=drive_link"],
    ["tb-file-operations-backup-retention-medium","e78ba7c5-5e47-4c29-8f83-83c8efaed522","File Operations","medium","Oluwafikayomi Adeleke","Tewodros Alemu","https://drive.google.com/file/d/1E1cDB-GxambM-VaxzzfeoYIhhLKHaJZA/view?usp=sharing"],
    ["tb-file-operations-clean-asset-library-medium","9cb07521-4050-4356-af9c-c315d7daa8eb","File Operations","medium","Tobi Adebisi","Tewodros Alemu","https://drive.google.com/file/d/1s9ThseXB9HYosOuU1uhfUgeXvIfX9xfk/view?usp=drive_link"],
    ["tb-file-operations-config-file-merger-medium","e69b0703-2609-4533-aeb6-dc532ea84639","File Operations","medium","Oluwafikayomi Adeleke","Tewodros Alemu","https://drive.google.com/file/d/13cQIa43VXHVdEcNQM0qS6LUG1mtQee9P/view?usp=sharing"],
    ["tb-file-operations-document-vault-integrity-audit-medium","87344a18-b14f-44a8-8926-21144a0bf213","File Operations","medium","Opeyemi Odebode","Tewodros Alemu","https://drive.google.com/file/d/1m1YjgPZWmEeu3j-abvBZA7UIGdTv5P9z/view?usp=sharing"],
    ["tb-file-operations-export-pipeline-hard","29cefe9a-3c9d-4856-885b-f053ca0e5617","File Operations","hard","Tobi Adebisi","tewodros.a@turing.com","https://drive.google.com/file/d/1rhCDD6PrpT1rphA3ImB0dtWQ-YmlT8Oq/view?usp=drive_link"],
    ["tb-file-operations-file-dedup-planner-medium","196dc546-2a6b-4d14-8ff9-46ffca603bd8","File Operations","medium","Oluwafikayomi Adeleke","Tewodros Alemu","https://drive.google.com/file/d/1jChwofA93MtW4IBINmfZhIpc6smzOSCs/view?usp=sharing"],
    ["tb-file-operations-file-organize-manifest-medium","415c4fe4-b2e0-43cf-aabd-97332422f92a","File Operations","medium","Ateeb Tahir","tewodros.a@turing.com","https://drive.google.com/file/d/1rPCdbD7epAtL1hQIOXJHf8rnOn7lCRTJ/view"],
    ["tb-file-operations-financial-reconciliation-multi-provider-medium","966349bf-6f74-40b7-a615-30c2bb7d7085","File Operations","medium","Om Rajput","Tewodros Alemu","https://drive.google.com/file/d/1Cb_7M_ldada-Kue3Hp5sKECW5mh0g65n/view?usp=sharing"],
    ["tb-file-operations-log-aggregation-system-medium","a5518c0f-05f6-4757-be06-cf02921fbec9","File Operations","medium","Tobi Adebisi","Tewodros Alemu","https://drive.google.com/file/d/1KzOJL2XQeZr3DarGD40HWan_quryUO4z/view?usp=drive_link"],
    ["tb-file-operations-log-rotation-timeline-index-hard","ff70d238-f641-40bc-a364-c723689f0895","File Operations","hard","Ateeb Tahir","Unknown","https://drive.google.com/file/d/14-kJe9y48Hh9tdHfSlmyWf1hH7JjPfYF/view?usp=drive_link"],
    ["tb-file-operations-overlay-layer-merge-forensics-hard","7b441542-435d-4516-97ce-a2a7ab48cd76","File Operations","hard","Opeyemi Odebode","tewodros.a@turing.com","https://drive.google.com/file/d/1MmSfI_A1FxwWLl2tPf3AzPPI0CZlf-Cr/view?usp=sharing"],
    ["tb-file-operations-reorganize-log-archive-medium","f2fabc37-503e-4768-a9e5-2b4c3dda2b4f","File Operations","medium","Tobi Adebisi","Tewodros Alemu","https://drive.google.com/file/d/1BPER7iPolWv-VjVmsJwudyAZstvwB7AQ/view?usp=drive_link"],
    ["tb-file-operations-repo-storage-audit-medium","b1fecd8b-5d8a-4507-984f-db56bf54eced","File Operations","medium","Opeyemi Odebode","Tewodros Alemu","https://drive.google.com/file/d/1BhKsk0_mHq_Crww03mLqZWiyPoN10bQj/view?usp=sharing"],
    ["tb-file-operations-snapshot-diff-medium","972c2f1b-859b-4093-8387-096a52fbde02","File Operations","medium","Oluwafikayomi Adeleke","Tewodros Alemu","https://drive.google.com/file/d/14nm6St2hi_DkEGhgdSZpckltHfWjsyFh/view?usp=sharing"],
    ["tb-file-system-audit-directory-permissions-medium","a38cfeaf-e545-4aee-9980-53c5949787a5","File System","medium","Toygar Aksoy","Unknown","https://drive.google.com/file/d/1FR0FCFXHB4_dAiwZsXrx3fIilsW85t8i/view?usp=drive_link"],
    ["tb-file-system-backup-evidence-epistemic-audit-hard","4856fb24-36a1-4d52-a356-c21ea6bd4c4d","File System","hard","Om Rajput","tewodros.a@turing.com","https://drive.google.com/file/d/1Kcuod9Ppzv8xZL3uCe1Qu7I2A02KvtKx/view?usp=sharing"],
    ["tb-file-system-cross-cloud-object-store-reconcile-medium","34abe509-f599-452b-b1cc-eddf77b3a17b","File System","medium","Om Rajput","Tewodros Alemu","https://drive.google.com/file/d/1GvayuC_fYsv2bkvdhf77jbIWx8b78fbw/view?usp=sharing"],
    ["tb-file-system-detect-multienv-config-drift-medium","6da15138-ca5a-4ddc-b9b8-e3520e350143","File System","medium","Toygar Aksoy","Unknown","https://drive.google.com/file/d/1vdyBpsJD4mG4MV4YYEAXIRH-vjc0cErD/view?usp=drive_link"],
    ["tb-file-system-file-integrity-audit-medium","3ceece5c-e29a-463e-bf7c-f61586ece52e","File System","medium","Ateeb Tahir","tewodros.a@turing.com","https://drive.google.com/file/d/1bvkuDBv6vIqRoZX8Yhp3fbdiqqCY9_Za/view?usp=drive_link"],
    ["tb-file-system-inbox-file-sorter-medium","4d1ec974-cf1d-41d1-bca4-92124e6f2094","File System","medium","Tobi Adebisi","Tewodros Alemu","https://drive.google.com/file/d/1UfJHIWNOMSKPsKvDCTX1n_RbkXhXAUK0/view?usp=drive_link"],
    ["tb-file-system-log-audit-consolidation-medium","d09bca0d-f241-4408-a9e9-6971e1c5ebf1","File System","medium","Tobi Adebisi","Unknown","https://drive.google.com/file/d/1qRUBi561SHp8ggyCSdORnRg5j25jjTEY/view?usp=drive_link"],
    ["tb-file-system-multi-host-log-consolidation-medium","9fe459b0-65e1-47b5-ba20-3ff9622bb13a","File System","medium","Om Rajput","Tewodros Alemu","https://drive.google.com/file/d/1keei52v5O_w27YHWu_SYMEzzAyND77g1/view?usp=sharing"],
    ["tb-file-system-phantom-backup-coverage-audit-medium","2b94c9b9-24bf-4bf1-a0a9-d6d1f7e768cb","File System","medium","Om Rajput","tewodros.a@turing.com","https://drive.google.com/file/d/1jQoFEJWDLnsaFQdazSs8oq5_OadoBe8h/view?usp=sharing"],
    ["tb-file-system-reconcile-etl-pipeline-file-flow-medium","e1cc7c38-a3ae-470f-95c0-2964dbe96800","File System","medium","Toygar Aksoy","Unknown","https://drive.google.com/file/d/1kRPBZfPUxe8SkNsSW-GuZV_z3swibdLE/view?usp=drive_link"],
    ["tb-file-system-replay-filewatcher-event-cascade-hard","94115202-ca99-436d-b696-ade577f3f951","File System","hard","Toygar Aksoy","Unknown","https://drive.google.com/file/d/1TvBdNZeTBTvNpibf9nFeEO_QHuAPEBV0/view?usp=drive_link"],
    ["tb-file-system-server-migration-data-org-medium","3948bc89-262d-4149-925d-c38e4c051237","File System","medium","Tobi Adebisi","tewodros.a@turing.com","https://drive.google.com/file/d/1tiuqXpRCC-bjT8xWbZNRwIZlMybxfAVZ/view?usp=drive_link"],
    ["tb-file-system-weather-data-reconcile-medium","717f904d-6856-4baf-b8e9-540522a37625","File System","medium","Ateeb Tahir","tewodros.a@turing.com","https://drive.google.com/file/d/12PmHQsdyhEyJaJ8792wbJftfOPIevI4m/view?usp=drive_link"],
    ["tb-file-system-workspace-migration-cleanup-medium","77ec5a27-07d8-45a4-8c9f-2edf2f94bf1b","File System","medium","Tobi Adebisi","Tewodros Alemu","https://drive.google.com/file/d/1Pd35SfpTAm2QPcU99mm_ySdBDqfRV4Jh/view?usp=drive_link"],
    ["tb-machine-learning-binary-classification-evaluation-medium","378315ae-84f4-44c6-aecc-18127aecaccb","Machine Learning","medium","Muhammad Sial","Estifanos Gashawtena","https://drive.google.com/file/d/1erfNWlgo9BBvRWTwZYNzpMusvqIT5GMG/view"],
    ["tb-machine-learning-churn-model-debug-medium","abe97442-b384-4c8f-9869-9583c0000446","Machine Learning","medium","Amit Jadhav","Unknown","https://drive.google.com/file/d/1FtivMUNokrxsPx2Jk2V_-QyAkPBWsbwb/view?usp=drive_link"],
    ["tb-machine-learning-churn-scoring-lift-ks-evaluation-medium","9e39c629-edb0-406f-97c6-19ed54f2637a","Machine Learning","medium","Muhammad Labeeb Tariq","estifanos.g@turing.com","https://drive.google.com/file/d/1cwxXktg29nd7G3xyXQ7tBwz-ivo3Snkg/view?usp=sharing"],
    ["tb-machine-learning-forecast-backtest-smape-mase-medium","f020c148-7dc0-45ff-b7c2-8d390b2a9340","Machine Learning","medium","Muhammad Labeeb Tariq","Estifanos Gashawtena","https://drive.google.com/file/d/1rDKeKDO6S3hKC6biMuCcobAnHQzgXVAy/view?usp=sharing"],
    ["tb-machine-learning-kmeans-clustering-customer-segmentation-medium","f42b0631-eb9c-4c47-a985-9a83499c3004","Machine Learning","medium","Muhammad Sial","Estifanos Gashawtena","https://drive.google.com/file/d/10foZl-NGIIFNagw1zhR5Ro-JpCsL8pBM/view?usp=drive_link"],
    ["tb-machine-learning-knn-classification-medium","881a4ee6-317a-4107-9672-83b354e51f8c","Machine Learning","medium","Muhammad Sial","estifanos.g@turing.com","https://drive.google.com/file/d/1GHjUFp4whm06lg0sBrx6dAgMftA-8sDA/view"],
    ["tb-machine-learning-logit-drift-audit-medium","be467eab-78f6-4bdb-a546-1a612175098a","Machine Learning","medium","Muhammad Labeeb Tariq","Estifanos Gashawtena","https://drive.google.com/file/d/1xTZB4d5ZuhcaT1QFhiHZGKeNEBtwBKE0/view?usp=sharing"],
    ["tb-machine-learning-model-score-instability-debug-medium","30eb949b-c9bc-4563-92db-08ef17c21dea","Machine Learning","medium","Amit Jadhav","Estifanos Gashawtena","https://drive.google.com/file/d/132gS6icegAIoevdmDRVYrdUsRPgPPS1o/view?usp=drive_link"],
    ["tb-machine-learning-neural-network-mlp-hard","63a65dd1-5dd2-4fbe-8be1-a5dac1ca1bfb","Machine Learning","hard","Muhammad Sial","estifanos.g@turing.com","https://drive.google.com/file/d/1Rms3TV2lYRTMRjn-gYhYZjnUNRObe_VZ/view?usp=drive_link"],
    ["tb-machine-learning-pipeline-drift-calibration-debugger-hard","020b8bd1-6a1b-4af6-a6f4-578123e345bf","Machine Learning","hard","Muhammad Labeeb Tariq","Estifanos Gashawtena","https://drive.google.com/file/d/1qXn3p98latIg6ItEfZtp628agy8HQ0xV/view?usp=sharing"],
    ["tb-machine-learning-ranking-ndcg-map-audit-medium","05068611-0559-4965-ad4d-7672d26f6af9","Machine Learning","medium","Muhammad Labeeb Tariq","Estifanos Gashawtena","https://drive.google.com/file/d/1V5hEizVKFu8E1fMTyC2eHe0VDkLr6usF/view?usp=sharing"],
    ["tb-machine-learning-regression-diagnostics-report-medium","93a3e556-1f8d-46d4-90fe-ec12ebe06531","Machine Learning","medium","Aaweg","Unknown","https://drive.google.com/file/d/1wZVXvAW8MM4foDa7hO6m3NYGgCQklYAe/view?usp=drive_link"],
    ["tb-machine-learning-svm-classifier-hard","53288e9d-f02e-42cd-be10-5b10209192a3","Machine Learning","hard","Muhammad Sial","Unknown","https://drive.google.com/file/d/1rW98nD1lp7XbrH6f7hrbbZD1_Zadnzxw/view?usp=drive_link"],
    ["tb-machine-learning-ticket-routing-logloss-audit-medium","0ed545b3-1ada-4d16-b456-5ce0f09d7455","Machine Learning","medium","Muhammad Labeeb Tariq","Estifanos Gashawtena","https://drive.google.com/file/d/1-txwsnGO7v-f8WRSPlokElvNF8guQkzl/view?usp=sharing"],
    ["tb-mathematics-credit-portfolio-risk-medium","20a40db9-aa7b-4931-9fd3-38f035ba7e7b","Mathematics","medium","Amit Jadhav","","https://drive.google.com/file/d/1D6B8U2SLZOUQIwZr99h6ZpIB5rTuATQq/view?usp=drive_link"],
    ["tb-mathematics-goldbach-conjecture-representation-investigation-hard","6411ffd6-4adb-4a70-be3e-ca27117578e6","Mathematics","hard","Nse-Abasi Etim","estifanos.g@turing.com","https://drive.google.com/file/d/1DRbLGYshUJg4z7CsZ_EbaKlQcVil-srT/view?usp=sharing"],
    ["tb-mathematics-markov-chain-absorption-analysis-medium","c711803b-57cb-4396-ba6c-d9b4b1a79b41","Mathematics","medium","Muhammad Labeeb Tariq","Unknown","https://drive.google.com/file/d/1gvYva3mJgXnqrP52cl1jVgcUjN_GMQMV/view?usp=sharing"],
    ["tb-mathematics-matrix-operations-linear-algebra-medium","5ce102f4-16b6-48c8-885a-85cc62cbc060","Mathematics","medium","Muhammad Sial","estifanos.g@turing.com","https://drive.google.com/file/d/1q0uWNXGiUZHrD3mi9GNpydXqe8gsHe9F/view?usp=drive_link"],
    ["tb-mathematics-matrix-transform-analysis-hard","89d81be6-23a9-43dc-9c92-a220f7d5d2ad","Mathematics","hard","Amit Jadhav","estifanos.g@turing.com","https://drive.google.com/file/d/1BcWaAUROONhE3-__i7EcA-AE1Pn1OZR7/view?usp=drive_link"],
    ["tb-mathematics-number-theory-explorer-medium","0bcfaa5b-a94f-4c37-a682-5bbc83a324a0","Mathematics","medium","Arslan Younas","Unknown","https://drive.google.com/file/d/1SpDmrZEo7ZJQTf6bK4YGeMPMNxx85HXw/view?usp=sharing"],
    ["tb-mathematics-numerical-integration-convergence-investigation-medium","6cd908d1-076e-4a6f-8315-997394422ec5","Mathematics","medium","Nse-Abasi Etim","estifanos.g@turing.com","https://drive.google.com/file/d/1Rxxb0hTsnF8HrWVpE-kY28c9hZx5jz0F/view?usp=sharing"],
    ["tb-mathematics-partition-function-congruence-investigation-hard","5b1b7c1f-9858-4c97-8f3c-8bb7e1ab3600","Mathematics","hard","Nse-Abasi Etim","estifanos.g@turing.com","https://drive.google.com/file/d/1UiNrqTgaFNSF55EXGpwCZnsBgUWRwAuX/view?usp=sharing"],
    ["tb-mathematics-planar-geometry-analyzer-medium","b7e41d93-5f2a-4c81-ae37-d9f052b18c63","Mathematics","medium","Aaweg","Unknown","https://drive.google.com/file/d/1Ld-HgQef_ftdpbEXDGzwsT6Asqx0NHYO/view?usp=drive_link"],
    ["tb-mathematics-polynomial-root-classifier-medium","478005e8-740c-42fc-8cb5-f2787eeed982","Mathematics","medium","Arslan Younas","Estifanos Gashawtena","https://drive.google.com/file/d/18Fb2wYC3_fCyIut2qyoeNC6HYzt5PZ_Q/view?usp=sharing"],
    ["tb-mathematics-prime-gap-analysis-investigation-hard","77650e41-dc89-425d-9666-7f7c638f07db","Mathematics","hard","Nse-Abasi Etim","estifanos.g@turing.com","https://drive.google.com/file/d/1CfrEua1XgVshG7yi91iZrlYL_DnfZpSX/view?usp=sharing"],
    ["tb-mathematics-sequence-analyzer-medium","16500c64-f38e-41a3-8826-1f87bacd7d19","Mathematics","medium","Arslan Younas","Estifanos Gashawtena","https://drive.google.com/file/d/14QtPEgXYerAA_BwzAexRVkSR8diFNwTK/view?usp=sharing"],
    ["tb-mathematics-statistical-analysis-suite-medium","38c0f797-8133-48b0-9d4e-2250c1fa918e","Mathematics","medium","Muhammad Sial","Estifanos Gashawtena","https://drive.google.com/file/d/1BH41dFX-GHSjKPia6XLDJYiL8Ey3bivm/view?usp=drive_link"],
    ["tb-model-training-credit-scorecard-woe-binning-medium","1c2aa314-bbdc-4bf6-8a8a-040e2e514344","Model Training","medium","Muhammad Labeeb Tariq","estifanos.g@turing.com","https://drive.google.com/file/d/1W4YbqMKm0tYXTWqIIL_pez4QKTQkpcg7/view?usp=sharing"],
    ["tb-model-training-customer-segmentation-clustering-medium","42d977e8-35a0-42db-b965-687b022c6700","Model Training","medium","Muhammad Labeeb Tariq","estifanos.g@turing.com","https://drive.google.com/file/d/10_maUAomI6BY1LXFuxbKgNngPesO3Jqa/view?usp=sharing"],
    ["tb-model-training-decision-tree-classifier-training-medium","4a297212-c02a-4c04-aedd-46bdef9ee495","Model Training","medium","Muhammad Sial","Estifanos Gashawtena","https://drive.google.com/file/d/1p8h4jUDX-r3EfTf0-QL16LEzyE5RwdPp/view?usp=drive_link"],
    ["tb-model-training-delivery-quantile-interval-predictor-hard","e336cb30-b068-4e0f-8d35-b42f78374be8","Model Training","hard","Muhammad Labeeb Tariq","estifanos.g@turing.com","https://drive.google.com/file/d/1oqQMe3Z4Ntga63pz6g09znFyH4P2q03W/view?usp=sharing"],
    ["tb-model-training-fraud-anomaly-detection-medium","10850370-168b-41df-a7cc-b8b0b72b637d","Model Training","medium","Muhammad Labeeb Tariq","estifanos.g@turing.com","https://drive.google.com/file/d/1yF4rrkNKDNwQVimP0Opip3H41tHqvClX/view?usp=sharing"],
    ["tb-model-training-fraud-risk-training-pipeline-debug-hard","b59792b4-49ad-4535-8283-81ef9404da3d","Model Training","hard","Amit Jadhav","estifanos.g@turing.com","https://drive.google.com/file/d/1i9xonPhGYeqin14WW1bduSZun6druEhn/view?usp=drive_link"],
    ["tb-model-training-linear-regression-gradient-descent-medium","11a5a562-23db-4d04-b4c1-6b9f94ba965f","Model Training","medium","Muhammad Sial","estifanos.g@turing.com","https://drive.google.com/file/d/11ERoSooHzmlTJ3BEO3YVL7ulKswL84J3/view"],
    ["tb-model-training-loan-approval-dtree-medium","c12756d0-e387-477f-b4cc-d5f043a55430","Model Training","medium","Muhammad Sial","estifanos.g@turing.com","https://drive.google.com/file/d/1fsx6tjb7MX-coMvCbeYNvVclr7eaPw8a/view"],
    ["tb-model-training-logistic-regression-classifier-medium","4dd9e66a-68f6-47f4-a856-e4cd209276fb","Model Training","medium","Muhammad Sial","Estifanos Gashawtena","https://drive.google.com/file/d/1ZdtzXZCb898HfT632uKbA6yUo8RhLDu9/view?usp=drive_link"],
    ["tb-model-training-model-evaluation-instability-hard","90453d93-754e-458a-af89-83a724314eb4","Model Training","hard","Amit Jadhav","estifanos.g@turing.com","https://drive.google.com/file/d/179pOWcZPoalNuK8EEJ-LL5PsxpDYFLZp/view?usp=drive_link"],
    ["tb-model-training-naive-bayes-spam-filter-medium","d4c3e43e-ac5c-4af6-ab8c-89400591fc40","Model Training","medium","Muhammad Sial","estifanos.g@turing.com","https://drive.google.com/file/d/1fP6tG99Ev5gscMWFdEiQqp_3f57N_2Hu/view"],
    ["tb-model-training-pca-analysis-medium","4d0b3859-bc04-479e-9f85-9c0ea1a0d4dc","Model Training","medium","Muhammad Sial","Unknown","https://drive.google.com/file/d/1Lr1oVxM8NleAMbNRgytJCbUrcPXH5Ste/view"],
    ["tb-model-training-sensor-defect-stacking-pipeline-hard","6568ce7d-875f-42a2-9b7a-e155dcf1521b","Model Training","hard","Muhammad Labeeb Tariq","estifanos.g@turing.com","https://drive.google.com/file/d/1JZAU8s6VXp-T2igz9ZRwbrHGyFIodwtN/view?usp=sharing"],
    ["tb-model-training-vehicle-fuel-regression-medium","7fdaa225-8de4-48ba-9e77-1099224f1f3b","Model Training","medium","Aaweg","Unknown","https://drive.google.com/file/d/1U4nKYiniHcoi8D7YEGcIDOkRpy0ZWXN8/view?usp=drive_link"],
    ["tb-personal-assistant-calendar-conflict-resolver-medium","99176bf3-ec22-43b3-a75e-b444429be0de","Personal Assistant","medium","Zachary Kibathi","Hasnain Mubashir","https://drive.google.com/file/d/1BJs1XlJe9L3d5ErllHQJtrJi6VqnCS_e/view?usp=drive_link"],
    ["tb-personal-assistant-company-wide-stats-medium","f1a1738b-ca17-445b-8e30-96f997f65b46","Personal Assistant","medium","Zachary Kibathi","Unknown","https://drive.google.com/file/d/1P1HnnA9ql9uX4i62YYFVTheQgfXIQL-h/view?usp=drive_link"],
    ["tb-personal-assistant-contact-list-normalizer-medium","f7e6d5c4-b3a2-4f1e-8d9c-0b1a2e3f4d5e","Personal Assistant","medium","Zachary Kibathi","hasnain.m@turing.com","https://drive.google.com/file/d/1kBvzg7HKQt8YTZedAsQ_lWrtCmZ-hv4M/view?usp=drive_link"],
    ["tb-personal-assistant-daily-brief-builder-inbox-calendar-notes-medium","b5723a0b-f956-46c3-b03e-aba203137f23","Personal Assistant","medium","Amir Salih","Unknown","https://drive.google.com/file/d/1ors2Ji3BWwiuHmhTSKIMEDa95e4DSDDE/view?usp=sharing"],
    ["tb-personal-assistant-email-triage-planner-medium","069e64b7-0921-4958-ba3b-7d0ee2650dac","Personal Assistant","medium","Zachary Kibathi","hasnain.m@turing.com","https://drive.google.com/file/d/18BM7J-VLmm2x1pPYX_ybmBoqY9ycDONy/view?usp=drive_link"],
    ["tb-personal-assistant-event-planner-medium","8b498de4-fc89-4c68-879f-fbbcd85aa974","Personal Assistant","medium","Muhammad Ishmal","Hasnain Mubashir","https://drive.google.com/file/d/130qmFmyMKxXvG9oQ8oKlRspyR9OKNxF3/view?usp=sharing"],
    ["tb-personal-assistant-expense-auto-categorizer-hard","c156c010-c7cd-4884-9266-ed38612febd5","Personal Assistant","hard","Zachary Kibathi","hasnain.m@turing.com","https://drive.google.com/file/d/10FU34buQaEoAvNzPLlw8Qi7RdS9mHe8Y/view?usp=drive_link"],
    ["tb-personal-assistant-expense-report-generator-medium","02275911-547a-4513-b4a7-448f58c1b8b2","Personal Assistant","medium","Zachary Kibathi","Hasnain Mubashir","https://drive.google.com/file/d/1dMo9lk_0UlDvCiyrstECerBDlEu2xd6T/view?usp=drive_link"],
    ["tb-personal-assistant-expense-validator-medium","51e228db-7e45-4256-a6ff-0b15526abc09","Personal Assistant","medium","Muhammad Ishmal","Hasnain Mubashir","https://drive.google.com/file/d/1smbsNfWYnPNxh8bo9fen7EFFudn0mF3U/view?usp=sharing"],
    ["tb-personal-assistant-home-admin-final-package-delivery-digest-medium","1bab68c2-7b5c-4bf2-9364-a303f0480786","Personal Assistant","medium","Amir Salih","Hasnain Mubashir","https://drive.google.com/file/d/1dx6hnAeMKAlJFRUyP61B_s6D3wzKEYpM/view?usp=sharing"],
    ["tb-personal-assistant-home-rennovation-planner-medium","68bca57d-6c60-4c6f-8de3-ec325d834b08","Personal Assistant","medium","Muhammad Ishmal","Hasnain Mubashir","https://drive.google.com/file/d/1PstqNouCq8ybJlC-7G4-5mVKtXI_YbJ-/view?usp=sharing"],
    ["tb-personal-assistant-household-schedule-combination-medium","f3c7ff66-9579-418e-830b-0d57a6206e18","Personal Assistant","medium","Amir Salih","Hasnain Mubashir","https://drive.google.com/file/d/1xG0_RiLmU4OnL6no_mil5NvrjzG5NfEN/view?usp=sharing"],
    ["tb-personal-assistant-insurance-claim-adjuster-hard","e71fa767-d985-4ae6-ad86-5f2d9e27ce4f","Personal Assistant","hard","Muhammad Ishmal","hasnain.m@turing.com","https://drive.google.com/file/d/1ZooG3068xRT45409rrWQJndoAyizif33/view?usp=sharing"],
    ["tb-personal-assistant-meeting-scheduler-medium","0e9cf2cf-6b6c-4f6d-bf19-fafd3e8eb33f","Personal Assistant","medium","Muhammad Ishmal","Hasnain Mubashir","https://drive.google.com/file/d/1RN96pHorw5aj0KkauIcXivl1nO5hd2B0/view?usp=sharing"],
    ["tb-protocol-analysis-cross-session-dependency-analysis-medium","1901ba68-eed1-41a5-9741-b114ae89cb80","Protocol Analysis","medium","Om Rajput","Tewodros Alemu","https://drive.google.com/file/d/1DrOxRFnQ_XonlbqNp7LTRP8hR6ZecDY0/view?usp=sharing"],
    ["tb-protocol-analysis-dns-query-sighting-ratification-audit-medium","3c25e135-81b1-4606-b92c-bf4f62a4c7f3","Protocol Analysis","medium","Om Rajput","Unknown","https://drive.google.com/file/d/1DrP2AYYtmMc9u_taPo7rH7zPldPzMXzq/view?usp=sharing"],
    ["tb-protocol-analysis-meshlink-protocol-traffic-analyzer-medium","c2d8664d-327d-4aba-9475-b7e742b8007f","Protocol Analysis","medium","Opeyemi Odebode","tewodros.a@turing.com","https://drive.google.com/file/d/1qOq770mFBMiomz0TKZmZwNq7U5gRwfzV/view?usp=sharing"],
    ["tb-protocol-analysis-message-broker-medium","7e89a262-a34d-40e4-937d-5050ec26ffd3","Protocol Analysis","medium","Opeyemi Odebode","Tewodros Alemu","https://drive.google.com/file/d/15dUAsbprwwyglLrgbswvBU4FHn6pWP-e/view?usp=sharing"],
    ["tb-protocol-analysis-modbus-log-audit-medium","058fba4b-83fe-4d7c-94eb-12a5b50a5b2f","Protocol Analysis","medium","Ateeb Tahir","Tewodros Alemu","https://drive.google.com/file/d/1sw-Yw2ra_juk06pE2d83F2xvo_kVNW1l/view?usp=drive_link"],
    ["tb-protocol-analysis-network-flow-conversation-analysis-medium","78d03516-b8ed-47e9-aac4-1d4137d0096e","Protocol Analysis","medium","Oluwafikayomi Adeleke","Unknown","https://drive.google.com/file/d/1F8MjX0uwR4Q6pwRW68KsdlhTIJaMqWpU/view?usp=sharing"],
    ["tb-protocol-analysis-protocol-frame-decoder-medium","9177aa5a-8a9f-411b-80cf-cd0795febd16","Protocol Analysis","medium","Opeyemi Odebode","tewodros.a@turing.com","https://drive.google.com/file/d/1lK9273IRx90nIBCg-rUufebKJ5rOFOWT/view?usp=sharing"],
    ["tb-protocol-analysis-protocol-packet-reassembly-hard","3940271e-449b-4d5d-8b61-ff20e6501bcb","Protocol Analysis","hard","Oluwafikayomi Adeleke","tewodros.a@turing.com","https://drive.google.com/file/d/1uhwg-F_C5Ygw1CoDsb-fce4aoSjr2nqN/view?usp=sharing"],
    ["tb-protocol-analysis-protocol-session-health-audit-medium","e8b3c45f-77f6-47f8-a453-de85090d6ecb","Protocol Analysis","medium","Oluwafikayomi Adeleke","tewodros.a@turing.com","https://drive.google.com/file/d/1ioi6adP3zQmJyEywt6PhCZ_c8si4jy7r/view?usp=sharing"],
    ["tb-protocol-analysis-scada-rtu-protocol-forensics-medium","aeaa2b8e-6d86-44c6-850a-68efc2b0a5c3","Protocol Analysis","medium","Opeyemi Odebode","tewodros.a@turing.com","https://drive.google.com/file/d/1RpwOwEom0w2xpq0HVtR3Zy1Ixh7naTiQ/view?usp=sharing"],
    ["tb-protocol-analysis-stream-observability-continuity-audit-hard","28eb9ab9-4ff2-4375-859d-245e3e70bced","Protocol Analysis","hard","Om Rajput","Unknown","https://drive.google.com/file/d/1FRr3bNkpjPGPIFZRLn874ZTcBCiuG9Eq/view?usp=sharing"],
    ["tb-protocol-analysis-trace-valid-packet-delivery-medium","0c7dbd41-f20f-40c2-9e06-0c8e8003243c","Protocol Analysis","medium","Toygar Aksoy","Unknown","https://drive.google.com/file/d/1U30HFbzR3r1eyyT8_OYrKSsFz3PvKMOV/view?usp=drive_link"],
    ["tb-protocol-analysis-traffic-inspector-medium","1c43faf7-3523-4397-b8b3-8e406aaafe63","Protocol Analysis","medium","Tobi Adebisi","Unknown","https://drive.google.com/file/d/13yokYsCDGcQs5egIwnugp5ttotEcmife/view?usp=drive_link"],
    ["tb-protocol-analysis-validator-coverage-flow-forensics-hard","89535c48-411c-4e69-beee-fa8fd56ea67b","Protocol Analysis","hard","Om Rajput","Unknown","https://drive.google.com/file/d/1WNisuxgFFTJWza-C_cFE__p59x-llX0q/view?usp=sharing"],
    ["tb-scientific-computing-climate-data-sensor-validation-investigation-hard","87befd86-3bce-4096-9cdc-7170ce34e3a9","Scientific Computing","hard","Nse-Abasi Etim","Estifanos Gashawtena","https://drive.google.com/file/d/1n-Bl8mXhKnpTeHS-WG6ZWTcvRsNnkKhO/view?usp=sharing"],
    ["tb-scientific-computing-climate-station-analysis-medium","94dc7ee8-333c-464a-ad28-4106b3a4cad6","Scientific Computing","medium","Aaweg","Unknown","https://drive.google.com/file/d/1B9VqmHbMDAC0khRsd_yJYNmBB-Ywa8I0/view?usp=drive_link"],
    ["tb-scientific-computing-computational-reproducibility-investigation-medium","e1a957bd-ceeb-40ef-bec7-3e7a7959cd11","Scientific Computing","medium","Nse-Abasi Etim","Estifanos Gashawtena","https://drive.google.com/file/d/1B-8jkzlwLnu_SwhGfcYf8ySZmGIt8Sww/view?usp=sharing"],
    ["tb-scientific-computing-genomic-contamination-detection-medium","7009054a-37f1-4fde-b121-79d603682e30","Scientific Computing","medium","Nse-Abasi Etim","Estifanos Gashawtena","https://drive.google.com/file/d/1DZi8mIKqvcWGYMk4c0OZqpStZw39WsDR/view?usp=sharing"],
    ["tb-scientific-computing-heat-diffusion-simulation-hard","d75a3226-42ce-4a4e-87f7-91ac37a212b4","Scientific Computing","hard","Muhammad Sial","Estifanos Gashawtena","https://drive.google.com/file/d/1qR8EDhA2dO7mTG3mWMgmNScAAjxDBl4a/view"],
    ["tb-scientific-computing-lotka-volterra-stability-investigation-medium","0a5071aa-8d62-4d73-aed3-1ee522569838","Scientific Computing","medium","Nse-Abasi Etim","Unknown","https://drive.google.com/file/d/1uzjLwQAkCqmeKUlLA3hbFx8m-7uu4tVP/view?usp=sharing"],
    ["tb-scientific-computing-monte-carlo-integration-medium","32222665-8e6e-4b42-b87c-3ed1992439ee","Scientific Computing","medium","Arslan Younas","Unknown","https://drive.google.com/file/d/1pSrO6QD88PNAV6OcI-Cp0k0i2uAK_eic/view?usp=sharing"],
    ["tb-scientific-computing-numerical-methods-experimental-analysis-hard","642fe989-0e76-4618-9c62-7588e68415f5","Scientific Computing","hard","Muhammad Sial","Estifanos Gashawtena","https://drive.google.com/file/d/1yNdvavQwaQ6KFDu73wcSpFGz1RzVBFzz/view"],
    ["tb-scientific-computing-protein-structure-pipeline-debugging-medium","63f7aedb-f3a5-492c-a5cb-f533da6a0436","Scientific Computing","medium","Nse-Abasi Etim","estifanos.g@turing.com","https://drive.google.com/file/d/1uSDp6eFS5pjgnVfRGIKZy7zqNey968qA/view?usp=sharing"],
    ["tb-scientific-computing-reactor-kinetics-arrhenius-fit-hard","884de912-d364-4429-9a2f-49e8c85acca5","Scientific Computing","hard","Amit Jadhav","estifanos.g@turing.com","https://drive.google.com/file/d/1CzCMkTPHHqarLD_F1oSRtfFGNkyBGtZ5/view?usp=drive_link"],
    ["tb-scientific-computing-stellar-cluster-nbody-simulation-debugging-medium","e80dc435-15b4-4ef6-9179-253a0826c583","Scientific Computing","medium","Nse-Abasi Etim","Estifanos Gashawtena","https://drive.google.com/file/d/1Fsjn8y8Q_Ra-Td6vQasDGo301bRhpna5/view?usp=sharing"],
    ["tb-scientific-computing-tensile-test-material-analysis-medium","0c8dc1a8-e70c-464f-b7d4-78a4ac536c52","Scientific Computing","medium","Aaweg","Unknown","https://drive.google.com/file/d/1s3H4zIGJ_7YSceYZCmbV5guw8uiovo8y/view?usp=drive_link"],
    ["tb-scientific-computing-thermal-diffusivity-fit-medium","74514900-792f-4470-b6b4-6926157e5898","Scientific Computing","medium","Amit Jadhav","Estifanos Gashawtena","https://drive.google.com/file/d/1OyHus-Xuc8yRATqbjPSnJLSgbMuzqc40/view?usp=drive_link"],
    ["tb-scientific-computing-thermal-plate-equilibrium-medium","80c6dadb-5f3b-45d2-abad-8ad30871fba3","Scientific Computing","medium","Muhammad Labeeb Tariq","Estifanos Gashawtena","https://drive.google.com/file/d/1Kc74jbqMNbRIgDPdTwL53EOsHH_PS2jV/view?usp=sharing"],
    ["tb-security-encrypted-siem-breach-forensics-hard","d5470277-0364-4d2c-9c86-444edfbed976","Security","hard","Opeyemi Odebode","Unknown","https://drive.google.com/file/d/1Ep5yzqcGWeApdM2-YA1ag5fEFvbI74_H/view?usp=sharing"],
    ["tb-security-endpoint-security-scanner-coverage-breach-hard","6060370d-f99f-4b86-9bc8-980a62e51ce5","Security","hard","Om Rajput","Unknown","https://drive.google.com/file/d/1vndUw9KmfuFc-IHJaiRqrOaY_C6GEhuc/view?usp=sharing"],
    ["tb-security-firewall-rule-audit-medium","43ce7f17-557e-4ec7-9e6f-0dd752a9db1e","Security","medium","Tobi Adebisi","Unknown","https://drive.google.com/file/d/1J3rPtA3EWHIzykqhpnxVeFW0Y0kslPvX/view?usp=drive_link"],
    ["tb-security-firewall-rule-chain-packet-evaluator-medium","ffddaf76-317e-4190-a0e1-fe9e6476bcd7","Security","medium","Toygar Aksoy","Unknown","https://drive.google.com/file/d/1D8gfKKrxmaeqZcdCQRgq4GmWvISGfJgo/view?usp=drive_link"],
    ["tb-security-incident-response-hardening-medium","33058b33-df14-4025-a063-8dc520913f84","Security","medium","Tobi Adebisi","tewodros.a@turing.com","https://drive.google.com/file/d/1rTt11KZabpKPP_8zRLF88ZlE4OojBrzs/view?usp=drive_link"],
    ["tb-security-maritime-ais-signal-forensics-medium","3a59c03b-3093-4f61-8b93-70386bedfab5","Security","medium","Opeyemi Odebode","Tewodros Alemu","https://drive.google.com/file/d/1JJmkiKnrDxZKtLuaqYLGxdXbxlYfHsrz/view?usp=sharing"],
    ["tb-security-mobile-security-audit-medium","aed1610f-2851-4f28-98be-d504bf238e18","Security","medium","Tobi Adebisi","Unknown","https://drive.google.com/file/d/1gLmnU80lJxeSIu-fb---q306BhWFe-dy/view?usp=drive_link"],
    ["tb-security-permission-audit-medium","f704c0fa-f905-440a-90ec-66a083360cea","Security","medium","Tobi Adebisi","Tewodros Alemu","https://drive.google.com/file/d/1BPfZyXT34jF9jnQC4uzbmJp94oi6lWFR/view?usp=drive_link"],
    ["tb-security-privesc-graph-audit-medium","84e7564a-d137-429c-83fa-6739abb07dd0","Security","medium","Opeyemi Odebode","Unknown","https://drive.google.com/file/d/12NfOc5KQgOtsYxQTUTibJwsXMBO2OhbO/view?usp=sharing"],
    ["tb-security-rbac-permission-resolution-validator-medium","2cca9fe0-772c-49f5-b4c7-843c6facd59a","Security","medium","Om Rajput","tewodros.a@turing.com","https://drive.google.com/file/d/1X6fWEbvspQPLncX39uMJmem6Q2LfIRDP/view?usp=sharing"],
    ["tb-security-security-incident-forensics-medium","d48e7676-e382-4251-94ff-abe2826704f2","Security","medium","Opeyemi Odebode","Tewodros Alemu","https://drive.google.com/file/d/1DDgZYXzzeRoBbvwbgOde6RO0tT4iyAC_/view?usp=sharing"],
    ["tb-security-security-incident-triage-multi-log-medium","7b46bbc9-111d-441f-a490-e09c14fb00b2","Security","medium","Om Rajput","Tewodros Alemu","https://drive.google.com/file/d/1Oh5-oXyaE1KJBwzJg-U-xeT8MaOD_8Cb/view?usp=sharing"],
    ["tb-security-server-log-forensic-xor-decryption-hard","c451e6d5-eda4-4171-bde5-0a5d7d3c6a8b","Security","hard","Ateeb Tahir","Unknown","https://drive.google.com/file/d/1QALvqfj5GdR-toXC1aZ9B6hwcwn3qlQb/view?usp=drive_link"],
    ["tb-security-web-access-log-security-triage-medium","1d5aa383-a595-4000-80fd-3c76e84a5ea7","Security","medium","Ateeb Tahir","Unknown","https://drive.google.com/file/d/1zwfTqNACOlpTON4NSs9ff9KB5xHPNbtT/view"],
    ["tb-software-engineering-api-contract-compliance-auditor-hard","deecc1f3-8cbd-48e2-b250-1edf80e8","Software Engineering","hard","Mateeh Ullah","abdullah.c1@turing.com","https://drive.google.com/file/d/17NpIy-Snap9IE-91bzN4nWCtLv7zxIuF/view?usp=sharing"],
    ["tb-software-engineering-api-route-validator-medium","14a248de-94b7-4cf7-a28b-c4de79f61c1c","Software Engineering","medium","Mateeh Ullah","Abdullah Chaudhary","https://drive.google.com/file/d/1JSyTaAH34_7ivJyUuKkhQo4hpZQL5Z8h/view?usp=drive_link"],
    ["tb-software-engineering-build-cache-effectiveness-analyzer-medium","6b693af9-bce2-48d7-89de-445eab10bef1","Software Engineering","medium","Suresh H","Unknown","https://drive.google.com/file/d/1kE-CLnNpRxy2MWsyI4nZcOHUZntnwNNu/view?usp=drive_link"],
    ["tb-software-engineering-configuration-auditor-medium","a8b7c6d5-4e3f-2a1b-9c8d-7e6f5a4b3c2d","Software Engineering","medium","Zulqarnain Abbas","abdullah.c1@turing.com","https://drive.google.com/file/d/1ORZ0gIPwwu6cUJtCEuXWkiMxgnv8pbT0/view?usp=sharing"],
    ["tb-software-engineering-distributed-trace-analyzer-medium","8cbf9393-e904-415f-ab8a-9ea3f7b5c5fa","Software Engineering","medium","Shadaab Rajbarbhuiya","abdullah.c1@turing.com","https://drive.google.com/file/d/10mOAkXojliEl0LwCTDLPOAwWrJLwPWae/view?usp=drive_link"],
    ["tb-software-engineering-distributed-versioned-datastore-conflict-resolver-medium","6433b944-346b-4dd2-96d1-1df55fdc68c4","Software Engineering","medium","Mentesnot Sibatu","Unknown","https://drive.google.com/file/d/1CkdSFNKMSYn9rkqzzdsX80opQlz2w8m8/view?usp=drive_link"],
    ["tb-software-engineering-feature-flag-retirement-planner-medium","a7ca0dd2-3683-408e-bd32-321a7dbb41a8","Software Engineering","medium","Shadaab Rajbarbhuiya","Abdullah Chaudhary","https://drive.google.com/file/d/1p-8KCw8o_bwXJp4MTJ8bG7O-k9mErf78/view?usp=drive_link"],
    ["tb-software-engineering-incident-rollout-policy-reconciler-hard","226a4d01-7d5e-4a33-bc4b-d2a55135f5e2","Software Engineering","hard","Suresh H","abdullah.c1@turing.com","https://drive.google.com/file/d/1YegrUESEV82StUdVDNwTKgTX3MomNT72/view?usp=drive_link"],
    ["tb-software-engineering-invariant-patch-composition-medium","08e745e5-b0f0-4b43-9999-855bdea3e2e0","Software Engineering","medium","Mentesnot Sibatu","Unknown","https://drive.google.com/file/d/1xjaGAZyCntduHDCtOOmOfnG5fpj0Wa-o/view?usp=drive_link"],
    ["tb-software-engineering-legacy-api-audit-medium","60dd8b45-a55e-4989-ae18-f882d6335d85","Software Engineering","medium","Zulqarnain Abbas","abdullah.c1@turing.com","https://drive.google.com/file/d/1QgdmP5bHtpjArAllwrCd2xiPMN8Gi1CJ/view?usp=sharing"],
    ["tb-software-engineering-migration-chain-validator-medium","2b20ad62-679a-4a62-8ece-df3eff08a0fb","Software Engineering","medium","Mateeh Ullah","Abdullah Chaudhary","https://drive.google.com/file/d/1ZznERDhavjdU-mf_t_zDkZst22DDIYbz/view?usp=drive_link"],
    ["tb-software-engineering-monorepo-dependency-graph-analyzer-hard","d8540d27-4aed-4b8b-8671-fc66018e1b82","Software Engineering","hard","Mateeh Ullah","Abdullah Chaudhary","https://drive.google.com/file/d/1N6_Tv6XKyScX6jClh4uYn4PkkSEDMH-B/view?usp=drive_link"],
    ["tb-software-engineering-time-travel-deterministic-debugger-medium","1b536e19-524e-42db-b1ed-aa2119e455be","Software Engineering","medium","Mentesnot Sibatu","Unknown","https://drive.google.com/file/d/1ydIGkXwiPA7UB-bWSMix3zwBymBQAuu0/view?usp=drive_link"],
    ["tb-system-administration-access-log-traffic-analysis-medium","044eea7b-228c-4def-a79a-302848f134f7","System Administration","medium","Ateeb Tahir","tewodros.a@turing.com","https://drive.google.com/file/d/10Mz5OLKEM1RiB5q_Vxf8v-id8EuMKYld/view?usp=drive_link"],
    ["tb-system-administration-detect-ipam-address-conflicts-medium","4c68ad01-940f-4725-a6fa-116a3cf10af3","System Administration","medium","Toygar Aksoy","Unknown","https://drive.google.com/file/d/1JSB0qidfTCsrViJu9uXK0xvtmxaveInb/view?usp=drive_link"],
    ["tb-system-administration-firewall-ruleset-consolidation-audit-medium","3db15142-4bb2-4d42-8e6d-0f28b4564767","System Administration","medium","Opeyemi Odebode","tewodros.a@turing.com","https://drive.google.com/file/d/1SjupvSh67hZk5pDU-OmQyjNvyjyo5tRD/view?usp=sharing"],
    ["tb-system-administration-firewall-ruleset-zone-audit-hard","77b691a5-e155-4c2f-9121-65c0e7696d1e","System Administration","hard","Oluwafikayomi Adeleke","Unknown","https://drive.google.com/file/d/1yitIgVpjL_m3my-YKGO17dJ4jPxzlms7/view?usp=sharing"],
    ["tb-system-administration-gateway-transfer-audit-medium","3f47aa07-7e83-4c31-b634-2329e48969d1","System Administration","medium","Om Rajput","tewodros.a@turing.com","https://drive.google.com/file/d/1taSzHH6Rvt9L8O87pk9Jn2i0eMJyQwMl/view?usp=sharing"],
    ["tb-system-administration-linux-storage-health-forensics-medium","0c45d10b-3c5e-44cf-8df4-609fc84d77c6","System Administration","medium","Opeyemi Odebode","tewodros.a@turing.com","https://drive.google.com/file/d/1J_sAxClKaUoS_XAPDJCX0KxL8dI_UHTP/view?usp=sharing"],
    ["tb-system-administration-package-audit-medium","866eab2f-26ee-407b-b0be-a2c62eafea02","System Administration","medium","Ateeb Tahir","Tewodros Alemu","https://drive.google.com/file/d/15LdcGuesfq9KhXFYSP6j63_nI0lRQYGq/view?usp=drive_link"],
    ["tb-system-administration-service-lifecycle-override-validator-medium","5503a1b0-5aca-49a1-9bd6-92a18d99a2b7","System Administration","medium","Om Rajput","Tewodros Alemu","https://drive.google.com/file/d/1dbm-9Ffdp-q1FZWN1IQ_hsx-sShPcKNF/view?usp=sharing"],
    ["tb-system-administration-ssh-config-security-audit-medium","24385d78-ce7e-486d-aed4-1cb8641a2408","System Administration","medium","Oluwafikayomi Adeleke","Tewodros Alemu","https://drive.google.com/file/d/1cB1t_fg0L2tNU36mU1leSc3zdGzHEnvS/view?usp=sharing"],
    ["tb-system-administration-subnet-ip-allocation-audit-medium","b3f74ef0-935e-4036-a269-f8e826136ff6","System Administration","medium","Oluwafikayomi Adeleke","tewodros.a@turing.com","https://drive.google.com/file/d/1HivjdHXjjTY4kex8PKw0BHrXT9Tf-Fwj/view?usp=sharing"],
    ["tb-system-administration-systemd-boot-dependency-audit-hard","5d6b780a-c153-49f8-952b-8080d16a3147","System Administration","hard","Oluwafikayomi Adeleke","Unknown","https://drive.google.com/file/d/1xFDrsUqVbradi2BJHc4_8zU89NtkQ333/view?usp=sharing"],
    ["tb-system-administration-user-account-audit-medium","ed878636-2328-45a9-885b-0fe63bbbcb6a","System Administration","medium","Tobi Adebisi","tewodros.a@turing.com","https://drive.google.com/file/d/1vFvBX9TDK6qcfl8nKS5nNvkjzqwh3n4b/view?usp=drive_link"],
    ["tb-system-administration-user-disk-quota-report-medium","tb-system-administration-user-disk-quota-report-medium","System Administration","medium","Ateeb Tahir","tewodros.a@turing.com","https://drive.google.com/file/d/1W_AnrQ-mh6-g2MB_PBxP-dUta6aY4vik/view?usp=drive_link"]
  ];
}

function getExcludedTasks_() {
  return [
    ["tb-frontend-development-appointment-scheduler-medium","d08234e1-54a3-4bdd-b431-f61715f7b8ed","Frontend Development","medium","Fenet Shewarega","Hasnain Mubashir","https://drive.google.com/file/d/11lrZJ70aT1Ib_sel8w0spBhnZhfdj-oA/view?usp=sharing"],
    ["tb-frontend-development-dashboard-cards-medium","2a959660-4369-404f-bd24-70742b83b7b8","Frontend Development","medium","Fenet Shewarega","Hasnain Mubashir","https://drive.google.com/file/d/1p4jlgTh64r2OnyeYEN2OMVjV1UOqTQFV/view?usp=sharing"],
    ["tb-frontend-development-data-table-medium","032b39e1-b28d-4c3b-8aaf-22d3047acf50-","Frontend Development","medium","Fenet Shewarega","Hasnain Mubashir","https://drive.google.com/file/d/1TN28hW7_2rJEWc8n_eIk2svxDV5vBuaE/view?usp=sharing"],
    ["tb-frontend-development-data-visualization-dashboard-hard","2ac62265-c751-4b74-a041-b52e29fd1610","Frontend Development","hard","Fenet Shewarega","hasnain.m@turing.com","https://drive.google.com/file/d/10IisbZVx-bctKoC3ZPuIKWQ7RC8PXGMY/view?usp=sharing"],
    ["tb-frontend-development-form-wizard-medium","e22fd026-be4e-48ba-8942-1d1f5faa2ec5","Frontend Development","medium","Muhammad Ishmal","Hasnain Mubashir","https://drive.google.com/file/d/1CAtG6mJpZVgyIilaEdYNHWqdt6Ms90Ku/view?usp=sharing"],
    ["tb-frontend-development-kanban-board-hard","93afb2f6-42d8-43e6-ba01-1ae32a0da2d0","Frontend Development","hard","Fenet Shewarega","hasnain.m@turing.com","https://drive.google.com/file/d/13s1pPxUQH63hQ2Do5dKzIY3J-tBpAosp/view?usp=sharing"],
    ["tb-frontend-development-legacy-landing-page-refactor-for-accessibility-and-responsiveness-medium","71e139d8-0a6c-406b-ba29-0089bbfc777a","Frontend Development","medium","Amir Salih","Hasnain Mubashir","https://drive.google.com/file/d/1RG6hr7dbdVy_hcATSKKBTLGtq40AMfbd/view?usp=sharing"],
    ["tb-frontend-development-real-time-server-metrics-dashboard-hard","f2d136f0-561e-4d00-9302-98a48b877a59","Frontend Development","hard","Fenet Shewarega","Unknown","https://drive.google.com/file/d/1nEeZNMcLOgU8RxNdDJvrKbZvaP6YiTkG/view?usp=sharing"],
    ["tb-frontend-development-replay-timeline-generator-medium","109e384d-41dd-4f15-a72f-7ee13e3d17d1","Frontend Development","medium","Zachary Kibathi","Hasnain Mubashir","https://drive.google.com/file/d/1MSv3KpnQE_2UYL6JEnlDjvdTgvYEMbE-/view?usp=drive_link"],
    ["tb-frontend-development-responsive-nav-menu-medium","2cfa9efc-e3c4-4003-89b8-92b727863d73","Frontend Development","medium","Fenet Shewarega","Hasnain Mubashir","https://drive.google.com/file/d/1vWlEdbA8A--MmD3MhsCJHWzjM1IxV8nQ/view?usp=sharing"],
    ["tb-frontend-development-schema-driven-form-builder-live-validation-draft-restore-medium","cb2af0f9-0241-447c-b84c-ac67954450cb","Frontend Development","medium","Amir Salih","hasnain.m@turing.com","https://drive.google.com/file/d/1dAVppr3yfOFEmysgmyPz66D7x8tn4FWH/view?usp=sharing"],
    ["tb-frontend-development-timeline-widget-medium","a7c3e1f4-8b2d-4e6a-9f0c-5d3b1a2e4c6f","Frontend Development","medium","Muhammad Ishmal","Hasnain Mubashir","https://drive.google.com/file/d/12gy55N9WEIjCszZUIWY8647yOSGVBENs/view?usp=sharing"],
    ["tb-frontend-development-typescript-props-generator-medium","43993261-1281-4b57-a3eb-d3bf6267f2b2","Frontend Development","medium","Zachary Kibathi","Hasnain Mubashir","https://drive.google.com/file/d/1QPl37D7kmfEcVuwy1nVcYWzwLhqSmFmD/view?usp=drive_link"],
    ["tb-frontend-development-vanilla-to-react-typescript-medium","7ac8278c-01d6-4c0d-9e8a-63ecde9449f3","Frontend Development","medium","Zachary Kibathi","hasnain.m@turing.com","https://drive.google.com/file/d/13obtRsvZYLAgWL1QfHSImUhE17lp6_gW/view?usp=drive_link"],
    ["tb-games-development-board-siege-medium","0c64091a-34ff-45b2-a117-2ff66a36b410","Games Development","medium","Riya Verma","Hasnain Mubashir","https://drive.google.com/file/d/1wXAc2gI2J3_2wLdbAIcIRqRZ4ifOgKBR/view?usp=sharing"],
    ["tb-games-development-carcassonne-game-hard","62fd4a7b-de7d-4970-ad25-d677e2b7ff30","Games Development","hard","Riya Verma","hasnain.m@turing.com","https://drive.google.com/file/d/1JoQjdzC4pMy_t_5ppU0oAraL-ZqCNg9h/view?usp=sharing"],
    ["tb-games-development-cascade-dominion-hard","48b1a938-4129-481d-bbb3-bbeec2639a1a","Games Development","hard","Riya Verma","hasnain.m@turing.com","https://drive.google.com/file/d/1Zgf09fVQye_Gth7pUg_c9OE9PvpMfYS5/view?usp=sharing"],
    ["tb-games-development-chess-best-move-medium","03ca7278-90d2-4beb-8ee7-4fcd205eade1","Games Development","medium","Amir Salih","Hasnain Mubashir","https://drive.google.com/file/d/1s8ogsDMksGHFnHd9e92t8w7WMGhoq4rc/view?usp=sharing"],
    ["tb-games-development-dockside-arbitrage-medium","21fafbb2-5225-46d6-a13c-519159088909","Games Development","medium","Riya Verma","hasnain.m@turing.com","https://drive.google.com/file/d/1J2YGPRU3RSgxSrnYNYQcumco-dxT8WjB/view?usp=sharing"],
    ["tb-games-development-fixing-platformers-glitchy-collision-medium","e5e99faf-56ea-4a7a-991a-678479428c62","Games Development","medium","Fenet Shewarega","Unknown","https://drive.google.com/file/d/15isY11ObCRo9OJE1E0JORv6wiGuZoP6Q/view?usp=drive_link"],
    ["tb-games-development-mahjong-medium","97c21df4-ede3-4983-aa5b-c121cc93909f","Games Development","medium","Riya Verma","Hasnain Mubashir","https://drive.google.com/file/d/1t4ikM-r7RqW4SBa5htUBNs6LTfBSNs19/view?usp=drive_link"],
    ["tb-games-development-othello-style-grid-capture-medium","d852d0a3-2a8e-49e9-8486-5075fcf96139","Games Development","medium","Riya Verma","Hasnain Mubashir","https://drive.google.com/file/d/1Np4hD1--s2xyHHUMpwd4A3T1YpJwuHg5/view?usp=sharing"],
    ["tb-games-development-roguelike-battle-log-resolver-status-effects-cooldown-stacking-hard","3043b49a-bb98-4b5c-8760-c55fe25bca07","Games Development","hard","Amir Salih","Unknown","https://drive.google.com/file/d/1yIo-yecE7Sf1Xy1PMQPyymDBhu1eznGy/view?usp=sharing"],
    ["tb-games-development-rpg-battle-engine-medium","8a3f2c1b-5e4d-4b9a-8c7e-1d2f3a4b5c6d","Games Development","medium","Zachary Kibathi","hasnain.m@turing.com","https://drive.google.com/file/d/1Ty2Y_OiZzhAevA24hPPPUzRSLgqtTj21/view?usp=drive_link"],
    ["tb-games-development-rummikub-medium","ff5016e5-a26d-4cb4-8d97-05acd0f66594","Games Development","medium","Riya Verma","hasnain.m@turing.com","https://drive.google.com/file/d/1_DkBZHUc6lo9y3QB0dAzb6kImB9V9v2g/view?usp=sharing"],
    ["tb-games-development-tower-control-game-medium","4e2fa748-0a75-40eb-9d17-2e7255d4491c","Games Development","medium","Riya Verma","Unknown","https://drive.google.com/file/d/1SNujOJrtKFw_pD_bI8LtZgt0wuX0lDJs/view?usp=sharing"],
    ["tb-games-development-turn-grid-war-medium","133195de-e208-4655-ad5d-eb5d44ff9624","Games Development","medium","Riya Verma","hasnain.m@turing.com","https://drive.google.com/file/d/1SiIhQ7QOQmlma4tr7HYKljui4esSegLt/view?usp=sharing"],
    ["tb-games-development-wordle-feedback-generator-medium","6a08d38d-e37b-45cd-ae30-cb6118d6ca98","Games Development","medium","Riya Verma","Hasnain Mubashir","https://drive.google.com/file/d/1czmf6mwfFBOcfa4dnOvJ1Bp1N6MbeD07/view?usp=sharing"],
    ["tb-ui-ux-optimization-analytics-dashboard-token-migration-hard","a6b37628-9002-4fef-809f-dea480b5136f","UI/UX Optimization","hard","Muhammad Ishmal","hasnain.m@turing.com","https://drive.google.com/file/d/16MSA9xkgwv7xGUIM3roLLGqDKxIQOaid/view?usp=sharing"],
    ["tb-ui-ux-optimization-cross-breakpoint-layout-regression-triage-visual-hierarchy-medium","75fc55aa-c84b-4108-b9dd-940738447a6f","UI/UX Optimization","medium","Amir Salih","Unknown","https://drive.google.com/file/d/1GbxKvW_jNVaburrm_o_0oi0Q9igEU976/view?usp=sharing"],
    ["tb-ui-ux-optimization-dead-css-finder-medium","a0837436-239a-4efe-a93b-5a3a75c9491e","UI/UX Optimization","medium","Zachary Kibathi","Hasnain Mubashir","https://drive.google.com/file/d/1IHia43QB_V0-JaIE4kTaNqNu8za_993J/view?usp=drive_link"],
    ["tb-ui-ux-optimization-e-commerce-product-catalog-ux-fix-medium","f6153418-6760-498b-aefc-5316d04cf0a5","UI/UX Optimization","medium","Riya Verma","Unknown","https://drive.google.com/file/d/1eQPuZwv67Q26Rfvw-b7a2ncQk3Cg9Hrg/view?usp=sharing"],
    ["tb-ui-ux-optimization-ecommerce-checkout-usability-and-accessibility-optimization-medium","778e02db-d764-4fc4-83b4-4552a960c307","UI/UX Optimization","medium","Amir Salih","hasnain.m@turing.com","https://drive.google.com/file/d/1mKPUoQCLZRXkwF3jNbOFRDxnZbf2AbnY/view?usp=sharing"],
    ["tb-ui-ux-optimization-event-booking-page-ux-fixes-medium","a3c52f36-3f55-4b6e-8331-20f1f6997189","UI/UX Optimization","medium","Stephen Kinuthia","Unknown","https://drive.google.com/file/d/1l1H9DwZORrC43ztJrnzc_OSJ8lqCp0_V/view?usp=sharing"],
    ["tb-ui-ux-optimization-incident-log-viewer-token-migration-hard","f7c81d3a-4e92-4b17-a6f5-8d2c3b5e9f01","UI/UX Optimization","hard","Muhammad Ishmal","Unknown","https://drive.google.com/file/d/1KXyL74dwurG7MPRRfAK1gMX6LssEGRXE/view?usp=sharing"],
    ["tb-ui-ux-optimization-landing-page-accessibility-medium","1e4a90c0-d6a0-403f-9525-1c26cd0a185b","UI/UX Optimization","medium","Fenet Shewarega","Unknown","https://drive.google.com/file/d/1iXzuNT7ERiPEyvEQdcRbgWgykSAoHYPN/view?usp=sharing"],
    ["tb-ui-ux-optimization-pet-adoption-page-ux-audit-medium","8287d913-2e33-48df-8594-d8d45b886a23","UI/UX Optimization","medium","Stephen Kinuthia","Unknown","https://drive.google.com/file/d/1Wkb_p6uAVGWQbaksOkj1cjpl_IaN-_0u/view?usp=sharing"],
    ["tb-ui-ux-optimization-plant-nursery-catalog-page-a11y-audit-medium","8779c19f-b74e-45da-bc54-544ba6f3253d","UI/UX Optimization","medium","Stephen Kinuthia","Unknown","https://drive.google.com/file/d/17BIHXBPNB3INbvo-jg6zWPZJj8TrnIPB/view?usp=sharing"],
    ["tb-ui-ux-optimization-recipe-app-accessibility-overhaul-hard","334f322f-02cf-460a-8cf9-60ff6dd097ad","UI/UX Optimization","hard","Stephen Kinuthia","Unknown","https://drive.google.com/file/d/1Vx-Zsc_Smrvy5rn4S3paMOtF47_9R4BJ/view?usp=sharing"],
    ["tb-ui-ux-optimization-responsive-accessibility-fix-medium","ed68e056-846f-4e25-885a-60855f0c9d6d","UI/UX Optimization","medium","Muhammad Ishmal","hasnain.m@turing.com","https://drive.google.com/file/d/19oF-L1zGeKCuZA1dxnrsNmU_6-iobcyX/view?usp=sharing"],
    ["tb-ui-ux-optimization-responsive-nav-component-medium","bf11c297-1898-4ade-97ec-ec2bb4967bb7","UI/UX Optimization","medium","Fenet Shewarega","Unknown","https://drive.google.com/file/d/1iOpsSswZOgDxFnuIfSX6U0DsJKZZVfiV/view?usp=drive_link"],
    ["tb-ui-ux-optimization-staff-directory-ux-fix-medium","c3a9e7b2-5f1d-4a8c-b6d0-9e4f2c7a1b3d","UI/UX Optimization","medium","Muhammad Ishmal","hasnain.m@turing.com","https://drive.google.com/file/d/1n74t4KrRsX7H63tRDxMY3c0ceVSm6TWF/view?usp=sharing"]
  ];
}

function getFlaggedTasks_() {
  return [
    ["cicd-build-failure-diagnosis-medium","52b7adae-f40c-4389-9f18-36f44e98840d-terminal-bench-cicd-build-failure-diagnosis-medium","Build-and-Deployment","medium","critical",4,3,3,3.33,"Both the question and tests are severely inadequate","Poor question quality / contradictory description; Low test quality; Insufficient test coverage"],
    ["adversarial-temporal-hypergraph-medium","a9e7f629-dc0a-4ac8-bb64-294a93ef42d1-terminal-bench-adversarial-temporal-hypergraph-medium","algorithm-design","medium","moderate",7,7,5,6.33,"Insufficient test coverage","Insufficient test coverage"],
    ["intrusion-scanner-hard","b8f3c9d2-7a41-4e5b-9c8d-3f2e1a6b4d5c-terminal-bench-intrusion-scanner-hard","algorithm-design","hard","serious",5,7,6,6.0,"Question description is weak/insufficient","Poor question quality / contradictory description"],
    ["self-referential-adversarial-system-reconstruction-medium","3b60b71b-9fb6-4aed-bfb1-24e39a3223f2-terminal-bench-self-referential-adversarial-system-reconstruction-medium","algorithm-design","medium","serious",4,7,7,6.0,"Instruction asks to reconstruct state space and operators from traces, but spec.json already provides complete operator definitions; entropy mechanism doesn't match the actual spec definition","Poor question quality / contradictory description"],
    ["warehouse-inventory-reconciliation-medium","6f82a4b1-3c2e-4f9a-8d1b-9e4a7c5f2d8a-terminal-bench-warehouse-inventory-reconciliation-medium","data-analysis","medium","critical",6,4,4,4.67,"~10 out of 16 tests execute the exact same logic (comparing sorted(flagged_skus))","Low test quality; Insufficient test coverage"],
    ["ecommerce-transaction-reconciliation-hard","62e85496-e65c-41ae-92f8-7f8071cc53de-terminal-bench-ecommerce-transaction-reconciliation-hard","data-preprocessing","hard","moderate",5,8,9,7.33,"Question description is weak/insufficient","Poor question quality / contradictory description"],
    ["calendar-conflict-detection-medium","c7e2a9f4-8d3b-4a1c-b5e6-2f9d8c4a7e3b-terminal-bench-calendar-conflict-detection-medium","data-querying","medium","serious",7,5,5,5.67,"Insufficient test coverage","Low test quality; Insufficient test coverage"],
    ["federated-learning-dp-gradient-clipping-aggregation-hard","e9c8cd3b-2947-4ef0-bd6f-1334526091e4-terminal-bench-federated-learning-dp-gradient-clipping-aggregation-hard","data-science","hard","moderate",5,7,7,6.33,"Key validation rules are implicit; critical requirements are scattered across three files","Poor question quality / contradictory description"],
    ["regional-fleet-telemetry-mileage-calculation-hard","25a047bd-044d-4e4f-8ae1-2e72f2e7f02f-terminal-bench-regional-fleet-telemetry-mileage-calculation-hard","data-science","medium","serious",6,7,5,6.0,"Insufficient test coverage","Insufficient test coverage"],
    ["phantom-backup-coverage-audit-medium","2b94c9b9-24bf-4bf1-a0a9-d6d1f7e768cb-terminal-bench-phantom-backup-coverage-audit-medium","file-system","medium","serious",7,6,4,5.67,"Insufficient test coverage","Insufficient test coverage"],
    ["appointment-scheduler-medium","d08234e1-54a3-4bdd-b431-f61715f7b8ed-terminal-bench-appointment-scheduler-medium","frontend-development","medium","serious",7,5,6,6.0,"No interactive behavior tests; no time conflict detection verification","No rendering/browser tests; Low test quality"],
    ["dashboard-cards-medium","2a959660-4369-404f-bd24-70742b83b7b8-terminal-bench-dashboard-cards-medium","frontend-development","hard","serious",6,4,6,5.33,"Python operator precedence bug causes incorrect test logic","No rendering/browser tests; Low test quality"],
    ["data-table-medium","032b39e1-b28d-4c3b-8aaf-22d3047acf50-terminal-bench-data-table-medium","frontend-development","medium","serious",7,5,5,5.67,"test_search_filters_all_columns only checks that JS contains 'filter' and 'search'","No rendering/browser tests; Low test quality; Insufficient test coverage"],
    ["data-visualization-dashboard-hard","2ac62265-c751-4b74-a041-b52e29fd1610-terminal-bench-data-visualization-dashboard-hard","frontend-development","hard","moderate",7,5,7,6.33,"No rendering/browser tests; DOM parsing is present but interactive behavior is not verified","No rendering/browser tests; Low test quality"],
    ["form-wizard-medium","e22fd026-be4e-48ba-8942-1d1f5faa2ec5-terminal-bench-form-wizard-medium","frontend-development","medium","serious",7,4,5,5.33,"All 189 tests are static text analysis; assert 'admin' in js is sufficient to pass","No rendering/browser tests; Low test quality; Insufficient test coverage"],
    ["kanban-board-hard","93afb2f6-42d8-43e6-ba01-1ae32a0da2d0-terminal-bench-kanban-board-hard","frontend-development","hard","critical",6,4,5,5.0,"Drag-and-drop, WIP limits, and filtering are completely unverified; test_wip_handling passes as long as code contains 'wip' or 'limit'","No rendering/browser tests; Low test quality; Insufficient test coverage"],
    ["responsive-nav-menu-medium","2cfa9efc-e3c4-4003-89b8-92b727863d73-terminal-bench-responsive-nav-menu-medium","frontend-development","medium","serious",7,5,4,5.33,"Responsive layout only checks for keywords; no actual breakpoint verification","No rendering/browser tests; Low test quality; Insufficient test coverage"],
    ["timeline-widget-medium","a7c3e1f4-8b2d-4e6a-9f0c-5d3b1a2e4c6f-terminal-bench-timeline-widget-medium","frontend-development","medium","critical",7,4,4,5.0,"test_js_dark_theme only checks that 'dark' and 'class' appear somewhere in the JS code","No rendering/browser tests; Low test quality; Insufficient test coverage"],
    ["typescript-props-generator-medium","43993261-1281-4b57-a3eb-d3bf6267f2b2-terminal-bench-typescript-props-generator-medium","frontend-development","medium","critical",6,4,3,4.33,"test_typescript_compiles is dead code (no tsc environment available); multiple tests have no assertions","No rendering/browser tests; Low test quality; Insufficient test coverage"],
    ["vanilla-to-react-typescript-medium","7ac8278c-01d6-4c0d-9e8a-63ecde9449f3-terminal-bench-vanilla-to-react-typescript-medium","frontend-development","medium","serious",7,6,5,6.0,"No rendering/browser tests","No rendering/browser tests; Insufficient test coverage"],
    ["board-siege-medium","0c64091a-34ff-45b2-a117-2ff66a36b410-terminal-bench-board-siege-medium","games-development","medium","critical",4,6,3,4.33,"Single 12x12 board; hardcoding {\"captures\":[7]} passes all tests; rules don't clarify whether diagonal captures are included","Insufficient test scenarios / edge cases; Poor question quality / contradictory description; Insufficient test coverage"],
    ["carcassonne-game-hard","62fd4a7b-de7d-4970-ad25-d677e2b7ff30-terminal-bench-carcassonne-game-hard","games-development","hard","moderate",7,7,5,6.33,"Only 1 board state; penalty threshold boundaries, all meeples used up, and other scenarios are not tested","Insufficient test scenarios / edge cases; Insufficient test coverage"],
    ["cascade-dominion-hard","48b1a938-4129-481d-bbb3-bbeec2639a1a-terminal-bench-cascade-dominion-hard","games-development","hard","serious",5,7,5,5.67,"Only 1 board (15x15); no small boards, no cascade chains, no all-same-type pieces, and other edge cases missing","Insufficient test scenarios / edge cases; Poor question quality / contradictory description; Insufficient test coverage"],
    ["chess-best-move-medium","03ca7278-90d2-4beb-8ee7-4fcd205eade1-terminal-bench-chess-best-move-medium","games-development","easy","critical",4,5,3,4.0,"Case 1 and Case 2 use the same FEN (Scholar's Mate); only tests one-move checkmate; no promotion, en passant, or deep search tests","Insufficient test scenarios / edge cases; Poor question quality / contradictory description; Low test quality; Insufficient test coverage"],
    ["dockside-arbitrage-medium","21fafbb2-5225-46d6-a13c-519159088909-terminal-bench-dockside-arbitrage-medium","games-development","medium","moderate",7,7,5,6.33,"Only 1 dataset; missing dense-arrival tie, idle dock, all-rejected, and other scenarios","Insufficient test scenarios / edge cases; Insufficient test coverage"],
    ["mahjong-medium","97c21df4-ede3-4983-aa5b-c121cc93909f-terminal-bench-mahjong-medium","games-development","medium","critical",4,3,3,3.33,"Scenario 1 correct answer (DECLARE_MAHJONG) is completely unverified; instruction claims ALLOW_PUNG=false but actual value is true; tests contain dead code","Insufficient test scenarios / edge cases; Poor question quality / contradictory description; Low test quality; Insufficient test coverage"],
    ["othello-style-grid-capture-medium","d852d0a3-2a8e-49e9-8486-5075fcf96139-terminal-bench-othello-style-grid-capture-medium","games-development","medium","moderate",7,7,5,6.33,"Missing zero-capture, single-row, long-chain, and all-same-color edge cases","Insufficient test scenarios / edge cases; Insufficient test coverage"],
    ["rpg-battle-engine-medium","8a3f2c1b-5e4d-4b9a-8c7e-1d2f3a4b5c6d-terminal-bench-rpg-battle-engine-medium","games-development","medium","serious",7,5,5,5.67,"Tests have inter-test state dependencies; damage formula and healing mechanics are not verified","Insufficient test scenarios / edge cases; Low test quality; Insufficient test coverage"],
    ["rummikub-medium","ff5016e5-a26d-4cb4-8d97-05acd0f66594-terminal-bench-rummikub-medium","games-development","medium","critical",5,6,4,5.0,"All scenarios have solutions (no DRAW); all optimal solutions are runs (no groups); empty hand and other edge cases are missing","Insufficient test scenarios / edge cases; Poor question quality / contradictory description; Insufficient test coverage"],
    ["turn-grid-war-medium","133195de-e208-4655-ad5d-eb5d44ff9624-terminal-bench-turn-grid-war-medium","games-development","medium","moderate",7,7,5,6.33,"Missing out-of-bounds movement, combo chain trigger cap, weakened status stacking, and other edge cases","Insufficient test scenarios / edge cases; Insufficient test coverage"],
    ["wordle-feedback-generator-medium","6a08d38d-e37b-45cd-ae30-cb6118d6ca98-terminal-bench-wordle-feedback-generator-medium","games-development","easy","serious",7,7,4,6.0,"All 5 secret words have no repeated letters; missing all-GREEN, all-GRAY, and repeated-letter edge cases","Insufficient test scenarios / edge cases; Insufficient test coverage"],
    ["binary-classification-evaluation-medium","378315ae-84f4-44c6-aecc-18127aecaccb-terminal-bench-binary-classification-evaluation-medium","machine-learning","hard","serious",4,7,6,5.67,"CSV column names described in instruction.md do not match the actual data at all","Poor question quality / contradictory description"],
    ["churn-model-debug-medium","abe97442-b384-4c8f-9869-9583c0000446-terminal-bench-churn-model-debug-medium","machine-learning","medium","critical",5,5,4,4.67,"Instruction contradicts data in multiple places: says to use features listed in experiment configuration but the config file has no feature list; says data contains train/valid/test split column but CSV has no such column","Poor question quality / contradictory description; Low test quality; Insufficient test coverage"],
    ["model-score-instability-debug-medium","30eb949b-c9bc-4563-92db-08ef17c21dea-terminal-bench-model-score-instability-debug-medium","machine-learning","medium","critical",6,2,2,3.33,"Tests only check output file format; running echo '{\"score\":0.5}' > result.json passes all tests","Low test quality; Insufficient test coverage"],
    ["matrix-operations-linear-algebra-medium","5ce102f4-16b6-48c8-885a-85cc62cbc060-terminal-bench-matrix-operations-linear-algebra-medium","mathematics","medium","moderate",7,7,5,6.33,"Insufficient test coverage","Insufficient test coverage"],
    ["number-theory-explorer-medium","0bcfaa5b-a94f-4c37-a682-5bbc83a324a0-terminal-bench-number-theory-explorer-medium","mathematics","medium","critical",7,4,3,4.67,"All 9 output files with number theory calculations only verify format and sorting, never verify any computed values","Low test quality; Insufficient test coverage"],
    ["decision-tree-classifier-training-medium","4a297212-c02a-4c04-aedd-46bdef9ee495-terminal-bench-decision-tree-classifier-training-medium","model-training","medium","serious",8,4,4,5.33,"Deterministic algorithm (fixed seed + data) but tests don't verify any specific computed values","Low test quality; Insufficient test coverage"],
    ["pca-analysis-medium","4d0b3859-bc04-479e-9f85-9c0ea1a0d4dc-terminal-bench-pca-analysis-medium","model-training","medium","serious",7,5,5,5.67,"30 tests verify structure and basic mathematical properties but don't verify any specific values; reconstruction error threshold of <20 is too lenient","Low test quality; Insufficient test coverage"],
    ["email-triage-planner-medium","069e64b7-0921-4958-ba3b-7d0ee2650dac-terminal-bench-email-triage-planner-medium","personal-assistant","medium","serious",7,5,5,5.67,"Insufficient test coverage","Low test quality; Insufficient test coverage"],
    ["expense-report-generator-medium","02275911-547a-4513-b4a7-448f58c1b8b2-terminal-bench-expense-report-generator-medium","personal-assistant","medium","serious",7,6,5,6.0,"Expense rule edge cases (e.g., over-limit approvals, cross-category aggregation) are not covered","Insufficient test coverage"],
    ["computational-reproducibility-investigation-medium","e1a957bd-ceeb-40ef-bec7-3e7a7959cd11-terminal-bench-computational-reproducibility-investigation-medium","scientific-computing","medium","serious",6,6,6,6.0,"Tolerances are too lenient; insufficient coverage","Overall score borderline low"],
    ["heat-diffusion-simulation-hard","d75a3226-42ce-4a4e-87f7-91ac37a212b4-terminal-bench-heat-diffusion-simulation-hard","scientific-computing","hard","serious",7,5,5,5.67,"Out of 49 sensors, only 3 are verified (6% coverage); energy tolerance of +/-1000 is too loose","Low test quality; Insufficient test coverage"],
    ["monte-carlo-integration-medium","32222665-8e6e-4b42-b87c-3ed1992439ee-terminal-bench-monte-carlo-integration-medium","scientific-computing","medium","serious",6,6,6,6.0,"Insufficient test coverage","Overall score borderline low"],
    ["protein-structure-pipeline-debugging-medium","63f7aedb-f3a5-492c-a5cb-f533da6a0436-terminal-bench-protein-structure-pipeline-debugging-medium","scientific-computing","easy","serious",6,5,6,5.67,"Insufficient test coverage","Low test quality"],
    ["thermal-diffusivity-fit-medium","74514900-792f-4470-b6b4-6926157e5898-terminal-bench-thermal-diffusivity-fit-medium","scientific-computing","medium","serious",7,5,5,5.67,"No absolute RMSE threshold; test_result_is_deterministic_on_disk reads the same file twice (meaningless test)","Low test quality; Insufficient test coverage"],
    ["firewall-rule-audit-medium","43ce7f17-557e-4ec7-9e6f-0dd752a9db1e-terminal-bench-firewall-rule-audit-medium","security","medium","moderate",8,5,6,6.33,"Core algorithm (classifying rules as shadow/conflict/redundant) is completely untested; labeling all rules as 'none' passes as long as the format is correct","Low test quality"],
    ["maritime-ais-signal-forensics-medium","3a59c03b-3093-4f61-8b93-70386bedfab5-terminal-bench-maritime-ais-signal-forensics-medium","security","medium","serious",8,5,5,6.0,"test_transformation_key_present accepts any hexadecimal value instead of verifying the correct XOR key","Low test quality; Insufficient test coverage"],
    ["time-travel-deterministic-debugger-medium","1b536e19-524e-42db-b1ed-aa2119e455be-terminal-bench-time-travel-deterministic-debugger-medium","software-engineering","medium","serious",6,5,5,5.33,"Insufficient test coverage","Low test quality; Insufficient test coverage"],
    ["user-account-audit-medium","ed878636-2328-45a9-885b-0fe63bbbcb6a-terminal-bench-user-account-audit-medium","system-administration","medium","serious",7,5,5,5.67,"Insufficient test coverage","Low test quality; Insufficient test coverage"],
    ["dead-css-finder-medium","a0837436-239a-4efe-a93b-5a3a75c9491e-terminal-bench-dead-css-finder-medium","ui-ux-optimization","medium","critical",7,4,4,5.0,"Multiple test functions end with 'pass' and have no assertions; empty output can pass all tests","No rendering/browser tests; Low test quality; Insufficient test coverage"]
  ];
}

/* ──────────────────────── LLM SCORES (all 50 flagged tasks — merged from original + retest 2026-03-05) ──────────────────────── */

function getLLMScoresForFlagged_() {
  // [qq, tq, tc, avg, verdict]
  return {
    "cicd-build-failure-diagnosis-medium":        [7, 5, 5, 5.7, "CONDITIONAL"],
    "adversarial-temporal-hypergraph-medium":      [7, 6, 6, 6.3, "CONDITIONAL"],
    "intrusion-scanner-hard":                      [6, 6, 6, 6.0, "CONDITIONAL"],
    "self-referential-adversarial-system-reconstruction-medium": [5, 6, 6, 5.7, "CONDITIONAL"],
    "warehouse-inventory-reconciliation-medium":   [7, 5, 5, 5.7, "CONDITIONAL"],
    "ecommerce-transaction-reconciliation-hard":   [6, 7, 8, 7.0, "CONDITIONAL"],
    "calendar-conflict-detection-medium":          [7, 6, 6, 6.3, "CONDITIONAL"],
    "federated-learning-dp-gradient-clipping-aggregation-hard": [6, 6, 7, 6.3, "CONDITIONAL"],
    "regional-fleet-telemetry-mileage-calculation-hard": [7, 6, 6, 6.3, "CONDITIONAL"],
    "phantom-backup-coverage-audit-medium":        [5, 5, 4, 4.7, "REJECTED"],
    "appointment-scheduler-medium":                [7, 5, 4, 5.3, "CONDITIONAL"],
    "dashboard-cards-medium":                      [5, 4, 4, 4.3, "REJECTED"],
    "data-table-medium":                           [6, 4, 4, 4.7, "REJECTED"],
    "data-visualization-dashboard-hard":           [6, 5, 4, 5.0, "CONDITIONAL"],
    "form-wizard-medium":                          [5, 4, 4, 4.3, "REJECTED"],
    "kanban-board-hard":                           [6, 4, 4, 4.7, "REJECTED"],
    "responsive-nav-menu-medium":                  [6, 4, 4, 4.7, "REJECTED"],
    "timeline-widget-medium":                      [6, 4, 4, 4.7, "REJECTED"],
    "typescript-props-generator-medium":           [6, 4, 4, 4.7, "REJECTED"],
    "vanilla-to-react-typescript-medium":          [7, 6, 7, 6.7, "CONDITIONAL"],
    "board-siege-medium":                          [5, 5, 3, 4.3, "REJECTED"],
    "carcassonne-game-hard":                       [7, 6, 4, 5.7, "CONDITIONAL"],
    "cascade-dominion-hard":                       [7, 6, 5, 6.0, "CONDITIONAL"],
    "chess-best-move-medium":                      [5, 5, 4, 4.7, "REJECTED"],
    "dockside-arbitrage-medium":                   [7, 7, 4, 6.0, "CONDITIONAL"],
    "mahjong-medium":                              [5, 5, 3, 4.3, "REJECTED"],
    "othello-style-grid-capture-medium":           [7, 6, 5, 6.0, "CONDITIONAL"],
    "rpg-battle-engine-medium":                    [5, 5, 4, 4.7, "REJECTED"],
    "rummikub-medium":                             [7, 8, 6, 7.0, "CONDITIONAL"],
    "turn-grid-war-medium":                        [7, 7, 6, 6.7, "CONDITIONAL"],
    "wordle-feedback-generator-medium":            [6, 5, 4, 5.0, "CONDITIONAL"],
    "binary-classification-evaluation-medium":     [5, 5, 5, 5.0, "CONDITIONAL"],
    "churn-model-debug-medium":                    [4, 5, 4, 4.3, "REJECTED"],
    "model-score-instability-debug-medium":        [5, 4, 3, 4.0, "REJECTED"],
    "matrix-operations-linear-algebra-medium":     [7, 6, 4, 5.7, "CONDITIONAL"],
    "number-theory-explorer-medium":               [5, 4, 4, 4.3, "REJECTED"],
    "decision-tree-classifier-training-medium":    [7, 5, 4, 5.3, "CONDITIONAL"],
    "pca-analysis-medium":                         [7, 5, 4, 5.3, "CONDITIONAL"],
    "email-triage-planner-medium":                 [6, 6, 6, 6.0, "CONDITIONAL"],
    "expense-report-generator-medium":             [7, 6, 5, 6.0, "CONDITIONAL"],
    "computational-reproducibility-investigation-medium": [8, 5, 4, 5.7, "CONDITIONAL"],
    "heat-diffusion-simulation-hard":              [7, 5, 6, 6.0, "CONDITIONAL"],
    "monte-carlo-integration-medium":              [7, 5, 6, 6.0, "CONDITIONAL"],
    "protein-structure-pipeline-debugging-medium":  [7, 5, 4, 5.3, "CONDITIONAL"],
    "thermal-diffusivity-fit-medium":              [7, 6, 5, 6.0, "CONDITIONAL"],
    "firewall-rule-audit-medium":                  [7, 6, 4, 5.7, "CONDITIONAL"],
    "maritime-ais-signal-forensics-medium":        [8, 5, 5, 6.0, "CONDITIONAL"],
    "time-travel-deterministic-debugger-medium":   [7, 6, 6, 6.3, "CONDITIONAL"],
    "user-account-audit-medium":                   [8, 6, 4, 6.0, "CONDITIONAL"],
    "dead-css-finder-medium":                      [7, 5, 5, 5.7, "CONDITIONAL"]
  };
}
