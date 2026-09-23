# Ableton DJ MCP - Live Browser Bridge tests
# Copyright (C) 2026 Gabriel Pulga
# SPDX-License-Identifier: GPL-3.0-or-later

"""Unit tests for browser_ops. The Live module is not imported here; we use a
plain Python object graph that mirrors the BrowserItem shape (name, uri,
is_folder, is_device, is_loadable, children)."""

import os
import sys
import unittest

# Make the package importable when running pytest from the repo root.
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, os.pardir, os.pardir))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from live_browser_bridge import browser_ops  # type: ignore  # noqa: E402


class FakeItem(object):
    def __init__(self, name="", uri="", is_folder=False, is_device=False,
                 is_loadable=False, children=()):
        self.name = name
        self.uri = uri
        self.is_folder = is_folder
        self.is_device = is_device
        self.is_loadable = is_loadable
        self.children = list(children)


class FakeBrowser(object):
    def __init__(self, **roots):
        for attr in browser_ops.CATEGORY_ATTRS:
            setattr(self, attr, roots.get(attr))


def _build_browser():
    operator = FakeItem(name="Operator", uri="query:Synths#Operator",
                        is_device=True, is_loadable=True)
    bass_kit = FakeItem(name="808 Kit", uri="query:Drums#808",
                        is_device=False, is_loadable=True)
    synth_folder = FakeItem(name="Synths", is_folder=True, children=[operator])
    instruments = FakeItem(name="Instruments", is_folder=True, children=[synth_folder])
    drums = FakeItem(name="Drums", is_folder=True, children=[bass_kit])
    return FakeBrowser(instruments=instruments, drums=drums)


class ListCategoriesTest(unittest.TestCase):
    def test_lists_only_present_roots(self):
        browser = _build_browser()
        cats = browser_ops.list_categories(browser)
        self.assertIn("instruments", cats)
        self.assertIn("drums", cats)
        self.assertNotIn("clips", cats)


class WalkPathTest(unittest.TestCase):
    def test_empty_path_returns_root(self):
        browser = _build_browser()
        root = browser_ops.get_category_root(browser, "instruments")
        self.assertIs(browser_ops.walk_path(root, ""), root)

    def test_single_segment(self):
        root = browser_ops.get_category_root(_build_browser(), "instruments")
        node = browser_ops.walk_path(root, "Synths")
        self.assertEqual(node.name, "Synths")

    def test_multi_segment(self):
        root = browser_ops.get_category_root(_build_browser(), "instruments")
        node = browser_ops.walk_path(root, "Synths/Operator")
        self.assertEqual(node.uri, "query:Synths#Operator")

    def test_missing_segment_raises(self):
        root = browser_ops.get_category_root(_build_browser(), "instruments")
        with self.assertRaises(browser_ops.BrowserOpError):
            browser_ops.walk_path(root, "Synths/Nope")


class ChildrenOfTest(unittest.TestCase):
    def test_max_items_caps_result(self):
        item = FakeItem(children=[FakeItem(name="Item%d" % i) for i in range(10)])
        result = browser_ops.children_of(item, max_items=3)
        self.assertEqual([c.name for c in result], ["Item0", "Item1", "Item2"])

    def test_max_items_none_returns_all(self):
        item = FakeItem(children=[FakeItem(name="Item%d" % i) for i in range(10)])
        result = browser_ops.children_of(item)
        self.assertEqual(len(result), 10)


class BrowseTest(unittest.TestCase):
    def test_no_category_lists_categories(self):
        result = browser_ops.browse(_build_browser())
        self.assertIn("instruments", result["categories"])
        self.assertEqual(result["items"], [])

    def test_with_category_lists_root_children(self):
        result = browser_ops.browse(_build_browser(), category="instruments")
        names = [it["name"] for it in result["items"]]
        self.assertEqual(names, ["Synths"])
        self.assertFalse(result["truncated"])

    def test_with_path_walks(self):
        result = browser_ops.browse(_build_browser(), category="instruments",
                                    path="Synths")
        names = [it["name"] for it in result["items"]]
        self.assertEqual(names, ["Operator"])

    def test_search_filters(self):
        result = browser_ops.browse(_build_browser(), category="drums",
                                    search="808")
        names = [it["name"] for it in result["items"]]
        self.assertEqual(names, ["808 Kit"])

    def test_search_negative(self):
        result = browser_ops.browse(_build_browser(), category="drums",
                                    search="bigband")
        self.assertEqual(result["items"], [])

    def test_limit_truncates(self):
        children = [FakeItem(name="Item%d" % i) for i in range(5)]
        big_root = FakeItem(name="Big", is_folder=True, children=children)
        browser = FakeBrowser(instruments=big_root)
        result = browser_ops.browse(browser, category="instruments", limit=3)
        self.assertEqual(len(result["items"]), 3)
        self.assertTrue(result["truncated"])

    def test_large_unfiltered_folder_stops_enumeration_early(self):
        # An unfiltered browse of a huge folder must not walk every child
        # just to discard most of them. limit=50 keeps the reply well under
        # MAX_REPLY_BYTES so this isolates the item-count cap from the
        # separate byte-budget cap (see test_oversized_reply_is_trimmed_*).
        pulled = []

        def counting_children():
            for i in range(100_000):
                pulled.append(i)
                yield FakeItem(name="Item%d" % i)

        huge_root = FakeItem(name="Huge", is_folder=True)
        huge_root.children = counting_children()
        browser = FakeBrowser(instruments=huge_root)

        result = browser_ops.browse(browser, category="instruments", limit=50)

        self.assertEqual(len(result["items"]), 50)
        self.assertTrue(result["truncated"])
        self.assertEqual(len(pulled), 51)

    def test_oversized_reply_is_trimmed_to_fit_one_datagram(self):
        # Regression test for issue #270: the bridge silently drops a browse
        # reply that doesn't fit in a single UDP datagram (macOS rejects the
        # sendto() with EMSGSIZE), which surfaces to the caller as an
        # unexplained timeout. A folder with ~100 items already blows the
        # default limit=100 past MAX_REPLY_BYTES, well before `limit` kicks in.
        children = [FakeItem(name="Item%d" % i, uri="query:Big#Item%d" % i)
                    for i in range(100)]
        root = FakeItem(name="Big", is_folder=True, children=children)
        browser = FakeBrowser(instruments=root)

        result = browser_ops.browse(browser, category="instruments", limit=100)

        self.assertLess(len(result["items"]), 100)
        self.assertTrue(result["truncated"])
        self.assertLessEqual(
            browser_ops._reply_bytes("instruments", "", result["items"]),
            browser_ops.MAX_REPLY_BYTES,
        )

    def test_small_unfiltered_folder_not_truncated(self):
        children = [FakeItem(name="Item%d" % i) for i in range(5)]
        root = FakeItem(name="Small", is_folder=True, children=children)
        browser = FakeBrowser(instruments=root)
        result = browser_ops.browse(browser, category="instruments", limit=150)
        self.assertEqual(len(result["items"]), 5)
        self.assertFalse(result["truncated"])

    def test_depth_recurses(self):
        result = browser_ops.browse(_build_browser(), category="instruments",
                                    depth=2)
        self.assertEqual(result["items"][0]["name"], "Synths")
        self.assertEqual(result["items"][0]["children"][0]["name"], "Operator")


class FindByUriTest(unittest.TestCase):
    def test_finds_in_category(self):
        browser = _build_browser()
        item = browser_ops.find_by_uri(browser, "query:Synths#Operator")
        self.assertIsNotNone(item)
        self.assertEqual(item.uri, "query:Synths#Operator")

    def test_finds_in_other_category(self):
        browser = _build_browser()
        item = browser_ops.find_by_uri(browser, "query:Drums#808")
        self.assertIsNotNone(item)

    def test_returns_none_when_missing(self):
        browser = _build_browser()
        self.assertIsNone(browser_ops.find_by_uri(browser, "query:Nope"))

    def test_empty_uri_returns_none(self):
        self.assertIsNone(browser_ops.find_by_uri(_build_browser(), ""))

    def test_infers_category_from_uri_and_skips_other_roots(self):
        class Trap(object):
            name = "Packs"
            uri = ""

            @property
            def children(self):
                raise AssertionError("walked a root the URI does not point at")

        operator = FakeItem(name="Operator", uri="query:Synths#Operator",
                            is_device=True, is_loadable=True)
        browser = FakeBrowser(instruments=FakeItem(children=[operator]),
                              packs=Trap())
        self.assertIs(browser_ops.find_by_uri(browser, "query:Synths#Operator"),
                      operator)

    def test_falls_back_to_all_roots_when_prefix_root_misses(self):
        odd = FakeItem(name="Odd", uri="query:Synths#Odd", is_loadable=True)
        browser = FakeBrowser(instruments=FakeItem(children=[]),
                              drums=FakeItem(children=[odd]))
        self.assertIs(browser_ops.find_by_uri(browser, "query:Synths#Odd"), odd)

    def test_prefers_shallow_match(self):
        deep = FakeItem(name="Deep", uri="query:Synths#Dup")
        shallow = FakeItem(name="Shallow", uri="query:Synths#Dup")
        folder = FakeItem(name="F", is_folder=True,
                          children=[FakeItem(is_folder=True, children=[deep])])
        browser = FakeBrowser(instruments=FakeItem(children=[folder, shallow]))
        self.assertIs(browser_ops.find_by_uri(browser, "query:Synths#Dup"), shallow)

    def test_category_for_uri(self):
        self.assertEqual(browser_ops.category_for_uri("query:AudioFx#Reverb"),
                         "audio_effects")
        self.assertIsNone(browser_ops.category_for_uri("query:Unknown#X"))


class SerializeItemTest(unittest.TestCase):
    def test_leaf_no_children_when_max_depth_zero(self):
        item = FakeItem(name="x", uri="u", is_loadable=True,
                        children=[FakeItem(name="kid")])
        out = browser_ops.serialize_item(item, max_depth=0, include_children=False)
        self.assertNotIn("children", out)

    def test_includes_children_at_depth(self):
        item = FakeItem(name="x", children=[FakeItem(name="kid")])
        out = browser_ops.serialize_item(item, max_depth=1)
        self.assertEqual(len(out["children"]), 1)


if __name__ == "__main__":
    unittest.main()
