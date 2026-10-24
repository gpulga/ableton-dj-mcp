# Ableton DJ MCP - Live Browser Bridge
# Copyright (C) 2026 Gabriel Pulga
# SPDX-License-Identifier: GPL-3.0-or-later

"""Pure helpers for browsing Live's Application.Browser tree.

Functions here take a `browser` object and operate on it. They never touch
sockets or queues, which makes them easy to unit-test with a stubbed Live
module.

The functions tolerate Live's mix of attribute/iterator-style children
(``BrowserItem.children`` is a sequence in modern versions; older versions
exposed ``iter_children``)."""

import collections
import itertools
import json
import re

# macOS's default net.inet.udp.maxdgram is 9216 bytes; a sendto() over that
# fails with EMSGSIZE. BrowserBridge._send() catches that and only logs it,
# so an oversized reply is silently dropped and the caller just sees its own
# request time out with no indication why (issue #270 — a folder with ~65+
# items already blows this budget, including under the tool's default
# limit=100). Stay well under the OS ceiling to leave room for UDP/IP framing
# and the {id, ok, result} envelope BrowserBridge wraps this in.
MAX_REPLY_BYTES = 8192

CATEGORY_ATTRS = (
    "instruments",
    "audio_effects",
    "midi_effects",
    "drums",
    "sounds",
    "samples",
    "clips",
    "current_project",
    "user_library",
    "user_folders",
    "packs",
    "plugins",
    "max_for_live",
)


class BrowserOpError(Exception):
    """Raised by ops when the Live browser API behaves unexpectedly."""


def list_categories(browser):
    """Return the names of category roots present on this browser instance.

    Different Live versions expose different roots; we probe for each known
    attribute and skip any that are missing or None."""
    out = []
    for attr in CATEGORY_ATTRS:
        if hasattr(browser, attr) and getattr(browser, attr) is not None:
            out.append(attr)
    return out


class _FolderList(object):
    """Stands in for a root that Live exposes as a sequence of folders rather
    than one BrowserItem: ``Browser.user_folders`` (Places) is a vector, so
    treating it as an item listed nothing."""

    is_folder = True
    is_device = False
    is_loadable = False
    uri = ""

    def __init__(self, name, items):
        self.name = name
        self.children = list(items)


def _as_item(name, value):
    # Live hands Places back as its own vector type, not a list or tuple, so
    # anything without children that can be iterated is a list of folders.
    if hasattr(value, "children") or hasattr(value, "iter_children"):
        return value
    try:
        return _FolderList(name, list(value))
    except TypeError:
        return value


def get_category_root(browser, category):
    """Return the BrowserItem root for ``category`` or raise BrowserOpError."""
    if category not in CATEGORY_ATTRS:
        raise BrowserOpError("unknown category: %s" % category)
    root = getattr(browser, category, None)
    if root is None:
        raise BrowserOpError("category not available: %s" % category)
    return _as_item(category, root)


def children_of(item, max_items=None):
    """Return children for a BrowserItem, abstracting over Live versions.

    ``max_items``, when given, stops enumeration after that many children via
    ``itertools.islice`` instead of materializing the whole collection first.
    A populated Library folder can hold thousands of entries; on a large,
    unfiltered folder this avoids paying for entries the caller is going to
    discard anyway."""
    children = getattr(item, "children", None)
    if children is None:
        children = getattr(item, "iter_children", None)
        if callable(children):
            children = children()
        else:
            children = []
    if max_items is None:
        # children may be a Live "vector" — coerce to plain list
        return list(children)
    return list(itertools.islice(children, max_items))


def serialize_item(item, depth=0, max_depth=1, include_children=True):
    """Convert a BrowserItem to a JSON-safe dict.

    ``depth=0, max_depth=1`` returns the item plus one level of children.
    Pass ``max_depth=0`` to get a leaf-only dict (no children traversal)."""
    out = {
        "name": getattr(item, "name", "") or "",
        "uri": getattr(item, "uri", "") or "",
        "isFolder": bool(getattr(item, "is_folder", False)),
        "isDevice": bool(getattr(item, "is_device", False)),
        "isLoadable": bool(getattr(item, "is_loadable", False)),
    }
    if include_children and depth < max_depth:
        kids = []
        for child in children_of(item):
            kids.append(
                serialize_item(
                    child,
                    depth=depth + 1,
                    max_depth=max_depth,
                    include_children=True,
                )
            )
        out["children"] = kids
    return out


def walk_path(root, path):
    """Walk a slash-separated path of BrowserItem names down from ``root``.

    Empty/None path returns the root unchanged. Raises BrowserOpError on
    a missing segment, with the partial path that resolved."""
    if not path:
        return root
    segments = [s for s in path.split("/") if s]
    current = root
    walked = []
    for seg in segments:
        match = None
        for child in children_of(current):
            if getattr(child, "name", "") == seg:
                match = child
                break
        if match is None:
            raise BrowserOpError(
                "path segment not found: %s (resolved: %s)" % (seg, "/".join(walked))
            )
        walked.append(seg)
        current = match
    return current


def _reply_bytes(category, path, items):
    """Size of the JSON `browse` result payload, as sent over the wire."""
    envelope = {"category": category, "path": path or "", "items": items, "truncated": True}
    return len(json.dumps(envelope).encode("utf-8"))


# Sample-pack naming conventions: "Bass_Loop_124_Fm.wav", "Chord (122) A#min",
# "Pad 120bpm C maj". A bare number only counts as BPM inside the usual tempo
# range and between separators, so "Kick 01" isn't read as a tempo.
_SEP = r"[\s_\-()\[\].]"
_BPM_RE = re.compile(
    r"(?:(\d{2,3})\s?bpm|bpm\s?(\d{2,3})|(?:^|%s)(\d{2,3})(?=%s|$))" % (_SEP, _SEP),
    re.IGNORECASE,
)
_KEY_RE = re.compile(
    r"(?:^|%s)([A-G])(?:[\s_\-]?([#b]|(?i:sharp|flat)))?(?:[\s_\-]?((?i:maj(?:or)?|min(?:or)?)|m))?(?=%s|$)"
    % (_SEP, _SEP)
)
MIN_BPM = 60
MAX_BPM = 200


def name_tags(name):
    """BPM and key parsed from a sample's file name, when it carries them."""
    stem = name.rsplit(".", 1)[0] if "." in name else name
    tags = {}
    for match in _BPM_RE.finditer(stem):
        value = int(next(group for group in match.groups() if group))
        if MIN_BPM <= value <= MAX_BPM:
            tags["bpm"] = value
            break
    for match in _KEY_RE.finditer(stem):
        root, accidental, quality = match.groups()
        # A lone letter ("Kick A") is too ambiguous to call a key
        if not accidental and not quality:
            continue
        accidental = {"sharp": "#", "flat": "b"}.get(
            (accidental or "").lower(), accidental or ""
        )
        minor = quality is not None and quality.lower().startswith("m") and not quality.lower().startswith("maj")
        tags["key"] = "%s%s%s" % (root, accidental, "m" if minor else "")
        break
    return tags


def _deep_search(target, needle, cap):
    """Breadth-first walk of everything under ``target`` whose name contains
    ``needle``. Returns up to ``cap`` (item, relative path) pairs."""
    found = []
    queue = collections.deque((child, "") for child in children_of(target))
    seen = 0
    while queue and seen < MAX_FIND_NODES and len(found) < cap:
        item, parent = queue.popleft()
        seen += 1
        name = getattr(item, "name", "") or ""
        if needle in name.lower():
            found.append((item, parent))
        if getattr(item, "is_folder", False):
            here = "%s/%s" % (parent, name) if parent else name
            queue.extend((child, here) for child in children_of(item))
    return found


def _serialize_found(item, parent):
    out = serialize_item(item, max_depth=0, include_children=False)
    out["path"] = parent
    if not out["isFolder"]:
        out.update(name_tags(out["name"]))
    return out


def browse(browser, category=None, path=None, search=None, depth=1, limit=100,
           recursive=False):
    """Return a serialized listing of the browser tree.

    - No ``category``: list category names.
    - With ``category``, no ``path``: list category root's direct children.
    - With ``category`` + ``path``: walk to that subnode and list its children.
    - With ``search``: case-insensitive substring filter applied AFTER children
      enumeration. depth>1 supported to expand sub-folders inline.
    - With ``search`` + ``recursive``: match names anywhere under the target
      (breadth-first, capped at MAX_FIND_NODES). Each hit carries its folder
      ``path`` relative to the target, plus ``bpm``/``key`` parsed from file
      names that follow sample-pack naming.
    - ``limit`` truncates the top-level item list. Truncation is reported via
      the ``truncated`` flag on the result."""
    if category is None:
        return {
            "categories": list_categories(browser),
            "items": [],
        }

    root = get_category_root(browser, category)
    target = walk_path(root, path)

    if search and recursive:
        cap = (limit + 1) if limit is not None else MAX_FIND_NODES
        found = _deep_search(target, search.lower(), cap)
        truncated = limit is not None and len(found) > limit
        items = [_serialize_found(item, parent) for item, parent in found[:limit]]
        while items and _reply_bytes(category, path, items) > MAX_REPLY_BYTES:
            items.pop()
            truncated = True
        return {"category": category, "path": path or "", "items": items,
                "truncated": truncated}

    if search:
        # A search needs to scan every child to find matches, so there's no
        # cheaper enumeration cap to apply here.
        raw_items = children_of(target)
        needle = search.lower()
        raw_items = [it for it in raw_items if needle in (getattr(it, "name", "") or "").lower()]
    else:
        # No filter: stop enumerating as soon as we have one more than
        # `limit` so truncation can still be detected, instead of walking
        # (and paying for) the rest of a large folder just to discard it.
        scan_cap = (limit + 1) if limit is not None else None
        raw_items = children_of(target, max_items=scan_cap)

    truncated = False
    if limit is not None and len(raw_items) > limit:
        raw_items = raw_items[:limit]
        truncated = True

    items = [
        serialize_item(it, depth=0, max_depth=max(depth - 1, 0), include_children=depth > 1)
        for it in raw_items
    ]

    # Belt-and-suspenders: `limit` alone doesn't bound reply size (long
    # names, depth>1 sub-trees), so trim further if the JSON still wouldn't
    # fit in one UDP datagram.
    while items and _reply_bytes(category, path, items) > MAX_REPLY_BYTES:
        items.pop()
        truncated = True

    return {
        "category": category,
        "path": path or "",
        "items": items,
        "truncated": truncated,
    }


# URI prefix (the part before "#") of the items under each category root, as
# reported by Live 12.4. Lets find_by_uri search the right root first: a walk
# over the whole browser cost hundreds of ms per URI load (#326).
URI_PREFIX_CATEGORY = {
    "query:Synths": "instruments",
    "query:AudioFx": "audio_effects",
    "query:MidiFx": "midi_effects",
    "query:Drums": "drums",
    "query:Sounds": "sounds",
    "query:Samples": "samples",
    "query:Clips": "clips",
    "query:UserLibrary": "user_library",
    "query:LivePacks": "packs",
    "query:Plugins": "plugins",
    "query:M4L": "max_for_live",
}

# Cap the walk so a malformed URI can't spin Live for ages.
MAX_FIND_NODES = 50_000


def category_for_uri(uri):
    """Category attr whose items carry this URI prefix, or None if unknown."""
    return URI_PREFIX_CATEGORY.get(uri.split("#", 1)[0])


def _search(roots, uri):
    """Breadth-first search, so shallow items (most loadable devices) are
    found without descending into large folders first."""
    queue = collections.deque(roots)
    seen = 0
    while queue and seen < MAX_FIND_NODES:
        item = queue.popleft()
        seen += 1
        if getattr(item, "uri", None) == uri:
            return item
        queue.extend(children_of(item))
    return None


def find_by_uri(browser, uri, category=None):
    """First BrowserItem whose ``uri`` matches, or None.

    With ``category``, searches only that root. Otherwise searches the root
    implied by the URI prefix first, then every root as a fallback."""
    if not uri:
        return None
    if category is not None:
        return _search([get_category_root(browser, category)], uri)

    inferred = category_for_uri(uri)
    inferred_root = getattr(browser, inferred, None) if inferred else None
    if inferred_root is not None:
        found = _search([_as_item(inferred, inferred_root)], uri)
        if found is not None:
            return found

    roots = [
        _as_item(attr, getattr(browser, attr))
        for attr in CATEGORY_ATTRS
        if getattr(browser, attr, None) is not None
    ]
    return _search(roots, uri)
