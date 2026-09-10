from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass
class GeneratorOptions:
    opencv_build_dir: str
    out_dir: str
    opencv_doc_build_dir: str | None = None
    package_version: str = "0.0.0"
    jobs: int = 0  # 0 -> os.cpu_count()
    debug: bool = False

    def __post_init__(self) -> None:
        if not self.jobs:
            self.jobs = os.cpu_count() or 1
