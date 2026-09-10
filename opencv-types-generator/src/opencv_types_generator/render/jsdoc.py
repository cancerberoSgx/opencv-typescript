"""Convert doxygen's HTML-ish description fragments into JSDoc comments.

Port of mirada/doxygen2typescript's toMarkdown.ts + render/jsdoc.ts, using lxml to walk the
fragment instead of a hand-rolled DOM walker. Doxygen descriptions are stored (by
parse_doxygen.py) as serialized inner-XML strings, e.g.:
  "<para>Some text <ref refid=\"...\" kindref=\"member\">Foo</ref> more.</para>"
"""
from __future__ import annotations

from lxml import etree

from ..doxygen_schema import Described, Member

_BLOCK_TAGS = {"para", "itemizedlist", "orderedlist", "simplesect"}


def _fragment_to_text(xml_fragment: str) -> str:
    if not xml_fragment or not xml_fragment.strip():
        return ""
    wrapped = f"<root>{xml_fragment}</root>"
    try:
        root = etree.fromstring(
            wrapped.encode("utf-8"), parser=etree.XMLParser(recover=True, huge_tree=True)
        )
    except etree.XMLSyntaxError:
        return ""
    if root is None:
        return ""
    return _render_children(root).strip()


def _render_children(el) -> str:
    parts = [el.text or ""]
    for child in el:
        parts.append(_render_node(child))
        parts.append(child.tail or "")
    return "".join(parts)


def _render_node(el) -> str:
    tag = etree.QName(el).localname if el.tag is not None else ""
    inner = _render_children(el)

    if tag == "para":
        return inner.strip() + "\n\n"
    if tag in ("ref", "computeroutput"):
        return f"`{inner.strip()}`" if tag == "computeroutput" else inner.strip()
    if tag in ("bold", "emphasis"):
        marker = "**" if tag == "bold" else "*"
        return f"{marker}{inner.strip()}{marker}"
    if tag == "linebreak":
        return "\n"
    if tag == "itemizedlist":
        return inner
    if tag == "listitem":
        return f"- {inner.strip()}\n"
    if tag == "simplesect":
        kind = el.get("kind", "")
        return f"@{kind} {inner.strip()}\n" if kind else inner
    if tag == "parameterlist":
        # handled separately (per-param descriptions), never inlined into the body text.
        return ""
    if tag == "ulink":
        href = el.get("url", "")
        return f"{inner.strip()} ({href})" if href else inner.strip()
    if tag in ("formula", "image"):
        return ""
    # Unknown/structural tag: keep its text content, drop the wrapper.
    return inner


def _describe(d: Described) -> str:
    brief = _fragment_to_text(d.briefdescription)
    detailed = _fragment_to_text(d.detaileddescription)
    if brief and detailed and detailed.startswith(brief):
        detailed = detailed[len(brief):].strip()
    parts = [p for p in (brief, detailed) if p]
    return "\n\n".join(parts).strip()


def _wrap_comment(lines: list[str]) -> str:
    body = [ln for chunk in lines for ln in chunk.split("\n")]
    if not any(ln.strip() for ln in body):
        return ""
    escaped = [ln.replace("*/", "*\\/") for ln in body]
    rendered = "\n".join(f" * {ln}".rstrip() for ln in escaped)
    return f"/**\n{rendered}\n */"


def to_jsdoc(d: Described) -> str:
    text = _describe(d)
    if not text:
        return ""
    return _wrap_comment(text.split("\n"))


def jsdoc_function(member: Member) -> str:
    text = _describe(member)
    lines = text.split("\n") if text else []
    param_lines = [
        f"@param {p.name} {_fragment_to_text(p.description).replace(chr(10), ' ')}".rstrip()
        for p in member.params
        if p.description and _fragment_to_text(p.description)
    ]
    if param_lines:
        if lines and lines[-1].strip():
            lines.append("")
        lines.extend(param_lines)
    if not lines or not any(ln.strip() for ln in lines):
        return ""
    return _wrap_comment(lines)
