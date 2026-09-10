import json
import shutil
import subprocess
from pathlib import Path

import pytest

from opencv_types_generator.options import GeneratorOptions
from opencv_types_generator.package_emitter import emit_package
from opencv_types_generator.pipeline import run_pipeline

FIXTURES = Path(__file__).parent / "fixtures"


def _run(out_dir: Path, jobs: int):
    options = GeneratorOptions(
        opencv_build_dir=str(FIXTURES / "mini_build"), out_dir=str(out_dir), jobs=jobs, debug=True
    )
    class_files, group_files, report = run_pipeline(options)
    emit_package(str(out_dir), class_files, group_files, report, "opencv-ts", "0.1.0")
    return class_files, group_files, report


@pytest.mark.parametrize("jobs", [1, 2])
def test_pipeline_renders_expected_classes_and_groups(tmp_path, jobs):
    class_files, group_files, report = _run(tmp_path / "out", jobs)

    assert set(class_files) == {"Mat"}
    assert set(group_files) == {"core_array"}
    assert report.classes_rendered == 1
    assert report.groups_rendered == 1
    assert report.errors == []
    # the mini bindings.cpp registers a free function with no matching doxygen node -
    # must be reported, never silently dropped (see parse_bindings_cpp.py).
    assert report.unmatched.functions == ["notRegisteredElsewhere"]
    assert report.unmatched.classes == []


def test_emitted_package_has_expected_layout(tmp_path):
    out = tmp_path / "out"
    _run(out, jobs=1)

    assert (out / "package.json").exists()
    assert (out / "index.d.ts").exists()
    assert (out / "opencv.js.d.ts").exists()
    assert (out / "generated" / "Mat.d.ts").exists()
    assert (out / "generated" / "core_array.d.ts").exists()
    assert (out / "hacks" / "scalars.d.ts").exists()

    package_json = json.loads((out / "package.json").read_text())
    assert package_json["name"] == "opencv-ts"
    assert package_json["version"] == "0.1.0"

    report = json.loads((out / "generation-report.json").read_text())
    assert report["unmatched"]["functions"] == ["notRegisteredElsewhere"]
    # C++-only types the mini fixture references but never registers with opencv.js
    # (MatExpr, UMat, Vec, ...) must be stubbed, not silently left as compile errors.
    assert "MatExpr" in report["unresolved_types"]


@pytest.mark.skipif(shutil.which("npx") is None, reason="node/npx not available")
def test_emitted_package_type_checks_with_real_tsc(tmp_path):
    out = tmp_path / "out"
    _run(out, jobs=1)

    npm_install = subprocess.run(
        ["npm", "install", "--no-save", "--no-audit", "--no-fund", "typescript@5.5.4"],
        cwd=out,
        capture_output=True,
        text=True,
        timeout=120,
    )
    if npm_install.returncode != 0:
        pytest.skip(f"could not install typescript (no network?): {npm_install.stderr[-500:]}")

    tsc = subprocess.run(
        [str(out / "node_modules" / ".bin" / "tsc"), "-p", "tsconfig.json"],
        cwd=out,
        capture_output=True,
        text=True,
        timeout=120,
    )
    assert tsc.returncode == 0, tsc.stdout + tsc.stderr
