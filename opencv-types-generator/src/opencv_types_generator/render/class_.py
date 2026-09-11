from __future__ import annotations

import re

from ..doxygen_schema import CompoundDef, Member
from .enums import render_class_enums
from .identifiers import (
    HACK_OVERRIDDEN_MEMBERS,
    INHERITED_ONLY_MEMBERS,
    STATIC_SIDE_INCOMPATIBLE_SUBCLASSES,
    is_templated,
    is_valid_id,
    resolve_base_class_name,
)
from .jsdoc import jsdoc_function, to_jsdoc
from .types import render_param, render_type

_OPERATOR_RE = re.compile(r"^operator[^a-zA-Z0-9_]")


def _valid_attr(m: Member, class_js_name: str) -> bool:
    if m.name in HACK_OVERRIDDEN_MEMBERS.get(class_js_name, ()):
        return False
    return is_valid_id(m.name) and not is_templated(m)


def _valid_method(m: Member, class_js_name: str) -> bool:
    if m.name in HACK_OVERRIDDEN_MEMBERS.get(class_js_name, ()):
        return False
    if m.name in INHERITED_ONLY_MEMBERS.get(class_js_name, ()):
        return False
    return (
        is_valid_id(m.name)
        and not m.name.startswith("~")
        and not _OPERATOR_RE.match(m.name)
        and not is_templated(m)
    )


def _render_method(
    f: Member, class_js_name: str, class_bare_name: str, cpp_type_to_js_name: dict[str, str]
) -> str:
    name = "constructor" if f.name == class_bare_name else f.name
    prot = "private" if f.prot == "package" else f.prot
    static = "static " if f.static == "yes" else ""
    params = ", ".join(render_param(p, cpp_type_to_js_name) for p in f.params)
    ret = "" if name == "constructor" else f": {render_type(f.type, cpp_type_to_js_name)}"
    doc = jsdoc_function(f)
    sig = f"  {prot} {static}{name}({params}){ret}"
    return f"{doc}\n{sig}" if doc else sig


def _render_attr(
    f: Member, class_js_name: str, class_bare_name: str, cpp_type_to_js_name: dict[str, str]
) -> str:
    name = "constructor" if f.name == class_bare_name else f.name
    prot = "private" if f.prot == "package" else f.prot
    static = "static " if f.static == "yes" else ""
    doc = to_jsdoc(f)
    sig = f"  {prot} {static}{name}: {render_type(f.type, cpp_type_to_js_name)}"
    return f"{doc}\n{sig}" if doc else sig


def render_compound_class(
    compound: CompoundDef,
    class_js_name: str,
    base_cpp_type: str | None,
    cpp_type_to_js_name: dict[str, str],
) -> tuple[str, set[str]]:
    """Returns (rendered .d.ts source, set of emitted enum-constant names) - the latter
    feeds the generation report's unmatched-constants reconciliation, see pipeline.py."""
    base_name = resolve_base_class_name(class_js_name, compound, base_cpp_type, cpp_type_to_js_name)
    # See STATIC_SIDE_INCOMPATIBLE_SUBCLASSES: these get the base's instance members via a
    # merged `interface`, not `class ... extends`, so their own conflicting static member
    # doesn't have to satisfy TypeScript's static-side inheritance check.
    instance_only_base = class_js_name in STATIC_SIDE_INCOMPATIBLE_SUBCLASSES
    extends = f" extends {base_name}" if base_name and not instance_only_base else ""

    # The doxygen-documented constructor member is named after the class's own *bare* C++
    # name (e.g. "Net"), not its flattened embind name (e.g. "dnn_Net" - only equal to the
    # bare name for classes with no namespace prefix), so a namespace-nested class's own
    # constructor was never actually recognized as one, and rendered as a same-named,
    # any-returning method instead of a real `constructor(...)`.
    class_bare_name = compound.compoundname.rsplit("::", 1)[-1] if compound.compoundname else class_js_name

    attrs = "\n\n".join(
        _render_attr(f, class_js_name, class_bare_name, cpp_type_to_js_name)
        for f in compound.public_attribs
        if _valid_attr(f, class_js_name)
    )
    methods = "\n\n".join(
        _render_method(f, class_js_name, class_bare_name, cpp_type_to_js_name)
        for f in compound.public_funcs
        if _valid_method(f, class_js_name)
    )
    body = "\n\n".join(part for part in (attrs, methods) if part)

    header = to_jsdoc(compound)
    class_decl = f"export declare class {class_js_name}{extends} {{\n{body}\n}}"
    if base_name and instance_only_base:
        class_decl += f"\n\nexport declare interface {class_js_name} extends {base_name} {{}}"
    enums_src, enum_names = render_class_enums(compound, class_js_name)

    parts = [p for p in (header, class_decl) if p]
    source = "\n".join(parts)
    if enums_src:
        source = f"{source}\n\n{enums_src}"
    return source, enum_names
