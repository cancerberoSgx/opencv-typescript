"""Dataclasses mirroring the subset of doxygen's compound.xsd we consume.

Port of mirada/doxygen2typescript's src/doxygen2json/doxygenTypes.ts. Kept close to the
original field names so anyone diffing against that project can follow along; Python
naming conventions (snake_case) are used instead of the TS camelCase.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Location:
    file: Optional[str] = None
    line: Optional[int] = None
    column: Optional[int] = None
    bodyfile: Optional[str] = None
    bodystart: Optional[int] = None
    bodyend: Optional[int] = None


@dataclass
class Descriptions:
    briefdescription: str = ""
    detaileddescription: str = ""
    # The raw <detaileddescription> lxml element, kept around for renderers that want to
    # walk it directly (e.g. markdown/jsdoc conversion) instead of re-parsing the string.
    detaileddescription_node: object = None
    inbodydescription: str = ""


@dataclass
class Described(Descriptions):
    id: str = ""
    prot: str = "public"
    location: Optional[Location] = None


@dataclass
class RefText:
    """A <ref refid="..." kindref="...">text</ref> node."""
    refid: str = ""
    kindref: str = "compound"
    text: str = ""


@dataclass
class LinkedText:
    """A <type>...</type> (or similar) node: plain text, optionally wrapping a <ref>."""
    name: Optional[str] = None
    ref: Optional[RefText] = None


@dataclass
class CompoundRefType:
    """A <basecompoundref>/<derivedcompoundref> node."""
    refid: str = ""
    prot: str = "public"
    virt: str = "non-virtual"
    text: str = ""


@dataclass
class TemplateParam:
    type: LinkedText = field(default_factory=LinkedText)
    description: Optional[str] = None


@dataclass
class Param(TemplateParam):
    name: str = ""
    defval: Optional[str] = None


@dataclass
class Member(Described):
    type: LinkedText = field(default_factory=LinkedText)
    definition: Optional[str] = None
    argsstring: Optional[str] = None
    name: str = ""
    static: str = "no"
    mutable: str = "no"
    implicit: str = "no"
    inline: str = "no"
    const: str = "no"
    kind: str = "function"
    params: list[Param] = field(default_factory=list)
    templateparamlist: list[TemplateParam] = field(default_factory=list)


@dataclass
class PublicTypeEnumValue(Described):
    initializer: str = ""
    name: str = ""


@dataclass
class PublicType(Described):
    kind: str = "enum"
    name: Optional[str] = None
    enum_values: list[PublicTypeEnumValue] = field(default_factory=list)


@dataclass
class CompoundDef(Described):
    compoundname: str = ""
    kind: str = "class"
    title: Optional[str] = None
    public_types: list[PublicType] = field(default_factory=list)
    public_attribs: list[Member] = field(default_factory=list)
    public_funcs: list[Member] = field(default_factory=list)
    functions: list[Member] = field(default_factory=list)
    # sectiondef kind="define" - #define macro constants (CV_8UC1, CV_32FC3, ...), which
    # opencv.js registers via emscripten's `constant()` just like enum values.
    defines: list[Member] = field(default_factory=list)
    # direct base classes (doxygen <basecompoundref>), in declaration order. TS only
    # supports single inheritance, so renderers should use entry [0].
    basecompoundref: list[CompoundRefType] = field(default_factory=list)
    # direct known subclasses (doxygen <derivedcompoundref>). Informational only.
    derivedcompoundref: list[CompoundRefType] = field(default_factory=list)
