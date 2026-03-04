#!/usr/bin/env python3
"""
Domain-Specific LLM Reviewer — Batch Runner

Usage:
  # Review from a domain CSV (downloads from GDrive, extracts, reviews)
  python review_batch.py --csv /path/to/algorithm-design.csv

  # Review local task directories
  python review_batch.py --paths /path/to/task1 /path/to/task2

  # Review all tasks in a directory
  python review_batch.py --dir /path/to/tasks/

  # Review from GDrive folder (downloads + extracts ZIPs first)
  python review_batch.py --gdrive-folder-id <FOLDER_ID>

  # Specify output directory and batch name
  python review_batch.py --csv ./algo.csv --output ./reports/ --batch "Week3-Batch4"
"""

from __future__ import annotations

import argparse
import csv
import io
import logging
import os
import re
import sys
import time
import zipfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

_THIS_DIR = Path(__file__).resolve().parent
if str(_THIS_DIR) not in sys.path:
    sys.path.insert(0, str(_THIS_DIR))

import config
from config import (
    SERVICE_ACCOUNT_FILE, GDRIVE_SCOPES,
    apply_cli_overrides,
)
from domains import DOMAIN_REGISTRY, get_reviewer_for_domain
from fp_scanner import scan_for_false_positive, apply_fp_results
from report_generator import generate_all_reports
from score_schema import TaskScore
from task_loader import load_task, task_summary

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("review-batch")


# ── Terminal progress bar ──────────────────────────────────────────────────

class ProgressBar:
    """Simple terminal progress bar with live status updates."""

    def __init__(self, total: int, width: int = 40, title: str = "Progress"):
        self.total = total
        self.width = width
        self.title = title
        self.current = 0
        self.passed = 0
        self.failed = 0
        self.errors = 0
        self.start_time = time.time()
        self._current_task = ""

    def _format_time(self, seconds: float) -> str:
        m, s = divmod(int(seconds), 60)
        h, m = divmod(m, 60)
        if h:
            return f"{h}h{m:02d}m{s:02d}s"
        if m:
            return f"{m}m{s:02d}s"
        return f"{s}s"

    def _render(self):
        pct = self.current / self.total if self.total else 0
        filled = int(self.width * pct)
        bar = "█" * filled + "░" * (self.width - filled)
        elapsed = time.time() - self.start_time

        if self.current > 0 and self.current < self.total:
            eta = (elapsed / self.current) * (self.total - self.current)
            eta_str = f"ETA {self._format_time(eta)}"
        elif self.current >= self.total:
            eta_str = f"Done in {self._format_time(elapsed)}"
        else:
            eta_str = "..."

        status_line = (
            f"\r  {self.title} |{bar}| {self.current}/{self.total} "
            f"({pct:.0%}) [{eta_str}] "
            f"✓{self.passed} ✗{self.failed}"
        )
        if self.errors:
            status_line += f" ⚠{self.errors}"

        sys.stdout.write(status_line)
        sys.stdout.flush()

    def set_task(self, name: str):
        self._current_task = name
        task_display = name[:45] + "..." if len(name) > 48 else name
        sys.stdout.write(f"\r  ▶ Reviewing: {task_display:<50}")
        sys.stdout.flush()

    def set_downloading(self, name: str, idx: int, total: int):
        name_display = name[:40] + "..." if len(name) > 43 else name
        sys.stdout.write(f"\r  ⬇ Downloading [{idx}/{total}]: {name_display:<50}")
        sys.stdout.flush()

    def set_extracting(self, name: str):
        name_display = name[:45] + "..." if len(name) > 48 else name
        sys.stdout.write(f"\r  📦 Extracting: {name_display:<50}")
        sys.stdout.flush()

    def update(self, verdict: str = ""):
        self.current += 1
        if verdict == "APPROVED":
            self.passed += 1
        elif verdict in ("REJECTED", "CONDITIONAL"):
            self.failed += 1
        elif verdict == "ERROR":
            self.errors += 1
        self._render()

    def finish(self):
        self._render()
        sys.stdout.write("\n")
        sys.stdout.flush()

    def clear_line(self):
        sys.stdout.write("\r" + " " * 120 + "\r")
        sys.stdout.flush()


# ── Safe ZIP extraction ───────────────────────────────────────────────────

def _safe_extract_zip(zip_path: Path, extract_to: Path):
    """Extract a ZIP file with path traversal protection."""
    with zipfile.ZipFile(zip_path, "r") as zf:
        for member in zf.namelist():
            member_path = (extract_to / member).resolve()
            if not str(member_path).startswith(str(extract_to.resolve())):
                logger.warning("Skipping suspicious ZIP entry: %s", member)
                continue
            zf.extract(member, extract_to)


# ── GDrive download helpers ────────────────────────────────────────────────

def _get_gdrive_service():
    """Create and return an authenticated GDrive service."""
    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
    except ImportError:
        logger.error(
            "Google API libraries not installed. Run:\n"
            "  pip install google-auth google-api-python-client"
        )
        sys.exit(1)

    if not SERVICE_ACCOUNT_FILE or not Path(SERVICE_ACCOUNT_FILE).exists():
        logger.error(
            "GDRIVE_SA_FILE not set or file not found.\n"
            "  export GDRIVE_SA_FILE=/path/to/service-account.json"
        )
        sys.exit(1)

    credentials = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=GDRIVE_SCOPES
    )
    return build("drive", "v3", credentials=credentials)


def _extract_file_id(url: str) -> str | None:
    """Extract GDrive file ID from various URL formats."""
    m = re.search(r"/d/([a-zA-Z0-9_-]+)", url)
    if m:
        return m.group(1)
    m = re.search(r"id=([a-zA-Z0-9_-]+)", url)
    if m:
        return m.group(1)
    return None


def download_gdrive_file(service, file_id: str, dest_dir: Path) -> Path | None:
    """Download a single file from GDrive and return the local path."""
    from googleapiclient.http import MediaIoBaseDownload

    try:
        meta = service.files().get(
            fileId=file_id, fields="name,mimeType,size",
            supportsAllDrives=True
        ).execute()
    except Exception as e:
        logger.error("Failed to get file metadata for %s: %s", file_id, e)
        return None

    filename = Path(meta["name"]).name  # sanitize to prevent path traversal
    dest_path = dest_dir / filename

    if dest_path.exists():
        return dest_path

    try:
        request = service.files().get_media(fileId=file_id)
        fh = io.BytesIO()
        downloader = MediaIoBaseDownload(fh, request)
        done = False
        while not done:
            _, done = downloader.next_chunk()
        with open(dest_path, "wb") as f:
            f.write(fh.getvalue())
        return dest_path
    except Exception as e:
        logger.error("Failed to download %s: %s", filename, e)
        return None


def download_gdrive_folder(folder_id: str, dest_dir: Path) -> list[Path]:
    """Download ZIP files from a GDrive folder and return extracted task dirs."""
    from googleapiclient.http import MediaIoBaseDownload

    service = _get_gdrive_service()

    query = f"'{folder_id}' in parents and trashed=false"
    all_files: list[dict] = []
    page_token = None
    while True:
        results = service.files().list(
            q=query, pageSize=100,
            fields="nextPageToken, files(id, name, mimeType)",
            supportsAllDrives=True, includeItemsFromAllDrives=True,
            pageToken=page_token,
        ).execute()
        all_files.extend(results.get("files", []))
        page_token = results.get("nextPageToken")
        if not page_token:
            break

    zips = [f for f in all_files if f["name"].lower().endswith(".zip")]
    logger.info("Found %d ZIP files in GDrive folder", len(zips))

    dest_dir.mkdir(parents=True, exist_ok=True)
    extracted_dirs: list[Path] = []

    for gfile in zips:
        zip_path = dest_dir / Path(gfile["name"]).name
        if not zip_path.exists():
            logger.info("Downloading %s ...", gfile["name"])
            request = service.files().get_media(fileId=gfile["id"])
            fh = io.BytesIO()
            downloader = MediaIoBaseDownload(fh, request)
            done = False
            while not done:
                _, done = downloader.next_chunk()
            with open(zip_path, "wb") as f:
                f.write(fh.getvalue())
        else:
            logger.info("Skipping %s (already downloaded)", gfile["name"])

        extract_to = dest_dir / zip_path.stem
        if not extract_to.exists():
            _safe_extract_zip(zip_path, extract_to)

        for toml_file in extract_to.rglob("task.toml"):
            extracted_dirs.append(toml_file.parent)

    return extracted_dirs


# ── CSV-based review pipeline ──────────────────────────────────────────────

def load_csv_tasks(csv_path: Path) -> list[dict]:
    """Load task list from a domain CSV file."""
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return list(reader)


def run_csv_review(
    csv_path: Path,
    output_dir: Path,
    batch_name: str,
    run_qd: bool,
    workers: int,
    run_fp: bool = True,
    msource: bool = False,
) -> tuple[list[TaskScore], list[dict]]:
    """Full pipeline: read CSV → download ZIPs → extract → review → report."""

    tasks_meta = load_csv_tasks(csv_path)
    if not tasks_meta:
        print("  ✗ No tasks found in CSV!")
        sys.exit(1)

    domain = tasks_meta[0].get("domain", "unknown")
    total = len(tasks_meta)

    # Header
    print()
    print("=" * 70)
    print(f"  DOMAIN REVIEW: {domain}")
    print(f"  CSV: {csv_path.name} ({total} tasks)")
    print("=" * 70)

    # Phase 1: Download from GDrive
    download_dir = output_dir / "_downloads"
    download_dir.mkdir(parents=True, exist_ok=True)

    service = None
    gdrive_tasks = [t for t in tasks_meta if t.get("link")]
    if gdrive_tasks:
        print(f"\n  Phase 1: Downloading {len(gdrive_tasks)} tasks from Google Drive\n")
        service = _get_gdrive_service()

    pb_dl = ProgressBar(len(tasks_meta), title="Download ")
    task_dirs: list[tuple[dict, Path | None]] = []

    for idx, task_row in enumerate(tasks_meta, 1):
        task_name = task_row.get("task_name", f"task_{idx}")
        link = task_row.get("link", "").strip()

        if not link:
            task_dirs.append((task_row, None))
            pb_dl.update("ERROR")
            continue

        file_id = _extract_file_id(link)
        if not file_id:
            task_dirs.append((task_row, None))
            pb_dl.update("ERROR")
            continue

        pb_dl.set_downloading(task_name, idx, total)

        zip_path = download_gdrive_file(service, file_id, download_dir)
        if not zip_path:
            task_dirs.append((task_row, None))
            pb_dl.update("ERROR")
            continue

        # Extract
        extract_to = download_dir / zip_path.stem
        if not extract_to.exists() and zip_path.suffix.lower() == ".zip":
            try:
                pb_dl.set_extracting(task_name)
                _safe_extract_zip(zip_path, extract_to)
            except Exception as e:
                logger.error("Failed to extract %s: %s", zip_path, e)
                task_dirs.append((task_row, None))
                pb_dl.update("ERROR")
                continue

        # Find task.toml
        found = None
        if extract_to.is_dir():
            for toml_hit in extract_to.rglob("task.toml"):
                found = toml_hit.parent
                break
        if not found and extract_to.is_dir():
            for md_hit in extract_to.rglob("instruction.md"):
                found = md_hit.parent
                break

        task_dirs.append((task_row, found or extract_to))
        pb_dl.update("APPROVED")

    pb_dl.finish()

    valid_dirs = [(m, d) for m, d in task_dirs if d is not None]
    skipped = total - len(valid_dirs)
    if skipped:
        print(f"  ⚠ {skipped} task(s) skipped (download/extract failed)")

    if not valid_dirs:
        print("  ✗ No tasks could be downloaded!")
        sys.exit(1)

    # Phase 2: Review (parallel if workers > 1)
    msource_str = " + msource" if msource else ""
    print(f"\n  Phase 2: Reviewing {len(valid_dirs)} tasks ({9 if run_qd else 0} QD checks + qq/tq/tc scoring{msource_str})")
    if workers > 1:
        print(f"           Using {workers} parallel workers\n")
    else:
        print()

    pb_rev = ProgressBar(len(valid_dirs), title="Review  ")
    scores: list[TaskScore] = []
    task_data_cache: dict[str, dict] = {}

    def _do_review(idx_meta_dir):
        idx, meta, task_dir = idx_meta_dir
        task_name = meta.get("task_name", task_dir.name)
        try:
            task_data = load_task(task_dir)
            cache_key = task_data.get("slug", task_dir.name)
            task_data_cache[cache_key] = task_data
            result = review_single_task(task_dir, run_qd=run_qd, msource=msource)
        except Exception as e:
            result = TaskScore(
                task_name=task_name,
                category=meta.get("domain", "unknown"),
                qq=0, tq=0, tc=0,
                core_issue=f"REVIEW ERROR: {e}",
            )
        return idx, result

    if workers > 1:
        items = [(i, m, d) for i, (m, d) in enumerate(valid_dirs, 1)]
        with ThreadPoolExecutor(max_workers=workers) as pool:
            futures = {pool.submit(_do_review, item): item for item in items}
            for future in as_completed(futures):
                idx, result = future.result()
                if result:
                    scores.append(result)
                    pb_rev.clear_line()
                    v = result.verdict
                    v_icon = "✓" if v == "APPROVED" else "✗" if v == "REJECTED" else "~"
                    qd_str = result.qd_summary[:15] if result.qd_results else ""
                    print(
                        f"  {v_icon} [{idx}/{len(valid_dirs)}] {result.task_name:<40} "
                        f"qq={result.qq} tq={result.tq} tc={result.tc} "
                        f"({result.overall}) {v:<12} {qd_str}"
                    )
                    pb_rev.update(v)
                else:
                    pb_rev.update("ERROR")
    else:
        for idx, (meta, task_dir) in enumerate(valid_dirs, 1):
            task_name = meta.get("task_name", task_dir.name)
            pb_rev.set_task(task_name)

            try:
                task_data = load_task(task_dir)
                cache_key = task_data.get("slug", task_dir.name)
                task_data_cache[cache_key] = task_data
                result = review_single_task(task_dir, run_qd=run_qd, msource=msource)
            except Exception as e:
                pb_rev.clear_line()
                logger.error("Review failed for %s: %s", task_name, e)
                result = TaskScore(
                    task_name=task_name,
                    category=meta.get("domain", "unknown"),
                    qq=0, tq=0, tc=0,
                    core_issue=f"REVIEW ERROR: {e}",
                )

            if result:
                scores.append(result)
                pb_rev.clear_line()
                v = result.verdict
                v_icon = "✓" if v == "APPROVED" else "✗" if v == "REJECTED" else "~"
                qd_str = result.qd_summary[:15] if result.qd_results else ""
                print(
                    f"  {v_icon} [{idx}/{len(valid_dirs)}] {result.task_name:<40} "
                    f"qq={result.qq} tq={result.tq} tc={result.tc} "
                    f"({result.overall}) {v:<12} {qd_str}"
                )
                pb_rev.update(v)
            else:
                pb_rev.update("ERROR")

    pb_rev.finish()

    # Phase 3: False-Positive Scan
    fp_collected = _run_fp_scan(scores, task_data_cache, run_fp, valid_dirs)

    return scores, fp_collected


# ── Shared FP Scan helper (deduplicated) ──────────────────────────────────

def _run_fp_scan(
    scores: list[TaskScore],
    task_data_cache: dict[str, dict],
    run_fp: bool,
    valid_dirs: list[tuple] | None = None,
) -> list[dict]:
    """Run false-positive scan on REJECTED/CONDITIONAL tasks.

    Shared between CSV and non-CSV modes to avoid duplication.
    """
    fp_collected: list[dict] = []
    rejected_scores = [s for s in scores if s.verdict in ("REJECTED", "CONDITIONAL")]
    if not rejected_scores or not run_fp:
        return fp_collected

    print(f"\n  Phase 3: False-Positive Scan ({len(rejected_scores)} tasks flagged)\n")
    pb_fp = ProgressBar(len(rejected_scores), title="FP Scan ")

    upgraded = 0
    for idx, s in enumerate(rejected_scores, 1):
        pb_fp.set_task(s.task_name)

        task_data = task_data_cache.get(s.task_name, {})
        if not task_data and valid_dirs:
            for item in valid_dirs:
                d = item[1] if isinstance(item, tuple) and len(item) >= 2 else item
                if d and hasattr(d, 'name') and d.name == s.task_name:
                    try:
                        task_data = load_task(d)
                    except Exception:
                        pass
                    break

        try:
            fp_result = scan_for_false_positive(s, task_data)
        except Exception as e:
            logger.error("FP scan failed for %s: %s", s.task_name, e)
            pb_fp.update("ERROR")
            continue

        original_verdict = s.verdict
        fp_verdict = fp_result.get("fp_verdict", "KEEP_REJECTED")
        confidence = fp_result.get("confidence", 1.0)

        fp_result["task_name"] = s.task_name
        fp_result["original_verdict"] = original_verdict
        fp_collected.append(fp_result)

        if fp_verdict != "KEEP_REJECTED":
            adjusted = apply_fp_results(s, fp_result)
            for i, existing in enumerate(scores):
                if existing.task_name == s.task_name:
                    scores[i] = adjusted
                    break
            upgraded += 1
            pb_fp.clear_line()
            print(
                f"  ↑ [{idx}/{len(rejected_scores)}] {s.task_name:<40} "
                f"{original_verdict}→{adjusted.verdict} "
                f"qq={s.qq}→{adjusted.qq} tq={s.tq}→{adjusted.tq} "
                f"tc={s.tc}→{adjusted.tc} (conf={confidence:.0%})"
            )
        else:
            pb_fp.clear_line()
            print(
                f"  = [{idx}/{len(rejected_scores)}] {s.task_name:<40} "
                f"{original_verdict} confirmed (conf={confidence:.0%})"
            )
        pb_fp.update(fp_verdict)

    pb_fp.finish()
    print(f"\n  FP Scan: {upgraded}/{len(rejected_scores)} tasks upgraded")

    return fp_collected


# ── Task discovery ─────────────────────────────────────────────────────────

def discover_tasks(base_dir: Path) -> list[Path]:
    tasks = []
    for toml_file in sorted(base_dir.rglob("task.toml")):
        tasks.append(toml_file.parent)
    return tasks


def discover_from_zip(zip_path: Path, extract_to: Path) -> list[Path]:
    if not extract_to.exists():
        _safe_extract_zip(zip_path, extract_to)
    tasks = []
    for toml_file in extract_to.rglob("task.toml"):
        tasks.append(toml_file.parent)
    return tasks


# ── Single task review ─────────────────────────────────────────────────────

def review_single_task(
    task_dir: Path, domain_filter: str | None = None,
    run_qd: bool = True, msource: bool = False,
) -> TaskScore | None:
    try:
        task = load_task(task_dir)
    except Exception as e:
        logger.error("Failed to load task %s: %s", task_dir, e)
        return TaskScore(
            task_name=task_dir.name, category="unknown",
            qq=0, tq=0, tc=0, core_issue=f"LOAD ERROR: {e}",
        )

    category = task["category"]
    if domain_filter and category != domain_filter:
        return None

    normalized = category.lower().replace("_", "-").replace(" ", "-")
    if category not in DOMAIN_REGISTRY and normalized not in DOMAIN_REGISTRY:
        return TaskScore(
            task_name=task.get("slug", task_dir.name), category=category,
            qq=0, tq=0, tc=0,
            core_issue=f"No reviewer available for domain '{category}'",
        )

    try:
        reviewer_cls = get_reviewer_for_domain(category)
    except ValueError as e:
        return TaskScore(
            task_name=task.get("slug", task_dir.name), category=category,
            qq=0, tq=0, tc=0, core_issue=str(e),
        )

    reviewer = reviewer_cls()
    return reviewer.review(str(task_dir), run_qd=run_qd, msource=msource)


# ── Print summary ─────────────────────────────────────────────────────────

def print_summary(scores: list[TaskScore], reports: dict[str, Path]):
    print("\n" + "=" * 80)
    print(f"  REVIEW COMPLETE — {len(scores)} tasks reviewed")
    print("=" * 80)
    print(
        f"\n{'#':<4} {'Domain':<25} {'Task':<30} "
        f"{'qq':>3} {'tq':>3} {'tc':>3} {'Avg':>5} {'QD':>12} {'Verdict':<12}"
    )
    print("-" * 110)
    for i, s in enumerate(scores, 1):
        qd_short = s.qd_summary[:12] if s.qd_results else "n/a"
        print(
            f"{i:<4} {s.category:<25} {s.task_name:<30} "
            f"{s.qq:>3} {s.tq:>3} {s.tc:>3} {s.overall:>5} "
            f"{qd_short:>12} {s.verdict:<12}"
        )

    if scores:
        avg_qq = round(sum(s.qq for s in scores) / len(scores), 1)
        avg_tq = round(sum(s.tq for s in scores) / len(scores), 1)
        avg_tc = round(sum(s.tc for s in scores) / len(scores), 1)
        avg_all = round(sum(s.overall for s in scores) / len(scores), 1)
        approved = sum(1 for s in scores if s.verdict == "APPROVED")
        rejected = sum(1 for s in scores if s.verdict == "REJECTED")
        conditional = sum(1 for s in scores if s.verdict == "CONDITIONAL")
        print("-" * 110)
        print(
            f"{'':4} {'AVERAGE':<25} {'':<30} "
            f"{avg_qq:>3} {avg_tq:>3} {avg_tc:>3} {avg_all:>5}"
        )
        print(
            f"\n  Approved: {approved}/{len(scores)} | "
            f"Conditional: {conditional}/{len(scores)} | "
            f"Rejected: {rejected}/{len(scores)}"
        )

    print(f"\n  Reports saved to:")
    for name, path in reports.items():
        icon = {"task_csv": "📊", "excel": "📗", "markdown": "📝",
                "master_csv": "📋", "summary_csv": "📈",
                "per_task_reports": "📁", "fp_report": "🔍"}.get(name, "📄")
        print(f"    {icon} {name}: {path}")

    if "per_task_reports" in reports:
        per_task_dir = reports["per_task_reports"]
        count = sum(1 for f in per_task_dir.iterdir() if f.suffix == ".md") if per_task_dir.is_dir() else 0
        print(f"\n  📁 {count} individual per-task review documents saved to:")
        print(f"     {per_task_dir}/")
        print(f"     Trainers can upload these .md files with their task submissions.")
    print()


# ── Main ───────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Domain-Specific LLM Reviewer — Batch Runner",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )

    input_group = parser.add_mutually_exclusive_group(required=True)
    input_group.add_argument(
        "--csv", type=Path,
        help="Path to a domain CSV file (task list with GDrive links)",
    )
    input_group.add_argument(
        "--paths", nargs="+", type=Path,
        help="Paths to individual task directories or ZIP files",
    )
    input_group.add_argument(
        "--dir", type=Path,
        help="Directory containing multiple task directories",
    )
    input_group.add_argument(
        "--gdrive-folder-id", type=str,
        help="Google Drive folder ID containing task ZIPs",
    )

    parser.add_argument(
        "--output", "-o", type=Path,
        default=Path(__file__).resolve().parent / "outputs",
        help="Output directory for reports (default: ./outputs/)",
    )
    parser.add_argument(
        "--batch", "-b", type=str, default="",
        help="Batch name for report filenames",
    )
    parser.add_argument(
        "--domain", "-d", type=str, default=None,
        help="Filter to a specific domain (e.g., 'algorithm-design')",
    )
    parser.add_argument(
        "--workers", "-w", type=int, default=1,
        help="Max concurrent review workers (default: 1)",
    )
    parser.add_argument(
        "--no-qd", action="store_true",
        help="Skip QD checks (A, B, C, E, F, G, H, J, M) and only run qq/tq/tc scoring",
    )
    parser.add_argument(
        "--no-fp", action="store_true",
        help="Skip false-positive scanning (second pass on rejected tasks)",
    )
    parser.add_argument(
        "--msource", action="store_true",
        help="Material source review: read all environment files (data, configs, rules) "
             "and include their contents in the LLM prompt for deeper cross-referencing "
             "against instruction.md and tests",
    )
    parser.add_argument(
        "--custom-url", type=str, default=None,
        help="Custom LLM API base URL (e.g. https://llm-proxy.company.com/v1)",
    )
    parser.add_argument(
        "--api-key", type=str, default=None,
        help="API key / Bearer token for the LLM endpoint",
    )
    parser.add_argument(
        "--model", type=str, default=None,
        help="Model name to use (e.g. gpt-5.3-codex, claude-sonnet-4-6)",
    )
    parser.add_argument(
        "--provider", type=str, default=None, choices=["openai", "anthropic"],
        help="LLM provider to use (default: from LLM_PROVIDER env var)",
    )
    parser.add_argument(
        "--verbose", "-v", action="store_true",
        help="Enable debug logging",
    )

    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    else:
        logging.getLogger("domain-reviewer").setLevel(logging.WARNING)
        logging.getLogger("httpx").setLevel(logging.WARNING)
        logging.getLogger("review-batch").setLevel(logging.WARNING)

    # Apply CLI overrides before anything reads config values
    if args.custom_url or args.api_key or args.model or args.provider:
        apply_cli_overrides(
            api_key=args.api_key,
            model=args.model,
            custom_url=args.custom_url,
            provider=args.provider,
        )

    if config.LLM_PROVIDER == "anthropic":
        if not config.ANTHROPIC_API_KEY:
            print("  ✗ ANTHROPIC_API_KEY not set. Export it or pass --api-key:")
            print("    export ANTHROPIC_API_KEY=sk-ant-...")
            sys.exit(1)
        print(f"  Using: Anthropic ({config.ANTHROPIC_MODEL})")
        if args.custom_url:
            print(f"  Endpoint: {args.custom_url}")
    else:
        if not config.OPENAI_API_KEY:
            print("  ✗ OPENAI_API_KEY not set. Export it or pass --api-key:")
            print("    export OPENAI_API_KEY=sk-...")
            sys.exit(1)
        print(f"  Using: OpenAI ({config.OPENAI_MODEL})")
        if args.custom_url:
            print(f"  Endpoint: {config.OPENAI_BASE_URL}")

    run_qd = not args.no_qd
    run_fp = not args.no_fp
    msource = args.msource
    if msource:
        print("  Material source review enabled (--msource)")
        print("     Environment files will be read and included in LLM prompts")

    scores: list[TaskScore] = []
    fp_collected: list[dict] = []

    # ── CSV mode ──
    if args.csv:
        if not args.csv.exists():
            print(f"  ✗ CSV file not found: {args.csv}")
            sys.exit(1)

        batch_name = args.batch or args.csv.stem
        scores, fp_collected = run_csv_review(
            args.csv, args.output, batch_name, run_qd, args.workers, run_fp,
            msource=msource,
        )

    # ── Other modes ──
    else:
        task_dirs: list[Path] = []

        if args.gdrive_folder_id:
            download_dir = args.output / "_gdrive_downloads"
            task_dirs = download_gdrive_folder(args.gdrive_folder_id, download_dir)
        elif args.dir:
            if not args.dir.is_dir():
                print(f"  ✗ Not a directory: {args.dir}")
                sys.exit(1)
            task_dirs = discover_tasks(args.dir)
        elif args.paths:
            for p in args.paths:
                if p.suffix == ".zip":
                    extract_to = p.parent / p.stem
                    task_dirs.extend(discover_from_zip(p, extract_to))
                elif p.is_dir():
                    if (p / "task.toml").exists():
                        task_dirs.append(p)
                    else:
                        task_dirs.extend(discover_tasks(p))

        if not task_dirs:
            print("  ✗ No task directories found!")
            sys.exit(1)

        total = len(task_dirs)
        print(f"\n  Found {total} task(s) to review\n")

        pb = ProgressBar(total, title="Review  ")
        task_data_cache: dict[str, dict] = {}
        for idx, td in enumerate(task_dirs, 1):
            pb.set_task(td.name)
            try:
                task_data = load_task(td)
                cache_key = task_data.get("slug", td.name)
                task_data_cache[cache_key] = task_data
            except Exception:
                pass
            result = review_single_task(td, args.domain, run_qd=run_qd, msource=msource)
            if result:
                scores.append(result)
                pb.clear_line()
                v = result.verdict
                v_icon = "✓" if v == "APPROVED" else "✗" if v == "REJECTED" else "~"
                print(
                    f"  {v_icon} [{idx}/{total}] {result.task_name:<40} "
                    f"qq={result.qq} tq={result.tq} tc={result.tc} "
                    f"({result.overall}) {v:<12}"
                )
            pb.update(result.verdict if result else "ERROR")
        pb.finish()

        # FP Scan for non-CSV mode (using shared helper)
        fp_collected = _run_fp_scan(scores, task_data_cache, run_fp)

        batch_name = args.batch

    if not scores:
        print("  ✗ No tasks were successfully reviewed!")
        sys.exit(1)

    reports = generate_all_reports(
        scores, args.output, batch_name, fp_results=fp_collected or None
    )
    print_summary(scores, reports)


if __name__ == "__main__":
    main()
