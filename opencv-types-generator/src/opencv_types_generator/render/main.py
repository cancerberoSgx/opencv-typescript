"""Per-compound render orchestration - the unit of work handed to each worker process in
pipeline.py's ProcessPoolExecutor. Deliberately takes only plain, picklable arguments and
re-parses the compound's own (small) XML file inside the worker rather than shipping
parsed dataclasses across the process boundary.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from ..parse_doxygen import parse_doxygen_file
from .class_ import render_compound_class
from .group import render_group
from .identifiers import normalize_id


@dataclass
class RenderTask:
    kind: str  # 'class' | 'group'
    xml_file: str
    cpp_type_to_js_name: dict[str, str]
    js_name: str | None = None  # class tasks
    base_cpp_type: str | None = None  # class tasks
    registered_function_names: frozenset[str] = frozenset()  # group tasks
    registered_constant_names: frozenset[str] = frozenset()  # group tasks


@dataclass
class RenderResult:
    file_stem: str
    content: str
    emitted_constants: set[str] = field(default_factory=set)
    emitted_functions: set[str] = field(default_factory=set)
    error: str | None = None


def render_task(task: RenderTask) -> RenderResult:
    try:
        defs = parse_doxygen_file(task.xml_file)
    except Exception as exc:  # noqa: BLE001 - reported, not raised, so one bad file
        return RenderResult(file_stem="", content="", error=f"{task.xml_file}: {exc}")

    if not defs:
        return RenderResult(file_stem="", content="", error=f"no <compounddef> in {task.xml_file}")
    compound = defs[0]

    if task.kind == "class":
        content, emitted_constants = render_compound_class(
            compound, task.js_name, task.base_cpp_type, task.cpp_type_to_js_name
        )
        return RenderResult(file_stem=task.js_name, content=content, emitted_constants=emitted_constants)

    if task.kind == "group":
        content, emitted_functions, emitted_constants = render_group(
            compound, set(task.registered_function_names), set(task.registered_constant_names)
        )
        stem = normalize_id(compound.compoundname or compound.title or "group")
        return RenderResult(
            file_stem=stem,
            content=content,
            emitted_constants=emitted_constants,
            emitted_functions=emitted_functions,
        )

    return RenderResult(file_stem="", content="", error=f"unsupported compound kind {task.kind!r}")
