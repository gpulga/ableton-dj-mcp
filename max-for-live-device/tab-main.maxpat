{
	"patcher": {
		"fileversion": 1,
		"appversion": {
			"major": 9,
			"minor": 0,
			"revision": 10,
			"architecture": "x64",
			"modernui": 1
		},
		"classnamespace": "box",
		"rect": [
			371.0,
			205.0,
			597.0,
			604.0
		],
		"openinpresentation": 1,
		"gridsize": [
			15.0,
			15.0
		],
		"boxes": [
			{
				"box": {
					"id": "obj-21",
					"linecount": 2,
					"maxclass": "message",
					"numinlets": 2,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						416.0,
						435.0,
						166.0,
						35.0
					],
					"text": "script sendbox \"update-available-button\" hidden 1"
				}
			},
			{
				"box": {
					"id": "obj-17",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						243.0,
						459.0,
						75.0,
						22.0
					],
					"text": "prepend text"
				}
			},
			{
				"box": {
					"id": "obj-20",
					"linecount": 2,
					"maxclass": "newobj",
					"numinlets": 4,
					"numoutlets": 2,
					"outlettype": [
						"",
						""
					],
					"patching_rect": [
						243.0,
						411.0,
						137.0,
						35.0
					],
					"text": "combine v X.Y.Z \" \" available @triggers 1"
				}
			},
			{
				"box": {
					"id": "obj-24",
					"linecount": 2,
					"maxclass": "message",
					"numinlets": 2,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						136.5,
						535.0,
						363.0,
						35.0
					],
					"text": ";\rmax launch_browser https://github.com/gpulga/ableton-dj-mcp/releases"
				}
			},
			{
				"box": {
					"id": "obj-15",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 2,
					"outlettype": [
						"bang",
						""
					],
					"patching_rect": [
						391.0,
						290.0,
						29.5,
						22.0
					],
					"text": "t b l"
				}
			},
			{
				"box": {
					"id": "obj-14",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 2,
					"outlettype": [
						"",
						""
					],
					"patching_rect": [
						391.0,
						381.0,
						67.0,
						22.0
					],
					"save": [
						"#N",
						"thispatcher",
						";",
						"#Q",
						"end",
						";"
					],
					"text": "thispatcher"
				}
			},
			{
				"box": {
					"id": "obj-53",
					"linecount": 2,
					"maxclass": "message",
					"numinlets": 2,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						391.0,
						329.0,
						166.0,
						35.0
					],
					"text": "script sendbox \"update-available-button\" hidden 0"
				}
			},
			{
				"box": {
					"annotation": "Click to get the latest version.",
					"bgcolor": [
						0.596078431372549,
						0.933333333333333,
						1.0,
						1.0
					],
					"fontface": 0,
					"hidden": 1,
					"hint": "",
					"id": "obj-12",
					"maxclass": "textbutton",
					"numinlets": 1,
					"numoutlets": 3,
					"outlettype": [
						"",
						"",
						"int"
					],
					"parameter_enable": 0,
					"patching_rect": [
						243.0,
						497.0,
						100.0,
						20.0
					],
					"presentation": 1,
					"presentation_rect": [
						147.0,
						4.0,
						101.0,
						22.0
					],
					"rounded": 8.0,
					"text": "Update available",
					"textoncolor": [
						0.129411764705882,
						0.129411764705882,
						0.129411764705882,
						1.0
					],
					"textovercolor": [
						0.231372549019608,
						0.03921568627451,
						0.72156862745098,
						1.0
					],
					"underline": 1,
					"usetextovercolor": 1,
					"varname": "update-available-button"
				}
			},
			{
				"box": {
					"id": "obj-11",
					"maxclass": "newobj",
					"numinlets": 0,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						391.0,
						257.0,
						116.0,
						22.0
					],
					"text": "r ---update-available"
				}
			},
			{
				"box": {
					"bgmode": 0,
					"border": 0,
					"clickthrough": 1,
					"enablehscroll": 0,
					"enablevscroll": 0,
					"id": "obj-4",
					"lockeddragscroll": 0,
					"lockedsize": 0,
					"maxclass": "bpatcher",
					"name": "server-status.maxpat",
					"numinlets": 0,
					"numoutlets": 0,
					"offset": [
						0.0,
						0.0
					],
					"patching_rect": [
						24.0,
						91.0,
						198.0,
						71.0
					],
					"presentation": 1,
					"presentation_rect": [
						28.0,
						15.0,
						213.0,
						75.0
					],
					"viewvisibility": 1
				}
			},
			{
				"box": {
					"fontface": 1,
					"fontname": "Ableton Sans Bold",
					"fontsize": 9.0,
					"id": "obj-10",
					"maxclass": "comment",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [
						46.0,
						52.0,
						86.0,
						17.0
					],
					"presentation": 1,
					"presentation_rect": [
						172.0,
						16.0,
						24.0,
						17.0
					],
					"text": "",
					"textjustification": 1
				}
			},
			{
				"box": {
					"id": "obj-5",
					"linecount": 2,
					"maxclass": "live.comment",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [
						188.0,
						202.0,
						150.0,
						29.0
					],
					"presentation": 1,
					"presentation_linecount": 2,
					"presentation_rect": [
						181.0,
						118.0,
						69.0,
						29.0
					],
					"text": "Ideas in.\nMusic out.",
					"textjustification": 1
				}
			},
			{
				"box": {
					"id": "obj-8",
					"maxclass": "newobj",
					"numinlets": 1,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						267.0,
						123.0,
						72.0,
						22.0
					],
					"text": "prepend set"
				}
			},
			{
				"box": {
					"id": "obj-2",
					"linecount": 2,
					"maxclass": "newobj",
					"numinlets": 2,
					"numoutlets": 2,
					"outlettype": [
						"",
						""
					],
					"patching_rect": [
						267.0,
						75.0,
						102.0,
						35.0
					],
					"text": "combine v X.Y.Z @triggers 1"
				}
			},
			{
				"box": {
					"fontface": 1,
					"fontname": "Ableton Sans Medium",
					"fontsize": 13.0,
					"id": "obj-54",
					"maxclass": "comment",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [
						2.0,
						14.0,
						65.0,
						45.5
					],
					"presentation": 1,
					"presentation_rect": [
						5.0,
						6.0,
						170.0,
						34.0
					],
					"text": "",
					"textjustification": 0
				}
			},
			{
				"box": {
					"id": "obj-19",
					"linecount": 2,
					"maxclass": "message",
					"numinlets": 2,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						46.0,
						239.0,
						240.0,
						35.0
					],
					"text": ";\rmax launchbrowser https://github.com/gpulga/ableton-dj-mcp/blob/main/docs/Tools-Reference.md"
				}
			},
			{
				"box": {
					"annotation": "Open docs on GitHub",
					"id": "obj-18",
					"maxclass": "textbutton",
					"numinlets": 1,
					"numoutlets": 3,
					"outlettype": [
						"",
						"",
						"int"
					],
					"parameter_enable": 0,
					"patching_rect": [
						46.0,
						200.0,
						63.0,
						21.0
					],
					"presentation": 1,
					"presentation_rect": [
						0.0,
						125.0,
						65.0,
						20.0
					],
					"text": "Docs",
					"varname": "Docs Link"
				}
			},
			{
				"box": {
					"id": "obj-7",
					"maxclass": "newobj",
					"numinlets": 0,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"patching_rect": [
						302.0,
						38.0,
						67.0,
						22.0
					],
					"text": "r ---version"
				}
			},
			{
				"box": {
					"fontname": "Ableton Sans Medium",
					"fontsize": 10.0,
					"id": "obj-23",
					"maxclass": "comment",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [
						267.0,
						154.0,
						78.0,
						21.0
					],
					"presentation": 1,
					"presentation_rect": [
						25.0,
						55.0,
						177.0,
						16.0
					],
					"text": "vX.Y.Z",
					"textjustification": 1
				}
			},
			{
				"box": {
					"fontface": 1,
					"fontname": "Ableton Sans Bold",
					"fontsize": 24.0,
					"id": "obj-3",
					"maxclass": "comment",
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [
						31.0,
						37.0,
						163.0,
						35.0
					],
					"presentation": 1,
					"presentation_rect": [
						25.0,
						17.0,
						177.0,
						35.0
					],
					"text": "Ableton DJ MCP",
					"textjustification": 1
				}
			},
			{
				"box": {
					"angle": 270.0,
					"background": 1,
					"bgcolor": [
						0.163688058058427,
						0.163688010157025,
						0.163688022674427,
						0.0
					],
					"id": "obj-1",
					"maxclass": "panel",
					"mode": 0,
					"numinlets": 1,
					"numoutlets": 0,
					"patching_rect": [
						204.0,
						40.0,
						34.0,
						29.0
					],
					"presentation": 1,
					"presentation_rect": [
						0.0,
						-2.0,
						250.0,
						150.0
					],
					"proportion": 0.39,
					"rounded": 0
				}
			}
		],
		"lines": [
			{
				"patchline": {
					"destination": [
						"obj-15",
						0
					],
					"source": [
						"obj-11",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-24",
						0
					],
					"source": [
						"obj-12",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-20",
						1
					],
					"source": [
						"obj-15",
						1
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-53",
						0
					],
					"source": [
						"obj-15",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-12",
						0
					],
					"source": [
						"obj-17",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-19",
						0
					],
					"source": [
						"obj-18",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-8",
						0
					],
					"source": [
						"obj-2",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-17",
						0
					],
					"source": [
						"obj-20",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-14",
						0
					],
					"source": [
						"obj-21",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-14",
						0
					],
					"source": [
						"obj-53",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-2",
						1
					],
					"source": [
						"obj-7",
						0
					]
				}
			},
			{
				"patchline": {
					"destination": [
						"obj-23",
						0
					],
					"source": [
						"obj-8",
						0
					]
				}
			}
		],
		"parameters": {
			"inherited_shortname": 1
		},
		"dependency_cache": [
			{
				"name": "server-status.maxpat",
				"bootpath": "~/ableton-dj-mcp/max-for-live-device",
				"patcherrelativepath": ".",
				"type": "JSON",
				"implicit": 1
			}
		],
		"autosave": 0
	}
}