// Minimal synthetic bindings.cpp, hand-written for the e2e pipeline test - shaped like a
// real opencv.js-generated bindings.cpp but covering only the small set of compounds we
// ship XML fixtures for (tests/fixtures/mat.xml, group-sample.xml).
#include <emscripten/bind.h>

EMSCRIPTEN_BINDINGS(testBinding) {
    emscripten::class_<cv::Mat>("Mat")
        .constructor<>()
        ;

    function("absdiff", select_overload<void(const Mat&, const Mat&, Mat&)>(&binding_utils::absdiff));
    function("notRegisteredElsewhere", &binding_utils::somethingElse);

    constant("NORM_L1", static_cast<long>(cv::NORM_L1));
    constant("CV_8UC1", CV_8UC1);
}
