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
    # <cstdint>'s fixed-width typedefs - distinct spellings from OpenCV's own int64/uint64
    # above, used directly by some (previously never generated, now BIND_ALL-exposed)
    # functions, e.g. FileStorage::write(const String&, int64_t).
    "int8_t": "number", "uint8_t": "number", "int16_t": "number", "uint16_t": "number",
    "int32_t": "number", "uint32_t": "number", "int64_t": "number", "uint64_t": "number",
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

# Cache of _bare_name_to_js_name's result, keyed by id(cpp_type_to_js_name) - it's the same
# dict, built once in parse_bindings_cpp.py, reused for every render_type() call across a
# whole run; no need to rebuild the reverse index every time.
_BARE_NAME_CACHE: dict[int, dict[str, str]] = {}


def _bare_name_to_js_name(cpp_type_to_js_name: dict[str, str]) -> dict[str, str]:
    """A type reference doxygen renders is its bare (unqualified) name (e.g. "Net" for
    `cv::dnn::Net`, from `<ref>Net</ref>` - doxygen's *display* text, not its fully-qualified
    one) - `cpp_type_to_js_name` is keyed by the fully-qualified C++ name instead
    ("cv::dnn::Net"), so a direct lookup by `t.name` alone never hits. This builds the
    reverse index (bare name -> js_name) via each key's last `::`-segment, but - like
    opencv-compiler's analogous `_bare_name_fallback_map` - only for bare names with exactly
    one candidate: many classes have their own nested "Params", for instance, and a bare
    "Params" has no single correct resolution.
    """
    cached = _BARE_NAME_CACHE.get(id(cpp_type_to_js_name))
    if cached is not None:
        return cached
    candidates: dict[str, set[str]] = {}
    for cpp_type, js_name in cpp_type_to_js_name.items():
        bare = cpp_type.rsplit("::", 1)[-1]
        candidates.setdefault(bare, set()).add(js_name)
    result = {bare: next(iter(names)) for bare, names in candidates.items() if len(names) == 1}
    _BARE_NAME_CACHE[id(cpp_type_to_js_name)] = result
    return result


def render_type(t: LinkedText, cpp_type_to_js_name: dict[str, str] | None = None) -> str:
    if t is None or not t.name:
        return "any"
    name = t.name
    if is_valid_id(name) and not _TEMPLATE_PARAM_RE.fullmatch(name):
        if name in CPP_PRIMITIVE_TO_TS:
            return CPP_PRIMITIVE_TO_TS[name]
        if cpp_type_to_js_name:
            resolved = _bare_name_to_js_name(cpp_type_to_js_name).get(name)
            if resolved:
                return resolved
        return name
    if _VECTOR_TYPE_RE.fullmatch(name):
        return name
    return "any"


def render_param(p: Param, cpp_type_to_js_name: dict[str, str] | None = None) -> str:
    optional = "?" if p.defval else ""
    return f"{p.name}{optional}: {render_type(p.type, cpp_type_to_js_name)}"
