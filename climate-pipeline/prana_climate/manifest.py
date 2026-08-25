"""Manifest writer — per spec §6.

A `manifest.json` is written alongside every uploaded dataset so we can
reconstruct provenance, validate checksums, and re-run the pipeline
when a new GCM member becomes available.
"""
from __future__ import annotations

import hashlib
import json
import os
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional


@dataclass
class FileEntry:
    filename: str
    size_bytes: int
    sha256: Optional[str] = None


@dataclass
class Manifest:
    variable: str
    scenario: str
    model: str
    frequency: str
    member: str
    grid: str
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    format: str = "NetCDF (.nc)"
    esgf_dataset_id: Optional[str] = None
    esgf_node: Optional[str] = None
    download_date: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    files: List[FileEntry] = field(default_factory=list)
    notes: Optional[str] = None

    def to_dict(self) -> dict:
        d = asdict(self)
        return d


def sha256_of(path: Path, chunk: int = 1 << 20) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(chunk), b""):
            h.update(block)
    return h.hexdigest()


def build_from_files(
    *,
    variable: str,
    scenario: str,
    model: str,
    frequency: str,
    member: str,
    files: List[Path],
    esgf_dataset_id: Optional[str] = None,
    esgf_node: Optional[str] = None,
) -> Manifest:
    entries: List[FileEntry] = []
    period_start = period_end = None
    for p in files:
        if not p.exists():
            continue
        st = p.stat()
        sha = sha256_of(p) if st.st_size < 50_000_000 else None  # skip hashing very large files
        entries.append(FileEntry(filename=p.name, size_bytes=st.st_size, sha256=sha))

    m = Manifest(
        variable=variable,
        scenario=scenario,
        model=model,
        frequency=frequency,
        member=member,
        grid="gn",  # default CMIP6 native grid
        esgf_dataset_id=esgf_dataset_id,
        esgf_node=esgf_node,
        files=entries,
    )
    return m


def write_manifest(manifest: Manifest, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        json.dump(manifest.to_dict(), f, indent=2, sort_keys=True)
