from pathlib import Path

from opencv_types_generator.parse_bindings_cpp import (
    compound_xml_path,
    match_bindings_cpp,
    parse_bindings_cpp,
)

FIXTURES = Path(__file__).parent / "fixtures"


def test_parses_synthetic_class_and_base_patterns():
    code = """
    emscripten::class_<cv::Mat>("Mat")
        .constructor<>()
        ;
    emscripten::class_<cv::dnn::Net >("dnn_Net")
        ;
    emscripten::class_<cv::BackgroundSubtractorMOG2 ,base<BackgroundSubtractor>>("BackgroundSubtractorMOG2")
        ;
        function("absdiff", &binding_utils::absdiff);
        .function("elemSize", select_overload<size_t()const>(&cv::Mat::elemSize));
        constant("CV_8UC1", CV_8UC1);
    """
    parsed = parse_bindings_cpp(code)
    by_name = {c.js_name: c for c in parsed.classes}
    assert by_name["Mat"].cpp_type == "cv::Mat"
    assert by_name["Mat"].base_cpp_type is None
    assert by_name["dnn_Net"].cpp_type == "cv::dnn::Net"
    assert by_name["BackgroundSubtractorMOG2"].base_cpp_type == "BackgroundSubtractor"
    # a *member* `.function(...)` inside a class_<> chain must never be read as a free
    # top-level function registration.
    assert parsed.functions == ["absdiff"]
    assert parsed.constants == ["CV_8UC1"]


def test_matches_real_sample_bindings_and_index(tmp_path):
    code = (FIXTURES / "bindings.sample.cpp").read_text()
    parsed = parse_bindings_cpp(code)
    matched = match_bindings_cpp(parsed, str(FIXTURES / "index.sample.xml"))

    # fix #1: every class matches, including namespace-flattened ones a constructor-name
    # coincidence match would have missed entirely (see parse_bindings_cpp.py docstring).
    assert not matched.unmatched.classes
    dnn_net = next(c for c in matched.classes if c.js_name == "dnn_Net")
    assert dnn_net.cpp_type == "cv::dnn::Net"

    # fix #2: bindings.cpp's own base<> is captured for use by render/identifiers.py.
    mog2 = next(c for c in matched.classes if c.js_name == "BackgroundSubtractorMOG2")
    assert mog2.base_cpp_type == "BackgroundSubtractor"

    assert matched.cpp_type_to_js_name["cv::dnn::Net"] == "dnn_Net"

    # free functions/constants: real, expected gaps (JS-only overload aliases like
    # `ellipse1`; class-scoped enum constants like `AgastFeatureDetector_AGAST_5_8`, which
    # get reconciled later in pipeline.py once the owning class is rendered) - not zero,
    # but bounded and of the expected shape.
    assert "ellipse1" in matched.unmatched.functions
    assert any(c.startswith("AgastFeatureDetector_") for c in matched.unmatched.constants)
    assert "NORM_L1" not in matched.unmatched.constants  # free/group constants do match


def test_compound_xml_path_joins_refid_with_slashes():
    assert compound_xml_path("/docs", "d3/d63/classcv_1_1Mat") == "/docs/d3/d63/classcv_1_1Mat.xml"
