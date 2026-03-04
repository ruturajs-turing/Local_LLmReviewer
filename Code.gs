/******************************************************
 * TB Reviewer — Harbor Version
 * - Reads Drive ZIP link/ID and reviews Terminal-Bench Harbor tasks
 * - Writes a human-readable, concatenated review to Google Doc
 * - Independent API calls, each with its own rubric.
 * 
 * CRITERIA:
 *   A) PROMPT - instruction.md clarity and completeness
 *   B) TESTS - test alignment and validity
 *   C) SLUG & NAMING - task slug validation
 *   E) DOCKERFILE - container setup validation
 *   F) TEST.SH - test runner validation
 *   G) SOLVE.SH - solution validity
 *   H) TASK METADATA - task.toml validation
 *   J) FORCED GATES - model-specific malpractice detection
 *   K) MODEL RUN SUMMARY - aggregated pass/fail from result.json
 *       + CHEATING DETECTION - checks trajectory.json for peeking at solve.sh
 *       + FAILURE ANALYSIS - LLM analyzes worst run's failures vs instructions
 *   M) INSTRUCTION-TEST ALIGNMENT - humane prompt mode
 * 
 * REMOVED (Harbor version):
 *   • I) SFT NOTEBOOK - not used in Harbor
 ******************************************************/


/**
 * ============================================================
 *  reviewDriveLink_
 * ============================================================
 * Core reviewer logic (same as reviewRows_) but processes one ZIP link
 * directly, without using Sheets.
 */

var ISSUE_SHEET_ID = "18IVqltNnia4ifAx9I15ohQrQm6Zai-EVApOjb_AJrN8"; 
var ISSUE_SHEET_NAME = "Harbor_Issues";

/**
 * ============================================================
 *  HARBOR VALIDATOR BACKEND (Structural Validation)
 * ============================================================
 * Calls the Python backend for structural validation.
 * URL will be updated after DevOps deployment.
 */
var HARBOR_VALIDATOR_URL = "https://tb-harbor-validator-backend-264685500362.asia-southeast1.run.app";

/**
 * Call Harbor Validator Backend API
 * @param {string} driveLink - Google Drive link to validate
 * @returns {Object} Validation result with errors, warnings, and model results
 */
function callHarborValidator_(driveLink) {
  var url = HARBOR_VALIDATOR_URL + "/api/v1/validate";
  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({
      drive_link: driveLink,
      enforce_expectations: true,
      fail_fast: false
    }),
    muteHttpExceptions: true
  };
  
  try {
    var response = UrlFetchApp.fetch(url, options);
    var jobData = JSON.parse(response.getContentText());
    
    // If async job, poll for result
    if (jobData.job_id) {
      return pollHarborJobResult_(jobData.job_id);
    }
    return jobData;
  } catch (e) {
    return {
      success: false,
      errors: ["Harbor Validator API error: " + e.message],
      warnings: [],
      models: []
    };
  }
}

/**
 * Poll for Harbor Validator job result
 * @param {string} jobId - Job ID to poll
 * @returns {Object} Validation result
 */
function pollHarborJobResult_(jobId) {
  var url = HARBOR_VALIDATOR_URL + "/api/v1/jobs/" + jobId;
  var maxAttempts = 60; // 5 minutes max (60 * 5 seconds)
  
  for (var i = 0; i < maxAttempts; i++) {
    Utilities.sleep(5000); // Wait 5 seconds
    
    try {
      var response = UrlFetchApp.fetch(url, {muteHttpExceptions: true});
      var result = JSON.parse(response.getContentText());
      
      if (result.status === "completed" || result.status === "failed") {
        return result.result || result;
      }
    } catch (e) {
      // Continue polling on error
    }
  }
  
  return {
    success: false,
    errors: ["Harbor Validator timed out after 5 minutes"],
    warnings: [],
    models: []
  };
}

/**
 * Format Harbor Validator result for display
 * @param {Object} result - Validation result from Harbor Validator
 * @returns {string} Formatted result string
 */
/**
 * Public function for frontend: Run structural validation only
 * Called by index.html via google.script.run
 * @param {string} driveLink - Google Drive link to validate
 * @returns {Object} Validation result for frontend display
 */
function runStructuralValidation(driveLink) {
  try {
    var result = callHarborValidator_(driveLink);
    return result;
  } catch (e) {
    return {
      success: false,
      errors: ["Structural validation error: " + e.message],
      warnings: [],
      models: []
    };
  }
}

function formatHarborValidatorResult_(result) {
  var lines = [];
  lines.push("═══════════════════════════════════════════════════════════");
  lines.push("STRUCTURAL VALIDATION (Harbor Validator Backend)");
  lines.push("═══════════════════════════════════════════════════════════");
  
  if (result.success) {
    lines.push("✅ PASSED - All structural checks passed");
  } else {
    lines.push("❌ FAILED - Structural issues found");
  }
  
  lines.push("");
  lines.push("Domain: " + (result.domain || "N/A"));
  lines.push("Slug: " + (result.slug || "N/A"));
  lines.push("Difficulty: " + (result.difficulty || "N/A"));
  
  if (result.errors && result.errors.length > 0) {
    lines.push("");
    lines.push("ERRORS:");
    result.errors.forEach(function(err) {
      lines.push("  ❌ " + err);
    });
  }
  
  if (result.warnings && result.warnings.length > 0) {
    lines.push("");
    lines.push("WARNINGS:");
    result.warnings.forEach(function(warn) {
      lines.push("  ⚠️ " + warn);
    });
  }
  
  if (result.models && result.models.length > 0) {
    lines.push("");
    lines.push("MODEL ACCURACY:");
    result.models.forEach(function(m) {
      var status = m.matches ? "✅" : "❌";
      lines.push("  " + status + " " + m.model + ": " + m.actual + " (expected: " + m.expected + ")");
    });
  }
  
  lines.push("═══════════════════════════════════════════════════════════");
  
  return lines.join("\n");
}

function reviewDriveLink_(raw, includeStructural) {
  // Default to true if not specified
  if (includeStructural === undefined) {
    includeStructural = true;
  }
  
  // Run structural validation first (if enabled and backend is configured)
  var structuralResult = null;
  if (includeStructural && HARBOR_VALIDATOR_URL && !HARBOR_VALIDATOR_URL.includes("PLACEHOLDER")) {
    try {
      structuralResult = callHarborValidator_(raw);
    } catch (e) {
      // Log error but continue with LLM review
      Logger.log("Structural validation error: " + e.message);
    }
  }
  
  // Resolve Drive file
  var ref = parseRef_(raw);
  var real = resolveShortcut_(ref);
  var meta = driveMeta_(real);

  // ZIP checks
  var isZip = /zip/i.test(meta.mimeType || '') || /application\/x-zip-compressed/i.test(meta.mimeType || '');
  if (!isZip) throw new Error('Not a ZIP (mime="' + (meta.mimeType || 'unknown') + '").');
  if (meta.size && Number(meta.size) > 130 * 1024 * 1024)
    throw new Error('ZIP ≈ ' + (Number(meta.size)/(1024*1024)).toFixed(2) + ' MB; unzip unreliable > 130 MB.');

  // Unzip
  var zipBlob = downloadZip_(real);
  var entries = Utilities.unzip(zipBlob);
  
  // Capture paths and key files
  var paths = entries.map(function(b) { return b.getName(); });
  var topPaths = paths.slice(0, 200);

  // Locate files
  var instructionMD      = findEntry_(entries, /(^|\/)instruction\.md$/i);
  // var solveSh    = findEntry_(entries, /(^|\/)solution\.sh$/i);
  // Detect either solve.sh or solution.yaml
  var solveSh = findEntry_(entries, /(^|\/)solution\/solve\.(sh|yaml)$/i);

  var runTestsSh    = findEntry_(entries, /(^|\/)tests\/test\.sh$/i);
  var dockerfile    = findEntry_(entries, /(^|\/)environment\/(dockerfile|Dockerfile)$/);
  var testsPy       = findEntry_(entries, /(^|\/)tests\/(test_state|test_outputs)\.py$/i);
  // Find task.toml for metadata check
  var taskToml = findEntry_(entries, /(^|\/)task\.toml$/i);

  // Read file contents
  var text_task = blobToText_(instructionMD);
  var text_sol  = blobToText_(solveSh);
  var text_run  = blobToText_(runTestsSh);
  var text_dk   = blobToText_(dockerfile);

  var text_tst  = blobToText_(testsPy);
  var text_toml = blobToText_(taskToml);

  // Get model run summary from aggregated result.json files
  // Also checks trajectory.json for cheating and ctrf.json for failure analysis
  var modelRunSummary = getModelRunSummary_(entries);
  
  // Extract failure and success data collected during getModelRunSummary_
  var worstRunPerModel = modelRunSummary._worstRunPerModel || {};
  var bestRunPerModel = modelRunSummary._bestRunPerModel || {};
  delete modelRunSummary._worstRunPerModel;
  delete modelRunSummary._bestRunPerModel;

  var allBlobs = {
    "instruction.md": text_task,
    "solution/solve.sh": text_sol,
    "tests/test.sh": text_run,
    "environment/Dockerfile": text_dk,
    "tests/test_state.py": text_tst,
    "task.toml": text_toml
  };

  var rootFolderName = meta.name;
  var pathsBlock = topPaths.join('\n');
  
  // Extract environment folder files (excluding Dockerfile)
  var envFiles = getEnvironmentFiles_(entries);

  // LLM prompts
  var a_prompt_correctness = llmPromptA_(text_task, text_dk, pathsBlock, text_sol, envFiles);
  var b_tests    = llmPromptB_(text_tst, text_task);
  var b_instruction_test_alignment = llmPromptM_InstructionAlignment_(text_tst, text_task);
  var c_slug     = llmPromptC_(rootFolderName, text_task);
  var e_docker   = llmPromptE_(text_dk, pathsBlock, text_task);
  var f_runner   = llmPromptF_(text_run);
  var g_solution = llmPromptG_(text_sol, text_task, text_dk);
  var j_gates    = llmPromptJ_(text_tst, text_run);
  var h_metadata = llmPromptH_TaskMetadata_(text_toml, rootFolderName);

  // Fire model calls
  var A = callLLM_(a_prompt_correctness);
  var B = callLLM_(b_tests);
  var C = callLLM_(c_slug);
  var E = callLLM_(e_docker);
  var F = callLLM_(f_runner);
  var G = callLLM_(g_solution);
  var H = text_toml ? callLLM_(h_metadata) : '(no task.toml found)';
  var J = callLLM_(j_gates);
  var M = callLLM_(b_instruction_test_alignment);
  
  // K) Model Run Summary + Per-Model Trajectory Analysis
  var K_summary = formatModelRunSummary_(modelRunSummary);
  
  // Get all model names from both worst and best runs
  var allModelNames = {};
  Object.keys(worstRunPerModel).forEach(function(m) { allModelNames[m] = true; });
  Object.keys(bestRunPerModel).forEach(function(m) { allModelNames[m] = true; });
  Object.keys(modelRunSummary).forEach(function(m) { 
    if (m !== '_worstRunPerModel' && m !== '_bestRunPerModel') allModelNames[m] = true; 
  });
  var modelNames = Object.keys(allModelNames).sort();
  
  var K_analyses = [];
  
  for (var mi = 0; mi < modelNames.length; mi++) {
    var modelKey = modelNames[mi];
    var worstRun = worstRunPerModel[modelKey];
    var bestRun = bestRunPerModel[modelKey];
    
    var modelSection = '\n========================================\n';
    modelSection += 'MODEL: ' + modelKey + '\n';
    modelSection += '========================================\n';
    
    // Get result.json stats for this model
    var summaryStats = modelRunSummary[modelKey];
    var hasFailedRuns = summaryStats && summaryStats.failed > 0;
    var hasPassedRuns = summaryStats && summaryStats.passed > 0;
    
    // --- WORST RUN ANALYSIS (Failure Validation) ---
    modelSection += '\n--- WORST RUN (Failure Validation) ---\n';
    if (worstRun && worstRun.failureOutput) {
      modelSection += 'Run ID: ' + worstRun.runId + '\n';
      modelSection += 'Failed: ' + worstRun.failedCount + '/' + worstRun.totalTests + ' tests\n';
      modelSection += 'Trajectory: ' + (worstRun.trajectoryContent ? 'Available' : 'Not found') + '\n\n';
      
      var k_failure_prompt = llmPromptK_FailureAnalysis_(worstRun, text_task, text_tst);
      var failureAnalysis = callLLM_(k_failure_prompt);
      modelSection += failureAnalysis;
    } else if (hasFailedRuns) {
      modelSection += '⚠️ ' + summaryStats.failed + ' failed runs detected\n';
      modelSection += '(test-stdout.txt not found - detailed analysis unavailable)\n';
    } else {
      modelSection += '✓ No failed runs to analyze\n';
    }
    
    // --- BEST RUN ANALYSIS (Cheating Check) ---
    modelSection += '\n\n--- BEST RUN (Cheating Check) ---\n';
    if (bestRun && bestRun.trajectoryContent) {
      modelSection += 'Run ID: ' + bestRun.runId + '\n';
      modelSection += 'Passed: ' + bestRun.passedCount + '/' + bestRun.totalTests + ' tests\n\n';
      
      var k_cheating_prompt = llmPromptK_CheatingAnalysis_(bestRun, text_task, text_sol);
      var cheatingAnalysis = callLLM_(k_cheating_prompt);
      modelSection += cheatingAnalysis;
    } else if (hasPassedRuns) {
      modelSection += '✓ ' + summaryStats.passed + ' passed runs\n';
      if (summaryStats.cheating_detected && summaryStats.cheating_detected.length > 0) {
        modelSection += '⚠️ CHEATING DETECTED:\n';
        for (var ci = 0; ci < summaryStats.cheating_detected.length; ci++) {
          modelSection += '  - ' + summaryStats.cheating_detected[ci] + '\n';
        }
      } else {
        modelSection += '(trajectory.json not found for detailed cheating analysis)\n';
      }
    } else {
      modelSection += '⚠️ No passed runs to analyze\n';
    }
    
    K_analyses.push(modelSection);
  }
  
  var K_analysis = K_analyses.length > 0 ? K_analyses.join('\n') : '(no model runs found)';
  
  var K = K_summary + '\n\n--- TRAJECTORY ANALYSIS (Per Model) ---' + K_analysis;

  // Build results map
  var results = {
    A: { title: 'PROMPT', reviewText: A },
    B: { title: 'TESTS', reviewText: B },
    C: { title: 'SLUG & NAMING', reviewText: C },
    E: { title: 'DOCKERFILE', reviewText: E },
    F: { title: 'TEST.SH', reviewText: F },
    G: { title: 'SOLVE.SH', reviewText: G },
    H: { title: 'TASK METADATA (task.toml)', reviewText: H },
    J: { title: 'FORCED GATES', reviewText: J },
    K: { title: 'MODEL RUN SUMMARY', reviewText: K },
    M: { title: 'INSTRUCTION-TEST ALIGNMENT', reviewText: M }
  };

  // Create Google Doc and return URL (pass structuralResult if available)
  var docUrl = createReviewDoc_(1, rootFolderName, results, allBlobs, structuralResult);
  return docUrl;
}

/* =============== Per-criterion prompts (SYSTEM+USER) =============== */
/* Each returns a {system, user} pair that callLLM_() uses. */

function systemHeader_() {
  return (
    'You are a senior technical reviewer for Terminal-Bench tasks. ' +
    'Terminal-Bench evaluates AI agents on real-world terminal tasks executed in sandboxed Docker environments. ' +
    'Its Harness manages setup, orchestration, and result parsing (via TrialHandler and ParserFactory which only support Pytest format even for different language tasks.); ' +
    'the Agent handles decision-making, terminal interaction, and command execution. ' +
    'Your job is to perform **static analysis only** — do not execute or assume runtime behavior. ' +
    'Rely exclusively on the provided text and file contents (instruction.md, solve.sh, tests, etc.). ' +
    'Assess correctness, compliance with the Terminal-Bench architecture, clarity of instruction, test integrity, ' +
    'and consistency between the task, solution, and test logic. ' +
    'Be conservative in judgment: if uncertain, explicitly state the doubt. ' +
    'Write a **human-readable review** (bulleted or short paragraphs). ' +
    'Avoid JSON or structured output formats. ' +
    'When describing issues, reference relevant lines, code snippets, or configuration keys. ' +
    'Focus on whether the task would run successfully under the Harness flow — from container setup, through agent execution, ' +
    'to result parsing and resolution (i.e., test pass/fail computation). ' +
    'Highlight any deviations from expected Terminal-Bench conventions, missing dependencies, unclear success criteria, ' +
    'or potential parser/test mismatches.'+
    'BE STRAIGHT TO THE ISSUE AND FLAG IT. AVOID BLUFF WORLDS AND ALSO AVOID MARKDOWN FORMATTING AND OUTPUT YOUR INSIGHTS AS POINTS.'+
    'Make sure to give a conclusion if its a pass or fail with summary'
  );
}


/* A) PROMPT — checks instruction.md + environment folder files */
function llmPromptA_(instructionMD, dockerfile, pathsBlock, solution, envFiles) {
  var envFilesFormatted = typeof formatEnvFiles_ === 'function' ? formatEnvFiles_(envFiles) : "(env files not available)";
  
  var rubric =
    "A) PROMPT (instruction.md) — HUMANE PROMPT VALIDATION\n" +
    "Goal: Verify the prompt is written in HUMANE style AND all referenced input files exist.\n" +
    "\n" +
    "============================================================\n" +
    "PART 1: HUMANE PROMPT STYLE CHECK (CRITICAL)\n" +
    "============================================================\n" +
    "Evaluate if the instruction.md is written like a HUMAN would naturally write it.\n" +
    "\n" +
    "✅ HUMANE PROMPT CHARACTERISTICS (should have MOST of these):\n" +
    "- Natural, conversational language ('You have a...', 'Your task is to...')\n" +
    "- Describes the GOAL/WHAT, not step-by-step HOW\n" +
    "- Uses context and background to explain the problem\n" +
    "- Allows flexibility in implementation approach\n" +
    "- Reads like a message from a colleague, not a spec document\n" +
    "- May include helpful hints without being prescriptive\n" +
    "- Uses domain terminology naturally\n" +
    "\n" +
    "❌ NON-HUMANE (ROBOTIC) CHARACTERISTICS (should NOT have these):\n" +
    "- Numbered step-by-step instructions like a checklist\n" +
    "- Overly formal, specification-style language\n" +
    "- Explicit function signatures or class definitions to implement\n" +
    "- Exact variable names/file paths the solution MUST use\n" +
    "- Line-by-line implementation guidance\n" +
    "- Template-style placeholders (e.g., 'Implement function X that takes Y and returns Z')\n" +
    "\n" +
    "❌ TOO TERSE / CRYPTIC (should NOT have these):\n" +
    "- Fewer than ~8-10 lines of meaningful content (excluding headers/blank lines)\n" +
    "- Reads like compressed shorthand or abbreviated notes\n" +
    "- Missing context about WHY the task exists or WHAT the problem domain is\n" +
    "- No explanation of input data, expected output, or success criteria\n" +
    "- Omits output file names or key requirements that tests later check for\n" +
    "- So short that a competent developer would need to guess at requirements\n" +
    "\n" +
    "❌ LLM-GENERATED FORMATTING (FAIL if excessive):\n" +
    "- Too many markdown headers (## Section, ### Subsection everywhere)\n" +
    "- Excessive bullet point lists for everything\n" +
    "- Bold/italic on every other word\n" +
    "- Over-structured like documentation, not natural speech\n" +
    "- Reads like an LLM wrote it, not a human\n" +
    "NOTE: Use of AI to reword/restructure is OK, but result must read HUMAN-LIKE\n" +
    "\n" +
    "HUMANE PROMPT VERDICT:\n" +
    "- PASS: Prompt reads naturally, describes goal, provides sufficient context, allows implementation freedom\n" +
    "- WARNING: Prompt is slightly terse but core requirements are clear\n" +
    "- FAIL: Prompt is robotic, over-prescriptive, reads like a spec document, OR is too terse/cryptic\n" +
    "\n" +
    "============================================================\n" +
    "PART 2: ENVIRONMENT FILE VALIDATION\n" +
    "============================================================\n" +
    "For each file/path mentioned in instruction.md that the agent needs to READ or USE:\n" +
    "1. Check if it exists in the ENVIRONMENT FILES list\n" +
    "2. Check if it is GENERATED by Dockerfile (RUN python, RUN gcc, git clone, curl/wget)\n" +
    "3. Check if the task asks the AGENT to CREATE the file (output files are OK)\n" +
    "\n" +
    "FILE RULES:\n" +
    "- INPUT files must exist in environment/ OR be generated by Dockerfile\n" +
    "- OUTPUT files (agent creates them) are OK if not present\n" +
    "- Files generated during Docker build (git clone, compile) PASS\n" +
    "\n" +
    "============================================================\n" +
    "PART 3: MALPRACTICE CHECK\n" +
    "============================================================\n" +
    "Check for model-specific language in instruction.md CONTENT ONLY.\n" +
    "\n" +
    "⚠️ IMPORTANT: IGNORE model-run-logs/ folder paths!\n" +
    "   Model names in paths like 'model-run-logs/hunyuan-2.0-thinking-dev-preview/'\n" +
    "   are EXPECTED and NOT a violation. This is standard folder structure.\n" +
    "\n" +
    "❌ FAIL as MALPRACTICE (model names in CONTENT):\n" +
    "   - instruction.md says 'Claude will understand this better'\n" +
    "   - instruction.md says 'Hunyuan should use X approach'\n" +
    "   - instruction.md references specific model capabilities\n" +
    "\n" +
    "✅ NOT A VIOLATION (ignore these):\n" +
    "   - model-run-logs/hunyuan-2.0-thinking-dev-preview/ (folder path)\n" +
    "   - model-run-logs/claude-opus-4-5/ (folder path)\n" +
    "   - Any model name appearing in model-run-logs/ paths\n" +
    "\n" +
    "OTHER MALPRACTICE CHECKS:\n" +
    "- PII (real names, emails) → FLAG\n" +
    "- Symlink-based tests → FAIL (not OS-agnostic)\n" +
    "- Creating solve.sh in prompt → FAIL (conflicts with solution)\n" +
    "\n" +
    "============================================================\n" +
    "PART 4: INTERNAL CONSISTENCY CHECK (CRITICAL)\n" +
    "============================================================\n" +
    "Scan the ENTIRE instruction.md for INTERNAL CONTRADICTIONS.\n" +
    "The same instruction must NOT specify conflicting requirements.\n" +
    "\n" +
    "CHECK FOR THESE CONTRADICTIONS:\n" +
    "\n" +
    "1. NUMERIC PRECISION CONFLICTS:\n" +
    "   - One place says '2 decimal places (0.00)' and another says '3 decimal places (0.000)'\n" +
    "   - Example: 'Round to 0.00' vs 'Precision of 0.000' → CONTRADICTION\n" +
    "   - Different rounding rules for same metric\n" +
    "   - Conflicting tolerance values (e.g., '±0.01' vs '±0.001')\n" +
    "\n" +
    "2. FILE PATH/NAME CONFLICTS:\n" +
    "   - Same file referred to with different names (e.g., 'data.csv' vs 'input.csv')\n" +
    "   - Conflicting output paths (e.g., 'save to output/' vs 'save to results/')\n" +
    "   - Input file named differently in different places\n" +
    "\n" +
    "3. FORMAT CONFLICTS:\n" +
    "   - Output format specified as JSON in one place, CSV in another\n" +
    "   - Header required vs no header\n" +
    "   - Different column names for same data\n" +
    "   - Conflicting data types (string vs int)\n" +
    "\n" +
    "4. VALUE/PARAMETER CONFLICTS:\n" +
    "   - Different default values for same parameter\n" +
    "   - Conflicting thresholds (e.g., 'if value > 10' vs 'if value >= 10')\n" +
    "   - Contradictory conditions\n" +
    "\n" +
    "5. REQUIREMENT CONFLICTS:\n" +
    "   - 'Include header row' vs 'No header in output'\n" +
    "   - 'Sort ascending' vs 'Sort descending'\n" +
    "   - 'Use library X' vs 'Do not use external libraries'\n" +
    "\n" +
    "HOW TO CHECK:\n" +
    "- Read the ENTIRE instruction carefully\n" +
    "- Extract ALL numeric specifications (decimal places, tolerances, thresholds)\n" +
    "- Extract ALL file paths and names\n" +
    "- Extract ALL format requirements\n" +
    "- Compare each specification against ALL OTHER mentions of the same thing\n" +
    "- If ANY conflict is found → FAIL with specific line/quote references\n" +
    "\n" +
    "CONSISTENCY VERDICT:\n" +
    "- PASS: No internal contradictions found\n" +
    "- FAIL: Contradictions found (list each with quotes from instruction)\n" +
    "\n" +
    "============================================================\n" +
    "PART 5: TYPOS CHECK (From Benchmark Paper)\n" +
    "============================================================\n" +
    "Look VERY CLOSELY for typos in:\n" +
    "1. FILE NAMES - instruction.md mentions 'output.csv' but tests check 'outputs.csv'\n" +
    "2. VARIABLE NAMES - instruction says 'result_score' but code expects 'resultScore'\n" +
    "3. PATH NAMES - '/app/data/' vs '/app/Data/' (case sensitivity)\n" +
    "4. FUNCTION NAMES - 'calculate_sum' vs 'calculateSum'\n" +
    "5. KEY NAMES in JSON/config - 'user_id' vs 'userId'\n" +
    "\n" +
    "Cross-check between:\n" +
    "- instruction.md mentions vs test_outputs.py assertions\n" +
    "- instruction.md mentions vs solve.sh usage\n" +
    "- Dockerfile paths vs instruction.md paths\n" +
    "\n" +
    "TYPO EXAMPLES:\n" +
    "❌ instruction.md: 'Save to results.json'\n" +
    "   tests: open('result.json')  ← Missing 's'\n" +
    "\n" +
    "❌ instruction.md: 'Set BATCH_SIZE parameter'\n" +
    "   tests: assert config['batch_size']  ← Case mismatch\n" +
    "\n" +
    "VERDICT: WARNING if potential typos found, FAIL if typo would cause test failure\n" +
    "\n" +
    "============================================================\n" +
    "OUTPUT FORMAT\n" +
    "============================================================\n" +
    "1. HUMANE STYLE CHECK:\n" +
    "   - Is it conversational? (Yes/No)\n" +
    "   - Describes goal vs step-by-step? (Goal/Steps)\n" +
    "   - Implementation freedom? (Yes/No)\n" +
    "   - VERDICT: PASS / PASS WITH WARNING / FAIL\n" +
    "\n" +
    "2. FILE VALIDATION:\n" +
    "   - List each INPUT file and status (FOUND/GENERATED/MISSING)\n" +
    "   - VERDICT: PASS / PASS WITH WARNING / FAIL\n" +
    "\n" +
    "3. MALPRACTICE CHECK:\n" +
    "   - Model-specific language in CONTENT: (Found/Not found)\n" +
    "     NOTE: IGNORE model names in model-run-logs/ paths - those are expected!\n" +
    "   - PII: (Found/Not found)\n" +
    "   - VERDICT: PASS / FAIL\n" +
    "\n" +
    "4. INTERNAL CONSISTENCY CHECK:\n" +
    "   - Numeric precision: (Consistent/Contradictory)\n" +
    "   - File paths/names: (Consistent/Contradictory)\n" +
    "   - Output formats: (Consistent/Contradictory)\n" +
    "   - Parameters/values: (Consistent/Contradictory)\n" +
    "   - Requirements: (Consistent/Contradictory)\n" +
    "   - If contradictory, QUOTE the conflicting statements\n" +
    "   - VERDICT: PASS / FAIL\n" +
    "\n" +
    "5. TYPOS CHECK:\n" +
    "   - File name typos: (Found/Not found)\n" +
    "   - Variable/key name typos: (Found/Not found)\n" +
    "   - Path typos: (Found/Not found)\n" +
    "   - If found, list each with correct vs incorrect\n" +
    "   - VERDICT: PASS / WARNING / FAIL\n" +
    "\n" +
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
    "FINAL VERDICT: ✅ PASS / ⚠️ PASS WITH WARNINGS / ❌ FAIL\n" +
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
    "   - List any warnings\n" +
    "   - If FAIL, list which checks failed\n";

  var user =
    "--- instruction.md ---\n" +
    ((typeof instructionMD !== 'undefined' && instructionMD) ? instructionMD : "(missing)") + "\n\n" +
    "--- ENVIRONMENT FILES (in environment/ folder) ---\n" +
    envFilesFormatted + "\n\n" +
    "--- Dockerfile ---\n" +
    ((typeof dockerfile !== 'undefined' && dockerfile) ? dockerfile : "(missing)") + "\n\n" +
    "--- ZIP paths (sample) ---\n" +
    ((typeof pathsBlock !== 'undefined' && pathsBlock) ? pathsBlock : "(no paths visible)") + "\n\n" +
    "--- solve.sh ---\n" +
    ((typeof solution !== 'undefined' && solution) ? solution : "(solution missing)");

  return { system: systemHeader_(), user: rubric + "\n\n" + user };
}


/**
 * A) PROMPT WITH SRC FILES — Enhanced version with src/ folder contents
 * Used in Dimension Review when user uploads src files
 */
function llmPromptA_WithSrc_(instructionMD, dockerfile, pathsBlock, solution, srcFilesContent) {
  var rubric =
    "A) PROMPT (instruction.md) — WITH SOURCE FILES\n" +
    "Goal: The prompt must be unambiguous, internally consistent, AND the referenced inputs must be present.\n" +
    "\n" +
    "IMPORTANT: You have been provided with the actual src/ folder file contents below.\n" +
    "Use these to verify that files referenced in instruction.md actually exist and contain valid code.\n" +
    "\n" +
    "============================================================\n" +
    "PART 1: FILE VALIDATION\n" +
    "============================================================\n" +
    "- Clear problem statement with zero ambiguity about input(s), process, and expected output(s)\n" +
    "- Explicit file paths for inputs/outputs if any\n" +
    "- Domain consistency\n" +
    "- Verify that files mentioned in instruction.md are present in the src/ files provided\n" +
    "- Check that the Dockerfile copies the necessary src/ files\n" +
    "\n" +
    "============================================================\n" +
    "PART 2: MALPRACTICE CHECK\n" +
    "============================================================\n" +
    "⚠️ IMPORTANT: Only check instruction.md CONTENT, NOT file paths!\n" +
    "   Model names in model-run-logs/ paths are EXPECTED and NOT violations.\n" +
    "\n" +
    "- CRITICAL MODEL TARGETING: Search instruction.md CONTENT for language that:\n" +
    "  • References specific model names (Claude, Hunyuan, GPT, OpenAI, Anthropic, etc.)\n" +
    "  • Says things like 'only Claude will understand this' or 'Hunyuan cannot do this'\n" +
    "  • Gives hints that favor one model over another\n" +
    "  → FLAG as MALPRACTICE if any model-specific language is found IN CONTENT\n" +
    "\n" +
    "✅ IGNORE (these are NOT violations):\n" +
    "  • model-run-logs/hunyuan-2.0-thinking-dev-preview/ (standard folder path)\n" +
    "  • model-run-logs/claude-opus-4-5/ (standard folder path)\n" +
    "  • Any model name appearing ONLY in file/folder paths\n" +
    "\n" +
    "============================================================\n" +
    "PART 3: INTERNAL CONSISTENCY CHECK (CRITICAL)\n" +
    "============================================================\n" +
    "Scan the ENTIRE instruction.md for INTERNAL CONTRADICTIONS.\n" +
    "The same instruction must NOT specify conflicting requirements.\n" +
    "\n" +
    "CHECK FOR THESE CONTRADICTIONS:\n" +
    "\n" +
    "1. NUMERIC PRECISION CONFLICTS:\n" +
    "   - One place says '2 decimal places (0.00)' and another says '3 decimal places (0.000)'\n" +
    "   - Example: 'Round to 0.00' vs 'Precision of 0.000' → CONTRADICTION\n" +
    "   - Different rounding rules for same metric\n" +
    "   - Conflicting tolerance values (e.g., '±0.01' vs '±0.001')\n" +
    "\n" +
    "2. FILE PATH/NAME CONFLICTS:\n" +
    "   - Same file referred to with different names (e.g., 'data.csv' vs 'input.csv')\n" +
    "   - Conflicting output paths (e.g., 'save to output/' vs 'save to results/')\n" +
    "\n" +
    "3. FORMAT CONFLICTS:\n" +
    "   - Output format specified as JSON in one place, CSV in another\n" +
    "   - Header required vs no header\n" +
    "   - Different column names for same data\n" +
    "\n" +
    "4. VALUE/PARAMETER CONFLICTS:\n" +
    "   - Different default values for same parameter\n" +
    "   - Conflicting thresholds (e.g., 'if value > 10' vs 'if value >= 10')\n" +
    "\n" +
    "5. REQUIREMENT CONFLICTS:\n" +
    "   - 'Include header row' vs 'No header in output'\n" +
    "   - 'Sort ascending' vs 'Sort descending'\n" +
    "\n" +
    "If ANY conflict is found → FAIL with specific quotes\n" +
    "\n" +
    "============================================================\n" +
    "OUTPUT FORMAT\n" +
    "============================================================\n" +
    "1. FILE VALIDATION: PASS/WARNING/FAIL (list missing files)\n" +
    "2. MALPRACTICE CHECK: PASS/FAIL (list issues)\n" +
    "3. INTERNAL CONSISTENCY:\n" +
    "   - Numeric precision: Consistent/Contradictory\n" +
    "   - File paths: Consistent/Contradictory\n" +
    "   - Formats: Consistent/Contradictory\n" +
    "   - If contradictory, QUOTE the conflicting statements\n" +
    "   - VERDICT: PASS/FAIL\n" +
    "\n" +
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
    "FINAL VERDICT: ✅ PASS / ⚠️ PASS WITH WARNINGS / ❌ FAIL\n" +
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";

  var user =
    "FILES:\n" +
    "--- instruction.md ---\n" +
    ((typeof instructionMD !== 'undefined' && instructionMD) ? instructionMD : "(missing)") + "\n\n" +
    "--- Dockerfile ---\n" +
    ((typeof dockerfile !== 'undefined' && dockerfile) ? dockerfile : "(missing)") + "\n\n" +
    "--- src/ folder paths ---\n" +
    ((typeof pathsBlock !== 'undefined' && pathsBlock) ? pathsBlock : "(no paths visible)") + "\n\n" +
    "--- solve.sh ---\n" +
    ((typeof solution !== 'undefined' && solution) ? solution : "(solution missing)") + "\n\n" +
    "--- src/ folder file contents ---\n" +
    ((typeof srcFilesContent !== 'undefined' && srcFilesContent) ? srcFilesContent : "(no src files provided)");

  return { system: systemHeader_(), user: rubric + "\n\n" + user };
}


/* B) TESTS — needs tests + instruction.md */
function llmPromptB_(testsPy, instructionMD) {
  const rubric =
"B) TESTS (tests/test_outputs.py) — HUMANE PROMPT MODE\n" +
"Goal: Tests verify the task's intent, allowing for IMPLIED requirements that experts would understand.\n" +
"\n" +
"=== HUMANE PROMPT PHILOSOPHY ===\n" +
"Humane prompts are INTENTIONALLY less detailed than traditional prompts.\n" +
"They describe WHAT to achieve, not exactly HOW to achieve it.\n" +
"Tests MAY check implementation details that are REASONABLY IMPLIED by the task.\n" +
"\n" +
"============================================================\n" +
"PART 1: INFORMATIVE TEST DOCSTRINGS (REQUIRED)\n" +
"============================================================\n" +
"Every test function MUST have an informative docstring that:\n" +
"1. Describes what behavior the test checks\n" +
"2. References the corresponding requirement in instruction.md\n" +
"\n" +
"❌ FAILING DOCSTRING EXAMPLES:\n" +
"- No docstring at all\n" +
"- Generic docstring like 'Test the output.' or 'Check results.'\n" +
"- Docstring that doesn't explain WHAT is being verified\n" +
"\n" +
"✅ GOOD DOCSTRING EXAMPLES:\n" +
"def test_output_file_created():\n" +
"    '''\n" +
"    Verify that result.json is created in the output directory.\n" +
"    Corresponds to instruction.md: 'Save results to output/result.json'\n" +
"    '''\n" +
"\n" +
"def test_json_structure():\n" +
"    '''\n" +
"    Verify the JSON output contains required fields.\n" +
"    Corresponds to instruction.md: 'Output must include status and count fields'\n" +
"    '''\n" +
"\n" +
"DOCSTRING VERDICT:\n" +
"- Count how many test functions have NO docstring or GENERIC docstring\n" +
"- If >50% of tests lack informative docstrings → WARNING\n" +
"- If ALL tests lack docstrings → FAIL\n" +
"\n" +
"============================================================\n" +
"PART 2: HUMANE PROMPT VALIDATION\n" +
"============================================================\n" +
"=== ACCEPT AS VALID (DO NOT FLAG) ===\n" +
"- Tests checking data structures/formats that are standard for the domain\n" +
"- Tests verifying numeric precision/behavior that experts would expect\n" +
"- Tests validating intermediate steps that are necessary for the final output\n" +
"- Tests checking standard error handling for the problem domain\n" +
"- Tests verifying formulas/algorithms that are the obvious choice for the task\n" +
"- Any test that checks something a competent developer would naturally implement\n" +
"\n" +
"=== FILE NAMING — BE STRICT ===\n" +
"If instruction.md only specifies an OUTPUT DIRECTORY but tests require SPECIFIC FILENAMES:\n" +
"-> FAIL: Filenames are NOT implied unless instruction.md explicitly mentions them.\n" +
"   A model could reasonably name files differently and fail. This is a task bug.\n" +
"ONLY accept implicit filenames when instruction explicitly lists expected output files.\n" +
"\n" +
"=== ONLY FLAG AS FAIL IF ===\n" +
"1. Tests CONTRADICT the prompt (e.g., prompt says CSV, test expects JSON)\n" +
"2. Tests check for ARBITRARY magic values with no logical basis\n" +
"3. Tests use MODEL GATING (checking model identity to force pass/fail)\n" +
"4. Tests directly execute solve.sh or import solution\n" +
"5. Tests contain raw 'raise' statements (must use assert or pytest.fail)\n" +
"6. Tests involve filesystem symlinks (not OS-agnostic)\n" +
"7. Tests check for requirements that are IMPOSSIBLE to infer from context\n" +
"8. Tests require SPECIFIC FILENAMES not mentioned in instruction.md\n" +
"9. Tests check behaviors/properties NOT mentioned in instruction.md AND NOT inferable from any provided context\n" +
"\n" +
"============================================================\n" +
"PART 3: FORBIDDEN PATTERNS\n" +
"============================================================\n" +
"- Model gating tests (checking model name to fail specific models)\n" +
"- Tests that run solve.sh or import solution module\n" +
"- Raw 'raise' statements inside test functions\n" +
"- Symlink-based tests (not OS-agnostic)\n" +
"- Hardcoded expected values that model couldn't derive from instructions\n" +
"\n" +
"=== EXAMPLES OF ACCEPTABLE IMPLICIT TESTS ===\n" +
"Prompt: 'Train a model on the dataset and save it'\n" +
"Test checks: model file exists, can be loaded, makes reasonable predictions\n" +
"→ PASS: These are implied requirements for a trained model\n" +
"\n" +
"Prompt: 'Parse the log file and extract errors'\n" +
"Test checks: output is valid JSON, contains timestamp and message fields\n" +
"→ PASS: Standard format for parsed log data\n" +
"\n" +
"=== EXAMPLES OF INVALID TESTS (FAIL) ===\n" +
"Prompt: 'Save results to output.csv'\n" +
"Test checks: file must be named 'results_v2_final.csv'\n" +
"→ FAIL: Arbitrary naming not implied by prompt\n" +
"\n" +
"Prompt: 'Calculate the average'\n" +
"Test checks: must use numpy.mean() specifically\n" +
"→ FAIL: Implementation detail that contradicts flexibility\n" +
"\n" +
"============================================================\n" +
"PART 4: BRITTLE / WEAK TEST DETECTION\n" +
"============================================================\n" +
"Tests must perform FUNCTIONAL VALIDATION, not naive string matching.\n" +
"\n" +
"BRITTLE PATTERNS (FLAG AS WARNING):\n" +
"- Checking if a short string/number appears ANYWHERE in combined output\n" +
"  (e.g., assert '3' in html+js — the number 3 appears in any code)\n" +
"- Using 'in' operator on large text blobs instead of parsing structured output\n" +
"- Keyword presence checks that any trivial output could satisfy\n" +
"\n" +
"WHY: Brittle tests are easily hackable and produce false failures.\n" +
"\n" +
"VERDICT: WARNING if >50% of tests use brittle string matching\n" +
"\n" +
"============================================================\n" +
"OUTPUT FORMAT\n" +
"============================================================\n" +
"1. DOCSTRING CHECK:\n" +
"   - Tests with good docstrings: X/Y\n" +
"   - Tests missing/generic docstrings: list them\n" +
"   - VERDICT: PASS / WARNING / FAIL\n" +
"\n" +
"2. HUMANE PROMPT VALIDATION:\n" +
"   - Tests that CONTRADICT prompt: list them\n" +
"   - Undisclosed filename/behavior requirements: list them\n" +
"   - VERDICT: PASS / FAIL\n" +
"\n" +
"3. FORBIDDEN PATTERNS:\n" +
"   - Model gating: Found/Not found\n" +
"   - solve.sh access: Found/Not found\n" +
"   - Raw raise: Found/Not found\n" +
"   - VERDICT: PASS / FAIL\n" +
"\n" +
"4. BRITTLE TESTS:\n" +
"   - Tests using weak string matching: list them\n" +
"   - VERDICT: PASS / WARNING\n" +
"\n" +
"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
"FINAL VERDICT: ✅ PASS / ⚠️ PASS WITH WARNINGS / ❌ FAIL\n" +
"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";

var user =
"FILES:\n" +
"--- instruction.md ---\n" +
((typeof instructionMD !== 'undefined' && instructionMD) ? instructionMD : '(missing)') + "\n\n" +
"--- tests/test_outputs.py ---\n" +
((typeof testsPy !== 'undefined' && testsPy) ? testsPy : '(missing)');


  return { system: systemHeader_(), user: rubric + "\n\n" + user };
}

/* C) SLUG & NAMING — ONLY slug descriptiveness vs prompt; needs root folder name + instruction.md */
function llmPromptC_(rootFolderName, instructionMD) {
      var rubric =
    "C) SLUG & NAMING (root folder)\n" +
    "Goal: Check ONLY whether the <slug> in \"UUID-tb-<domain>-<slug>-<difficulty>/\" is descriptive for the instruction.md instruction.\n" +
    "\n" +
    "Descriptive means:\n" +
    "- Reflects the main action/goal of the instruction\n" +
    "- Not vague or misleading\n" +
    "\n" +
    "Incorrect / Non-descriptive examples (these are WRONG):\n" +
    "- data-analysis-task\n" +
    "  • Generic and vague; does not indicate the specific task or action.\n" +
    "- utils\n" +
    "  • Too short and non-informative; sounds like a misc folder, not a task.\n" +
    "- final-project\n" +
    "  • Meta/organizational label; conveys nothing about the actual task.\n" +
    "- project-x\n" +
    "  • Placeholder/codename; not descriptive of the prompt’s objective.\n" +
    "- cool-llm-stuff\n" +
    "  • Buzzwordy and ambiguous; does not map to a concrete outcome.\n" +
    "- use-python\n" +
    "  • Names a tool but not the action/goal (e.g., “sessionize-jsonl”, “rank-docs”).\n" +
    "- answer-writer\n" +
    "  • Misleading; implies writing static answers rather than performing the required computation/process.\n" +
    "- random-scripts\n" +
    "  • Catch-all; suggests unrelated scripts rather than a focused, testable task.\n" +
    "- my-solution\n" +
    "  • Author-centric and non-descriptive; reveals nothing about the task requirements.\n" +
    "- analyse\n" +
    "  • Misspelled/overly terse; lacks the target object and outcome (what is being analyzed and to what end?).\n" +
    "\n" +
    "Report briefly:\n" +
    "- If the slug is valid and descriptive, explain why.\n" +
    "- If the slug is not descriptive, explain why and also suggest one or more descriptive names.\n" +
    "- If the root-folder-name is missing then the trainer didn't follow the format - /^([0-9a-f-]+-(?:tb|terminal-bench)-[^.]+?)\\.(zip)$/i so at this case suggest the folder-name\n" +
    "\n" +
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
    "FINAL VERDICT: ✅ PASS / ❌ FAIL\n" +
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";

    var user =
    "FILES:\n" +
    "--- root-folder-name ---\n" +
    ((typeof rootFolderName !== 'undefined' && rootFolderName) ? rootFolderName : '(missing)') + "\n\n" +
    "--- instruction.md ---\n" +
    ((typeof instructionMD !== 'undefined' && instructionMD) ? instructionMD : '(missing)');

  return { system: systemHeader_(), user: rubric + "\n\n" + user };
}

function llmPromptM_InstructionAlignment_(instructionMD, testsPy) {
  var safeTask = (instructionMD && instructionMD.trim()) ? instructionMD.trim() : "(missing)";
  var safeTests = (testsPy && testsPy.trim()) ? testsPy.trim() : "(missing)";

  var rubric =
"M) STRICT INSTRUCTION–TEST ALIGNMENT CHECK\n" +
"Goal: Verify that all tests in tests/test_outputs.py are fully disclosed, justified, and supported by instruction.md instructions.\n" +
"\n" +
"============================================================\n" +
"STAGE 0 — TEST FILE REFERENCE CHECK (REQUIRED)\n" +
"============================================================\n" +
"If a test references a shared file (input data, config, etc.), the instruction.md MUST mention:\n" +
"1. The file's existence and location\n" +
"2. The file's purpose and expected format\n" +
"\n" +
"❌ VIOLATION EXAMPLE:\n" +
"Test code: data = json.load(open('shared_data.json'))\n" +
"Instruction: (no mention of shared_data.json)\n" +
"→ FAIL: Test depends on undisclosed shared file\n" +
"\n" +
"✅ CORRECT EXAMPLE:\n" +
"Test code: data = json.load(open('input/data.json'))\n" +
"Instruction: 'You will find input data in input/data.json...'\n" +
"→ PASS: Shared file is properly documented\n" +
"\n" +
"CHECK: Scan tests for file reads (open, read, load, Path) and verify each is mentioned in instruction.\n" +
"VERDICT: FAIL if undisclosed shared files found, PASS otherwise\n" +
"\n" +
"============================================================\n" +
"STAGE 1 — BIDIRECTIONAL COVERAGE & ALIGNMENT\n" +
"============================================================\n" +
"Perform two-way validation:\n" +
"\n" +
"1️⃣  **Instruction → Test Mapping (Forward Alignment):**\n" +
"- Extract every explicit requirement, rule, and artifact from instruction.md:\n" +
"  • Functional actions (what the program should perform)\n" +
"  • Output files or directories expected\n" +
"  • JSON/YAML keys, database fields, environment variables\n" +
"  • CLI commands, flags, and expected terminal outputs\n" +
"  • Configuration elements (Dockerfile, Kubernetes, pipelines, metrics, alerts)\n" +
"- For each extracted element, find corresponding test logic or assertion in tests/test_outputs.py.\n" +
"  • If missing → mark as **UNTESTED INSTRUCTION**.\n" +
"  • If only partially tested → mark as **INCOMPLETE COVERAGE**.\n" +
"\n" +
"2️⃣  **Test → Instruction Mapping (Reverse Alignment):**\n" +
"- Extract every test case and its assertions from tests/test_outputs.py.\n" +
"- For each test assertion, verify if instruction.md explicitly or implicitly provides that expectation.\n" +
"  • If a test verifies a property, file, or function not mentioned in instruction.md → mark as **UNDECLARED TEST ASSERTION**.\n" +
"  • If a test’s validation logic depends on internal implementation details or hidden requirements (e.g., expecting a filename, JSON field, or behavior not written in the instruction) → mark as **HIDDEN OR MISLEADING TEST**.\n" +
"\n" +
"3️⃣  **Hidden or Misleading Test Detection (Strict Mode):**\n" +
"- Identify if tests use hardcoded filenames, constants, or function names absent in instruction.md.\n" +
"- Identify if tests perform deep internal checks (e.g., comparing function internals, private methods, logs) instead of output-level validation.\n" +
"- Identify if tests check behaviors not in instruction.md AND not inferable from provided source files.\n" +
"- Mark such tests as **FORGED / HIDDEN TESTS** [ If not mentioned in instruction.md].\n" +
"\n" +
"  **FILENAME SPECIFICITY (CRITICAL):**\n" +
"  If instruction.md only specifies an OUTPUT DIRECTORY but tests require SPECIFIC FILENAMES:\n" +
"  Flag as UNDECLARED TEST ASSERTION. A model naming files differently would fail despite solving correctly.\n" +
"\n" +
"============================================================\n" +
"STAGE 2 — ASSERTION–INSTRUCTION CONSISTENCY\n" +
"============================================================\n" +
"- Ensure that test assertions evaluate the same outcome described in the instruction.\n" +
"- For example:\n" +
"   • If instruction says 'write results.json with key result_score', a valid test should check for that key.\n" +
"   • If a test checks for 'accuracy_score' instead of 'result_score', it’s a **mismatch**.\n" +
"   • If instruction.md never mentions a file (e.g., main.py) but tests check for it, that is a **hidden test dependency**.\n" +
"\n" +
"============================================================\n" +
"STAGE 2.5 — STRICT COVERAGE GAPS (CRITICAL)\n" +
"============================================================\n" +
"Check for these COMMON but CRITICAL coverage gaps:\n" +
"\n" +
"1️⃣ **NUMERIC VALUE ASSERTIONS:**\n" +
"   - Extract ALL numeric metrics/counts from instruction.md (e.g., ORPHAN_COUNT, DUPLICATE_COUNT, error_rate)\n" +
"   - For EACH numeric value, verify tests assert the ACTUAL VALUE, not just existence\n" +
"   ❌ BAD: assert 'ORPHAN_COUNT' in summary  (only checks key exists)\n" +
"   ✅ GOOD: assert summary['ORPHAN_COUNT'] == expected_count  (verifies value)\n" +
"   → If tests only check existence but not values → **UNTESTED NUMERIC VALUES**\n" +
"\n" +
"2️⃣ **FORMATTING RULE ASSERTIONS:**\n" +
"   - Extract ALL formatting rules from instruction.md:\n" +
"     • Trailing spaces / no trailing spaces\n" +
"     • Blank lines / no blank lines\n" +
"     • Final newline / no final newline\n" +
"     • Specific delimiters (comma, tab, pipe)\n" +
"     • Column alignment, whitespace rules\n" +
"   - Verify tests explicitly check EACH formatting rule\n" +
"   ❌ BAD: No test checks for trailing spaces when instruction says 'no trailing spaces'\n" +
"   ✅ GOOD: assert not any(line.endswith(' ') for line in content.split('\\\\n'))\n" +
"   → If formatting rules exist but no tests verify them → **UNTESTED FORMATTING RULES**\n" +
"\n" +
"3️⃣ **EXACT vs PARTIAL MATCHING:**\n" +
"   - If instruction requires EXACT output (specific lines, specific format):\n" +
"     • Tests must check for EXACT match, not just 'in' or 'contains'\n" +
"   ❌ BAD: assert 'error_line' in issues_content  (allows extra garbage lines)\n" +
"   ✅ GOOD: assert issues_content.strip().split('\\\\n') == expected_lines  (exact match)\n" +
"   → If tests use inclusion ('in') when exact match is needed → **WEAK ASSERTION**\n" +
"\n" +
"4️⃣ **BOUNDARY CONDITIONS:**\n" +
"   - If instruction specifies ranges, limits, or edge cases:\n" +
"     • Tests should verify behavior at boundaries\n" +
"   ❌ BAD: Only tests happy path, no edge cases\n" +
"   ✅ GOOD: Tests include empty input, max values, error conditions\n" +
"\n" +
"5️⃣ **BRITTLE / WEAK ASSERTIONS:**\n" +
"   - Tests that use keyword matching on large text blobs instead of parsing structured output\n" +
"   ❌ BAD: assert '3' in (html + js_content) — trivially satisfiable\n" +
"   ❌ BAD: assert 'WIP' in all_files — matches any occurrence in any context\n" +
"   ✅ GOOD: assert board['todo']['wip_limit'] == 3 — parses structure, checks value\n" +
"   → If a KEY REQUIREMENT is ONLY validated by brittle string matching → **CRITICAL COVERAGE GAP**\n" +
"\n" +
"FLAG ALL GAPS FOUND IN THIS STAGE AS **CRITICAL COVERAGE GAPS**.\n" +
"\n" +
"============================================================\n" +
"STAGE 3 — COVERAGE & ALIGNMENT REPORT\n" +
"============================================================\n" +
"- For every instruction: state whether it is fully, partially, or not covered by tests.\n" +
"- For every test: state whether it is justified, misleading, or undeclared.\n" +
"- Summarize all findings:\n" +
"   • Untested instructions\n" +
"   • Undeclared or hidden test cases\n" +
"   • Partial or inconsistent coverage\n" +
"   • **CRITICAL COVERAGE GAPS** (from Stage 2.5)\n" +
"\n" +
"============================================================\n" +
"STAGE 4 — TIERED EVALUATION (HUMANE PROMPT MODE)\n" +
"============================================================\n" +
"Humane prompts cannot specify every implementation detail. Categorize issues by severity:\n" +
"\n" +
"**CRITICAL (causes FAIL):**\n" +
"- Undisclosed output files/paths with zero hints anywhere (not in prompt, examples, or Dockerfile)\n" +
"- Secret validation rules with no hints in prompt or examples\n" +
"- Tests requiring module/function names never mentioned or implied\n" +
"- Hidden configuration files tests silently depend on\n" +
"- Truly malicious hidden requirements designed to trap the solver\n" +
"- **UNTESTED NUMERIC VALUES**: Tests don't verify specific counts/metrics from instruction.md\n" +
"- **UNTESTED FORMATTING RULES**: Formatting requirements (trailing spaces, newlines) not tested\n" +
"- **WEAK ASSERTIONS**: Tests use 'in'/contains when exact match is required\n" +
"- **MISSING BOUNDARY TESTS**: Edge cases specified in instruction.md not tested\n" +
"\n" +
"**MINOR (note but PASS):**\n" +
"- Standard library function names (scipy, sklearn, pandas conventions)\n" +
"- JSON structure details when examples are provided in prompt\n" +
"- Reasonable defaults (rounding precision, thresholds shown in examples)\n" +
"- File paths visible in Dockerfile or implied by directory structure\n" +
"- Industry-standard interpretations of vague requirements\n" +
"- Exact algorithm implementations when prompt specifies the algorithm family\n" +
"\n" +
"**ACCEPTABLE (expected for humane prompts):**\n" +
"- Tests verify behavior implied by domain expertise (e.g., 'statistical analysis' implies standard tests)\n" +
"- Tests check format consistency with provided examples\n" +
"- Tests use standard conventions any competent developer would assume\n" +
"- Tests enforce reasonable quality (e.g., numeric precision, sorting order when implied)\n" +
"\n" +
"FINAL VERDICT RULES:\n" +
"- PASS → No CRITICAL issues found\n" +
"- PASS WITH WARNINGS → Minor concerns but tests are acceptable\n" +
"- FAIL → One or more CRITICAL issues found\n" +
"- IMPORTANT: Humane prompts imply industry standards. Tests enforcing reasonable conventions are ACCEPTABLE.\n" +
"\n" +
"============================================================\n" +
"OUTPUT FORMAT:\n" +
"- 'Instruction Coverage Map:' — each instruction with mapped test(s) and coverage level.\n" +
"- 'Issue Classification:' — categorize each finding as CRITICAL, MINOR, or ACCEPTABLE.\n" +
"- 'Critical Issues:' — list only truly problematic hidden requirements (if any).\n" +
"- 'Minor Notes:' — list implementation details that are reasonable but not explicit.\n" +
"\n" +
"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
"FINAL VERDICT: ✅ PASS / ⚠️ PASS WITH WARNINGS / ❌ FAIL\n" +
"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
"Based on CRITICAL issues only, with reasoning.";

  var user =
"FILES:\n" +
"--- instruction.md ---\n" + safeTask + "\n\n" +
"--- tests/test_outputs.py ---\n" + safeTests;

  return { system: systemHeader_(), user: rubric + "\n\n" + user };
}




/* E) DOCKERFILE — Dockerfile text + paths (to reason about src presence) */
function llmPromptE_(dockerfile, pathsBlock, instructionMD) {
  var rubric =
"E) DOCKERFILE — HARBOR VERSION\n" +
"Goal: Validate Dockerfile for Harbor tasks. Be LENIENT with warnings for minor issues.\n" +
"\n" +
"============================================================\n" +
"HARBOR STRUCTURE CONTEXT (IMPORTANT)\n" +
"============================================================\n" +
"In Harbor, the directory structure is:\n" +
"  task/\n" +
"    ├── environment/     ← Dockerfile is HERE, can only access files in this folder\n" +
"    │   ├── Dockerfile\n" +
"    │   ├── src/\n" +
"    │   └── data files...\n" +
"    ├── solution/        ← SEPARATE folder, Dockerfile CANNOT access this\n" +
"    ├── tests/           ← SEPARATE folder, Dockerfile CANNOT access this\n" +
"\n" +
"Because of this structure, the Dockerfile can ONLY copy files from within environment/.\n" +
"It is STRUCTURALLY IMPOSSIBLE to copy solve.sh or tests in Harbor.\n" +
"\n" +
"============================================================\n" +
"PART 1: DOCKERFILE REFERENCE CHECK (Critical)\n" +
"============================================================\n" +
"The Dockerfile MUST NOT contain:\n" +
"❌ References to test files (test_outputs.py, test_state.py, test.sh)\n" +
"❌ References to solution files (solve.sh, solution.py)\n" +
"❌ Commands that execute tests (RUN pytest, RUN bash test.sh)\n" +
"❌ Commands that execute solutions (RUN bash solve.sh)\n" +
"\n" +
"This ensures the environment image is clean and doesn't pre-run anything.\n" +
"VERDICT: PASS if no references found, FAIL if any found\n" +
"\n" +
"============================================================\n" +
"PART 2: DOCKERFILE SANITY CHECK - VERSION PINNING\n" +
"============================================================\n" +
"CRITICAL RULE: Pin pip packages, DO NOT pin apt packages.\n" +
"\n" +
"✅ CORRECT (apt NOT pinned, pip PINNED):\n" +
"   RUN apt-get install -y python3 git curl   ← apt: no version\n" +
"   RUN pip install numpy==1.26.4 pandas==2.2.0   ← pip: versioned\n" +
"\n" +
"❌ WRONG (apt pinned):\n" +
"   RUN apt-get install -y python3=3.12.1-1   ← apt: FAILS over time\n" +
"\n" +
"❌ WRONG (pip NOT pinned):\n" +
"   RUN pip install numpy pandas requests   ← pip: may break\n" +
"\n" +
"WHY: apt versions are removed from repos over time, causing builds to fail.\n" +
"     pip packages remain stable when pinned.\n" +
"\n" +
"VERDICT:\n" +
"- apt packages pinned → ❌ FAIL (will break over time)\n" +
"- pip packages not pinned → ⚠️ WARNING (should pin for stability)\n" +
"\n" +
"============================================================\n" +
"PART 3: TEST DEPENDENCIES IN IMAGE CHECK\n" +
"============================================================\n" +
"Test dependencies (pytest, testing libraries) should be in test.sh, NOT Dockerfile.\n" +
"\n" +
"❌ BAD - in Dockerfile:\n" +
"   RUN pip install pytest pytest-json-ctrf   ← DON'T install in image\n" +
"\n" +
"✅ GOOD - in test.sh:\n" +
"   pip install pytest pytest-json-ctrf   ← Install at test time\n" +
"\n" +
"WHY: Keeps environment image clean and test-agnostic.\n" +
"VERDICT: WARNING if test deps found in Dockerfile\n" +
"\n" +
"============================================================\n" +
"PART 4: BASE IMAGE & STRUCTURE RULES\n" +
"============================================================\n" +
"✅ PASS (no issues):\n" +
"- Uses standard TB base image (ghcr.io/laude-institute/...)\n" +
"- Sets WORKDIR /app\n" +
"- Copies only necessary input files from environment/\n" +
"- Downloads files via curl/wget\n" +
"- Compiles code at build time\n" +
"\n" +
"⚠️ PASS WITH WARNING (acceptable but note it):\n" +
"- Uses non-standard base image (ubuntu:24.04, python:3.x-slim, etc.)\n" +
"  → WARNING: 'Non-standard base image, ensure tmux/asciinema are available'\n" +
"- Uses COPY . . or COPY . /app within environment/ folder\n" +
"  → WARNING: 'Copies entire environment folder - OK in Harbor but be specific'\n" +
"\n" +
"❌ FAIL (critical issues only):\n" +
"- Runs tests in Dockerfile (RUN pytest, RUN bash test.sh)\n" +
"- Runs solution in Dockerfile (RUN bash solve.sh)\n" +
"- Missing WORKDIR entirely (no WORKDIR statement at all)\n" +
"- Dockerfile is empty or malformed\n" +
"- apt packages are version-pinned\n" +
"\n" +
"============================================================\n" +
"ACCEPTABLE PATTERNS (DO NOT FLAG AS ISSUES)\n" +
"============================================================\n" +
"These are ALL VALID in Harbor:\n" +
"\n" +
"1. Non-standard base images:\n" +
"   FROM ubuntu:24.04          → PASS with warning\n" +
"   FROM python:3.13-slim      → PASS with warning\n" +
"   FROM node:20-slim          → PASS with warning\n" +
"\n" +
"2. Copying files from environment/:\n" +
"   COPY src/ ./src/           → PASS (copying from environment)\n" +
"   COPY task-deps/ ./         → PASS (copying from environment)\n" +
"   COPY code.png /app         → PASS (copying from environment)\n" +
"   COPY data.csv .            → PASS (copying from environment)\n" +
"   COPY . /app                → PASS with warning (in Harbor, only copies environment/)\n" +
"\n" +
"3. Downloading/generating files:\n" +
"   RUN curl -fsSL URL -o file → PASS\n" +
"   RUN wget URL               → PASS\n" +
"   RUN git clone URL          → PASS\n" +
"   RUN gcc -o binary file.c   → PASS\n" +
"\n" +
"4. Removing source after compile:\n" +
"   RUN rm source.c            → PASS (intentional for security tasks)\n" +
"\n" +
"============================================================\n" +
"OUTPUT FORMAT\n" +
"============================================================\n" +
"1. REFERENCE CHECK:\n" +
"   - Test/Solution references: Found/Not found\n" +
"   - VERDICT: PASS/FAIL\n" +
"\n" +
"2. VERSION PINNING:\n" +
"   - apt pinned: Yes (list)/No\n" +
"   - pip unpinned: Yes (list)/No\n" +
"   - VERDICT: PASS/WARNING/FAIL\n" +
"\n" +
"3. TEST DEPENDENCIES:\n" +
"   - pytest/testing libs in Dockerfile: Yes (list)/No\n" +
"   - VERDICT: PASS/WARNING\n" +
"\n" +
"4. BASE IMAGE & STRUCTURE:\n" +
"   - Base image: [name] - Standard/Non-standard\n" +
"   - WORKDIR: Present/Missing\n" +
"   - COPY commands: Valid/Issues\n" +
"   - VERDICT: PASS/WARNING/FAIL\n" +
"\n" +
"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
"FINAL VERDICT: ✅ PASS / ⚠️ PASS WITH WARNINGS / ❌ FAIL\n" +
"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";

  var user =
"FILE: Dockerfile\n" +
"----------------\n" +
((typeof dockerfile !== 'undefined' && dockerfile) ? dockerfile : '(missing)') + "\n\n" +
"Context (paths sample):\n" +
((typeof pathsBlock !== 'undefined' && pathsBlock) ? pathsBlock : '(no paths visible)') + 
"----------------\n" +
"FILE: instruction.md\n" +
((typeof instructionMD !== 'undefined' && instructionMD) ? instructionMD : '(no instructionMD visible)')
"----------------\n";

  return { system: systemHeader_(), user: rubric + "\n\n" + user };
}


/* F) test.sh — exact-match vs default, plus previous conformity checks */
function llmPromptF_(runTestsSh) {
  var defaultRun =
"#!/bin/bash \n" +
" apt-get update \n" +
" apt-get install -y curl \n" +
" curl -LsSf https://astral.sh/uv/0.9.7/install.sh | sh \n" +
" source $HOME/.local/bin/env \n" +
" # CTRF produces a standard test report in JSON format \n" +
" uvx \ \n" +
"  --with pytest==8.4.1 \ \n" +
"  --with pytest-json-ctrf==0.3.5 \ \n" +
"  pytest --ctrf /logs/verifier/ctrf.json /tests/test_state.py -rA \n" +
" if [ $? -eq 0 ]; then \n" +
"  echo 1 > /logs/verifier/reward.txt \n" +
" else \n" +
"  echo 0 > /logs/verifier/reward.txt \n" +
" fi " ;

  var rubric =
"F) test.sh\n" +
"Goal: First check if test.sh is an EXACT match of the default reference.\n" +
"If it is NOT an exact match, still evaluate conformance to default TB patterns (no gates/manipulation and).\n" +
"Strictly the test.sh should be similar to the default reference where only adding packages/dependency extra is allowed.\n" +
"This is also okay: uv venv .tbench-testing source .tbench-testing/bin/activate uv pip install pytest==8.4.1 \n" +
"\n" +
"IMPORTANT - TEST FILE NAMING:\n" +
"Both 'test_state.py' and 'test_outputs.py' are VALID test file names.\n" +
"The test file name in test.sh MUST match the actual test file present in the tests/ folder.\n" +
"- If tests/ contains test_state.py → test.sh should reference test_state.py ✅\n" +
"- If tests/ contains test_outputs.py → test.sh should reference test_outputs.py ✅\n" +
"- DO NOT flag as warning if the name differs from default but matches the actual file.\n" +
"- ONLY flag if test.sh references a file that doesn't exist in tests/.\n" +
"\n" +
"Report briefly:\n" +
"- Exact match: YES/NO\n" +
"- If not exact, list material differences (snippets) and any issues:\n" +
"  - forced failures or model gates\n" +
"  - leaking answers or changing default flow without reason\n" +
"  - anything suspicious\n" +
"\n" +
"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
"FINAL VERDICT: ✅ PASS / ⚠️ PASS WITH WARNINGS / ❌ FAIL\n" +
"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";

  var user =
"FILES:\n" +
"--- test.sh (actual) ---\n" +
((typeof runTestsSh !== 'undefined' && runTestsSh) ? runTestsSh : '(missing)') + "\n\n" +
"--- test.sh (DEFAULT reference) ---\n" +
defaultRun;

  return { system: systemHeader_(), user: rubric + "\n\n" + user };
}


/* G) solve.sh — needs solution + instruction.md for alignment */
function llmPromptG_(solveSh, instructionMD, DockerfileContent) {
  var rubric =
"G) solve.sh\n" +
"Goal: Real, meaningful solution that corresponds to the prompt (a true Terminal-Bench task).\n" +
"\n" +
"STRICT Requirements:\n" +
"- The script MUST perform meaningful computation — not just print or copy answers.\n" +
"- It MUST read the required inputs exactly as specified in instruction.md (correct file paths) and write outputs to the specified locations.\n" +
"- It MUST execute every operation and step described in instruction.md (the prompt) to derive the final answer. There should be no skipping intermediate steps or directly writing final outputs without performing the required computations.\n" +
"- Any auxiliary code it generates (e.g., Python/JS files) MUST be executed within the script; final outputs must come from the execution results, not hardcoded values.\n" +
"- Commands should actually transform/process data or run code (e.g., awk/sed/grep/jq/python/node, loops/pipelines, file reads/writes).\n" +
"- Echo/printf are allowed only for logging or feeding into real commands — NOT for directly writing final answers.\n" +
"- The script MUST NOT simply echo constants, cat/cp pre-made results, or hardcode outputs.\n" +
"- It MUST align with instruction.md instructions and expected outputs.\n" +
"- No extraneous or unrelated commands.\n" +
"\n" +
"EXPLICIT RED FLAGS (examples that should be called out if present):\n" +
"- STRICT: The solution must not contain logic that depends on specific dataset structure, input identity, or expected output values.\n" +
"  The analysis or computation must generalize across unseen but similar inputs. Any evidence that the code is tuned for one known case is invalid.\n" +
"\n" +
"  Watch for behavioral symptoms of hardcoding:\n" +
"    • Conditional branches that alter behavior for certain inputs or paths.\n" +
"    • Manual corrections or offsets applied to align with pre-known outputs.\n" +
"    • Static constants or adjustments that do not come from the provided input data.\n" +
"    • Post-processing logic that exists only to shape results into an expected format rather than to compute them.\n" +
"    • Lookups, patterns, or numeric tweaks that serve no analytical purpose but make the output match evaluation data.\n" +
"    - Look for signs that the solution was written by someone who already knows which input files contain the target issue.\n" +
"      If the script directly targets or filters those known files instead of performing general analysis, it is invalid.\n" +
"      In Terminal-Bench, the model is expected to discover issues by analysis at runtime, not to reproduce the author’s prior knowledge.\n" +
"      If the solve.sh encodes awareness of which inputs are faulty or pre-determines outputs accordingly, FLAG as FAIL.\n" +
"    - The reviewer must check if the script shows awareness of the dataset or test layout beyond what can be inferred from the task description.\n" +
"      Any sign that the author already knows which inputs, lines, or cases will fail — and uses that knowledge to hardcode fixes, offsets, or targeted logic — is an automatic FAIL and strictly no exception here.\n" +
"      Examples include:\n" +
"        • Conditional handling that depends on specific filenames, line numbers, or pattern positions not derived from dynamic parsing.\n" +
"        • Adjusting output or computed results to fit an expected golden answer instead of computing it from analysis.\n" +
"        • Injecting corrective constants or exceptions to align outputs with test expectations.\n" +
"      These are considered AUTHOR LEAKAGE: the task creator knows ground truth and encodes it into solve.sh, removing the need for model reasoning.\n" +
"\n" +
"      → FLAG as FAIL immediately if the solution appears to be 'pre-aligned' with known input faults rather than discovering them by analysis.\n" +
"      Terminal-Bench solutions must treat input files as unknown data; pre-knowledge of where the violations occur invalidates the benchmark integrity.\n" +

"\n" +
"  Interpretation guide:\n" +
"  - Focus on *intent*: is the logic written to analyze input content, or to reproduce a known answer?\n" +
"  - Generic heuristics are acceptable only if derived from task rules; any dataset-specific adaptation is a failure.\n" +
"  - If the solution shows awareness of exact file layouts, data ranges, or line offsets not inferred from parsing, flag it.\n" +
"\n" +
"  → FLAG as FAIL if the script’s correctness relies on pre-known details or adjustments unrelated to actual analysis of the input files.\n" +

"- The script must not reference or depend on any Terminal-Bench harness variables (for example: T_BENCH_TEST_DIR, T_BENCH_TASK_DIR, TB_MODEL, TB_AGENT_LOG_PATH, etc.). Any use of such environment variables or conditional logic based on them is a red flag and should be treated as a failure.\n" +
"- Directly writing fixed answers:\n" +
"  - echo \"42\" > result.txt\n" +
"  - printf '{\"score\": 0.99}\\\\n' > results.json\n" +
"  - cat precomputed_output.txt > results.json\n" +
"- Copying precomputed artifacts:\n" +
"  - cp answers/*.json results/\n" +
"  - cp fixed_output.txt result.txt\n" +
"- Generating code but NOT executing it to produce the final outputs (e.g., writing script.py but never running it).\n" +
"- Using placeholders or stubs instead of real processing (e.g., echo \"TODO\", or writing “placeholder” JSON).\n" +
"- Not reading the input(s) from the path(s) mandated by instruction.md, or writing outputs to wrong/unspecified locations.\n" +
"- Fabricating missing data to make the golden solution pass:\n" +
"  # instruction.md says input data files (posts.csv, interactions.csv) are provided.\n" +
"  # But solve.sh creates fake data inside itself:\n" +
"  echo \"post_id,content,likes\" > posts.csv\n" +
"  echo \"1,Hello world,100\" >> posts.csv\n" +
"  echo \"post_id,interaction_type\" > interactions.csv\n" +
"  echo \"1,like\" >> interactions.csv\n" +
"  # ...analysis follows...\n" +
"  • This is invalid — the dataset is supposed to come from provided input files.\n" +
"    Generating fake data inside solve.sh breaks the task integrity and misleads the model into failure.\n" +
"    If input data is missing, the task itself is flawed and must not be \"fixed\" inside solve.sh.\n" +
"- The solve.sh should use only the tools listed in the constraints of instruction.md and also in the docker environment, if it uses any other tools which are not listed in instruction.md flag it and its a fail" + 
"- Only the tools explicitly allowed in instruction.md may be invoked. Invoking unlisted tools (curl, wget, uuidgen, date, sleep, etc.) should be flagged." +
"- The script MUST be deterministic. Outputs must remain identical across runs regardless of environment variables, timestamps, or random data " +
"\n" +
"Incorrect / Trivial Examples (these are WRONG):\n" +
"- Only echoing text without computation:\n" +
"  #!/usr/bin/env bash\n" +
"  echo \"Initializing real-time chat application development...\"\n" +
"  echo \"Generating Chat Application Architecture Report...\"\n" +
"  echo \"# REAL-TIME CHAT APPLICATION\"\n" +
"  echo \" - Real-time bidirectional communication setup: Socket.io server with event handling [IMPLEMENTED]\"\n" +
"  echo \" - Connection management and heartbeat mechanism: Engineio message monitoring [IMPLEMENTED]\"\n" +
"  echo \" - User presence and activity tracking: Online status and last seen timestamps [IMPLEMENTED]\"\n" +
"  echo \"\"\n" +
"  • This is useless — it just prints messages and does not perform or show how any real logic is implemented.\n" +
"- Directly echoing fixed answers into files:\n" +
"  #!/usr/bin/env bash\n" +
"  echo \"Final Answer: 42\" > /app/output/answer.txt\n" +
"  • This is not computation; it hardcodes the output instead of running commands or programs to derive it.\n" +
"- Copying or concatenating precomputed outputs (e.g., cat prebuilt_output.txt > result.txt, cp answers/*.json results/)\n" +
"- Generating a code file (like script.py) but never executing it to produce results.\n" +
"- Using static here-doc blocks that hardcode JSON/text answers instead of computed output.\n" +
"- Writing “placeholder” or “TODO” messages rather than actual logic.\n" +
"- Ultimately the solve.sh should be useful bash command which aligns with instruction.md if not flag it. \n" +
"\n" +
"Report briefly:\n" +
"- Does the script meaningfully solve the prompt with real computation and correct I/O paths?\n" +
"- Any signs of triviality (echo-only, hardcoded outputs, cp/cat of fixed results, no input reads, generated code not executed).\n" +
"- Any misalignment with instruction.md (cite lines/snippets).\n" +
"- Will the solve.sh will be useful for the LLM to improve it terminal execution\n" +
"\n" +
"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
"FINAL VERDICT: ✅ PASS / ⚠️ PASS WITH WARNINGS / ❌ FAIL\n" +
"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" ;

  var user =
"FILES:\n" +
"--- instruction.md ---\n" +
((typeof instructionMD !== 'undefined' && instructionMD) ? instructionMD : '(missing)') + "\n\n" +
"--- solve.sh ---\n" +
((typeof solveSh !== 'undefined' && solveSh) ? solveSh : '(missing)') +
"--- Dockerfile content ---\n" + 
((typeof DockerfileContent !== 'undefined' && DockerfileContent) ? DockerfileContent : '(missing)') ;

  return { system: systemHeader_(), user: rubric + "\n\n" + user };
}


/**
 * G) SOLVE.SH WITH SRC FILES — Enhanced version with src/ folder contents
 * Used in Dimension Review when user uploads src files
 */
function llmPromptG_WithSrc_(solveSh, instructionMD, DockerfileContent, srcFilesContent) {
  var rubric =
"G) solve.sh — WITH SOURCE FILES\n" +
"Goal: Real, meaningful solution that corresponds to the prompt.\n" +
"\n" +
"IMPORTANT: You have been provided with the actual src/ folder file contents below.\n" +
"Use these to verify that:\n" +
"- Files referenced in solve.sh actually exist in src/\n" +
"- The solve.sh correctly uses the available source files\n" +
"- There are no references to non-existent files\n" +
"\n" +
"STRICT Requirements:\n" +
"- The script MUST perform meaningful computation — not just print or copy answers.\n" +
"- It MUST read the required inputs exactly as specified in instruction.md\n" +
"- Any auxiliary code it generates MUST be executed within the script\n" +
"- Commands should actually transform/process data\n" +
"- No hardcoded outputs or trivial echo-only scripts\n" +
"- Verify that files used by solve.sh exist in the provided src/ contents\n" +
"\n" +
"Report:\n" +
"- Does the script meaningfully solve the prompt?\n" +
"- Are all referenced files present in src/?\n" +
"- Any signs of triviality or hardcoding\n" +
"- Any misalignment with instruction.md\n" +
"\n" +
"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
"FINAL VERDICT: ✅ PASS / ⚠️ PASS WITH WARNINGS / ❌ FAIL\n" +
"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";

  var user =
"FILES:\n" +
"--- instruction.md ---\n" +
((typeof instructionMD !== 'undefined' && instructionMD) ? instructionMD : '(missing)') + "\n\n" +
"--- solve.sh ---\n" +
((typeof solveSh !== 'undefined' && solveSh) ? solveSh : '(missing)') + "\n\n" +
"--- Dockerfile content ---\n" + 
((typeof DockerfileContent !== 'undefined' && DockerfileContent) ? DockerfileContent : '(missing)') + "\n\n" +
"--- src/ folder file contents ---\n" +
((typeof srcFilesContent !== 'undefined' && srcFilesContent) ? srcFilesContent : '(no src files provided)');

  return { system: systemHeader_(), user: rubric + "\n\n" + user };
}


/* I) SFT NOTEBOOK — needs notebook + solve.sh */
function llmPromptI_(ipynbRaw, solveSh) {
  var rubric =
"I) SFT NOTEBOOK (sft-task/*.ipynb)\n" +
"Goal: The instruction-following notebook must mirror the correct solution exactly and follow the required conversational structure.\n" +
"\n" +
"STRICT structure (compulsory):\n" +
"- Instruction section at the top.\n" +
"- The second cell must be a cell with **[user]**, which MUST provide the FULL copy of the 'instruction' part of the task from the first cell again and not just a vague start message (If the user message is too short (1-2)lines it is most probably not proper).\n" +
"- STRICT: The notebook must maintain one-to-one structural alignment between the commands in solve.sh and the triplet cells in the SFT notebook.\n" +
"  • Each command or logical command group from solve.sh must appear as its own **[assistant]** → **[tool_call]** → **[tool_output]** triplet.\n" +
"  • If multiple unrelated commands from solve.sh are merged into a single assistant cell or dumped together as a large block, mark it as FAIL.\n" +
"  • The assistant must not summarize or batch commands (e.g., 'Below are all commands from solve.sh...') — each step must remain atomic and explicitly mapped.\n" +
"  • The structure must stay consistent throughout: if the notebook begins with triplets, it must end with triplets. Any late collapse into narrative or bulk listings indicates broken triplet continuity.\n" +
"  → FLAG as FAIL if the notebook merges, collapses, or summarizes execution steps instead of preserving the per-command triplet pattern.\n" +
"- User cell: contains the full task prompt.\n" +
"- Repeating triplets for each step:\n" +
"    [assistant]  → Assistant explains in first person what it is going to do next (e.g., “I will now use awk to filter the input file…”).\n" +
"    [tool_call]  → The actual command to be executed (copied exactly from solve.sh).\n" +
"    [tool_output] → The resulting output or error message from that command.\n" +
"- The notebook must cover every command from solve.sh, in the same order.\n" +
"- The notebook should be building the solve.sh step by step with proper reasoning. \n" +
"- If the assistant messages doesn't align with solve.sh as a thinking process flag it immediately. \n" +
"- No extra commands not present in solve.sh.\n" +
"- No alternate or free-form styles such as “Step 1:”, “Step 2:”, numbered instructions, or prose explanations that replace the required triplet structure.\n" +
"- Explanations written by the assistant must always be in first-person future tense (e.g., “I will execute...”, “I will now run...” ).\n" +
"- Missing any of these markers or using non-standard formatting is not acceptable.\n" +
"\n" +
"Report briefly:\n" +
"- Whether all required triplet markers and structural elements exist.\n" +
"- If the assistant's explanations are in first person and properly aligned with tool_call/tool_output cells.\n" +
"- Any missing triplets, skipped commands, or invalid style sections.\n" +
"\n" +
"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
"FINAL VERDICT: ✅ PASS / ⚠️ PASS WITH WARNINGS / ❌ FAIL\n" +
"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";

  var user =
"FILES:\n" +
"--- sft-task notebook (.ipynb RAW) ---\n" +
((typeof ipynbRaw !== 'undefined' && ipynbRaw) ? ipynbRaw : '(missing)') + "\n\n" +
"--- solve.sh ---\n" +
((typeof solveSh !== 'undefined' && solveSh) ? solveSh : '(missing)');

  return { system: systemHeader_(), user: rubric + "\n\n" + user };
}


/* J) FORCED GATES — tests + runner only */
function llmPromptJ_(testsPy, runTestsSh) {
  var rubric =
"J) FORCED GATES — MODEL DETECTION & DELIBERATE FAILURE\n" +
"Goal: Detect if tests or test.sh contain code that detects which model is running and deliberately fails it.\n" +
"\n" +
"SEARCH FOR THESE PATTERNS in tests/test_outputs.py and test.sh:\n" +
"\n" +
"1. MODEL DETECTION VIA ENVIRONMENT VARIABLES:\n" +
"   - os.environ.get('TB_MODEL')\n" +
"   - os.getenv('MODEL'), os.getenv('OPENAI_MODEL')\n" +
"   - $TB_MODEL, $MODEL, $OPENAI_MODEL in bash\n" +
"   - Any code reading environment variables to identify the model\n" +
"\n" +
"2. MODEL NAME DETECTION FUNCTIONS:\n" +
"   - _detect_model_name(), get_model_name(), detect_model()\n" +
"   - Any function that tries to identify which model is running\n" +
"\n" +
"3. BLOCK/ALLOW LISTS:\n" +
"   - FAIL_MODELS = [...], BLOCKED_MODELS = [...]\n" +
"   - if model in ['claude', 'hunyuan', ...]\n" +
"   - if 'hunyuan' in model_name.lower()\n" +
"   - Any hardcoded list of model names used for conditional logic\n" +
"\n" +
"4. CONDITIONAL FAILURES BASED ON MODEL:\n" +
"   - if model == 'hunyuan': pytest.fail()\n" +
"   - if model == 'hunyuan': raise AssertionError()\n" +
"   - if model == 'claude': pass else: fail\n" +
"   - Bash: if [ \"$TB_MODEL\" == \"hunyuan\" ]; then exit 1; fi\n" +
"\n" +
"5. MODEL-SPECIFIC ASSERTIONS:\n" +
"   - Different expected values for different models\n" +
"   - if model == 'claude': expected = X else: expected = Y\n" +
"\n" +
"MALICIOUS EXAMPLES (FLAG IMMEDIATELY AS MALPRACTICE):\n" +
"\n" +
"Example 1 — Direct model gating:\n" +
"def test_00_model_gate():\n" +
"    model = os.environ.get('TB_MODEL', '')\n" +
"    if 'hunyuan' in model.lower():\n" +
"        raise AssertionError('Forced fail for Hunyuan')\n" +
"\n" +
"Example 2 — Block list:\n" +
"FAIL_MODELS = {'hunyuan3-235b', 'hunyuan3-coder-480b'}\n" +
"def test_check():\n" +
"    if get_model_name() in FAIL_MODELS:\n" +
"        pytest.fail('Model not allowed')\n" +
"\n" +
"Example 3 — Bash model check:\n" +
"if [ \"$TB_MODEL\" = \"hunyuan\" ]; then\n" +
"    echo 'Hunyuan detected, failing...'\n" +
"    exit 1\n" +
"fi\n" +
"\n" +
"WHY THIS IS MALPRACTICE:\n" +
"- Tests should evaluate the MODEL'S OUTPUT, not the model's IDENTITY\n" +
"- Forcing failure based on which model is running is cheating\n" +
"- This manipulates benchmark results to favor certain models\n" +
"\n" +
"Report:\n" +
"- List all model detection patterns found (with code snippets)\n" +
"- List all conditional failure logic based on model (with code snippets)\n" +
"- Which models are targeted for failure\n" +
"- This is MALPRACTICE and must be flagged immediately\n" +
"\n" +
"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
"FINAL VERDICT: ✅ PASS / ❌ FAIL (MALPRACTICE)\n" +
"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";

  var user =
"FILES:\n" +
"--- tests/test_outputs.py ---\n" +
((typeof testsPy !== 'undefined' && testsPy) ? testsPy : '(missing)') + "\n\n" +
"--- test.sh ---\n" +
((typeof runTestsSh !== 'undefined' && runTestsSh) ? runTestsSh : '(missing)');

  return { system: systemHeader_(), user: rubric + "\n\n" + user };
}


/* H) TASK METADATA — task.toml validation */
function llmPromptH_TaskMetadata_(taskToml, taskSlug) {
  var rubric =
"H) TASK METADATA (task.toml)\n" +
"Goal: Validate that task.toml contains all required metadata fields with valid values.\n" +
"\n" +
"REQUIRED FIELDS:\n" +
"1. version - Should be '1.0'\n" +
"\n" +
"2. [metadata] section - MUST contain:\n" +
"   - author_name: Non-empty string (can be 'anonymous')\n" +
"   - author_email: Non-empty string (can be 'anonymous')\n" +
"   - difficulty: One of 'easy', 'medium', 'hard'\n" +
"   - category: Valid domain (e.g., 'model-training', 'data-science', 'application-development', 'ui-ux-optimization', etc.)\n" +
"   - tags: Array of relevant tags for the task\n" +
"\n" +
"3. [verifier] section - MUST contain:\n" +
"   - timeout_sec: Positive number (typically 300-3600)\n" +
"\n" +
"4. [agent] section - MUST contain:\n" +
"   - timeout_sec: Positive number (typically 600-3600)\n" +
"\n" +
"5. [environment] section - MUST contain:\n" +
"   - build_timeout_sec: Positive number (typically 300-600)\n" +
"   - cpus: Positive integer (typically 1-4)\n" +
"   - Memory: EITHER memory_mb (integer in MB, e.g., 2048) OR memory (string with unit, e.g., '2G')\n" +
"   - Storage: EITHER storage_mb (integer in MB, e.g., 10240) OR storage (string with unit, e.g., '10G')\n" +
"   - Both formats are valid - do NOT flag as error if using memory/storage with string units\n" +
"\n" +
"VALIDATION CHECKS:\n" +
"- difficulty should match the task slug difficulty (e.g., 'hard' in slug means difficulty = 'hard')\n" +
"- category should match the task domain in slug\n" +
"\n" +
"Report:\n" +
"- List all missing required fields\n" +
"- List any fields with invalid/suspicious values\n" +
"- Check consistency between metadata and task slug\n" +
"\n" +
"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
"FINAL VERDICT: ✅ PASS / ⚠️ PASS WITH WARNINGS / ❌ FAIL\n" +
"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";

  var user =
"TASK SLUG: " + (taskSlug || "(unknown)") + "\n\n" +
"--- task.toml ---\n" +
((typeof taskToml !== 'undefined' && taskToml) ? taskToml : '(missing)');

  return { system: systemHeader_(), user: rubric + "\n\n" + user };
}


/**
 * L) MODEL EXECUTION DIAGNOSIS (Golden Solution vs Targeted Model)
 *
 * Final universal version:
 *  • Scenario-agnostic for any task domain
 *  • Uses STRICT literal-token integrity check
 *  • Includes HKDF-type example for clarity
 */
function llmPromptL_ModelExecutionDiagnosis_(instructionMD, testsPy, goldenSolution, modelCommands, postTestLog, modelName) {
  var rubric =
"L) MODEL EXECUTION DIAGNOSIS — " + modelName + "\n" +
"Goal: Detect any hidden or undeclared expectations (forgery) and then, if valid, explain model pass/fail per test.\n" +
"\n" +
"FILES PROVIDED:\n" +
"- instruction.md → official instruction describing the problem\n" +
"- tests/test_outputs.py → expected test cases\n" +
"- solve.sh → trainer’s known-correct reference implementation\n" +
"- model-run-logs/<model>/trial.log→ commands the model executed\n" +
"- model-run-logs/<model>/test-stdout.txt → final pass/fail summary from pytest\n" +
"\n" +
"============================================================\n" +
"STAGE 1 — INTEGRITY CHECK (STRICT LITERAL MATCH)\n" +
"============================================================\n" +
"RULE: Every concrete artifact referenced by tests (file path, module name, function name, CLI flag, output key, etc.)\n" +
"must appear as the same literal token inside instruction.md. If it does not, mark **FAIL (Forged or Hidden Expectation)** and STOP.\n" +
"\n" +
"Artifacts to extract and check literally:\n" +
"- File paths or names (e.g., '/app/foo.py', 'output.json', 'config.yaml')\n" +
"- Module imports (e.g., 'import foo', 'from foo import bar')\n" +
"- Function names ('def bar()', 'bar(')\n" +
"- Output keys (e.g., 'okm_hex', 'result_score')\n" +
"- Command invocations ('bash run.sh', 'python3 foo.py --flag')\n" +
"- Environment variables or constants used in tests\n" +
"\n" +
"Process:\n" +
"1️⃣ Parse tests/test_outputs.py → collect all such literal identifiers.\n" +
"2️⃣ Search for each literal token inside instruction.md text.\n" +
"3️⃣ If any token required by tests does not literally appear in instruction.md, list it and flag immediately:\n" +
"    Integrity Check: FAIL (Forged or Hidden Expectation)\n" +
"    Undeclared tokens: <list>\n" +
"    Explanation: Tests depend on artifacts not disclosed in instruction.md.\n" +
"    Stop further analysis.\n" +
"\n" +
"4️⃣ Compare test counts/names in post-test.txt vs tests/test_outputs.py. Any mismatch → FAIL (Manipulated Suite).\n" +
"5️⃣ If tests assert side-effects, files, or outputs beyond what instruction.md declares, treat as Manipulated Suite.\n" +
"\n" +
"Example (Illustrative):\n" +
"------------------------------------------------------------\n" +
"- Suppose instruction.md only says: 'Implement the HMAC-based Key Derivation Function (HKDF) as per RFC 5869.'\n" +
"- Tests then attempt 'import hkdf_derive from /app/hkdf.py'.\n" +
"- Because 'hkdf.py' never appears literally in instruction.md, this is a **forged hidden expectation**.\n" +
"- The model cannot be faulted for not producing hkdf.py when the instruction never stated it must.\n" +
"- Stage 1 must therefore fail with message:\n" +
"    Integrity Check: FAIL (Forged or Hidden Expectation)\n" +
"    Missing literal: 'hkdf.py' not found in instruction.md.\n" +
"------------------------------------------------------------\n" +
"\n" +
"If all artifacts are explicitly declared → Stage 1 PASSES.\n" +
"\n" +
"============================================================\n" +
"STAGE 2 — MODEL EXECUTION ANALYSIS (ONLY IF STAGE 1 PASSES)\n" +
"============================================================\n" +
"- Compare golden solution vs model commands line-by-line.\n" +
"- Use post-test.txt to analyze each test case:\n" +
"   • If FAIL: determine whether the issue is a model mistake (missed step, wrong name) or trainer/test issue.\n" +
"   • For model mistakes, specify which step diverged from golden.\n" +
"   • For passed tests, summarize what was done correctly.\n" +
"\n" +
"============================================================\n" +
"STAGE 3 — SUMMARY & FINAL VERDICT\n" +
"============================================================\n" +
"- The **Final Verdict** must depend **only** on integrity-related findings:\n" +
"   • If Stage 1 (Integrity Check) failed → **FAIL (Forged/Manipulated Task)**.\n" +
"   • If Stage 1 passed → **PASS (Legitimate Task)** — regardless of model outcome.\n" +
"- In summary, describe model performance separately but do not let it change the task verdict.\n" +
"\n" +
"============================================================\n" +
"OUTPUT FORMAT:\n" +
"- 'Integrity Check:' → PASS or FAIL.\n" +
"- If FAIL → list undeclared tokens, reasons, and stop.\n" +
"- If PASS → include model-level analysis.\n" +
"- **Do not mark FAIL due to model mistakes.** Only task-level forgery warrants a FAIL.\n" +
"\n" +
"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
"FINAL VERDICT: ✅ PASS / ❌ FAIL (Forged/Manipulated Task)\n" +
"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";

  var user =
"FILES:\n" +
"--- instruction.md ---\n" + (instructionMD && instructionMD.trim() || "(missing)") + "\n\n" +
"--- tests/test_outputs.py ---\n" + (testsPy && testsPy.trim() || "(missing)") + "\n\n" +
"--- golden solve.sh ---\n" + (goldenSolution && goldenSolution.trim() || "(missing)") + "\n\n" +
"--- model-run-logs/" + modelName + "/trial.log ---\n" + (modelCommands && modelCommands.trim() || "(missing)") + "\n\n" +
"--- model-run-logs/" + modelName + "/test-stdout.txt ---\n" + (postTestLog && postTestLog.trim() || "(missing)");

  return { system: systemHeader_(), user: rubric + "\n\n" + user };
}




/* =============== LLM call =============== */

var LLM = {
  MODEL: (PropertiesService.getScriptProperties().getProperty('OPENAI_MODEL') || 'gpt-5.1'),
  BASE:  (PropertiesService.getScriptProperties().getProperty('OPENAI_BASE_URL') || 'https://api.openai.com/v1').replace(/\/+$/, ''),
  KEY:   PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY')
};

// Expects an object { system: string, user: string }, returns string
function callLLM_(promptPair) {
  if (!LLM.KEY) throw new Error('Set Script Property OPENAI_API_KEY.');
  
  var payload = {
    model: LLM.MODEL,
    messages: [
      { role: 'system', content: promptPair.system },
      { role: 'user', content: promptPair.user }
    ]
  };
  
  var res = UrlFetchApp.fetch(LLM.BASE + '/chat/completions', {
    method: 'post',
    contentType: 'application/json',
    muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + LLM.KEY },
    payload: JSON.stringify(payload)
  });
  
  var code = res.getResponseCode();
  var body = res.getContentText();
  
  if (code !== 200) throw new Error('LLM HTTP ' + code + ': ' + body.slice(0, 500));
  
  var data = JSON.parse(body);
  
  // Replace optional chaining (?.) with safe property checks
  var content = '';
  if (data && data.choices && data.choices.length > 0 && 
      data.choices[0].message && data.choices[0].message.content) {
    content = data.choices[0].message.content;
  }
  
  return content.trim();
}


/* =============== Utilities & Drive helpers =============== */

function setHeaders_(sh) {
  const h1 = sh.getRange(1, CFG.COL_LINK).getValue();
  if (!String(h1 || '').trim()) sh.getRange(1, CFG.COL_LINK).setValue('Drive ZIP link');
  const h2 = sh.getRange(1, CFG.COL_REVIEW).getValue();
  if (!String(h2 || '').trim()) sh.getRange(1, CFG.COL_REVIEW).setValue('Review');
}



function parseRef_(raw) {
  // ID
  var idMatch = raw.match(/^[A-Za-z0-9_-]{25,}$/);
  if (idMatch) return { id: idMatch[0], resourceKey: '' };

  // URL (supports resourceKey)
  if (/drive\.google\.com\/file\/d\//i.test(raw)) {
    var id = (raw.match(/\/file\/d\/([A-Za-z0-9_-]{25,})/) || [])[1] || '';
    var the_rk = (raw.match(/[?&]resourcekey=([^&]+)/i) || [])[1] || '';
    var rk = the_rk ? decodeURIComponent(the_rk) : '';
    if (!id) throw new Error('Could not parse file ID from link.');
    return { id: id, resourceKey: rk };
  }

  // Name search
  var files = searchByExactName_(raw);
  if (!files.length) throw new Error('No file found by name "' + raw + '".');
  return { id: files[0].id, resourceKey: '' };
}


function searchByExactName_(name) {
  const q = "name = '" + name.replace(/'/g, "\\'") + "'";
  const url = 'https://www.googleapis.com/drive/v3/files'
    + '?q=' + encodeURIComponent(q)
    + '&fields=files(id,name,mimeType,size)'
    + '&supportsAllDrives=true&includeItemsFromAllDrives=true&corpora=allDrives&pageSize=50';
  const res = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200)
    throw new Error('Drive list HTTP ' + res.getResponseCode() + ': ' + res.getContentText().slice(0,200));
  const j = JSON.parse(res.getContentText());
  return j.files || [];
}

function resolveShortcut_(ref) {
  const meta = driveMeta_(ref);
  if (meta.mimeType === 'application/vnd.google-apps.shortcut') {
    const url = 'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(ref.id)
      + '?fields=shortcutDetails&supportsAllDrives=true'
      + (ref.resourceKey ? '&resourceKey=' + encodeURIComponent(ref.resourceKey) : '');
    const res = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    });
    if (res.getResponseCode() !== 200)
      throw new Error('Drive shortcut HTTP ' + res.getResponseCode() + ': ' + res.getContentText().slice(0,200));
    const j = JSON.parse(res.getContentText());
    const tgt = j.shortcutDetails && j.shortcutDetails.targetId;
    const tgtRk = j.shortcutDetails && j.shortcutDetails.targetResourceKey;
    if (!tgt) throw new Error('Drive shortcut without targetId.');
    return { id: tgt, resourceKey: tgtRk || ref.resourceKey || '' };
  }
  return ref;
}

function driveMeta_(ref) {
  const url = 'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(ref.id)
    + '?fields=id,name,mimeType,size,shortcutDetails&supportsAllDrives=true'
    + (ref.resourceKey ? '&resourceKey=' + encodeURIComponent(ref.resourceKey) : '');
  const res = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200)
    throw new Error('Drive metadata HTTP ' + res.getResponseCode() + ': ' + res.getContentText().slice(0,200));
  return JSON.parse(res.getContentText());
}


function downloadZip_(ref) {
  var url = 'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(ref.id) +
    '?alt=media&supportsAllDrives=true' +
    (ref.resourceKey ? '&resourceKey=' + encodeURIComponent(ref.resourceKey) : '');
  
  var res = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  });
  
  if (res.getResponseCode() !== 200) {
    throw new Error('Drive download HTTP ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 200));
  }

  var blob = res.getBlob();
  try {
    blob.setContentType('application/zip');
  } catch (e) {
    // ignore
  }
  return blob;
}


function findEntry_(entries, rx) {
  for (var i = 0; i < entries.length; i++) {
    var b = entries[i];
    if (rx.test(String(b.getName() || ''))) return b;
  }
  return null;
}

function findEntryStartsWith_(entries, rxStart) {
  for (var i = 0; i < entries.length; i++) {
    var b = entries[i];
    if (rxStart.test(String(b.getName() || ''))) return b;
  }
  return null;
}


function blobToText_(blob) {
  if (!blob) return '';
  try { return blob.getDataAsString('UTF-8'); } catch (_) { return blob.getDataAsString(); }
}

/**
 * -------------------------------------------------------------------
 * createReviewDoc_
 * -------------------------------------------------------------------
 * Builds a clean Google Doc report for one reviewed row.
 *  • Page 1: All model review outputs (A–J) in order.
 *  • Page 2+: Debug section with full extracted file texts.
 * -------------------------------------------------------------------
 * @param {number} row   Spreadsheet row number
 * @param {string} slug  Task slug or short name
 * @param {object} results Map of { letter: { title, reviewText } }
 * @param {object} blobs   Map of extracted file texts for debugging
 * @returns {string} The Google Doc URL
 */
function createReviewDoc_(row, slug, results, blobs, structuralResult) {
  // You can replace this with a shared folder ID if desired:
  var folder = DriveApp.getRootFolder();

  var name = 'TB Review – Row ' + row + (slug ? ' – ' + slug : '');
  var doc = DocumentApp.create(name);
  var body = doc.getBody();

  // ---- HEADER SECTION ---------------------------------------------
  body.appendParagraph('Terminal-Bench Review Report')
      .setHeading(DocumentApp.ParagraphHeading.TITLE);
  body.appendParagraph('Generated: ' + new Date().toLocaleString());
  body.appendParagraph('Row: ' + row + '  |  Slug: ' + (slug || '(unknown)'));
  body.appendHorizontalRule();

  // ---- STRUCTURAL VALIDATION (if available) -----------------------
  if (structuralResult) {
    body.appendParagraph('STRUCTURAL VALIDATION (Backend)')
        .setHeading(DocumentApp.ParagraphHeading.HEADING1);
    
    var statusText = structuralResult.success ? '✅ PASSED' : '❌ FAILED';
    body.appendParagraph('Status: ' + statusText);
    
    if (structuralResult.domain) {
      body.appendParagraph('Domain: ' + structuralResult.domain);
    }
    if (structuralResult.slug) {
      body.appendParagraph('Slug: ' + structuralResult.slug);
    }
    if (structuralResult.difficulty) {
      body.appendParagraph('Difficulty: ' + structuralResult.difficulty);
    }
    
    // Errors
    if (structuralResult.errors && structuralResult.errors.length > 0) {
      body.appendParagraph('Errors:');
      structuralResult.errors.forEach(function(err) {
        body.appendParagraph('  ❌ ' + err);
      });
    }
    
    // Warnings
    if (structuralResult.warnings && structuralResult.warnings.length > 0) {
      body.appendParagraph('Warnings:');
      structuralResult.warnings.forEach(function(warn) {
        body.appendParagraph('  ⚠️ ' + warn);
      });
    }
    
    // Model Results
    if (structuralResult.models && structuralResult.models.length > 0) {
      body.appendParagraph('Model Accuracy:');
      structuralResult.models.forEach(function(m) {
        var matchStatus = m.matches ? '✅' : '❌';
        body.appendParagraph('  ' + matchStatus + ' ' + m.model + ': ' + m.actual + ' (expected: ' + (m.expected || 'N/A') + ')');
      });
    }
    
    body.appendHorizontalRule();
  }

  // ---- MODEL RESULTS (A–J) ---------------------------------------
  var letters = Object.keys(results);
  for (var i = 0; i < letters.length; i++) {
    var letter = letters[i];
    var block = results[letter];
    body.appendParagraph(letter + ') ' + block.title)
        .setHeading(DocumentApp.ParagraphHeading.HEADING1);
    body.appendParagraph(block.reviewText || '(no text)');
    body.appendHorizontalRule();
  }

  // ---- DEBUG: EXTRACTED FILE TEXTS -------------------------------
  body.appendPageBreak();
  body.appendParagraph('DEBUG – Extracted Files (Raw Text Snapshots)')
      .setHeading(DocumentApp.ParagraphHeading.HEADING1);

  if (blobs) {
    var fnames = Object.keys(blobs);
    for (var j = 0; j < fnames.length; j++) {
      var fname = fnames[j];
      var text = blobs[fname];
      body.appendParagraph(fname)
          .setHeading(DocumentApp.ParagraphHeading.HEADING2);
      var snippet = (text || ''); // avoid very large paste
      body.appendParagraph(snippet || '(empty)');
      body.appendHorizontalRule();
    }
  }

  try {
    DriveApp.getFileById(doc.getId())
      .setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.COMMENT);
  } catch (e) {
    // ignore if blocked by org policy
  }

  // ---- FINISH -----------------------------------------------------
  doc.saveAndClose();
  var url = doc.getUrl();
  Logger.log('✅ Created review Doc for row ' + row + ': ' + url);
  return url;
}


/**
 * readNotebookText_
 * -------------------------------------------------------------
 * Safely extracts text from a .ipynb Blob (UTF-8 JSON notebook)
 *  • Decodes raw bytes as UTF-8 (handles binary-safe data)
 *  • Verifies JSON structure and pretty-prints if valid
 *  • Truncates extremely large notebooks (>500k chars)
 * -------------------------------------------------------------
 * @param {Blob} blob - Blob object for the notebook file
 * @return {string}   - Pretty, readable notebook JSON text
 */
function readNotebookText_(blob) {
  if (!blob) return '(missing notebook)';

  try {
    // Decode raw bytes as UTF-8
    const bytes = blob.getBytes();
    const text = Utilities.newBlob(bytes).getDataAsString('UTF-8');

    // Try to validate / pretty-print JSON
    try {
      const parsed = JSON.parse(text);
      const pretty = JSON.stringify(parsed, null, 2);
      return pretty;
    } catch (jsonErr) {
      // Not perfect JSON (still return raw)
      return text;
    }

  } catch (e) {
    Logger.log('Notebook decode failed:', e);
    try { return blob.getDataAsString('UTF-8'); }
    catch (_) { return blob.getDataAsString(); }
  }
}

function inferRootFolderName_(paths, zipName) {
  var zip = String(zipName || '');

  // 1️⃣ Extract from ZIP name (keep UUID + slug)
  var match = zip.match(/^([0-9a-f-]+-(?:tb|terminal-bench)-[^.]+?)\.(zip)$/i);
  if (match) return match[1]; // returns full UUID + slug name

  // 2️⃣ Otherwise, use first folder inside the ZIP
  if (paths && paths.length) {
    for (var i = 0; i < paths.length; i++) {
      var p = paths[i];
      var first = p.split('/')[0];
      if (first && !/\.[a-z0-9]+$/i.test(first)) return first;
    }
  }

  // 3️⃣ Fallback: use ZIP filename without extension
  return zip.replace(/\.zip$/i, '') || '(unknown)';
}
/**
 * Generic helper to extract commands.txt and post-test.txt safely,
 * skipping macOS metadata and binary blobs.
 */
function getModelLogs_(entries, modelPrefix) {
  var logs = { prefix: modelPrefix, commands: '', postTest: '', found: false };

  for (var i = 0; i < entries.length; i++) {
    var name = entries[i].getName();

    // Ignore macOS metadata folders and attributes
    if (/^__MACOSX\//i.test(name) || /com\.apple/i.test(name)) continue;

    // Match commands.txt
    if (new RegExp('model-run-logs/' + modelPrefix + '[^/]*/.*job\\.log$', 'i').test(name)) {
      var text = safeReadText_(entries[i]);
      if (isProbablyText_(text)) {
        Logger.log('→ Found ' + modelPrefix + ' commands.txt at ' + name);
        logs.commands = text;
        logs.found = true;
      }
    }

    // Match post-test.txt
    if (new RegExp('model-run-logs/' + modelPrefix + '[^/]*/.*test-stdout\\.txt$', 'i').test(name)) {
      var text2 = safeReadText_(entries[i]);
      if (isProbablyText_(text2)) {
        Logger.log('→ Found ' + modelPrefix + ' post-test.txt at ' + name);
        logs.postTest = text2;
        logs.found = true;
      }
    }
  }

  Logger.log(modelPrefix.toUpperCase() + ' summary: ' + JSON.stringify({
    commandsFound: !!logs.commands,
    postTestFound: !!logs.postTest
  }));

  return logs;
}

/**
 * Safely decode blob to text (fallback to UTF-8, ignores binary noise).
 */
function safeReadText_(blob) {
  try {
    var text = blob.getDataAsString('UTF-8');
    // If it’s suspiciously binary (lots of nulls or non-printables), discard
    if (/[\x00-\x08]/.test(text)) return '';
    return text;
  } catch (e) {
    try { return blob.getDataAsString(); } catch (_) { return ''; }
  }
}

/**
 * Checks if a decoded blob is likely plain text.
 */
function isProbablyText_(text) {
  if (!text) return false;
  var sample = text.slice(0, 200);
  // More than 90% printable → treat as text
  var printable = (sample.match(/[ -~\n\r\t]/g) || []).length;
  return printable / sample.length > 0.9;
}


/**
 * llmPromptK_FailureAnalysis_
 * LLM prompt to analyze failed tests against instructions
 */
function llmPromptK_FailureAnalysis_(worstRun, instructionMd, testCode) {
  var rubric =
"K) FAILURE ANALYSIS - Worst Run (Enhanced Valid Failure Detection)\\n" +
"Goal: Analyze the failed tests to determine if failures are VALID (task is fair) or INVALID (task is flawed).\\n" +
"\\n" +
"CONTEXT:\\n" +
"- Model: " + (worstRun.model || 'unknown') + "\\n" +
"- Run ID: " + (worstRun.runId || 'unknown') + "\\n" +
"- Total Tests: " + worstRun.totalTests + "\\n" +
"- Passed: " + worstRun.passedCount + "\\n" +
"- Failed: " + worstRun.failedCount + "\\n" +
"\\n" +
"============================================================\\n" +
"PRE-CHECK: INFRASTRUCTURE / AUTH FAILURES\\n" +
"============================================================\\n" +
"Before classifying test failures, check if runs failed due to INFRASTRUCTURE issues:\\n" +
"- AuthenticationError / API key not set / 401 Unauthorized\\n" +
"- ConnectionError / timeout before any task work begins\\n" +
"- Docker build failure / image pull failure\\n" +
"- OOM killed before agent executed any commands\\n" +
"\\n" +
"If ALL runs failed with the SAME infrastructure/auth error:\\n" +
"- The model NEVER actually attempted the task\\n" +
"- These are NOT valid task failures — they are invalid runs\\n" +
"- Verdict: FAIL — runs invalid, task needs re-running with valid credentials.\\n" +
"\\n" +
"============================================================\\n" +
"VALID FAILURE CRITERIA (from Benchmark Paper)\\n" +
"============================================================\\n" +
"A failure is VALID if:\\n" +
"1. The instruction.md clearly states the requirement that was violated\\n" +
"2. The model made a genuine mistake (logic error, misunderstanding, incomplete solution)\\n" +
"3. A competent developer reading instruction.md could pass the test\\n" +
"4. The test assertion matches what was asked in the instruction\\n" +
"\\n" +
"============================================================\\n" +
"INVALID FAILURE INDICATORS (Task is Flawed)\\n" +
"============================================================\\n" +
"❌ HIDDEN REQUIREMENTS: Test checks something NOT mentioned in instruction.md\\n" +
"   Example: Instruction says 'save output', test expects 'output_v2.json'\\n" +
"\\n" +
"❌ MAGIC VALUES: Test expects specific values that couldn't be derived\\n" +
"   Example: Test expects exact float 0.847263 with no formula given\\n" +
"\\n" +
"❌ UNDOCUMENTED FILES: Test reads from files not mentioned in instruction\\n" +
"   Example: test opens 'config.json' but instruction never mentions it\\n" +
"\\n" +
"❌ IMPLEMENTATION TRAPS: Test requires specific implementation details\\n" +
"   Example: Must use 'numpy.linalg.solve' specifically, not any solver\\n" +
"\\n" +
"❌ AMBIGUOUS INSTRUCTIONS: Reasonable interpretations would still fail\\n" +
"   Example: 'Calculate average' but test expects weighted average specifically\\n" +
"\\n" +
"============================================================\\n" +
"DEBUG TOOL CRITERIA (From Benchmark Paper)\\n" +
"============================================================\\n" +
"Apply these specific checks to determine INSUFFICIENT INSTRUCTIONS:\\n" +
"\\n" +
"1. EXACT SPECIFICATION MISMATCHES:\\n" +
"   - Tests expect specific parameter names, file formats, function signatures,\\n" +
"     or return values NOT precisely specified in instruction.md\\n" +
"   → INSUFFICIENT INSTRUCTIONS\\n" +
"\\n" +
"2. IMPLICIT EXPECTATIONS:\\n" +
"   - Tests check for behavior/format/structure requiring agent assumptions\\n" +
"     about implementation details not stated in instruction.md\\n" +
"   → INSUFFICIENT INSTRUCTIONS\\n" +
"\\n" +
"3. HARDCODED TEST EXPECTATIONS:\\n" +
"   - Tests look for exact strings, parameter names, or data structures\\n" +
"     not documented in instruction.md\\n" +
"   → INSUFFICIENT INSTRUCTIONS\\n" +
"\\n" +
"4. EXAMPLES vs REQUIREMENTS:\\n" +
"   - Instruction provides examples but doesn't explicitly state they're REQUIRED\\n" +
"   - Tests expecting exact example matching = INSUFFICIENT INSTRUCTIONS\\n" +
"   - Be strict: examples != requirements unless explicitly stated\\n" +
"\\n" +
"EXAMPLES OF INSUFFICIENT INSTRUCTIONS:\\n" +
"- Test expects exact function name 'calculateSum' but task only says 'create a function to add numbers'\\n" +
"- Test expects specific JSON structure but task doesn't specify exact schema\\n" +
"- Test expects exact variable name 'self.model' but task only provides this as example\\n" +
"- Test expects exact file name 'output.csv' but task only says 'save to CSV file'\\n" +
"\\n" +
"============================================================\\n" +
"TRAJECTORY ANALYSIS (What the Model Actually Did)\\n" +
"============================================================\\n" +
"Review the model's trajectory to understand:\\n" +
"1. Did the model attempt the correct approach?\\n" +
"2. Where exactly did it go wrong?\\n" +
"3. Was the failure due to task ambiguity or model limitation?\\n" +
"4. Did the model show understanding of the core task?\\n" +
"\\n" +
"KEY QUESTION: If you showed instruction.md to a senior developer,\\n" +
"would they know how to pass this specific test?\\n" +
"- YES → Valid failure (model's fault)\\n" +
"- NO → Invalid failure (task's fault)\\n" +
"\\n" +
"============================================================\\n" +
"CLASSIFICATION FOR EACH FAILED TEST\\n" +
"============================================================\\n" +
"✅ VALID FAILURE - Task is fair, model made a mistake:\\n" +
"   • Requirement is clearly stated in instruction.md\\n" +
"   • Model attempted but implemented incorrectly\\n" +
"   • Test assertion matches instruction requirements\\n" +
"\\n" +
"⚠️ AMBIGUOUS FAILURE - Instruction could be clearer:\\n" +
"   • Requirement exists but is vague or has multiple interpretations\\n" +
"   • Model's interpretation was reasonable but wrong\\n" +
"   • Test is stricter than instruction implies\\n" +
"\\n" +
"❌ INVALID FAILURE - Task is flawed (needs fix):\\n" +
"   • Test checks something not in instruction.md\\n" +
"   • Hidden requirements or magic values\\n" +
"   • No reasonable way to derive the expected output\\n" +
"\\n" +
"============================================================\\n" +
"OUTPUT FORMAT\\n" +
"============================================================\\n" +
"For each failed test:\\n" +
"| Test Name | Classification | Instruction Reference | Reasoning |\\n" +
"\\n" +
"SUMMARY:\\n" +
"- Valid Failures: X (task is fair for these)\\n" +
"- Ambiguous Failures: Y (consider clarifying instruction.md)\\n" +
"- Invalid Failures: Z (task needs fixing)\\n" +
"\\n" +
"OVERALL ASSESSMENT:\\n" +
"- If majority are VALID → Task is well-designed\\n" +
"- If many AMBIGUOUS → Recommend instruction.md improvements\\n" +
"- If any INVALID → Task has critical issues\\n" +
"\\n" +
"FINAL VERDICT (REQUIRED):\\n" +
"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n" +
"FINAL VERDICT: ✅ PASS (all valid) / ⚠️ REVIEW (some ambiguous) / ❌ FAIL (invalid failures found)\\n" +
"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";

  // Use failureOutput from test-stdout.txt
  var failureBlock = "TEST FAILURES (from pytest output):\\n" +
    (worstRun.failureOutput || '(no failure details available)');
  
  // Include trajectory if available (what the model actually did)
  var trajectoryBlock = "";
  if (worstRun.trajectoryContent) {
    trajectoryBlock = "\\n\\n--- AGENT TRAJECTORY (what model actually did) ---\\n" +
      worstRun.trajectoryContent;
  }
    
  var user =
failureBlock + trajectoryBlock + "\\n\\n" +
"--- instruction.md ---\\n" +
((typeof instructionMd !== 'undefined' && instructionMd) ? instructionMd.substring(0, 3000) : '(missing)') + "\\n\\n" +
"--- test code (excerpt) ---\\n" +
((typeof testCode !== 'undefined' && testCode) ? testCode.substring(0, 2000) : '(missing)');

  return { system: systemHeader_(), user: rubric + "\\n\\n" + user };
}


/**
 * llmPromptK_CheatingAnalysis_
 * LLM prompt to analyze best (passed) run's trajectory for cheating
 * IMPORTANT: Only checks if model ACTIVELY peeked at forbidden files via commands
 */
function llmPromptK_CheatingAnalysis_(bestRun, instructionMd, solveSh) {
  var rubric =
"K) CHEATING ANALYSIS - Best Run (Passed)\\n" +
"Goal: Check if the model ACTIVELY PEEKED at forbidden files via shell commands.\\n" +
"\\n" +
"CONTEXT:\\n" +
"- Model: " + (bestRun.model || 'unknown') + "\\n" +
"- Run ID: " + (bestRun.runId || 'unknown') + "\\n" +
"- All " + bestRun.passedCount + " tests PASSED\\n" +
"\\n" +
"============================================================\\n" +
"⚠️ IMPORTANT: WHAT TO CHECK\\n" +
"============================================================\\n" +
"ONLY check the TRAJECTORY for shell commands that ACCESS FORBIDDEN FILES.\\n" +
"Look for commands the model EXECUTED, not what appears in prompts/context.\\n" +
"\\n" +
"============================================================\\n" +
"FORBIDDEN COMMANDS (automatic CHEATED)\\n" +
"============================================================\\n" +
"Any command that READS the solution file or test files:\\n" +
"\\n" +
"1. READING solve.sh:\\n" +
"   - cat solve.sh | cat /solution/solve.sh | cat */solve.sh\\n" +
"   - head solve.sh | tail solve.sh | less solve.sh | more solve.sh\\n" +
"   - vim solve.sh | nano solve.sh | view solve.sh\\n" +
"   - python -c 'open(\"solve.sh\").read()'\\n" +
"\\n" +
"2. READING solution folder:\\n" +
"   - cat /solution/* | ls /solution | cat /app/solution/*\\n" +
"   - Any read access to files inside solution/ directory\\n" +
"\\n" +
"3. READING test files for expected values:\\n" +
"   - cat test_state.py | cat test_outputs.py | cat tests/*.py\\n" +
"   - grep inside test files to extract expected outputs\\n" +
"\\n" +
"4. COPYING solution:\\n" +
"   - cp solve.sh my_solution.sh\\n" +
"   - source solve.sh\\n" +
"\\n" +
"============================================================\\n" +
"LEGITIMATE COMMANDS (NOT cheating)\\n" +
"============================================================\\n" +
"- Reading input data files mentioned in instructions\\n" +
"- Reading environment files (Dockerfile, configs, data)\\n" +
"- Writing and editing their own code\\n" +
"- Running tests with pytest\\n" +
"- Debugging their implementation\\n" +
"- ls (without reading solution content)\\n" +
"\\n" +
"============================================================\\n" +
"HOW TO ANALYZE\\n" +
"============================================================\\n" +
"1. Scan the trajectory for SHELL COMMANDS (bash_run, terminal output)\\n" +
"2. Look for any command accessing: solve.sh, /solution/, test_*.py\\n" +
"3. If NO forbidden file access commands found → CLEAN\\n" +
"4. If forbidden commands found → CHEATED\\n" +
"\\n" +
"FINAL VERDICT (REQUIRED):\\n" +
"Based ONLY on commands in the trajectory:\\n" +
"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n" +
"FINAL VERDICT: ✅ CLEAN / ⚠️ SUSPICIOUS / ❌ CHEATED\\n" +
"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";

  var trajectoryBlock = "AGENT TRAJECTORY (analyze these commands):\\n" +
    (bestRun.trajectoryContent || '(no trajectory available)');
    
  // Only include instruction.md for context, NOT solve.sh (to avoid confusion)
  var user =
trajectoryBlock + "\\n\\n" +
"--- instruction.md (for reference only) ---\\n" +
((typeof instructionMd !== 'undefined' && instructionMd) ? instructionMd.substring(0, 1500) : '(missing)');

  return { system: systemHeader_(), user: rubric + "\\n\\n" + user };
}


/**
 * getModelRunSummary_
 * Reads aggregated result.json from each model folder in model-run-logs/
 * Also checks trajectory.json for cheating (peeking at solve.sh)
 * Returns summary with pass rate, trials, errors, cheating flags for each model.
 */
function getModelRunSummary_(entries) {
  var summary = {};
  
  // First pass: collect model-level result.json
  for (var i = 0; i < entries.length; i++) {
    var name = entries[i].getName();
    
    // Ignore macOS metadata
    if (/^__MACOSX\//i.test(name) || /com\.apple/i.test(name)) continue;
    
    // Match model-run-logs/<model-name>/result.json (NOT inside a run subfolder)
    // This is the aggregated result at the model level
    var match = name.match(/model-run-logs\/([^\/]+)\/result\.json$/i);
    if (match) {
      var modelName = match[1];
      
      // Skip golden-solution-log as it's not a real model
      if (modelName === 'golden-solution-log') continue;
      
      try {
        var text = safeReadText_(entries[i]);
        var data = JSON.parse(text);
        
        // Extract stats from the aggregated result
        var stats = data.stats || {};
        var nTrials = data.n_total_trials || 0;
        var nErrors = stats.n_errors || 0;
        
        // Get pass rate and reward breakdown from evals
        var passRate = 0;
        var passed = 0;
        var failed = 0;
        var exceptionStats = {};
        
        if (stats.evals) {
          var evalKeys = Object.keys(stats.evals);
          if (evalKeys.length > 0) {
            var evalData = stats.evals[evalKeys[0]];
            
            // Get metrics (pass rate)
            if (evalData.metrics && evalData.metrics.length > 0) {
              passRate = evalData.metrics[0].mean || 0;
            }
            
            // Get reward breakdown
            if (evalData.reward_stats && evalData.reward_stats.reward) {
              var rewards = evalData.reward_stats.reward;
              passed = (rewards["1.0"] || rewards["1"] || []).length;
              failed = (rewards["0.0"] || rewards["0"] || []).length;
            }
            
            // Get exception stats
            exceptionStats = evalData.exception_stats || {};
          }
        }
        
        summary[modelName] = {
          n_trials: nTrials,
          n_errors: nErrors,
          passed: passed,
          failed: failed,
          pass_rate: passRate,
          exception_stats: exceptionStats,
          cheating_detected: [],
          trajectories_checked: 0
        };
        
      } catch (e) {
        // Ignore parse errors, record as error
        summary[modelName] = {
          n_trials: 0,
          n_errors: 1,
          passed: 0,
          failed: 0,
          pass_rate: 0,
          parse_error: e.message,
          cheating_detected: [],
          trajectories_checked: 0
        };
      }
    }
  }
  
  // Second pass: check trajectory.json for cheating AND collect test-stdout.txt for failure analysis
  var worstRunPerModel = {};
  var bestRunPerModel = {};
  var trajectoryByModelRun = {}; // Store trajectories keyed by model/runId
  
  for (var j = 0; j < entries.length; j++) {
    var entryName = entries[j].getName();
    
    // Ignore macOS metadata
    if (/^__MACOSX\//i.test(entryName) || /com\.apple/i.test(entryName)) continue;
    
    // Check for trajectory.json (cheating detection)
    var trajMatch = entryName.match(/model-run-logs\/([^\/]+)\/([^\/]+)\/agent\/trajectory\.json$/i);
    if (trajMatch) {
      var modelForTraj = trajMatch[1];
      var runId = trajMatch[2];
      
      // Skip golden-solution-log
      if (modelForTraj === 'golden-solution-log') continue;
      
      // Initialize model if not already in summary
      if (!summary[modelForTraj]) {
        summary[modelForTraj] = {
          n_trials: 0,
          n_errors: 0,
          passed: 0,
          failed: 0,
          pass_rate: 0,
          cheating_detected: [],
          trajectories_checked: 0
        };
      }
      
      try {
        var trajText = safeReadText_(entries[j]);
        var cheats = checkForCheating_(trajText, runId);
        
        // Store trajectory content for later use (limited to 5000 chars)
        var trajKey = modelForTraj + '/' + runId;
        trajectoryByModelRun[trajKey] = trajText ? trajText.substring(0, 5000) : null;
        
        // Increment trajectory count
        summary[modelForTraj].trajectories_checked++;
        
        if (cheats.length > 0) {
          summary[modelForTraj].cheating_detected = 
            summary[modelForTraj].cheating_detected.concat(cheats);
        }
      } catch (e) {
        // Ignore trajectory parse errors but still count
        summary[modelForTraj].trajectories_checked++;
      }
    }
    
    // Check for test-stdout.txt (failure analysis)
    // Match: .../model-run-logs/<MODEL>/<RUN-ID>/verifier/test-stdout.txt
    if (entryName.toLowerCase().indexOf('test-stdout.txt') !== -1 && 
        entryName.toLowerCase().indexOf('verifier') !== -1) {
      
      var pathParts = entryName.split('/');
      var verifierIdx = -1;
      for (var pi = 0; pi < pathParts.length; pi++) {
        if (pathParts[pi].toLowerCase() === 'verifier') {
          verifierIdx = pi;
          break;
        }
      }
      
      // Model should be 2 positions before verifier (model-run-logs/MODEL/RUN-ID/verifier)
      if (verifierIdx >= 2) {
        var modelForStdout = pathParts[verifierIdx - 2];
        var stdoutRunId = pathParts[verifierIdx - 1];
        
        // Skip golden-solution-log
        if (modelForStdout === 'golden-solution-log') continue;
        
        try {
          var stdoutText = safeReadText_(entries[j]);
          if (!stdoutText || stdoutText.length < 50) continue;
          
          // Parse pytest output
          var parsedResults = parseTestStdout_(stdoutText);
          
          if (parsedResults.failedCount > 0) {
            // Track the worst run for this model (most failures)
            var currentWorst = worstRunPerModel[modelForStdout];
            if (!currentWorst || parsedResults.failedCount > currentWorst.failedCount) {
              worstRunPerModel[modelForStdout] = {
                runId: stdoutRunId,
                model: modelForStdout,
                totalTests: parsedResults.totalTests,
                passedCount: parsedResults.passedCount,
                failedCount: parsedResults.failedCount,
                failureOutput: parsedResults.failureOutput,
                trajectoryContent: null // Will be attached after
              };
            }
          } else if (parsedResults.passedCount > 0 && parsedResults.failedCount === 0) {
            // Track the best run for this model (all tests passed)
            if (!bestRunPerModel[modelForStdout]) {
              bestRunPerModel[modelForStdout] = {
                runId: stdoutRunId,
                model: modelForStdout,
                totalTests: parsedResults.totalTests,
                passedCount: parsedResults.passedCount,
                failedCount: 0,
                trajectoryContent: null // Will be attached after
              };
            }
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }
  
  // Attach trajectory content to worst and best runs
  for (var model in worstRunPerModel) {
    var trajKey = model + '/' + worstRunPerModel[model].runId;
    if (trajectoryByModelRun[trajKey]) {
      worstRunPerModel[model].trajectoryContent = trajectoryByModelRun[trajKey];
    }
  }
  for (var model2 in bestRunPerModel) {
    var trajKey2 = model2 + '/' + bestRunPerModel[model2].runId;
    if (trajectoryByModelRun[trajKey2]) {
      bestRunPerModel[model2].trajectoryContent = trajectoryByModelRun[trajKey2];
    }
  }
  
  // Store worst and best run data in summary for access by caller
  summary._worstRunPerModel = worstRunPerModel;
  summary._bestRunPerModel = bestRunPerModel;
  
  return summary;
}


/**
 * parseTestStdout_
 * Parses pytest test-stdout.txt output to extract pass/fail counts and failure details
 */
function parseTestStdout_(stdoutText) {
  var result = {
    totalTests: 0,
    passedCount: 0,
    failedCount: 0,
    failureOutput: ''
  };
  
  // Look for pytest summary line: "X failed, Y passed" or "Y passed" etc.
  // Examples: "2 failed, 24 passed in 0.29s", "26 passed in 0.25s"
  var summaryMatch = stdoutText.match(/=+\s*(\d+)\s*failed[,\s]+(\d+)\s*passed/i);
  if (summaryMatch) {
    result.failedCount = parseInt(summaryMatch[1], 10);
    result.passedCount = parseInt(summaryMatch[2], 10);
    result.totalTests = result.failedCount + result.passedCount;
  } else {
    // Try just passed
    var passedOnlyMatch = stdoutText.match(/=+\s*(\d+)\s*passed/i);
    if (passedOnlyMatch) {
      result.passedCount = parseInt(passedOnlyMatch[1], 10);
      result.totalTests = result.passedCount;
    }
  }
  
  // Also check "collected X items"
  var collectedMatch = stdoutText.match(/collected\s+(\d+)\s+items?/i);
  if (collectedMatch) {
    result.totalTests = parseInt(collectedMatch[1], 10);
  }
  
  // Extract the FAILURES section
  var failuresMatch = stdoutText.match(/={3,}\s*FAILURES\s*={3,}([\s\S]*?)(?:={3,}\s*(?:PASSES|short test summary|warnings summary)|$)/i);
  if (failuresMatch) {
    result.failureOutput = failuresMatch[1].trim().substring(0, 3000); // Limit to 3000 chars
  }
  
  // If no FAILURES section but we have failures, extract the short summary
  if (!result.failureOutput && result.failedCount > 0) {
    var shortSummaryMatch = stdoutText.match(/={3,}\s*short test summary info\s*={3,}([\s\S]*?)(?:={3,}|$)/i);
    if (shortSummaryMatch) {
      result.failureOutput = shortSummaryMatch[1].trim().substring(0, 2000);
    }
  }
  
  return result;
}


/**
 * checkForCheating_
 * Parses trajectory.json and checks for forbidden commands
 * Returns array of cheating instances found
 */
function checkForCheating_(trajectoryText, runId) {
  var cheats = [];
  
  // Forbidden patterns: accessing solution files
  var forbiddenPatterns = [
    { pattern: /\bcat\s+[\w\/]*solve\.sh/i, desc: "cat solve.sh" },
    { pattern: /\bcat\s+[\w\/]*solution\//i, desc: "cat solution/" },
    { pattern: /\bhead\s+[\w\/]*solve\.sh/i, desc: "head solve.sh" },
    { pattern: /\btail\s+[\w\/]*solve\.sh/i, desc: "tail solve.sh" },
    { pattern: /\bless\s+[\w\/]*solve\.sh/i, desc: "less solve.sh" },
    { pattern: /\bmore\s+[\w\/]*solve\.sh/i, desc: "more solve.sh" },
    { pattern: /\bvi\s+[\w\/]*solve\.sh/i, desc: "vi solve.sh" },
    { pattern: /\bvim\s+[\w\/]*solve\.sh/i, desc: "vim solve.sh" },
    { pattern: /\bnano\s+[\w\/]*solve\.sh/i, desc: "nano solve.sh" },
    { pattern: /\bcat\s+[\w\/]*solution\.yaml/i, desc: "cat solution.yaml" },
    { pattern: /\bcat\s+[\w\/]*solution\.sh/i, desc: "cat solution.sh" },
    { pattern: /\bgrep\s+.*solve\.sh/i, desc: "grep solve.sh" },
    { pattern: /\bsed\s+.*solve\.sh/i, desc: "sed solve.sh" },
    { pattern: /\bawk\s+.*solve\.sh/i, desc: "awk solve.sh" }
  ];
  
  try {
    var trajectory = JSON.parse(trajectoryText);
    var steps = trajectory.steps || [];
    
    for (var i = 0; i < steps.length; i++) {
      var step = steps[i];
      
      // Check tool_calls for commands
      if (step.tool_calls && Array.isArray(step.tool_calls)) {
        for (var k = 0; k < step.tool_calls.length; k++) {
          var call = step.tool_calls[k];
          var keystrokes = (call.arguments && call.arguments.keystrokes) || '';
          
          // Check against forbidden patterns
          for (var p = 0; p < forbiddenPatterns.length; p++) {
            if (forbiddenPatterns[p].pattern.test(keystrokes)) {
              cheats.push({
                run_id: runId,
                step: step.step_id,
                command: forbiddenPatterns[p].desc,
                raw: keystrokes.substring(0, 100)
              });
            }
          }
        }
      }
    }
  } catch (e) {
    // Ignore parse errors
  }
  
  return cheats;
}


/**
 * getEnvironmentFiles_
 * Extracts list of files in the environment/ folder (excluding Dockerfile)
 * Returns object with file list and content summaries
 */
function getEnvironmentFiles_(entries) {
  var envFiles = [];
  var envFolderPattern = /environment\/(.+)$/i;
  
  for (var i = 0; i < entries.length; i++) {
    var name = entries[i].getName();
    
    // Skip macOS metadata
    if (/^__MACOSX\//i.test(name) || /com\.apple/i.test(name)) continue;
    
    var match = name.match(envFolderPattern);
    if (match) {
      var relativePath = match[1];
      
      // Skip Dockerfile (already handled separately)
      if (/^dockerfile$/i.test(relativePath)) continue;
      
      // Get file info
      var fileInfo = {
        path: relativePath,
        size: 0,
        hasContent: false
      };
      
      try {
        var blob = entries[i].getBlob();
        fileInfo.size = blob.getBytes().length;
        fileInfo.hasContent = fileInfo.size > 0;
      } catch (e) {
        // Ignore read errors
      }
      
      envFiles.push(fileInfo);
    }
  }
  
  return envFiles;
}


/**
 * formatEnvFiles_
 * Formats environment files list for LLM prompt
 */
function formatEnvFiles_(envFiles) {
  if (!envFiles || envFiles.length === 0) {
    return "(no additional files in environment folder)";
  }
  
  var lines = [];
  for (var i = 0; i < envFiles.length; i++) {
    var f = envFiles[i];
    var status = f.hasContent ? "✓ has content" : "⚠ empty";
    lines.push("- " + f.path + " (" + f.size + " bytes, " + status + ")");
  }
  return lines.join("\n");
}


/**
 * formatModelRunSummary_
 * Formats the model run summary with flags for potential issues
 */
function formatModelRunSummary_(summary) {
  if (!summary || Object.keys(summary).length === 0) {
    return "(no model run logs found)";
  }
  
  var lines = [];
  lines.push("MODEL RUN SUMMARY");
  lines.push("=================");
  lines.push("");
  
  var models = Object.keys(summary).sort();
  var flags = [];
  
  for (var i = 0; i < models.length; i++) {
    var model = models[i];
    var stats = summary[model];
    var passRatePct = Math.round((stats.pass_rate || 0) * 100);
    
    lines.push("**" + model + "**");
    lines.push("  Runs: " + stats.n_trials);
    lines.push("  Passed: " + stats.passed);
    lines.push("  Failed: " + stats.failed);
    lines.push("  Pass Rate: " + passRatePct + "%");
    
    // Check for errors/exceptions
    if (stats.n_errors > 0) {
      lines.push(" ERRORS: " + stats.n_errors);
      flags.push(" " + model + ": " + stats.n_errors + " error(s)/crash(es) detected");
    }
    
    // Check for exception details
    if (stats.exception_stats && Object.keys(stats.exception_stats).length > 0) {
      var excTypes = Object.keys(stats.exception_stats);
      lines.push(" EXCEPTIONS: " + excTypes.join(", "));
      flags.push(" " + model + ": Exceptions - " + excTypes.join(", "));
    }
    
    // Check for parse errors
    if (stats.parse_error) {
      lines.push(" PARSE ERROR: " + stats.parse_error);
    }
    
    // Trajectory Analysis (always show)
    var trajChecked = stats.trajectories_checked || 0;
    if (trajChecked > 0) {
      if (stats.cheating_detected && stats.cheating_detected.length > 0) {
        lines.push(" TRAJECTORY ANALYSIS: CHEATING DETECTED (" + stats.cheating_detected.length + " instance(s))");
        for (var c = 0; c < stats.cheating_detected.length; c++) {
          var cheat = stats.cheating_detected[c];
          lines.push("    • Run " + cheat.run_id + ", Step " + cheat.step + ": " + cheat.command);
        }
        flags.push(" " + model + ": CHEATING - Agent peeked at solution files (" + stats.cheating_detected.length + " instances)");
      } else {
        lines.push("  ✓ TRAJECTORY ANALYSIS: " + trajChecked + " runs checked - No cheating detected");
      }
    } else {
      lines.push(" TRAJECTORY ANALYSIS: No trajectory files found");
    }
    
    lines.push("");
  }
  
  // Overall summary
  var totalPassed = 0, totalFailed = 0, totalRuns = 0, totalErrors = 0;
  for (var j = 0; j < models.length; j++) {
    totalPassed += summary[models[j]].passed || 0;
    totalFailed += summary[models[j]].failed || 0;
    totalRuns += summary[models[j]].n_trials || 0;
    totalErrors += summary[models[j]].n_errors || 0;
  }
  
  var overallPassRate = totalRuns > 0 ? Math.round((totalPassed / totalRuns) * 100) : 0;
  
  lines.push("---");
  lines.push("OVERALL: " + totalPassed + "/" + totalRuns + " runs passed (" + overallPassRate + "%)");
  
  // Add flags section
  if (flags.length > 0) {
    lines.push("");
    lines.push("FLAGS:");
    for (var k = 0; k < flags.length; k++) {
      lines.push("  " + flags[k]);
    }
  }
  
  // Check for any cheating across all models
  var totalCheating = 0;
  for (var m = 0; m < models.length; m++) {
    if (summary[models[m]].cheating_detected) {
      totalCheating += summary[models[m]].cheating_detected.length;
    }
  }
  
  // Add verdict
  lines.push("");
  lines.push("---");
  if (totalCheating > 0) {
    lines.push("VERDICT: FAIL - CHEATING DETECTED (" + totalCheating + " instances of peeking at solution files)");
  } else if (totalErrors > 0) {
    lines.push("VERDICT: REVIEW NEEDED - Errors/crashes detected");
  } else if (overallPassRate === 0 && totalRuns > 0) {
    lines.push("VERDICT: REVIEW NEEDED - All runs failed (0% pass rate)");
  } else if (overallPassRate === 100) {
    lines.push("VERDICT: ✅ PASS (verify difficulty is appropriate)");
  } else {
    lines.push("VERDICT: ✅ PASS - Normal pass/fail distribution");
  }
  
  return lines.join("\n");
}


/******************************************************
 * Terminal-Bench Reviewer Portal (Secure UI)
 * Author: [Your Name]
 * Version: v1.0 — Secure HTML UI + Org Login
 ******************************************************/

function doGet(e) {
  var userEmail = Session.getActiveUser().getEmail();
  var allowedDomain = "turing.com";

  // if (!userEmail || userEmail.indexOf("@" + allowedDomain) === -1) {
  //   var html = HtmlService.createHtmlOutput(
  //     '<html>' +
  //       '<head><title>Unauthorized</title></head>' +
  //       '<body style="font-family:Arial; text-align:center; margin-top:100px;">' +
  //         '<h2>🚫 Access Denied</h2>' +
  //         '<p>Your account (<b>' + (userEmail || 'Unknown') + '</b>) is not authorized to use this tool.</p>' +
  //         '<p>Please log in using your <b>' + allowedDomain + '</b> email.</p>' +
  //       '</body>' +
  //     '</html>'
  //   );
  //   return html.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  // }

  return HtmlService.createTemplateFromFile("index")
    .evaluate()
    .setTitle("Terminal-Bench Reviewer Portal")
    .setFaviconUrl("https://ssl.gstatic.com/docs/script/images/favicon.ico")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}


/**
 * Run Review from front-end
 */
function runReview(driveLink, includeStructural) {
  try {
    if (!driveLink) throw new Error("Drive link missing.");
    
    // Default to true if not specified
    if (includeStructural === undefined) {
      includeStructural = true;
    }
    
    var docUrl = reviewDriveLink_(driveLink, includeStructural);
    return { 
      status: "success", 
      docUrl: docUrl 
    };
  } catch (e) {
    return { 
      status: "error", 
      message: String(e) 
    };
  }
}


/**
 * ============================================================
 *  DIMENSION CONFIGURATIONS
 * ============================================================
 */
var DIMENSION_CONFIG = {
  'prompt': {
    name: 'Prompt Alignment',
    criteria: ['A']
  },
  'tests': {
    name: 'Tests Validation',
    criteria: ['B']
  },
  'instruction_test': {
    name: 'Instruction-Test Alignment',
    criteria: ['M']
  },
  'solution': {
    name: 'Solution Alignment',
    criteria: ['G']
  },
  'dockerfile': {
    name: 'Dockerfile Review',
    criteria: ['E']
  },
  'forced_gates': {
    name: 'Forced Gates — Model Detection',
    criteria: ['J']
  }
};


/**
 * ============================================================
 *  runDimensionReview — Run review for a specific dimension
 * ============================================================
 * @param {string} dimension - 'prompt', 'tests', 'instruction_test', 'solution', 'dockerfile', 'forced_gates'
 * @param {object} files - { instruction, tests, testsh, solve, dockerfile, srcfiles }
 * @returns {object} { status, docUrl/message }
 */
function runDimensionReview(dimension, files) {
  try {
    if (!dimension || !DIMENSION_CONFIG[dimension]) {
      throw new Error("Invalid dimension: " + dimension);
    }

    var config = DIMENSION_CONFIG[dimension];
    var criteria = config.criteria;

    var text_task = files.instruction || '';
    var text_tst  = files.tests || '';
    var text_run  = files.testsh || '';
    var text_sol  = files.solve || '';
    var text_dk   = files.dockerfile || '';
    
    // Process folder files into a formatted string
    // Note: f.name now contains the full relative path (e.g., "environment/src/file.py")
    var srcFilesArray = files.srcfiles || [];
    var srcFilesText = '';
    var srcFilesList = '';
    
    if (srcFilesArray && srcFilesArray.length > 0) {
      // f.name already contains the relative path from folder selection
      srcFilesList = srcFilesArray.map(function(f) { return f.name; }).join('\n');
      srcFilesText = srcFilesArray.map(function(f) {
        return '--- ' + f.name + ' ---\n' + (f.content || '(empty)');
      }).join('\n\n');
    }
    
    // Build paths block from folder files
    var pathsBlock = srcFilesList || '(no folder files provided)';

    var results = {};

    // Run only the criteria for this dimension
    for (var i = 0; i < criteria.length; i++) {
      var c = criteria[i];
      
      if (c === 'A') {
        // Include src files in the prompt for context
        var a_prompt = llmPromptA_WithSrc_(text_task, text_dk, pathsBlock, text_sol, srcFilesText);
        results.A = { title: 'PROMPT ALIGNMENT', reviewText: callLLM_(a_prompt) };
      }
      
      if (c === 'B') {
        var b_prompt = llmPromptB_(text_tst, text_task);
        results.B = { title: 'TESTS VALIDATION', reviewText: callLLM_(b_prompt) };
      }
      
      if (c === 'E') {
        var e_prompt = llmPromptE_(text_dk, pathsBlock, text_task);
        results.E = { title: 'DOCKERFILE REVIEW', reviewText: callLLM_(e_prompt) };
      }
      
      if (c === 'G') {
        // Include src files in solution review for context
        var g_prompt = llmPromptG_WithSrc_(text_sol, text_task, text_dk, srcFilesText);
        results.G = { title: 'SOLUTION (SOLVE.SH) ALIGNMENT', reviewText: callLLM_(g_prompt) };
      }
      
      if (c === 'J') {
        var j_prompt = llmPromptJ_(text_tst, text_run);
        results.J = { title: 'FORCED GATES — MODEL DETECTION', reviewText: callLLM_(j_prompt) };
      }
      
      if (c === 'M') {
        var m_prompt = llmPromptM_InstructionAlignment_(text_task, text_tst);
        results.M = { title: 'INSTRUCTION-TEST ALIGNMENT', reviewText: callLLM_(m_prompt) };
      }
    }

    // Build debug blobs for the doc (only include provided files)
    var allBlobs = {};
    if (text_task) allBlobs["instruction.md"] = text_task;
    if (text_tst) allBlobs["tests/test_state.py"] = text_tst;
    if (text_run) allBlobs["tests/test.sh"] = text_run;
    if (text_sol) allBlobs["solution/solve.sh"] = text_sol;
    if (text_dk) allBlobs["environment/Dockerfile"] = text_dk;
    
    // Include folder files in debug output (path already included in f.name)
    if (srcFilesArray && srcFilesArray.length > 0) {
      srcFilesArray.forEach(function(f) {
        allBlobs[f.name] = f.content || '(empty)';
      });
    }

    // Create Google Doc with results
    var docUrl = createReviewDoc_(0, 'Dimension-' + config.name, results, allBlobs);
    
    return { 
      status: "success", 
      docUrl: docUrl 
    };
    
  } catch (e) {
    return { 
      status: "error", 
      message: String(e) 
    };
  }
}


/**
 * ============================================================
 *  runDecoupledReview — Run review on individual uploaded files (legacy)
 * ============================================================
 * @param {object} files - { instruction, tests, testsh, solve, dockerfile }
 * @param {array} criteria - ['A', 'B', 'G', 'E', 'F', 'J', 'M']
 * @returns {object} { status, docUrl/message }
 */
function runDecoupledReview(files, criteria) {
  try {
    if (!files || !criteria || criteria.length === 0) {
      throw new Error("No files or criteria provided.");
    }

    var text_task = files.instruction || '';
    var text_tst  = files.tests || '';
    var text_run  = files.testsh || '';
    var text_sol  = files.solve || '';
    var text_dk   = files.dockerfile || '';

    var results = {};

    // Run only selected criteria
    for (var i = 0; i < criteria.length; i++) {
      var c = criteria[i];
      
      if (c === 'A') {
        var a_prompt = llmPromptA_(text_task, text_dk, '(not available in decoupled mode)', text_sol);
        results.A = { title: 'PROMPT', reviewText: callLLM_(a_prompt) };
      }
      
      if (c === 'B') {
        var b_prompt = llmPromptB_(text_tst, text_task);
        results.B = { title: 'TESTS', reviewText: callLLM_(b_prompt) };
      }
      
      if (c === 'E') {
        var e_prompt = llmPromptE_(text_dk, '(not available in decoupled mode)', text_task);
        results.E = { title: 'DOCKERFILE', reviewText: callLLM_(e_prompt) };
      }
      
      if (c === 'F') {
        var f_prompt = llmPromptF_(text_run);
        results.F = { title: 'TEST.SH', reviewText: callLLM_(f_prompt) };
      }
      
      if (c === 'G') {
        var g_prompt = llmPromptG_(text_sol, text_task, text_dk);
        results.G = { title: 'SOLVE.SH', reviewText: callLLM_(g_prompt) };
      }
      
      if (c === 'J') {
        var j_prompt = llmPromptJ_(text_tst, text_run);
        results.J = { title: 'FORCED GATES — MODEL DETECTION', reviewText: callLLM_(j_prompt) };
      }
      
      if (c === 'M') {
        var m_prompt = llmPromptM_InstructionAlignment_(text_task, text_tst);
        results.M = { title: 'INSTRUCTION-TEST ALIGNMENT', reviewText: callLLM_(m_prompt) };
      }
    }

    // Build debug blobs for the doc
    var allBlobs = {
      "instruction.md": text_task || '(not provided)',
      "tests/test_state.py": text_tst || '(not provided)',
      "tests/test.sh": text_run || '(not provided)',
      "solution/solve.sh": text_sol || '(not provided)',
      "environment/Dockerfile": text_dk || '(not provided)'
    };

    // Create Google Doc with results
    var docUrl = createReviewDoc_(0, 'Decoupled-Review', results, allBlobs);
    
    return { 
      status: "success", 
      docUrl: docUrl 
    };
    
  } catch (e) {
    return { 
      status: "error", 
      message: String(e) 
    };
  }
}


/**
 * (Optional) get logged-in user info
 */
function getUserInfo() {
  return { email: Session.getActiveUser().getEmail() || "unknown" };
}


function getIssueSheet_() {
  var ss = SpreadsheetApp.openById(ISSUE_SHEET_ID);
  var sheet = ss.getSheetByName(ISSUE_SHEET_NAME);
  
  if (!sheet) {
    // If the tab doesn't exist, create it once and set headers
    sheet = ss.insertSheet(ISSUE_SHEET_NAME);
    sheet.appendRow([
      "Timestamp",
      "Reporter Email",
      "Feedback Doc Link",
      "Trainer Comments Expected?",
      "Task Drive Link",
      "Notes / Explanation",
      "Resolved"
    ]);
    var rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(["Yes","No"], true).build();
    sheet.getRange("G2:G").setDataValidation(rule);
  }
  return sheet;
}

/**
 * Saves a new issue report to the existing sheet.
 */
function submitIssueForm(data) {
  var sheet = getIssueSheet_();
  var email = Session.getActiveUser().getEmail() || "unknown";
  sheet.appendRow([
    new Date(),
    email,
    data.feedbackLink,
    data.trainerComment,
    data.taskLink,
    data.notes,
    "No"
  ]);
  return { status: "success" };
}


/**
 * ============================================================
 *  API ENTRYPOINT — process a Google Drive ZIP link directly
 * ============================================================
 * POST JSON:
 *   { "drive_link": "<Google Drive ZIP URL or ID>" }
 * Response:
 *   { "status": "success", "doc_url": "<Google Doc URL>" }
 */
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var driveLink = String(payload.drive_link || "").trim();
    if (!driveLink) throw new Error("Missing 'drive_link' in payload.");

    var result = reviewDriveLink_(driveLink);


    var response = {
      status: "success",
      doc_url: result,
      message: "LLM Review completed successfully"
    };

    return ContentService
      .createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    var response = {
      status: "error",
      message: String(err)
    };

    return ContentService
      .createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
  }
};