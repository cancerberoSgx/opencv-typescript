"""Parse a single doxygen compound XML file into CompoundDef dataclasses.

Port of mirada/doxygen2typescript's src/doxygen2json/parseDoxygen.ts, using lxml instead
of a jsdom-backed CSS-selector layer. Doxygen's own compound.xsd is the source of truth
for the shapes handled here; see mirada/doxygen2typescript/assets/compound.xsd.
"""
from __future__ import annotations

from typing import Optional

from lxml import etree

from .doxygen_schema import (
    CompoundDef,
    CompoundRefType,
    LinkedText,
    Location,
    Member,
    Param,
    PublicType,
    PublicTypeEnumValue,
    RefText,
    TemplateParam,
)


def parse_doxygen_file(path: str) -> list[CompoundDef]:
    with open(path, "rb") as f:
        return parse_doxygen(f.read())


def parse_doxygen(xml: bytes | str) -> list[CompoundDef]:
    if isinstance(xml, str):
        xml = xml.encode("utf-8")
    root = etree.fromstring(xml, parser=etree.XMLParser(recover=True, huge_tree=True))
    return [_get_compound_def(c) for c in root.findall(".//compounddef")]


# ---------------------------------------------------------------------------
# small XML helpers
# ---------------------------------------------------------------------------

def _text(el, tag: str, default: str = "") -> str:
    if el is None:
        return default
    child = el.find(tag)
    if child is None:
        return default
    return "".join(child.itertext()) or default


def _text_opt(el, tag: str) -> Optional[str]:
    v = _text(el, tag, "")
    return v if v else None


def _inner_xml(el) -> str:
    """Approximates DOM's `innerHTML`: el's own text plus each child serialized verbatim."""
    if el is None:
        return ""
    parts = [el.text or ""]
    for child in el:
        parts.append(etree.tostring(child, encoding="unicode"))
    return "".join(parts)


def _int_or_none(v: Optional[str]) -> Optional[int]:
    if v is None or v == "":
        return None
    try:
        return int(v)
    except ValueError:
        return None


# ---------------------------------------------------------------------------
# node -> dataclass
# ---------------------------------------------------------------------------

def _get_location(el) -> Optional[Location]:
    loc = el.find("location")
    if loc is None:
        return None
    return Location(
        file=loc.get("file"),
        line=_int_or_none(loc.get("line")),
        column=_int_or_none(loc.get("column")),
        bodyfile=loc.get("bodyfile"),
        bodystart=_int_or_none(loc.get("bodystart")),
        bodyend=_int_or_none(loc.get("bodyend")),
    )


def _get_descriptions(el) -> dict:
    def joined(tag: str) -> str:
        return "\n".join(_inner_xml(c) for c in el.findall(tag))

    detailed_node = el.find("detaileddescription")
    return dict(
        briefdescription=joined("briefdescription"),
        detaileddescription=joined("detaileddescription"),
        detaileddescription_node=detailed_node,
        inbodydescription=joined("inbodydescription"),
    )


def _get_described(el) -> dict:
    return dict(
        id=el.get("id", ""),
        prot=el.get("prot", "public"),
        location=_get_location(el),
        **_get_descriptions(el),
    )


def _get_type(el, tag: str = "type") -> LinkedText:
    # examples:
    #  <type><ref refid="..." kindref="compound">MatExpr</ref></type>
    #  <type>int</type>
    #  <type>std::vector&lt; <ref .../> &gt; &amp;</type>
    type_el = el.find(tag)
    raw_text = "".join(type_el.itertext()).strip() if type_el is not None else ""
    if raw_text.startswith("std::vector"):
        # TODO: extract the real element type instead of erasing it to `any`.
        return LinkedText(name="Vector<any>")
    ref_el = type_el.find("ref") if type_el is not None else None
    if ref_el is not None:
        name = (ref_el.text or "").strip() or None
        ref = RefText(
            refid=ref_el.get("refid", ""),
            kindref=ref_el.get("kindref", "compound"),
            text=(ref_el.text or "").strip(),
        )
    else:
        name = raw_text or None
        ref = None
    return LinkedText(name=name, ref=ref)


def _get_param_description(section_el, param_el) -> Optional[str]:
    declname = _text(param_el, "declname")
    for item in section_el.findall(
        './/detaileddescription//parameterlist[@kind="param"]/parameteritem'
    ):
        name_el = item.find(".//parametername")
        if name_el is not None and "".join(name_el.itertext()).strip() == declname:
            desc_el = item.find("parameterdescription")
            return _inner_xml(desc_el).strip() if desc_el is not None else None
    return None


def _get_params(member_el) -> list[Param]:
    # Once one param in the list has a defval, every later param is treated as optional
    # too (matches C++/doxygen's "trailing defaulted params" convention) even if it has
    # no defval of its own - mirrors parseDoxygen.ts's getParams exactly. Renderers only
    # ever check this field for truthiness (append `?`), so a bare `True` marker is fine
    # for a later param that has no defval text of its own but is optional regardless.
    optional = False
    params: list[Param] = []
    for i, p in enumerate(member_el.findall("param")):
        own_defval = _text_opt(p, "defval")
        defval = own_defval if not optional else (own_defval or True)
        optional = optional or bool(defval)
        name = _text_opt(p, "declname") or _text_opt(p, "defname") or f"arg{i}"
        params.append(
            Param(
                type=_get_type(p),
                name=name,
                defval=defval,
                description=_get_param_description(member_el, p),
            )
        )
    return params


def get_member(el) -> Member:
    return Member(
        **_get_described(el),
        type=_get_type(el),
        definition=_text_opt(el, "definition"),
        argsstring=_text_opt(el, "argsstring"),
        name=_text(el, "name"),
        static=el.get("static", "no"),
        mutable=el.get("mutable", "no"),
        implicit=el.get("implicit", "no"),
        inline=el.get("inline", "no"),
        const=el.get("const", "no"),
        kind=el.get("kind", "function"),
        params=_get_params(el),
        templateparamlist=[
            TemplateParam(type=_get_type(p), description=_get_param_description(el, p))
            for p in el.findall("templateparamlist/param")
        ],
    )


def _get_public_type(el) -> PublicType:
    name = _text_opt(el, "name")
    if name and name.startswith("@"):
        name = None  # anonymous enum
    return PublicType(
        **_get_described(el),
        name=name,
        kind=el.get("kind", "enum"),
        enum_values=[
            PublicTypeEnumValue(
                **_get_described(v),
                initializer=_text(v, "initializer"),
                name=_text(v, "name"),
            )
            for v in el.findall("enumvalue")
        ],
    )


def _get_compound_ref(el) -> CompoundRefType:
    return CompoundRefType(
        refid=el.get("refid", ""),
        prot=el.get("prot", "public"),
        virt=el.get("virt", "non-virtual"),
        text="".join(el.itertext()),
    )


def _get_compound_def(c) -> CompoundDef:
    # Class compounds nest their enums under sectiondef[kind="public-type"]; group
    # (@defgroup) compounds instead have their own sectiondef[kind="enum"]/memberdef -
    # search descendants (not just direct children) to catch both shapes. A public-type
    # enum matches both searches, so dedupe by doxygen's own (stable, unique) id attribute
    # rather than by constructed-object identity.
    enum_elements: dict[str, object] = {}
    for m in c.findall('.//sectiondef[@kind="public-type"]/memberdef'):
        enum_elements[m.get("id", "")] = m
    for m in c.findall('.//memberdef[@kind="enum"]'):
        enum_elements[m.get("id", "")] = m
    public_types = [_get_public_type(m) for m in enum_elements.values()]

    public_attribs = [
        get_member(m) for m in c.findall('.//sectiondef[@kind="public-attrib"]/memberdef')
    ]
    public_funcs = [
        m
        for section_kind in ("public-func", "public-static-func")
        for m in c.findall(f'.//sectiondef[@kind="{section_kind}"]/memberdef')
    ]
    public_funcs = [get_member(m) for m in public_funcs]
    functions = [get_member(m) for m in c.findall('.//sectiondef[@kind="func"]/memberdef')]
    defines = [get_member(m) for m in c.findall('.//sectiondef[@kind="define"]/memberdef')]

    return CompoundDef(
        **_get_described(c),
        compoundname=_text(c, "compoundname").strip(),
        kind=c.get("kind", "class"),
        title=_text_opt(c, "title"),
        derivedcompoundref=[_get_compound_ref(r) for r in c.findall("derivedcompoundref")],
        basecompoundref=[_get_compound_ref(r) for r in c.findall("basecompoundref")],
        public_types=public_types,
        public_attribs=public_attribs,
        public_funcs=public_funcs,
        functions=functions,
        defines=defines,
    )
