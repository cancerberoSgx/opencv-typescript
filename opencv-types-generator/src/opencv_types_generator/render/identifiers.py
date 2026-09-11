"""Identifier + inheritance resolution - see parse_bindings_cpp.py's module docstring for
the rationale (fixes #1 and #2 vs. mirada/doxygen2typescript)."""
from __future__ import annotations

import re

from ..doxygen_schema import CompoundDef, Member

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

# Classes whose own doxygen-documented override of a specific base-class method is *valid*
# real C++ (a derived class overriding one virtual overload of a multi-overload base member
# - e.g. cv::Algorithm/DescriptorMatcher's `read`/`write` have both a virtual
# `(const FileNode&)` overload and a separate, non-virtual `(const String&)` convenience
# wrapper that opens the file and calls the virtual one; a subclass overriding only the
# virtual one is unremarkable in C++) but rejected by TypeScript's structural method-override
# check (TS2416: the override doesn't cover every call shape the base's declares). Dropping
# the subclass's own (narrower) declaration and leaving it to inherit the base's (wider) one
# is always safe here: embind's actual runtime dispatch doesn't care about compile-time
# overload sets, and the base's declared shape is a superset of what the subclass's own
# override actually is - the same idea as HACK_OVERRIDDEN_MEMBERS above, for a different
# reason (a real inheritance incompatibility, not a better hand-written alternative).
INHERITED_ONLY_MEMBERS: dict[str, set[str]] = {
    "FlannBasedMatcher": {"read", "write"},
}

# Classes whose own doxygen-documented static member(s) genuinely collide, by name, with a
# same-named static already declared on their real base class, with an incompatible
# signature (e.g. `BFMatcher.create(normType?, crossCheck?)` vs.
# `DescriptorMatcher.create(matcherType)`) - legal in C++ (static member functions aren't
# virtual/overridden there, so an unrelated same-named static in a subclass is unremarkable)
# but rejected by TypeScript's class declaration, which checks a derived class's static
# side against its base's (TS2417). These still need the base's *instance* members, so
# render_compound_class gives them those via a merged `interface X extends Base {}`
# instead of `class X extends Base` - interface extends only ever affects instance shape,
# so it sidesteps the static-side check entirely while leaving the class's own (real,
# doxygen-documented) static member exactly as generated.
STATIC_SIDE_INCOMPATIBLE_SUBCLASSES: frozenset[str] = frozenset({"BFMatcher"})


def is_templated(m: Member) -> bool:
    """True for a member-template (e.g. `template<typename _Tp> Mat(const std::vector<_Tp>&
    ...)`) - embind can only ever bind a concrete, non-template function pointer, so a
    templated member is never what opencv.js's bindings.cpp actually exposes, regardless of
    whether its own name happens to appear there (bindings.cpp matches free functions by
    name only - see parse_bindings_cpp.py - so an unrelated non-template overload of the
    same name can still be genuinely bound). Rendering these anyway would leak the raw,
    unresolved template parameter name (`_Tp`) as if it were a real type."""
    return bool(m.templateparamlist)


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
