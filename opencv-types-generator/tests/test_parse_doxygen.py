from pathlib import Path

from opencv_types_generator.parse_doxygen import parse_doxygen_file

FIXTURES = Path(__file__).parent / "fixtures"


def test_parses_class_with_base():
    defs = parse_doxygen_file(str(FIXTURES / "svm-with-base.xml"))
    assert len(defs) == 1
    d = defs[0]
    assert d.compoundname == "cv::ml::SVM"
    assert d.kind == "class"
    assert [b.text for b in d.basecompoundref] == ["cv::ml::StatModel"]
    assert [f.name for f in d.public_funcs] == ["getType"]
    assert d.public_funcs[0].type.name == "int"


def test_parses_real_mat_class():
    defs = parse_doxygen_file(str(FIXTURES / "mat.xml"))
    d = defs[0]
    assert d.compoundname == "cv::Mat"
    assert len(d.public_funcs) > 100
    assert len(d.derivedcompoundref) == 5
    # Mat has several anonymous (doxygen `@N`-named) enums holding its flag constants.
    enum_value_names = {v.name for t in d.public_types for v in t.enum_values}
    assert "AUTO_STEP" in enum_value_names
    assert "MAGIC_VAL" in enum_value_names


def test_own_defval_marks_a_param_optional():
    defs = parse_doxygen_file(str(FIXTURES / "mat.xml"))
    d = defs[0]
    ctor = next(
        f for f in d.public_funcs if f.name == "Mat" and [p.name for p in f.params] == ["size", "type", "data", "step"]
    )
    assert ctor.params[-1].defval == "AUTO_STEP"
    assert not ctor.params[0].defval and not ctor.params[1].defval


def test_defval_propagates_to_later_params_without_their_own(tmp_path):
    # Synthetic (not real opencv data): once a param has a defval, every later param in the
    # same list is optional too even if it has no <defval> of its own - matches C++'s
    # trailing-defaulted-params convention. `own_defval` (parse_doxygen.py#_get_params)
    # covers this; no real memberdef in our other fixtures happens to exercise it.
    xml = """<?xml version='1.0'?>
    <doxygen><compounddef id="x" kind="class">
      <compoundname>cv::X</compoundname>
      <sectiondef kind="public-func">
        <memberdef kind="function" id="a1" prot="public" static="no">
          <type>void</type><name>f</name>
          <param><type>int</type><declname>a</declname></param>
          <param><type>int</type><declname>b</declname><defval>5</defval></param>
          <param><type>int</type><declname>c</declname></param>
        </memberdef>
      </sectiondef>
    </compounddef></doxygen>"""
    from opencv_types_generator.parse_doxygen import parse_doxygen

    d = parse_doxygen(xml)[0]
    a, b, c = d.public_funcs[0].params
    assert not a.defval
    assert b.defval == "5"
    assert c.defval  # no defval of its own, but optional because `b` before it has one


def test_group_compound_parses_functions_enums_and_defines():
    defs = parse_doxygen_file(str(FIXTURES / "group-sample.xml"))
    d = defs[0]
    assert d.kind == "group"
    assert {f.name for f in d.functions} == {"absdiff", "notRegistered"}
    assert [t.name for t in d.public_types] == ["NormTypes"]
    assert {v.name for v in d.public_types[0].enum_values} == {"NORM_L1", "NORM_L2"}
    assert [m.name for m in d.defines] == ["CV_8UC1"]
