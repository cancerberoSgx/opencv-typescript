"""Identifier + inheritance resolution - see parse_bindings_cpp.py's module docstring for
the rationale (fixes #1 and #2 vs. mirada/doxygen2typescript)."""
from __future__ import annotations

import re

from ..doxygen_schema import CompoundDef

_INVALID_ID_CHARS_RE = re.compile(r"[^a-zA-Z0-9_]")
_VALID_ID_RE = re.compile(r"[A-Za-z0-9_]+")
_TEMPLATE_ARGS_RE = re.compile(r"<.*>")

# Classes where the JS/embind runtime shape has no equivalent in the real C++ hierarchy
# (Algorithm has no C++ base; Mat/MatExpr's JS-visible "base" is a hand-authored helper
# type, not a real OpenCV class) - confirmed against the real sample bindings.cpp: none of
# these three have a `base<...>` clause on their `emscripten::class_<...>` registration.
# Keep this table tiny: everything resolvable from bindings.cpp or doxygen data should be,
# so this only covers what genuinely can't be.
RUNTIME_ONLY_BASES: dict[str, str] = {
    "Mat": "Mat_",
    "MatExpr": "Mat",
    "Algorithm": "EmscriptenEmbindInstance",
}

# Members whose doxygen-derived (C++-shaped) signature conflicts with the JS-friendly
# shape a hacks/*.d.ts file already gives the same name via inheritance - e.g. C++
# `Mat::data` is a raw pointer (renders as `number`), but opencv.js actually exposes it as
# a `Uint8Array` view (hacks/mat.d.ts's `Mat_.data`); C++'s `Mat::size` is a callable
# struct field, but `Mat_` inherits `Vector<Mat>.size(): number`. Doxygen's version loses
# to the hack's in these cases, same idea as mirada's exportsHacks.ts#fixClasses, kept
# equally small and equally explicit about *why* each entry exists.
HACK_OVERRIDDEN_MEMBERS: dict[str, set[str]] = {
    "Mat": {"data", "size", "clone"},
}


def normalize_id(s: str) -> str:
    return _INVALID_ID_CHARS_RE.sub("_", s)


def is_valid_id(s: str | None) -> bool:
    return bool(s) and bool(_VALID_ID_RE.fullmatch(s.strip()))


def strip_template_args(s: str) -> str:
    return _TEMPLATE_ARGS_RE.sub("", s).strip()


def resolve_base_class_name(
    js_name: str,
    compound: CompoundDef,
    base_cpp_type: str | None,
    cpp_type_to_js_name: dict[str, str],
) -> str | None:
    """Resolve `js_name`'s TS base class, trying (in order):

    1. `bindings.cpp`'s own `base<X>` clause on this class's registration - the actual
       JS/embind runtime base, resolved via the cpp-type -> js-name map. `X` is written
       relative to `using namespace cv;`, so try both the raw and `cv::`-qualified form.
    2. doxygen's `<basecompoundref>` (first entry only - TS has no multiple inheritance),
       resolved the same way.
    3. The small manual override table for JS-only synthetic bases.
    """
    if base_cpp_type:
        for candidate in (base_cpp_type, f"cv::{base_cpp_type}"):
            resolved = cpp_type_to_js_name.get(candidate)
            if resolved:
                return resolved

    for ref in compound.basecompoundref[:1]:
        cpp_type = strip_template_args(ref.text)
        resolved = cpp_type_to_js_name.get(cpp_type)
        if resolved and resolved != js_name:
            return resolved

    return RUNTIME_ONLY_BASES.get(js_name)
