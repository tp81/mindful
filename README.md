# Mindful

Version: `0.1`

A static browser mind mapping app. It stores maps locally in `localStorage` and runs without a backend, so it can be hosted directly on GitHub Pages.

## Local Use

Open `index.html` directly in a browser, or run a local static server:

```sh
python3 -m http.server 4173
```

Then open `http://localhost:4173/`.

## GitHub Pages

This repository is ready for GitHub Pages because the app is plain static HTML, CSS, and JavaScript at the repository root.

To publish:

1. Push the repository to GitHub.
2. In the repository settings, open **Pages**.
3. Set the source to the main branch and root directory.
4. Save the setting.

## Shortcuts

- `Tab`: create a child node.
- `Enter`: create a sibling node when the current node is not the root.
- Arrow keys: navigate to parent, siblings, and first child when the caret is at a natural editing boundary.
- `Delete`: delete the selected non-root node when its text is empty.
- Drag nodes to move them manually.
- Drop a link on a node to create a child linked to that page.
- Drop an image on a node to create an image child under the selected node.
- Drop a file on a node to create a helpful placeholder explaining how to attach the file by link.
- Use the `-` / `+` control beside parent nodes to collapse or expand branches.
- Drag empty background to pan the workspace. Scrollbars appear when the graph extends beyond the viewport.
- Use the toolbar to export `.drawio`, export a single-page interactive HTML file, or print.
