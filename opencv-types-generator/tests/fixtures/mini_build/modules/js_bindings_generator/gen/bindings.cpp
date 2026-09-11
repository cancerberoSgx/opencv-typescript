// Minimal synthetic bindings.cpp, hand-written for the e2e pipeline test - shaped like a
// real opencv.js-generated bindings.cpp but covering only the small set of compounds we
// ship XML fixtures for (tests/fixtures/mat.xml, group-sample.xml).
#include <emscripten/bind.h>

EMSCRIPTEN_BINDINGS(testBinding) {
    emscripten::class_<cv::Mat>("Mat")
        .constructor<>()
        ;

    // Registered so hacks/dnn-loaders.d.ts (bundled unconditionally into every emitted
    // package, see package_emitter.py) has a real `generated/dnn_Net` module to import -
    // see test_emitted_package_type_checks_with_real_tsc.
    emscripten::class_<cv::dnn::Net>("dnn_Net")
        .constructor<>()
        ;

    function("absdiff", select_overload<void(const Mat&, const Mat&, Mat&)>(&binding_utils::absdiff));
    function("notRegisteredElsewhere", &binding_utils::somethingElse);

    constant("NORM_L1", static_cast<long>(cv::NORM_L1));
    constant("CV_8UC1", CV_8UC1);
}
