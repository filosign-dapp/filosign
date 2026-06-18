#!/usr/bin/env python3
"""
Batch-commit the current git worktree per AGENTS.md:

- Atomic batches of 5-7 files (configurable).
- Subject: [INITIATIVE] - SUBFEATURE (area): description
- Never stages apps/server/drizzle/** (user commits migrations manually).

Usage:
  python3 scripts/batch-commit-worktree.py --dry-run
  python3 scripts/batch-commit-worktree.py --commit
  python3 scripts/batch-commit-worktree.py --commit --min 5 --max 7
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from collections import Counter
from dataclasses import dataclass
from pathlib import PurePosixPath

EXCLUDE_PREFIXES = (
    "apps/server/drizzle/",
)

DEFAULT_MIN = 5
DEFAULT_MAX = 7
DEFAULT_TARGET = 6


@dataclass(frozen=True)
class CommitBatch:
    subject: str
    files: tuple[str, ...]


def run_git(*args: str) -> str:
    result = subprocess.run(
        ["git", *args],
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout


def get_worktree_files() -> list[str]:
    lines = run_git("status", "--porcelain").splitlines()
    files: list[str] = []
    for line in lines:
        if not line.strip():
            continue
        path = line[3:].strip()
        if " -> " in path:
            path = path.split(" -> ", 1)[1]
        files.append(path)
    return sorted(set(files))


def is_excluded(path: str) -> bool:
    return any(path.startswith(prefix) for prefix in EXCLUDE_PREFIXES)


def bucket_key(path: str) -> str:
    parts = PurePosixPath(path).parts
    if len(parts) >= 3 and parts[0] == "apps":
        return "/".join(parts[:3])
    if len(parts) >= 2 and parts[0] == "packages":
        return "/".join(parts[:2])
    if parts[0] == "project":
        return "project"
    if parts[0] == ".cursor":
        return ".cursor"
    return parts[0]


def infer_initiative(paths: list[str]) -> str:
    joined = " ".join(paths).lower()
    if any(
        token in joined
        for token in (
            "legal",
            "terms",
            "privacy",
            "addendum",
            "pilot",
            "acceptable-use",
            "subprocessor",
            "design-partner",
            "public-access",
            "public-fence",
            "deployment",
            "checkout",
            "request-access",
            "marketing-cta",
        )
    ):
        return "[LEGAL PILOT]"
    if any(token in joined for token in ("settlement", "payout")):
        return "[SETTLEMENTS]"
    if "platform-access" in joined or "partner-invite" in joined:
        return "[LEGAL PILOT]"
    return "[LEGAL PILOT]"


def infer_area(paths: list[str]) -> str:
    buckets = Counter(bucket_key(p) for p in paths)
    top = buckets.most_common(1)[0][0]
    if top.startswith("apps/"):
        return top.replace("apps/", "apps/")
    return top


def infer_subfeature(paths: list[str]) -> str:
    joined = " ".join(paths).lower()
    rules: list[tuple[str, str]] = [
        (r"legal-constants|design-partner|acceptable-use|subprocessor|terms\.astro|privacy\.astro", "Legal artifacts"),
        (r"sign-in|legal-assent|pilot-addendum|terms-reacceptance|terms-footer|gated-card", "Sign-in legal assent"),
        (r"payout-access|settlement-access|settlements-access", "Payout access pipeline"),
        (r"platform-access|partner-invite|register-user|public-fence", "Platform access fences"),
        (r"deployment|checkout|upgrade-plan|billing", "Checkout and deployment gates"),
        (r"profile\.ts|register\.ts|users-output", "User legal receipts"),
        (r"present-error|catalog/", "Error catalog"),
        (r"marketing|pricing|request-access|public-access", "Marketing access UX"),
        (r"schema/", "DB schema"),
        (r"tests/", "Tests"),
        (r"project/", "Product docs"),
    ]
    for pattern, label in rules:
        if re.search(pattern, joined):
            return label
    names = {PurePosixPath(p).name for p in paths}
    if len(names) == 1:
        return next(iter(names))
    return "Batch update"


def infer_description(paths: list[str], subfeature: str) -> str:
    joined = " ".join(paths).lower()
    if "test" in joined:
        return f"add and update tests for {subfeature.lower()}."
    if subfeature == "Legal artifacts":
        return "publish legal pages, constants, and hash-aligned source bundles."
    if subfeature == "Sign-in legal assent":
        return "single clickwrap at sign-in for terms, privacy, and design partner addendum."
    if subfeature == "Payout access pipeline":
        return "decouple partner payout auto-grant and extend intake fields."
    if subfeature == "Platform access fences":
        return "harden invite preview, registration, and public checkout fences."
    if subfeature == "Marketing access UX":
        return "route CTAs to request access when public checkout is disabled."
    if subfeature == "User legal receipts":
        return "persist terms and pilot addendum acceptance on register and profile."
    if subfeature == "Error catalog":
        return "align user-facing errors and toast presentation."
    if subfeature == "Product docs":
        return "sync settlement and GTM docs with pilot legal posture."
    return f"update {len(paths)} related paths."


def commit_subject(paths: list[str]) -> str:
    initiative = infer_initiative(paths)
    area = infer_area(paths)
    subfeature = infer_subfeature(paths)
    description = infer_description(paths, subfeature)
    return f"{initiative} - {subfeature} ({area}): {description}"


def group_files(
    files: list[str],
    *,
    min_size: int,
    max_size: int,
    target_size: int,
) -> list[list[str]]:
    if not files:
        return []

    ordered = sorted(files, key=lambda path: (bucket_key(path), path))
    batches: list[list[str]] = []
    index = 0

    while index < len(ordered):
        remaining = len(ordered) - index
        if remaining <= max_size:
            batches.append(ordered[index:])
            break

        take = min(target_size, max_size)
        tail = remaining - take
        if 0 < tail < min_size:
            take = remaining - min_size
            if take > max_size:
                take = max_size

        batches.append(ordered[index : index + take])
        index += take

    if len(batches) >= 2 and len(batches[-1]) < min_size:
        last = batches.pop()
        if len(batches[-1]) + len(last) <= max_size:
            batches[-1].extend(last)
        else:
            batches.append(last)

    for batch in batches:
        if len(batch) > max_size:
            raise ValueError(f"internal grouping error: {len(batch)} files in one batch")

    return batches


def build_plan(
    files: list[str],
    *,
    min_size: int,
    max_size: int,
    target_size: int,
) -> list[CommitBatch]:
    groups = group_files(files, min_size=min_size, max_size=max_size, target_size=target_size)
    return [
        CommitBatch(subject=commit_subject(group), files=tuple(group))
        for group in groups
    ]


def validate_plan(plan: list[CommitBatch], *, min_size: int, max_size: int) -> list[str]:
    errors: list[str] = []
    if not plan:
        errors.append("No files to commit.")
    for index, batch in enumerate(plan, start=1):
        count = len(batch.files)
        if count > max_size:
            errors.append(f"Batch {index} has {count} files (max {max_size}).")
        if count < min_size:
            errors.append(f"Batch {index} has {count} files (min {min_size}).")
        for path in batch.files:
            if is_excluded(path):
                errors.append(f"Batch {index} includes excluded path: {path}")
    return errors


def print_plan(plan: list[CommitBatch]) -> None:
    print(f"Planned {len(plan)} commit(s)\n")
    for index, batch in enumerate(plan, start=1):
        print(f"--- Commit {index} ({len(batch.files)} files) ---")
        print(batch.subject)
        for path in batch.files:
            print(f"  {path}")
        print()


def execute_plan(plan: list[CommitBatch]) -> None:
    for index, batch in enumerate(plan, start=1):
        print(f"[{index}/{len(plan)}] {batch.subject}")
        run_git("add", "--", *batch.files)
        subprocess.run(
            ["git", "commit", "-m", batch.subject],
            check=True,
        )
        print()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the commit plan without committing.",
    )
    parser.add_argument(
        "--commit",
        action="store_true",
        help="Stage and commit each batch.",
    )
    parser.add_argument("--min", type=int, default=DEFAULT_MIN, dest="min_size")
    parser.add_argument("--max", type=int, default=DEFAULT_MAX, dest="max_size")
    parser.add_argument("--target", type=int, default=DEFAULT_TARGET, dest="target_size")
    args = parser.parse_args()

    if args.min_size > args.max_size:
        print("error: --min cannot exceed --max", file=sys.stderr)
        return 2
    if not (args.min_size <= args.target_size <= args.max_size):
        print("error: --target must be between --min and --max", file=sys.stderr)
        return 2
    if not args.dry_run and not args.commit:
        parser.error("Pass --dry-run or --commit")

    all_files = get_worktree_files()
    excluded = [path for path in all_files if is_excluded(path)]
    files = [path for path in all_files if not is_excluded(path)]

    if excluded:
        print(f"Skipping {len(excluded)} drizzle migration path(s) (AGENTS.md):\n")
        for path in excluded:
            print(f"  {path}")
        print()

    plan = build_plan(
        files,
        min_size=args.min_size,
        max_size=args.max_size,
        target_size=args.target_size,
    )
    errors = validate_plan(plan, min_size=args.min_size, max_size=args.max_size)
    if errors:
        for error in errors:
            print(f"error: {error}", file=sys.stderr)
        return 1

    print_plan(plan)

    if args.commit:
        execute_plan(plan)
        print("Done.")
        remaining = run_git("status", "--short")
        if remaining.strip():
            print("\nRemaining worktree changes:")
            print(remaining)
            if any(line.strip().endswith(tuple(excluded)) or "apps/server/drizzle/" in line for line in remaining.splitlines()):
                print(
                    "\nReview and commit drizzle migrations manually:\n"
                    "  bun run db -- confirm-migration-commit --staged\n"
                    "  git commit --no-verify -m \"db: …\""
                )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
