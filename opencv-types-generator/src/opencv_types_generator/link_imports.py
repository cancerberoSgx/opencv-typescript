"""Auto-inject `import type` statements into generated (never hand-written) `.d.ts` files.

Each class/group is rendered independently (render/main.py, parallelized) with no
knowledge of where the types it mentions (`Size`, `Scalar`, `MatExpr`, another generated
class, ...) actually live - deliberately, so rendering stays a pure, parallel, per-compound
function. This module closes that gap in one place, once all files are known: for every
generated file, find which of its referenced identifiers are actually one of *our* exported
symbols (from another generated file or a hacks/*.d.ts file) and prepend the matching
`import type { ... } from '...'` line(s). Anything not one of ours (`Array`, `HTMLElement`,
`Uint8Array`, ...) is deliberately left alone - it must resolve against the ambient
DOM/ES lib globals, which is correct.

This is a regex-based heuristic, not a real TS parser (no compiler is invoked here - the
whole point of this project is a fast, pure-Python, no-Node-toolchain-required pipeline).
It is intentionally conservative: it only ever *adds* imports for identifiers matched
against a name we know we export; it never removes or rewrites anything else in the file.
"""
from __future__ import annotations

import re

_EXPORT_NAME_RE = re.compile(
    r"export\s+declare\s+class\s+(\w+)"
    r"|export\s+declare\s+function\s+(\w+)"
    r"|export\s+declare\s+const\s+(\w+)"
    r"|export\s+type\s+(\w+)"
    r"|export\s*\{\s*\w+\s+as\s+(\w+)\s*\}"
    r"|export\s*\{\s*(\w+)\s*\}"
)

# opencv/C++ type names are consistently TitleCase (Mat, Scalar, MatExpr, InputArray, ...),
# same convention JS/TS built-ins and DOM types happen to share - which is exactly why this
# stays a candidate filter, not a decision: only names present in `export_index` (i.e.
# genuinely ours) ever get imported.
_IDENTIFIER_RE = re.compile(r"\b[A-Z][A-Za-z0-9_]*\b")
_JSDOC_COMMENT_RE = re.compile(r"/\*\*.*?\*/", re.DOTALL)


def _strip_comments(content: str) -> str:
    """Real type references only ever appear in actual code positions (signatures, type
    aliases) - never inside a jsdoc comment's prose/code-sample text. Stripping comments
    before scanning for identifiers keeps both import-injection and the unresolved-types
    report free of words like "Because"/"GaussianBlur" that a docstring merely mentions."""
    return _JSDOC_COMMENT_RE.sub("", content)


def extract_exported_names(content: str) -> set[str]:
    names: set[str] = set()
    for m in _EXPORT_NAME_RE.finditer(content):
        names.update(g for g in m.groups() if g)
    return names


# TS/DOM/ES globals that happen to be TitleCase, like our own type names - never look
# these up in export_index (they wouldn't match anyway) or count them as "unresolved".
KNOWN_GLOBALS = frozenset({
    "Array", "ArrayBuffer", "ArrayBufferView", "Boolean", "Date", "Error", "Function",
    "HTMLCanvasElement", "HTMLElement", "HTMLImageElement", "HTMLVideoElement", "JSON",
    "Map", "Math", "Number", "Object", "Promise", "RegExp", "Set", "String", "Symbol",
    "Uint8Array", "Uint8ClampedArray", "Int8Array", "Uint16Array", "Int16Array",
    "Uint32Array", "Int32Array", "Float32Array", "Float64Array", "WeakMap", "WeakSet",
})


def inject_imports(content: str, own_name: str, export_index: dict[str, str]) -> str:
    # A file never needs to import something it declares itself - both its "headline"
    # symbol (`own_name`, e.g. the class a class-file is named after) and anything else
    # exported alongside it in the same file (e.g. a class's own prefixed enum constants).
    locally_declared = extract_exported_names(content) | {own_name}
    referenced = _IDENTIFIER_RE.findall(_strip_comments(content))
    needed: dict[str, set[str]] = {}
    for name in referenced:
        if name in locally_declared:
            continue
        module = export_index.get(name)
        if module:
            needed.setdefault(module, set()).add(name)
    if not needed:
        return content
    import_lines = [
        f"import type {{ {', '.join(sorted(names))} }} from '{module}';"
        for module, names in sorted(needed.items())
    ]
    return "\n".join(import_lines) + "\n\n" + content


def find_unresolved_types(contents: list[str], export_index: dict[str, str]) -> set[str]:
    """Identifiers referenced across `contents` that are neither one of our own exported
    symbols nor a known TS/DOM global - genuinely un-typed C++-only names (template
    internals like `Matx`/`Point_`/`MatIterator_`, allocator/iterator plumbing, ...) that
    opencv.js itself never binds. Stubbed to `any` by package_emitter rather than left as a
    hard compile error - the same fallback mirada's fixMissingImports reached for, applied
    up front instead of via a post-hoc compiler-diagnostics pass."""
    unresolved: set[str] = set()
    for content in contents:
        locally_declared = extract_exported_names(content)
        for name in _IDENTIFIER_RE.findall(_strip_comments(content)):
            if name not in locally_declared and name not in export_index and name not in KNOWN_GLOBALS:
                unresolved.add(name)
    return unresolved
