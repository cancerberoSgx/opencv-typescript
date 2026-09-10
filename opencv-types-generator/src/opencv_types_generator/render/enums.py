"""Render a compound's public enums as top-level `const`s.

Fix vs. mirada (#5): a class-scoped enum's runtime constant name is the literal
`bindings.cpp` registration string (`AgastFeatureDetector_AGAST_5_8`), confirmed against
the real sample - not something we need to reconstruct: it's exactly
`f"{class_js_name}_{enum_value_name}"`. mirada instead tried to rebuild this prefix from
doxygen data alone and never quite got it right (see its README's open TODO on this exact
bug). Free/group-scope enum constants (`LINE_8`, `NORM_L1`, ...) are registered unprefixed
and match doxygen's own enum value name directly - no prefixing needed there.
"""
from __future__ import annotations

from ..doxygen_schema import CompoundDef, PublicType
from .identifiers import is_valid_id
from .jsdoc import to_jsdoc


def render_class_enums(compound: CompoundDef, class_js_name: str) -> tuple[str, set[str]]:
    """Returns (rendered .d.ts source, set of emitted constant names) for every enum
    declared directly on `compound`, prefixed with `class_js_name`."""
    chunks: list[str] = []
    emitted: set[str] = set()
    for enum in compound.public_types:
        if enum.kind != "enum":
            continue
        type_name = f"{class_js_name}_{enum.name}" if enum.name else None
        if type_name and is_valid_id(enum.name):
            chunks.append(f"export type {type_name} = number")
        for value in enum.enum_values:
            if not is_valid_id(value.name):
                continue
            const_name = f"{class_js_name}_{value.name}"
            emitted.add(const_name)
            doc = to_jsdoc(value)
            ts_type = type_name or "number"
            chunks.append(f"{doc}\nexport declare const {const_name}: {ts_type}".strip())
    return "\n\n".join(chunks), emitted


def render_group_enum_constants(
    compound: CompoundDef, registered_constant_names: set[str]
) -> tuple[str, set[str]]:
    """Free/group-scope enums: only emit constants opencv.js actually registered
    (`registered_constant_names`, from parse_bindings_cpp) - keeps the surface limited to
    what's really callable at runtime instead of every constant doxygen happens to
    document for that group."""
    chunks: list[str] = []
    emitted: set[str] = set()
    for enum in compound.public_types:
        if enum.kind != "enum":
            continue
        for value in enum.enum_values:
            if not is_valid_id(value.name) or value.name not in registered_constant_names:
                continue
            emitted.add(value.name)
            doc = to_jsdoc(value)
            chunks.append(f"{doc}\nexport declare const {value.name}: number".strip())
    return "\n\n".join(chunks), emitted


def render_group_defines(
    compound: CompoundDef, registered_constant_names: set[str]
) -> tuple[str, set[str]]:
    """`#define` macro constants (CV_8UC1, CV_32FC3, ...) - opencv.js registers these via
    `constant()` exactly like enum values, so the same registered-name filter applies."""
    chunks: list[str] = []
    emitted: set[str] = set()
    for define in compound.defines:
        if not is_valid_id(define.name) or define.name not in registered_constant_names:
            continue
        emitted.add(define.name)
        doc = to_jsdoc(define)
        chunks.append(f"{doc}\nexport declare const {define.name}: number".strip())
    return "\n\n".join(chunks), emitted
