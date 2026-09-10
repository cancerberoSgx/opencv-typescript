from __future__ import annotations

import argparse
import logging
import sys

from .options import GeneratorOptions
from .package_emitter import emit_package
from .pipeline import run_pipeline


def build_arg_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="opencv-types-generator",
        description=(
            "Generates a full, installable npm TypeScript typings package for opencv.js "
            "from OpenCV's doxygen XML docs and its opencv.js bindings.cpp. Both must "
            "already be built - see the README for how."
        ),
    )
    p.add_argument(
        "--opencv-build-dir",
        default="../opencv-compiler/output/opencv/build_js",
        help=(
            "Path to the opencv.js build dir (contains modules/js_bindings_generator/gen/bindings.cpp) "
            "(default: ../opencv-compiler/output/opencv/build_js)"
        ),
    )
    p.add_argument(
        "--opencv-doc-build-dir",
        default="../opencv-compiler/output/opencv/build",
        help="Path to the dir containing doc/doxygen/xml (default: ../opencv-compiler/output/opencv/build)",
    )
    p.add_argument(
        "--out-dir",
        default="../opencv-ts",
        help="Output folder for the generated npm project (default: ../opencv-ts)",
    )
    p.add_argument("--package-name", default="opencv-ts", help="npm package name (default: opencv-ts)")
    p.add_argument("--package-version", default="5.0.0", help="npm package version (default: 5.0.0)")
    p.add_argument("--jobs", type=int, default=8, help="Parallel worker processes (default: 8)")
    p.add_argument("--debug", action="store_true", help="Verbose logging, incl. unmatched bindings")
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_arg_parser().parse_args(argv)
    logging.basicConfig(level=logging.DEBUG if args.debug else logging.INFO, format="%(message)s")

    options = GeneratorOptions(
        opencv_build_dir=args.opencv_build_dir,
        opencv_doc_build_dir=args.opencv_doc_build_dir,
        out_dir=args.out_dir,
        package_version=args.package_version,
        jobs=args.jobs,
        debug=args.debug,
    )

    class_files, group_files, report = run_pipeline(options)
    emit_package(
        out_dir=options.out_dir,
        class_files=class_files,
        group_files=group_files,
        report=report,
        package_name=args.package_name,
        package_version=args.package_version,
    )

    logging.info(
        "Wrote %d classes, %d groups to %s (%d unmatched bindings, %d render errors)",
        report.classes_rendered,
        report.groups_rendered,
        options.out_dir,
        report.unmatched.total(),
        len(report.errors),
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
