from opencv_types_generator.doxygen_schema import CompoundDef, CompoundRefType
from opencv_types_generator.render.identifiers import is_valid_id, resolve_base_class_name


def test_is_valid_id():
    assert is_valid_id("Mat")
    assert is_valid_id("dnn_Net")
    assert not is_valid_id("")
    assert not is_valid_id("const int *")
    assert not is_valid_id("operator=")


def test_resolve_base_class_prefers_bindings_cpp_base_over_doxygen():
    # BackgroundSubtractorMOG2's own doxygen basecompoundref would (if consulted) resolve
    # to something else here - bindings.cpp's own base<BackgroundSubtractor> must win.
    compound = CompoundDef(
        compoundname="cv::BackgroundSubtractorMOG2",
        kind="class",
        basecompoundref=[CompoundRefType(text="cv::SomeOtherDoxygenOnlyBase")],
    )
    resolved = resolve_base_class_name(
        js_name="BackgroundSubtractorMOG2",
        compound=compound,
        base_cpp_type="BackgroundSubtractor",
        cpp_type_to_js_name={
            "cv::BackgroundSubtractor": "BackgroundSubtractor",
            "cv::SomeOtherDoxygenOnlyBase": "SomeOtherDoxygenOnlyBase",
        },
    )
    assert resolved == "BackgroundSubtractor"


def test_resolve_base_class_falls_back_to_doxygen_basecompoundref():
    compound = CompoundDef(
        compoundname="cv::ml::SVM", kind="class", basecompoundref=[CompoundRefType(text="cv::ml::StatModel")]
    )
    resolved = resolve_base_class_name(
        js_name="ml_SVM",
        compound=compound,
        base_cpp_type=None,  # no base<> on this class's own bindings.cpp registration
        cpp_type_to_js_name={"cv::ml::StatModel": "ml_StatModel"},
    )
    assert resolved == "ml_StatModel"


def test_resolve_base_class_falls_back_to_manual_override_for_js_only_bases():
    compound = CompoundDef(compoundname="cv::Mat", kind="class")  # no C++ base at all
    resolved = resolve_base_class_name(
        js_name="Mat", compound=compound, base_cpp_type=None, cpp_type_to_js_name={}
    )
    assert resolved == "Mat_"


def test_resolve_base_class_returns_none_when_nothing_applies():
    compound = CompoundDef(compoundname="cv::Something", kind="class")
    resolved = resolve_base_class_name(
        js_name="Something", compound=compound, base_cpp_type=None, cpp_type_to_js_name={}
    )
    assert resolved is None
