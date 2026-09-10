"""Parse opencv.js's generated `bindings.cpp` and match its embind registrations
against a doxygen `index.xml`.

This is the module where the two structural fixes vs. mirada/doxygen2typescript live:

1. **Classes are matched to their doxygen compound by fully-qualified C++ type, not by a
   lucky constructor-member-name coincidence.** `bindings.cpp` registers each class as
   `emscripten::class_<cv::dnn::Net>("dnn_Net")` — a fully-qualified C++ type (`cv::dnn::Net`)
   paired with the flattened runtime name (`dnn_Net`). mirada's original matcher instead
   searched the whole doxygen index for any `<name>` node whose *text* equals the runtime
   name (`"dnn_Net"`) - which only ever accidentally works when a class has a same-named
   constructor member (`Mat()` inside class `Mat`), and silently fails for any
   namespace-flattened registration like `dnn_Net`/`ml_SVM` (there is no doxygen member
   literally named `dnn_Net`). Matching by C++ type against the compound-level `<name>`
   (doxygen's `<compound kind="class"><name>cv::dnn::Net</name>`) is exact and robust.

2. **Inheritance prefers `bindings.cpp`'s own `base<X>` clause** (e.g.
   `emscripten::class_<cv::BackgroundSubtractorMOG2, base<BackgroundSubtractor>>(...)`),
   which is the actual JS/embind runtime base - resolved to its registered name via the
   cpp-type -> js-name map built here. See render/identifiers.py for the full fallback
   chain (bindings.cpp base<> -> doxygen basecompoundref -> manual override).

Free functions and constants keep mirada's original matching strategy (exact text match
of a member-level `<name>` within a non-namespace/non-file compound) - validated against
a real bindings.cpp/index.xml pair: free functions and `#define` constants doxygen files
under `@defgroup` compounds, and their doxygen name already equals the registration name.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

from lxml import etree

# `.function("elemSize", ...)` (a *member* function inside a class_<> chain) must NOT
# match here - it's preceded by `.`, not whitespace, so `\s+function\(` correctly skips it
# and only matches top-level free `function("name", ...)` registrations.
_FUNCTION_RE = re.compile(r'\s+function\s*\(\s*"([^"]+)"')
_CONSTANT_RE = re.compile(r'\s+constant\s*\(\s*"([^"]+)"')
# Captures: (1) the class's fully-qualified C++ type, (2) its base<>'s C++ type if any
# (only the first, if `base<X,Y>` ever appears - TS only supports single inheritance
# anyway), (3) the runtime-registered JS name.
_CLASS_RE = re.compile(
    r'emscripten::class_<\s*([\w:]+)\s*'
    r'(?:,\s*base<\s*([\w:]+)(?:\s*,\s*[\w:]+)*\s*>)?\s*>'
    r'\s*\(\s*"([^"]+)"\s*\)'
)


@dataclass
class ClassRegistration:
    js_name: str
    cpp_type: str
    base_cpp_type: str | None = None


@dataclass
class BindingsCppParsed:
    functions: list[str] = field(default_factory=list)
    classes: list[ClassRegistration] = field(default_factory=list)
    constants: list[str] = field(default_factory=list)


def parse_bindings_cpp(code: str) -> BindingsCppParsed:
    functions = sorted({m.group(1) for m in _FUNCTION_RE.finditer(code) if m.group(1)})
    constants = sorted({m.group(1) for m in _CONSTANT_RE.finditer(code) if m.group(1)})
    classes_by_name: dict[str, ClassRegistration] = {}
    for m in _CLASS_RE.finditer(code):
        cpp_type, base_cpp_type, js_name = m.group(1), m.group(2), m.group(3)
        if js_name:
            classes_by_name[js_name] = ClassRegistration(js_name, cpp_type, base_cpp_type)
    classes = [classes_by_name[k] for k in sorted(classes_by_name)]
    return BindingsCppParsed(functions=functions, classes=classes, constants=constants)


# ---------------------------------------------------------------------------
# matching against doxygen's index.xml
# ---------------------------------------------------------------------------

_NON_TYPE_COMPOUND_KINDS = {"namespace", "file"}


@dataclass
class MatchedClass:
    js_name: str
    cpp_type: str
    base_cpp_type: str | None
    compound_refid: str
    compound_kind: str


@dataclass
class MatchedMember:
    name: str
    member_refid: str
    compound_refid: str
    compound_kind: str


@dataclass
class UnmatchedNames:
    classes: list[str] = field(default_factory=list)
    functions: list[str] = field(default_factory=list)
    constants: list[str] = field(default_factory=list)

    def total(self) -> int:
        return len(self.classes) + len(self.functions) + len(self.constants)


@dataclass
class MatchedBindings:
    classes: list[MatchedClass]
    functions: list[MatchedMember]
    constants: list[MatchedMember]
    unmatched: UnmatchedNames
    # fully-qualified C++ type -> runtime-registered JS name, for every *matched* class.
    # Used to resolve both bindings.cpp's `base<X>` and doxygen's `<basecompoundref>` to a
    # real emitted identifier (fix #2).
    cpp_type_to_js_name: dict[str, str]


def match_bindings_cpp(parsed: BindingsCppParsed, index_xml_path: str) -> MatchedBindings:
    tree = etree.parse(index_xml_path, parser=etree.XMLParser(huge_tree=True))
    root = tree.getroot()

    class_compounds: dict[str, list] = {}
    member_index: dict[str, list[tuple]] = {}
    for compound in root.findall("compound"):
        kind = compound.get("kind", "")
        name_el = compound.find("name")
        name = (name_el.text or "").strip() if name_el is not None else ""
        if kind in ("class", "struct") and name:
            class_compounds.setdefault(name, []).append(compound)
        if kind not in _NON_TYPE_COMPOUND_KINDS:
            for member in compound.findall("member"):
                mname_el = member.find("name")
                mname = (mname_el.text or "").strip() if mname_el is not None else ""
                if mname:
                    member_index.setdefault(mname, []).append((member, compound))

    matched_classes: list[MatchedClass] = []
    unmatched_classes: list[str] = []
    cpp_type_to_js_name: dict[str, str] = {}
    for reg in parsed.classes:
        compounds = class_compounds.get(reg.cpp_type)
        if not compounds:
            unmatched_classes.append(reg.js_name)
            continue
        compound = compounds[0]
        matched_classes.append(
            MatchedClass(
                js_name=reg.js_name,
                cpp_type=reg.cpp_type,
                base_cpp_type=reg.base_cpp_type,
                compound_refid=compound.get("refid", ""),
                compound_kind=compound.get("kind", ""),
            )
        )
        cpp_type_to_js_name[reg.cpp_type] = reg.js_name

    def match_members(names: list[str]) -> tuple[list[MatchedMember], list[str]]:
        matched: list[MatchedMember] = []
        unmatched: list[str] = []
        for name in names:
            candidates = member_index.get(name)
            if not candidates:
                unmatched.append(name)
                continue
            member, compound = candidates[0]
            matched.append(
                MatchedMember(
                    name=name,
                    member_refid=member.get("refid", ""),
                    compound_refid=compound.get("refid", ""),
                    compound_kind=compound.get("kind", ""),
                )
            )
        return matched, unmatched

    matched_functions, unmatched_functions = match_members(parsed.functions)
    matched_constants, unmatched_constants = match_members(parsed.constants)

    return MatchedBindings(
        classes=matched_classes,
        functions=matched_functions,
        constants=matched_constants,
        unmatched=UnmatchedNames(
            classes=unmatched_classes,
            functions=unmatched_functions,
            constants=unmatched_constants,
        ),
        cpp_type_to_js_name=cpp_type_to_js_name,
    )


def compound_xml_path(doc_xml_dir: str, refid: str) -> str:
    return str(Path(doc_xml_dir) / f"{refid}.xml")
