from pathlib import Path

from opencv_types_generator.parse_doxygen import parse_doxygen_file
from opencv_types_generator.render.class_ import render_compound_class
from opencv_types_generator.render.group import render_group

FIXTURES = Path(__file__).parent / "fixtures"


def test_renders_class_with_inheritance():
    compound = parse_doxygen_file(str(FIXTURES / "svm-with-base.xml"))[0]
    src, emitted_constants = render_compound_class(compound, "ml_SVM", None, {"cv::ml::StatModel": "ml_StatModel"})
    assert "export declare class ml_SVM extends ml_StatModel {" in src
    assert "getType(): number" in src
    assert emitted_constants == set()


def test_renders_real_mat_class_with_prefixed_enum_constants():
    compound = parse_doxygen_file(str(FIXTURES / "mat.xml"))[0]
    src, emitted_constants = render_compound_class(compound, "Mat", None, {})
    # `Mat` has no real C++ base - `extends Mat_` comes from the manual
    # RUNTIME_ONLY_BASES override (render/identifiers.py), not doxygen data.
    assert "export declare class Mat extends Mat_ {" in src
    assert "constructor()" in src
    # fix #5: class-scoped enum constants use the literal bindings.cpp-registered prefixed
    # name (verified against the real sample bindings.cpp - see test_parse_bindings_cpp.py)
    assert "export declare const Mat_AUTO_STEP: number" in src
    assert "Mat_AUTO_STEP" in emitted_constants


def test_renders_group_filtered_to_registered_bindings():
    compound = parse_doxygen_file(str(FIXTURES / "group-sample.xml"))[0]
    src, fn_names, const_names = render_group(compound, {"absdiff"}, {"NORM_L1", "CV_8UC1"})

    assert "export declare function absdiff(" in src
    assert "notRegistered" not in src  # not in registered_function_names -> excluded

    assert "export declare const NORM_L1: number" in src
    assert "NORM_L2" not in src  # not registered -> excluded even though doxygen has it
    assert "export declare const CV_8UC1: number" in src

    assert fn_names == {"absdiff"}
    assert const_names == {"NORM_L1", "CV_8UC1"}
