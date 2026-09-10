# Architecture

## Pipeline

```
bindings.cpp ──(regex)──> registrations{classes, functions, constants}
                            classes carry: registered JS name, fully-qualified C++ type,
                            and (if present) the base<X> C++ type from their own
                            emscripten::class_<T, base<X>>(...) registration.
index.xml ──(match)──────> a doxygen compound refid per registration
                            - classes matched by fully-qualified C++ type against the
                              compound-level <name> (exact, robust - see "Fix #1" below)
                            - functions/constants matched by member-level <name> text
                              within any non-namespace/non-file compound
                            - anything that fails to match is *recorded*, not dropped
                (parallel: one worker process per matched compound, via
                 concurrent.futures.ProcessPoolExecutor - pipeline.py)
                │
                ▼
compound's own .xml ──parse──> CompoundDef (doxygen_schema.py, parse_doxygen.py)
                │
                ▼
render/* ──> .d.ts text per class / per @defgroup (render/class_.py, render/group.py)
                │
                ▼ (package_emitter.py, single-threaded - needs the full symbol table)
link_imports.py: auto-inject `import type { ... }` per generated file, based on a
  global export-name -> module-path index built from every rendered file plus every
  hand-maintained hacks/*.d.ts file. Anything referenced but neither ours nor a known
  DOM/ES global gets stubbed to `any` in generated/_unresolved.d.ts (C++-only template/
  internal types opencv.js never binds, e.g. `Matx`, `Point_`, `MatIterator_`).
                │
                ▼
full npm project: package.json, tsconfig.json, index.d.ts (ambient global `cv`),
  opencv.js.d.ts (module augmentation), generated/*.d.ts, hacks/*.d.ts,
  generation-report.json, smoke-test/ (a real .ts file, type-checked as a publish gate).
```

## Two structural fixes vs. mirada/doxygen2typescript

Validated against real opencv.js build artifacts (`tests/fixtures/bindings.sample.cpp`,
`index.sample.xml` - not synthetic).

**1. Identifiers come from the literal `bindings.cpp` registration string, not doxygen's
stripped leaf name - and classes are *matched* by fully-qualified C++ type, not by a
same-named-constructor coincidence.**

`bindings.cpp` registers each class as `emscripten::class_<cv::dnn::Net>("dnn_Net")` - a
fully-qualified C++ type paired with the runtime-flattened name. mirada's original matcher
searched the whole doxygen index for any `<name>` node whose *text* equals the runtime name
(`"dnn_Net"`), which only ever works by luck when a class happens to have a same-named
constructor member (`Mat()` inside class `Mat` - doxygen never has a member literally named
`dnn_Net`, so that class silently vanished from mirada's output). Here, classes are matched
by fully-qualified C++ type against doxygen's compound-level `<name>` (`cv::dnn::Net`) -
exact and robust; see `parse_bindings_cpp.py`'s module docstring and
`test_parse_bindings_cpp.py::test_matches_real_sample_bindings_and_index` (0 unmatched
classes against the real sample, `dnn_Net` included).

**2. Inheritance prefers `bindings.cpp`'s own `base<X>` clause over doxygen's
`basecompoundref`.**

`emscripten::class_<cv::BackgroundSubtractorMOG2, base<BackgroundSubtractor>>(...)` - the
`base<X>` template argument is the actual JS/embind runtime base. Captured alongside each
class's own fully-qualified C++ type, it resolves directly via a `cpp_type -> js_name` map
with no doxygen lookup needed - runtime ground truth, not compile-time structure. Fallback
order (`render/identifiers.py#resolve_base_class_name`): bindings.cpp `base<X>` -> doxygen
`basecompoundref` -> a 3-entry manual override for the only classes with no real C++ base
at all (`Mat`, `MatExpr`, `Algorithm` - JS-only synthetic bases).

Three smaller, related fixes: (3) primitive C++->TS types are a static table applied at
render time (`render/types.py`), not reverse-engineered later from compiler diagnostics;
(4) every unmatched `bindings.cpp` registration is recorded in `generation-report.json`,
never silently dropped; (5) class-scoped enum constants use the literal
`bindings.cpp`-registered prefixed name (`AgastFeatureDetector_AGAST_5_8`) directly, instead
of reconstructing a prefix from doxygen data.

## Known limitations (v1)

- **Member-level filtering only applies to free functions/constants, not class methods.**
  A matched class renders *every* `public-func`/`public-attrib` doxygen gives it, not just
  the subset actually bound in its `bindings.cpp` `class_<T>(...).function(...)` chain
  (mirada's own long-standing TODO: "don't expose all class members but only those declared
  in bindings.cpp"). Free/group-scope functions and constants *are* filtered this way
  (`render/group.py`).
- **`std::vector<T>` collapses to `Vector<any>`** (`parse_doxygen.py#_get_type`) - the
  element type isn't extracted yet.
- **`HACK_OVERRIDDEN_MEMBERS`** (`render/identifiers.py`) is a small, manually-discovered
  table of doxygen-rendered members that conflict with a hack-defined member of the same
  name (currently just `Mat.data`/`Mat.size`/`Mat.clone`, found by actually type-checking
  the mini e2e fixture). Expect to grow this once a real, full opencv build is generated -
  the `generation-report.json` + a failing `smoke-test` compile are how you'll find the
  next one.
- **jsdoc conversion** (`render/jsdoc.py`) is a pragmatic doxygen-XML -> text walker, not a
  full markdown renderer - code samples inside `<programlisting>` lose their original line
  breaks.
