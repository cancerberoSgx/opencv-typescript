"""Top-level orchestration: parse bindings.cpp, match against doxygen's index.xml, render
every matched compound in parallel, then hand the results to package_emitter.
"""
from __future__ import annotations

import logging
from concurrent.futures import ProcessPoolExecutor
from dataclasses import dataclass, field
from pathlib import Path

from .options import GeneratorOptions
from .parse_bindings_cpp import (
    UnmatchedNames,
    compound_xml_path,
    match_bindings_cpp,
    parse_bindings_cpp,
)
from .render.main import RenderResult, RenderTask, render_task

log = logging.getLogger(__name__)


@dataclass
class GenerationReport:
    classes_rendered: int = 0
    groups_rendered: int = 0
    errors: list[str] = field(default_factory=list)
    unmatched: UnmatchedNames = field(default_factory=UnmatchedNames)
    # Filled in by package_emitter (needs the full cross-file symbol table, unavailable
    # until every compound has been rendered) - see link_imports.find_unresolved_types.
    unresolved_types: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "classes_rendered": self.classes_rendered,
            "groups_rendered": self.groups_rendered,
            "errors": self.errors,
            "unmatched": {
                "classes": self.unmatched.classes,
                "functions": self.unmatched.functions,
                "constants": self.unmatched.constants,
            },
            "unresolved_types": self.unresolved_types,
        }


def _build_render_tasks(matched, doc_xml_dir: str) -> list[RenderTask]:
    tasks: list[RenderTask] = []
    registered_function_names = frozenset(f.name for f in matched.functions)
    registered_constant_names = frozenset(c.name for c in matched.constants)

    for c in matched.classes:
        tasks.append(
            RenderTask(
                kind="class",
                xml_file=compound_xml_path(doc_xml_dir, c.compound_refid),
                cpp_type_to_js_name=matched.cpp_type_to_js_name,
                js_name=c.js_name,
                base_cpp_type=c.base_cpp_type,
            )
        )

    seen_group_refids: set[str] = set()
    for member in [*matched.functions, *matched.constants]:
        if member.compound_kind != "group" or member.compound_refid in seen_group_refids:
            continue
        seen_group_refids.add(member.compound_refid)
        tasks.append(
            RenderTask(
                kind="group",
                xml_file=compound_xml_path(doc_xml_dir, member.compound_refid),
                cpp_type_to_js_name={},
                registered_function_names=registered_function_names,
                registered_constant_names=registered_constant_names,
            )
        )
    return tasks


def run_pipeline(options: GeneratorOptions) -> tuple[dict[str, str], dict[str, str], GenerationReport]:
    """Returns (class_files, group_files, report) - `class_files`/`group_files` map a
    file stem (no extension) to rendered `.d.ts` source; package_emitter writes them out."""
    doc_xml_dir = str(Path(options.opencv_doc_build_dir or options.opencv_build_dir) / "doc/doxygen/xml")
    bindings_cpp_path = Path(options.opencv_build_dir) / "modules/js_bindings_generator/gen/bindings.cpp"
    index_xml_path = Path(doc_xml_dir) / "index.xml"

    parsed = parse_bindings_cpp(bindings_cpp_path.read_text())
    matched = match_bindings_cpp(parsed, str(index_xml_path))

    if options.debug:
        for kind, names in (
            ("classes", matched.unmatched.classes),
            ("functions", matched.unmatched.functions),
            ("constants", matched.unmatched.constants),
        ):
            if names:
                log.warning(
                    "%d %s registered in bindings.cpp have no matching doxygen node: %s",
                    len(names), kind, ", ".join(sorted(names)),
                )

    tasks = _build_render_tasks(matched, doc_xml_dir)

    results: list[RenderResult] = []
    if options.jobs == 1:
        results = [render_task(t) for t in tasks]
    else:
        with ProcessPoolExecutor(max_workers=options.jobs) as pool:
            results = list(pool.map(render_task, tasks, chunksize=4))

    class_files: dict[str, str] = {}
    group_files: dict[str, str] = {}
    emitted_constants: set[str] = set()
    errors: list[str] = []
    classes_rendered = groups_rendered = 0

    for task, result in zip(tasks, results):
        if result.error:
            errors.append(result.error)
            continue
        emitted_constants |= result.emitted_constants
        if task.kind == "class":
            class_files[result.file_stem] = result.content
            classes_rendered += 1
        else:
            group_files[result.file_stem] = result.content
            groups_rendered += 1

    # Reconcile: a bindings.cpp constant that failed the flat name-match in
    # parse_bindings_cpp (e.g. class-scoped enum constants like
    # `AgastFeatureDetector_AGAST_5_8`) is genuinely covered once we see it was emitted by
    # that class's own enum rendering (render/enums.py#render_class_enums) - only report
    # what's still missing after that.
    final_unmatched_constants = [c for c in matched.unmatched.constants if c not in emitted_constants]

    report = GenerationReport(
        classes_rendered=classes_rendered,
        groups_rendered=groups_rendered,
        errors=errors,
        unmatched=UnmatchedNames(
            classes=matched.unmatched.classes,
            functions=matched.unmatched.functions,
            constants=final_unmatched_constants,
        ),
    )
    return class_files, group_files, report
