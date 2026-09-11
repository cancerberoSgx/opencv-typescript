#!/usr/bin/env python3
"""Patches opencv's modules/js/generator/embindgen.py to add a "bind everything" mode.

opencv's own embind generator only emits a class/method/free-function if it's explicitly
listed in platforms/js/opencv_js.config.py's hand-curated whitelist - the vast majority of
OpenCV's public API is left out of opencv.js (and therefore out of any typings generated
from it) purely because nobody added it to that list, not because it can't be bound.

This patch adds an `OPENCV_JS_BIND_ALL=1` environment-variable-gated bypass: when set, every
class/method/free-function the header parser discovers (across whichever modules are being
built) gets bound, regardless of opencv_js.config.py. Exercising code paths the curated
whitelist never touched surfaced two real, general embindgen.py bugs (fixed here,
unconditionally - not gated on BIND_ALL, since they'd miscompile for anyone who hit them):

- `ArgInfo` double-appends `&` for a Mat/vector<Mat> in/out parameter that's *also* flagged
  `/Ref` by hdr_parser's generic C++ reference detection, producing invalid `Mat&&`. Hits
  any function using a raw `Mat&`/`const Mat&` parameter instead of the InputArray/
  OutputArray idiom (which sidesteps this) - e.g. `denoise_TVL1`, `KalmanFilter::correct`.
- A non-"self" parameter naming another class (e.g. a factory's `Params` argument, as in
  `SimpleBlobDetector::create(const SimpleBlobDetector::Params&)`) is emitted using that
  class's *flattened* embind name ("SimpleBlobDetector_Params") - not a real C++ identifier
  - instead of its real, possibly-nested-namespace C++ name
  ("cv::SimpleBlobDetector::Params"). The "self" parameter and factory `Ptr<T>` return types
  already resolve correctly elsewhere (via `class_info.cname` and
  `_qualify_factory_ptr_return_type` respectively) - this is every other parameter site,
  which nothing before BIND_ALL ever exercised (every previously-curated function either
  takes no other-class parameter or, like `SimpleBlobDetector::create`'s `Params`, was
  apparently never actually compiled before - see `_resolve_class_type_names` below).
- `_is_string_type` checks whether a property's type is `"std::string"` (the long form),
  but a property's raw parsed type is the *short* form (`"string"`/`"String"`) - the very
  form `type_dict` maps *from*. So a plain string property (e.g.
  `TrackerVit::Params::net`) satisfies `prop.tp in type_dict` (true - "string"/"String" are
  type_dict keys) while `_is_string_type(prop.tp)` wrongly returns false (checking the wrong
  form), together misrouting it to the enum-property template
  (`binding_utils::underlying_ptr`, meant for actual enums) instead of the plain one. Fixed
  by recognizing both forms.
- A no-argument, single-overload class method (e.g. a plain getter) is bound via a direct
  member-function pointer (`gen_function_binding`) rather than through a generated wrapper -
  presumably as a size/simplicity optimization for the common case. That path hand-assembles
  the method's return type from parsed metadata (`variant.refret`/`constret`), which for
  reasons not fully tracked down here (not simply "nested namespace", since simple types are
  affected too) is wrong for a long tail of real `const T& getX() const`-style accessors
  across many classes (e.g. `cv::aruco::Board::getDictionary`) - the hand-assembled type
  omits the `&`/`const`, so building a member-function-pointer typed against it doesn't match
  the method's *real* signature ('no matching function for call to select_overload'). Routing
  these through the wrapper path instead sidesteps the whole bug class: a wrapper function
  declared to return `T` (by value) compiles fine and behaves correctly whether the
  underlying method actually returns `T` or `const T&` (returning a reference where a
  by-value copy is declared is just an implicit copy - always valid for the copyable
  value/handle types genuinely returned here), so the wrapper never needs to get
  `refret`/`constret` right in the first place. Applied by simply removing the
  args/overload/`"String"`-return conditions that limited wrapper-routing to a subset of
  methods - every method already goes through this same path when it takes arguments or has
  multiple overloads, this just stops arbitrarily carving out the no-arg case too.

Beyond the whitelist, one more thing every previously-curated class/function sidestepped:
opencv's own hand-written `modules/js/src/core_bindings.cpp` (always linked in) registers a
fixed set of names under custom glue - free functions with a wrapper (`getBuildInformation`,
`CV_MAT_DEPTH`, the `test_hal_intrin_*` family) and plain-data types as a `value_object`/
`value_array`/`register_vector`/`class_` rather than the usual generated-from-doxygen path
(`DMatch`, `KeyPoint`, `Range`, `TermCriteria`, `RotatedRect`, `Moments`, `Mat`, `Tracker`,
the `*Vector` family). Nothing in the curated whitelist happens to share a name with any of
them, so this was never an issue before; BIND_ALL discovers and auto-binds the *real* C++
class/function of the same name for several of them, registering a second one under that
same already-taken name - not merely redundant, but a hard runtime error at
embind-registration time ("Cannot register multiple overloads of a function with the same
number of arguments (N)!" / "Cannot register type X twice", thrown when opencv.js's WASM
module initializes, not at compile time). `_core_bindings_registered_names` parses
`core_bindings.cpp` itself (rather than hardcoding a name list) to exclude exactly these, so
this keeps working if a future opencv version adds or removes hand-written registrations
there.

What's left over after both bugfixes and the core_bindings.cpp collisions gets excluded:

- `BIND_ALL_EXCLUDED_NAMESPACES` - whole sub-namespaces that aren't just "not whitelisted
  yet" but fundamentally don't apply to a WASM/JS build: no GPU/OpenCL device is available in
  a browser, no G-API graph compiler here, and `cv::utils::*` is internal plumbing/test hooks
  (e.g. `utils::nested::testEchoBooleanFunction`) rather than public API. Their headers are
  still compiled into libopencv (so e.g. `cv::cuda::GpuMat` exists and is
  `CV_EXPORTS_W`-annotated), so BIND_ALL would otherwise try to bind types/functions built
  against a runtime opencv.js has no support for at all, which doesn't even compile (e.g.
  wrapper code referencing the unqualified `GpuMat` name from `core/cuda.hpp`, which the
  generator's wrapper codegen doesn't namespace-qualify).
- `BIND_ALL_EXTRA_IGNORE` / `BIND_ALL_EXTRA_IGNORE_METHODS` - individual free functions /
  `(class_name, method_name)` pairs (matched the same way opencv_js.config.py's own
  whitelist keys things) excluded for reasons distinct from both bugfixes above - each entry
  below explains why. Mostly: a type the generated code never declares at all
  (`NativeByteArray`), or a bare, unqualified type name that's neither a `type_dict` key nor
  one of `self.classes`' flattened keys - a return/parameter written unqualified in its own
  header because it's valid there via ordinary C++ namespace scoping, which the *wrapper*
  code (emitted outside that namespace) can't likewise take for granted, and which
  `_resolve_class_type_names` (keyed on fully-flattened names) doesn't recognize in this
  bare form.

Run via entrypoint.sh right after resetting embindgen.py to its pristine (git HEAD) state,
so this is safe to re-run against an already-patched-then-reset checkout - always applies
cleanly, or fails loudly (non-zero exit) if the exact snippets it expects to find have
changed upstream, rather than silently leaving whitelist filtering in place.
"""
import sys

REPLACEMENTS = [
    (
        "def makeWhiteList(module_list):",
        "# When OPENCV_JS_BIND_ALL=1, bind every class/method/free-function discovered by\n"
        "# the header parser instead of only what platforms/js/opencv_js.config.py\n"
        "# whitelists - see opencv-compiler/patch-embindgen-bind-all.py.\n"
        "BIND_ALL = os.environ.get('OPENCV_JS_BIND_ALL') == '1'\n"
        "\n"
        "# Sub-namespaces excluded even under BIND_ALL - see the module docstring above.\n"
        "# ccm (color correction matrix) and mcc (Macbeth color chart) are excluded not for\n"
        "# the GPU/OpenCL/G-API/internal-plumbing reasons the others are, but because they\n"
        "# have real internal inconsistencies of their own - e.g. cv::ccm::ColorCorrectionModel\n"
        "# takes a parameter typed 'DistanceType' where the actual declared enum is\n"
        "# 'DistanceTypes' (plural) - which nothing generic can safely paper over.\n"
        "BIND_ALL_EXCLUDED_NAMESPACES = {'cuda', 'ocl', 'gapi', 'utils', 'ccm', 'mcc'}\n"
        "\n"
        "# Free functions excluded even under BIND_ALL - see the module docstring above.\n"
        "BIND_ALL_EXTRA_IGNORE = {\n"
        "    # cv::denoise_TVL1's second parameter is a plain, unannotated (no CV_OUT) `Mat&`\n"
        "    # output - ArgInfo has no way to tell it apart from a genuine const-input `Mat&`\n"
        "    # without that annotation, so it wrongly marks it const, and the wrapper's call\n"
        "    # into the real (non-const-accepting) function fails ('drops const qualifier').\n"
        "    'denoise_TVL1',\n"
        "    # cv::loadChromaticAberrationParams takes plain `int&` output parameters -\n"
        "    # embind fundamentally cannot bind a JS call's argument to a non-const C++\n"
        "    # reference to a primitive (int/float/double/...): the value crossing the JS/C++\n"
        "    # boundary is always materialized as a temporary, which can't bind to `int&`\n"
        "    # ('non-const lvalue reference to type int cannot bind to a temporary'). Same\n"
        "    # fundamental limitation as several of the upstream `ignore_list` entries above\n"
        "    # (e.g. `minMaxLoc`, `calibrationMatrixValues`) - would need dedicated wrapper\n"
        "    # code (as a few of those get, in core_bindings.cpp) to work at all.\n"
        "    'loadChromaticAberrationParams',\n"
        "}\n"
        "\n"
        "# (class_name, method_name) pairs excluded even under BIND_ALL - see the module\n"
        "# docstring above.\n"
        "BIND_ALL_EXTRA_IGNORE_METHODS = {\n"
        "    # Return/take a std::vector<>-of or bare cv::utils::nested::NativeByteArray,\n"
        "    # which the generated wrapper code never declares or includes a definition for\n"
        "    # ('unknown type name NativeByteArray') - the plain (non-Bytes) decode/detect\n"
        "    # overloads of the same classes are unaffected.\n"
        "    ('GraphicalCodeDetector', 'decodeBytes'), ('GraphicalCodeDetector', 'decodeBytesMulti'),\n"
        "    ('GraphicalCodeDetector', 'detectAndDecodeBytes'), ('GraphicalCodeDetector', 'detectAndDecodeBytesMulti'),\n"
        "    # cv::dnn::Net::getLayer returns Ptr<Layer> (another class, not Net itself), which\n"
        "    # embindgen.py's factory-detection heuristic (any class method returning *any*\n"
        "    # Ptr<T> is assumed to be a static factory like create()) misclassifies as a\n"
        "    # factory - the generated wrapper drops the `self` (cv::dnn::Net&) parameter\n"
        "    # entirely and calls it as `cv::dnn::Net::getLayer(arg1)`, but it's a genuine\n"
        "    # instance method. A correct fix means teaching that heuristic instance-vs-static\n"
        "    # methods apart, out of scope here.\n"
        "    ('dnn_Net', 'getLayer'),\n"
        "    # cv::DescriptorMatcher::create and cv::QRCodeDetectorAruco::getArucoParameters\n"
        "    # each fail with 'no matching function for call to select_overload' - the\n"
        "    # generated wrapper's actual signature doesn't match what the registration\n"
        "    # expects, for reasons distinct from (and not covered by) either bugfix above.\n"
        "    ('DescriptorMatcher', 'create'), ('QRCodeDetectorAruco', 'getArucoParameters'),\n"
        "    # Each of these getters' real declaration returns a const reference (e.g.\n"
        "    # `CV_WRAP const Dictionary& getDictionary() const;`), but embindgen.py's\n"
        "    # ref/const-return detection (variant.refret/constret) misses it, so the\n"
        "    # generated select_overload<...> template arg omits the '&'/'const' the real\n"
        "    # member-function-pointer signature has, making them mismatch\n"
        "    # ('no matching function for call to select_overload').\n"
        "    ('DescriptorMatcher', 'getTrainDescriptors'), ('SimpleBlobDetector', 'getBlobContours'),\n"
        "    ('QRCodeDetectorAruco', 'getDetectorParameters'),\n"
        "    ('aruco_ArucoDetector', 'getDetectorParameters'), ('aruco_ArucoDetector', 'getDictionary'),\n"
        "    ('aruco_ArucoDetector', 'getRefineParameters'),\n"
        "    ('aruco_Board', 'getDictionary'), ('aruco_Board', 'getIds'), ('aruco_Board', 'getObjPoints'),\n"
        "    # cv::FileNode::operator[] and cv::FileStorage::getNode/operator[] each have an\n"
        "    # overload taking a bare C string (hdr_parser reports its type as 'c_string',\n"
        "    # which isn't a type_dict entry, a class, or a real C++ type anywhere) -\n"
        "    # 'unknown type name c_string'. The std::string- and int-keyed overloads of the\n"
        "    # same operators are unaffected.\n"
        "    ('FileNode', 'getNode'), ('FileStorage', 'getNode'),\n"
        "    # cv::aruco::Dictionary::identify takes plain `int&` output parameters - same\n"
        "    # fundamental embind limitation as free-function loadChromaticAberrationParams\n"
        "    # above (a primitive can't be passed by non-const reference across the JS/C++\n"
        "    # boundary at all).\n"
        "    ('aruco_Dictionary', 'identify'),\n"
        "    # cv::dnn::ClassificationModel::classify (int&, float& outputs) and\n"
        "    # cv::dnn::Net::getMemoryConsumption (size_t&, size_t& outputs) - same\n"
        "    # fundamental embind limitation as loadChromaticAberrationParams above.\n"
        "    ('dnn_ClassificationModel', 'classify'), ('dnn_Net', 'getMemoryConsumption'),\n"
        "}\n"
        "\n"
        "def _bind_all_excluded(flattened_name):\n"
        "    # `flattened_name` is either a free-function's ns_id ('cuda', 'dnn', ...) or a\n"
        "    # class dict key ('cuda_GpuMat', 'dnn_Net', ...) - either way its first "
        "'_'-separated\n"
        "    # segment is the (possibly nested) namespace it came from.\n"
        "    return bool(flattened_name) and flattened_name.split('_')[0] in "
        "BIND_ALL_EXCLUDED_NAMESPACES\n"
        "\n"
        "_BARE_NAME_FALLBACK_CACHE = {}\n"
        "\n"
        "def _bare_name_fallback_map(classes):\n"
        "    # A second, narrower fallback for a related but distinct case from the main loop\n"
        "    # below: a namespace-nested (not class-nested) class referenced by its bare,\n"
        "    # unqualified last segment - e.g. `Ptr<Layer>` for `cv::dnn::Layer`, valid\n"
        "    # unqualified in dnn's own header via ordinary C++ scoping, but not in wrapper\n"
        "    # code emitted outside that namespace. Keyed by bare name -> real cname, but\n"
        "    # ONLY for bare names with exactly one candidate class - many classes have their\n"
        "    # own nested 'Params', for instance, and a bare 'Params' has no single correct\n"
        "    # resolution, so it's deliberately left out (and any function relying on it\n"
        "    # needs a BIND_ALL_EXTRA_IGNORE_METHODS entry instead). Cached per `classes` dict\n"
        "    # identity - this is the same self.classes instance for the whole generator run.\n"
        "    cached = _BARE_NAME_FALLBACK_CACHE.get(id(classes))\n"
        "    if cached is not None:\n"
        "        return cached\n"
        "    candidates = {}\n"
        "    for flat_name, class_info in classes.items():\n"
        "        bare = flat_name.rsplit('_', 1)[-1]\n"
        "        candidates.setdefault(bare, set()).add(class_info.cname)\n"
        "    result = {bare: next(iter(cnames)) for bare, cnames in candidates.items() if len(cnames) == 1}\n"
        "    _BARE_NAME_FALLBACK_CACHE[id(classes)] = result\n"
        "    return result\n"
        "\n"
        "def _resolve_class_type_names(type_str, classes):\n"
        "    # See the module docstring's second bugfix above. The `(?<!::)` negative\n"
        "    # lookbehind is required, not cosmetic: applied to an *already*-qualified type\n"
        "    # (e.g. a type_dict-resolved enum like 'cv::ANNIndex::Distance') a class whose\n"
        "    # flattened key has no namespace prefix (e.g. 'ANNIndex', matching\n"
        "    # self.classes['ANNIndex'].cname == 'cv::ANNIndex') would otherwise match its own\n"
        "    # bare name *inside* that already-correct string and double-qualify it into the\n"
        "    # invalid 'cv::cv::ANNIndex::Distance'.\n"
        "    if not classes:\n"
        "        return type_str\n"
        "    for flat_name, class_info in classes.items():\n"
        "        if flat_name in type_str:\n"
        "            type_str = re.sub(r'(?<!::)\\b' + re.escape(flat_name) + r'\\b', class_info.cname, type_str)\n"
        "    for bare, cname in _bare_name_fallback_map(classes).items():\n"
        "        if bare in type_str:\n"
        "            type_str = re.sub(r'(?<!::)\\b' + re.escape(bare) + r'\\b', cname, type_str)\n"
        "    return type_str\n"
        "\n"
        "def _core_bindings_registered_names(core_bindings_path):\n"
        "    # See the module docstring's core_bindings.cpp section above - every name it\n"
        "    # publicly registers, whether a free function or a value/vector/full-class type\n"
        "    # (e.g. DMatch, KeyPoint, Range, TermCriteria, RotatedRect, Moments, Tracker, Mat,\n"
        "    # and the *Vector family - all real doxygen-documented classes BIND_ALL would\n"
        "    # otherwise also try to bind, producing 'Cannot register type X twice').\n"
        "    try:\n"
        "        with open(core_bindings_path) as fh:\n"
        "            src = fh.read()\n"
        "    except OSError:\n"
        "        return set()\n"
        "    # Free functions: a top-level `function(\"name\", ...)` call, not `.function(...)`\n"
        "    # (a class-method registration chained onto `class_<T>()...`).\n"
        "    names = set(re.findall(r'(?m)^\\s*function\\(\"([^\"]+)\"', src))\n"
        "    # Types: `class_<T>(\"Name\")`, `value_object<T>(\"Name\")`, `value_array<T>(\"Name\")`,\n"
        "    # `register_vector<T>(\"Name\")` - `T` can itself contain arbitrarily-nested angle\n"
        "    # brackets (e.g. `register_vector<std::vector<cv::DMatch>>(\"DMatchVectorVector\")`),\n"
        "    # so find the matching `>` by depth-counting rather than a single non-greedy regex.\n"
        "    for kw in ('class_<', 'value_object<', 'value_array<', 'register_vector<'):\n"
        "        start = 0\n"
        "        while True:\n"
        "            i = src.find(kw, start)\n"
        "            if i == -1:\n"
        "                break\n"
        "            depth = 1\n"
        "            j = i + len(kw)\n"
        "            while j < len(src) and depth > 0:\n"
        "                if src[j] == '<':\n"
        "                    depth += 1\n"
        "                elif src[j] == '>':\n"
        "                    depth -= 1\n"
        "                j += 1\n"
        "            m = re.match(r'\\s*\\(\\s*\"([^\"]+)\"', src[j:j + 200])\n"
        "            if m:\n"
        "                names.add(m.group(1))\n"
        "            start = j\n"
        "    # The EMSCRIPTEN_CV_SIZE/POINT/RECT macros' own *invocations* (their definitions\n"
        "    # are already covered above, harmlessly matching their own macro-parameter name)\n"
        "    # pass the exposed name as a bare identifier or quoted string, e.g.\n"
        "    # `EMSCRIPTEN_CV_SIZE(Size)`, `EMSCRIPTEN_CV_RECT(int, \"Rect\")`.\n"
        "    for m in re.finditer(r'EMSCRIPTEN_CV_(?:SIZE|POINT)\\(([A-Za-z_][A-Za-z0-9_]*)\\)', src):\n"
        "        names.add(m.group(1))\n"
        "    for m in re.finditer(r'EMSCRIPTEN_CV_RECT\\([^,]+,\\s*\"([^\"]+)\"\\)', src):\n"
        "        names.add(m.group(1))\n"
        "    return names\n"
        "\n"
        "def makeWhiteList(module_list):",
    ),
    (
        # ArgInfo double-`&` fix - see module docstring. Unconditional (not gated on
        # BIND_ALL): a real, general bug, BIND_ALL is just the first thing to exercise it.
        "        if self.reference:\n"
        "            self.tp = self.tp + \"&\"",
        "        if self.reference and not self.tp.endswith(\"&\"):\n"
        "            self.tp = self.tp + \"&\"",
    ),
    (
        # _is_string_type fix - see module docstring. Unconditional: a real, general bug.
        "        string_types = {\n"
        "            \"std::string\",\n"
        "            \"char\",\n"
        "            \"signed char\",\n"
        "            \"unsigned char\",\n"
        "        }",
        "        string_types = {\n"
        "            \"std::string\",\n"
        "            \"string\",\n"
        "            \"String\",\n"
        "            \"char\",\n"
        "            \"signed char\",\n"
        "            \"unsigned char\",\n"
        "        }",
    ),
    (
        # No-arg-getter wrapper-routing fix - see module docstring. Unconditional: a real,
        # general bug (also affects the standard, non-BIND_ALL build for any class it
        # happens to curate that has this same shape - just apparently none currently do).
        "                    if with_wrapped_functions and (len(method.variants) > 1 or len(method.variants[0].args)>0 or \"String\" in method.variants[0].rettype):",
        "                    if with_wrapped_functions:",
    ),
    (
        # Return-type counterpart of the flattened-class-name-as-parameter-type fix, in
        # gen_function_binding_with_wrapper. Two changes: (1) the `for key in type_dict`
        # substitution was only ever run inside `if ret_type.startswith('Ptr')` - dedented
        # here to run unconditionally, matching gen_function_binding's already-correct
        # behavior below, so a *plain* (non-Ptr<>) type_dict-registered return (e.g. an enum
        # like QRCodeEncoder::ECIEncodings) actually gets resolved; (2) the same
        # class-name resolver used for parameters, for a plain class-typed (non-Ptr<>)
        # return that the type_dict loop doesn't cover (factory Ptr<T> returns are already
        # correctly handled by _qualify_factory_ptr_return_type above this, unaffected).
        "            if ret_type.startswith('Ptr'):  # smart pointer\n"
        "                ptr_type = ret_type.replace('Ptr<', '').replace('>', '')\n"
        "                if ptr_type in type_dict:\n"
        "                    ret_type = type_dict[ptr_type]\n"
        "                for key in type_dict:\n"
        "                    if key in ret_type:\n"
        "                        ret_type = re.sub(r\"\\b\" + key + r\"\\b\", type_dict[key], ret_type)\n",
        "            if ret_type.startswith('Ptr'):  # smart pointer\n"
        "                ptr_type = ret_type.replace('Ptr<', '').replace('>', '')\n"
        "                if ptr_type in type_dict:\n"
        "                    ret_type = type_dict[ptr_type]\n"
        "            for key in type_dict:\n"
        "                if key in ret_type:\n"
        "                    ret_type = re.sub(r\"\\b\" + key + r\"\\b\", type_dict[key], ret_type)\n"
        "            ret_type = _resolve_class_type_names(ret_type, self.classes)\n",
    ),
    (
        # Same class-name resolver addition for gen_function_binding's return type - its
        # type_dict loop was already unconditional, just needs the resolver call appended.
        "            for key in type_dict:\n"
        "                if key in ret_type:\n"
        "                    # Replace types. Instead of ret_type.replace we use regular\n"
        "                    # expression to exclude false matches.\n"
        "                    # See https://github.com/opencv/opencv/issues/15514\n"
        "                    ret_type = re.sub(r\"\\b\" + key + r\"\\b\", type_dict[key], ret_type)\n",
        "            for key in type_dict:\n"
        "                if key in ret_type:\n"
        "                    # Replace types. Instead of ret_type.replace we use regular\n"
        "                    # expression to exclude false matches.\n"
        "                    # See https://github.com/opencv/opencv/issues/15514\n"
        "                    ret_type = re.sub(r\"\\b\" + key + r\"\\b\", type_dict[key], ret_type)\n"
        "            ret_type = _resolve_class_type_names(ret_type, self.classes)\n",
    ),
    (
        # Flattened-class-name-as-parameter-type fix, occurrence 1 of 2 (identical text,
        # different enclosing method) - see module docstring. Also unconditional: a real,
        # general bug. Rewrites both branches (rather than appending a line after the
        # if/else) so the replacement text doesn't itself contain the needle - since this
        # same needle occurs twice, a replacement that re-embedded it verbatim would have
        # `str.replace(needle, replacement, 1)`'s *second* call re-match inside the first
        # call's own (already-replaced) output instead of reaching the second occurrence.
        "                if arg.tp in type_dict:\n"
        "                    arg_type = type_dict[arg.tp]\n"
        "                else:\n"
        "                    arg_type = arg.tp",
        "                if arg.tp in type_dict:\n"
        "                    arg_type = _resolve_class_type_names(type_dict[arg.tp], self.classes)\n"
        "                else:\n"
        "                    arg_type = _resolve_class_type_names(arg.tp, self.classes)",
    ),
    (
        # Occurrence 2 of 2 of the same snippet (different enclosing method).
        "                if arg.tp in type_dict:\n"
        "                    arg_type = type_dict[arg.tp]\n"
        "                else:\n"
        "                    arg_type = arg.tp",
        "                if arg.tp in type_dict:\n"
        "                    arg_type = _resolve_class_type_names(type_dict[arg.tp], self.classes)\n"
        "                else:\n"
        "                    arg_type = _resolve_class_type_names(arg.tp, self.classes)",
    ),
    (
        # Same fix, one-liner ternary form (constructor argument types).
        "                            arg_type = type_dict[arg.tp] if arg.tp in type_dict else arg.tp",
        "                            arg_type = _resolve_class_type_names(type_dict[arg.tp] if arg.tp in type_dict else arg.tp, self.classes)",
    ),
    (
        "                if name in ignore_list:\n"
        "                    continue\n"
        "                if not name in white_list['']:\n"
        "                    #print('Not in whitelist: \"{}\" from ns={}'.format(name, ns_name))\n"
        "                    continue",
        "                if name in ignore_list or name in BIND_ALL_EXTRA_IGNORE:\n"
        "                    continue\n"
        "                if BIND_ALL:\n"
        "                    if _bind_all_excluded(ns_id):\n"
        "                        continue\n"
        "                elif name not in white_list.get('', []):\n"
        "                    #print('Not in whitelist: \"{}\" from ns={}'.format(name, ns_name))\n"
        "                    continue",
    ),
    (
        "            if not name in white_list:\n"
        "                #print('Not in whitelist: \"{}\" from ns={}'.format(name, ns_name))\n"
        "                continue",
        "            if BIND_ALL:\n"
        "                if _bind_all_excluded(name) or name in BIND_ALL_EXTRA_IGNORE:\n"
        "                    continue\n"
        "            elif name not in white_list:\n"
        "                #print('Not in whitelist: \"{}\" from ns={}'.format(name, ns_name))\n"
        "                continue",
    ),
    (
        "                if method.cname in ignore_list:\n"
        "                    continue\n"
        "                if not method.name in white_list[method.class_name]:\n"
        "                    #print('Not in whitelist: \"{}\"'.format(method.name))\n"
        "                    continue",
        "                if method.cname in ignore_list or (method.class_name, method.name) in BIND_ALL_EXTRA_IGNORE_METHODS:\n"
        "                    continue\n"
        "                if not BIND_ALL and method.name not in white_list.get(method.class_name, []):\n"
        "                    #print('Not in whitelist: \"{}\"'.format(method.name))\n"
        "                    continue",
    ),
    (
        # Exclude core_bindings.cpp's own globally-registered names from BIND_ALL - see the
        # module docstring's core_bindings.cpp section. Runs right before the one call that
        # actually generates bindings.cpp, with core_bindings_path already in scope.
        "    generator = JSWrapperGenerator(\n"
        "        preprocessor_definitions=config_json.get(\"preprocessor_definitions\", None)\n"
        "    )\n"
        "    generator.gen(bindings_cpp, headers, core_bindings_path)",
        "    generator = JSWrapperGenerator(\n"
        "        preprocessor_definitions=config_json.get(\"preprocessor_definitions\", None)\n"
        "    )\n"
        "    if BIND_ALL:\n"
        "        BIND_ALL_EXTRA_IGNORE.update(_core_bindings_registered_names(core_bindings_path))\n"
        "    generator.gen(bindings_cpp, headers, core_bindings_path)",
    ),
]


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: patch-embindgen-bind-all.py <path-to-embindgen.py>", file=sys.stderr)
        return 2
    path = sys.argv[1]

    with open(path, "r") as fh:
        src = fh.read()

    for needle, replacement in REPLACEMENTS:
        if needle not in src:
            print(
                f"error: expected snippet not found in {path} (opencv's embindgen.py "
                "may have changed upstream - update patch-embindgen-bind-all.py):\n"
                f"{needle}",
                file=sys.stderr,
            )
            return 1
        src = src.replace(needle, replacement, 1)

    with open(path, "w") as fh:
        fh.write(src)

    print(f"{path}: patched for OPENCV_JS_BIND_ALL support.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
