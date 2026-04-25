# Changelog

## 0.1 - 2026-04-21

- Created Mindful as a static browser mind mapping app.
- Added browser-local storage for maps, nodes, hierarchy, colors, manual positions, links, and collapsed branches.
- Added editable map titles and a collapsible left map list.
- Added keyboard-driven node creation and deletion.
- Added left-to-right dynamic tree layout with manual node dragging.
- Added link drop support that creates linked child nodes and attempts to use the page title when browser CORS allows it.
- Added file drop placeholder messaging that explains link-based attachment behavior.
- Added branch collapse and expand controls.
- Added scrollable workspace panning by dragging the empty background.
- Added image drop support as child image nodes.
- Added `.drawio`, single-page interactive HTML, and print toolbar actions.
- Added author information and AI-use disclosure.
- Added GitHub Pages-ready static app files.
- Improved drag stop handling so nodes do not keep moving after pointer release is lost.
- Improved auto-layout spacing to reduce newly created node overlap within the same level.
- Changed printing to render through a dedicated printable window instead of the live editor surface.
- Added a toolbar action to reset/fix the layout.
- Added permanent map deletion from the sidebar with confirmation.
