"""Render a doxygen `@defgroup` compound: free functions + free (unprefixed) enum
constants, filtered to only what opencv.js actually registered in bindings.cpp - and, for
functions, to non-templates only (see identifiers.py#is_templated: bindings.cpp matches by
name alone, so a bound concrete overload and an unrelated, never-bound template overload of
the same free function can both otherwise look "registered")."""
from __future__ import annotations

from ..doxygen_schema import CompoundDef, Member
from .enums import render_group_defines, render_group_enum_constants
from .identifiers import is_templated, is_valid_id
from .jsdoc import jsdoc_function, to_jsdoc
from .types import render_param, render_type


def _render_function(f: Member) -> str:
    params = ", ".join(render_param(p) for p in f.params)
    ret = f": {render_type(f.type)}"
    doc = jsdoc_function(f)
    sig = f"export declare function {f.name}({params}){ret}"
    return f"{doc}\n{sig}" if doc else sig


def render_group(
    compound: CompoundDef, registered_function_names: set[str], registered_constant_names: set[str]
) -> tuple[str, set[str], set[str]]:
    """Returns (rendered .d.ts source, emitted function names, emitted constant names)."""
    functions = [
        f
        for f in compound.functions
        if is_valid_id(f.name) and f.name in registered_function_names and not is_templated(f)
    ]
    functions_src = "\n\n".join(_render_function(f) for f in functions)
    enums_src, emitted_enum_constants = render_group_enum_constants(compound, registered_constant_names)
    defines_src, emitted_defines = render_group_defines(compound, registered_constant_names)
    emitted_constants = emitted_enum_constants | emitted_defines

    header = to_jsdoc(compound) or f"/* @defgroup {compound.title or compound.compoundname} */"
    parts = [p for p in (header, functions_src, enums_src, defines_src) if p]
    return "\n\n".join(parts), {f.name for f in functions}, emitted_constants
