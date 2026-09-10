"""Primitive C++ -> TS type mapping, applied at render time.

Fix vs. mirada: mirada emits doxygen's raw type name verbatim and only patches unresolved
primitives afterwards by compiling the output and pattern-matching tsc's "no exported
member" diagnostics (fixMissingImports in render/exports.ts). Applying a static table here,
while we still have the full AST context, means the renderer never emits a reference it
doesn't already know how to resolve.
"""
from __future__ import annotations

import re

from ..doxygen_schema import LinkedText, Param
from .identifiers import is_valid_id

CPP_PRIMITIVE_TO_TS: dict[str, str] = {
    "int": "number", "float": "number", "double": "number", "size_t": "number",
    "uchar": "number", "schar": "number", "ushort": "number", "short": "number",
    "long": "number", "int64": "number", "uint64": "number", "unsigned": "number",
    "char": "number", "void": "void",
    "bool": "boolean",
}

# The only generic shape parse_doxygen.py itself ever produces (its std::vector handling).
# Any *other* non-bare-identifier type name reaching here is raw, un-translated C++ syntax
# doxygen reported verbatim (template types like `const std::initializer_list< _Tp >`,
# pointer/reference qualifiers, etc.) - not valid TS, and not safe to pass through.
_VECTOR_TYPE_RE = re.compile(r"Vector<.*>")

# A bare template-parameter name (`_Tp`, `_Ty`, ...) is a valid bare identifier by
# is_valid_id's character-class check alone, so it would otherwise pass straight through as
# if it were a real type name. render/identifiers.py#is_templated already excludes every
# member/function this could come from at the source, but this stays as a second, cheap
# line of defense: this identifier shape (leading underscore + capital letter) is the
# consistent STL/OpenCV template-parameter naming convention and is never a real emitted
# type name here, so it's still not safe to pass through even if it somehow reaches this
# far.
_TEMPLATE_PARAM_RE = re.compile(r"_[A-Z]\w*")


def render_type(t: LinkedText) -> str:
    if t is None or not t.name:
        return "any"
    name = t.name
    if is_valid_id(name) and not _TEMPLATE_PARAM_RE.fullmatch(name):
        return CPP_PRIMITIVE_TO_TS.get(name, name)
    if _VECTOR_TYPE_RE.fullmatch(name):
        return name
    return "any"


def render_param(p: Param) -> str:
    optional = "?" if p.defval else ""
    return f"{p.name}{optional}: {render_type(p.type)}"
