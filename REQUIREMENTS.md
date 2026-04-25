# Mindful Requirements

Current version: `0.1`

Author: Thomas Pengo

Disclosure: AI assistance was used in the creation of this project.

## Overview

Create a client-side JavaScript mind mapping app named Mindful that stores map data in the browser. The app starts with a blank white page containing one editable oval root node centered on the page.

## Data Storage

- Store mind map data locally in the browser.
- Persist nodes, text, colors, hierarchy, and any user-moved positions across page reloads.
- Persist multiple mind maps.
- Persist each map title.
- Persist collapsed branch state.
- Persist link metadata on link nodes.
- Do not require a server for normal use.

## Initial State

- The initial page background is white.
- A single oval root node appears at the center of the page.
- The root node text is editable immediately.
- The root node text is preselected on first load so the user can begin typing.

## Node Creation

- Pressing `Tab` while a node is selected creates a new child node.
- The new child is shown as a new oval.
- The new child node is selected and editable immediately.
- When the selected node is not the root, pressing `Enter` creates a sibling node.
- The new sibling node is selected and editable immediately.
- New nodes use colors from a pastel palette.

## Layout

- By default, the map is laid out as a tree from left to right.
- Child nodes appear to the right of their parent.
- Nodes dynamically reorganize when nodes are added or deleted.
- The layout should remain readable and avoid node overlap.
- Users can manually move nodes around.
- User-moved nodes keep their manual positions until reset by future behavior explicitly designed for that purpose.
- Dragging empty background pans the workspace.
- Scrollbars appear when the map exceeds the visible workspace.
- Parent nodes with children show a nearby branch control when approached.
- The branch control shows `-` when the branch can be collapsed.
- The branch control shows `+` when the branch is collapsed and can be expanded.

## Editing

- Clicking a node selects it.
- Clicking a node allows the user to edit its text.
- Clicking or entering a node selects all of its text for quick replacement.
- Text editing should feel direct and inline.
- Readability is more important than decorative style.
- Use a readable chalkboard-like or cursive-style font.
- The current map title is shown at the top left of the workspace.
- The current map title is editable.

## Multiple Maps

- A collapsible list of mind maps appears on the left side of the page.
- The list behaves similarly to ChatGPT's chats list.
- Users can create new maps from the list.
- Users can switch between saved maps.
- Each map entry includes a delete control.
- Deleting a map requires confirmation because the change is permanent.

## Deletion

- If the selected node text is empty and the user presses `Delete`, delete the selected node.
- The root node cannot be deleted.
- When a non-root node is deleted, remove its descendants as well.
- After deletion, select a nearby sensible node such as the parent or a sibling.

## Visual Style

- Background is white.
- Nodes are oval.
- Each new node receives a pastel color.
- Node text should be legible.
- Connections between parent and child nodes should make the tree structure clear.

## Drag And Drop

- Dropping a link on a node creates a child node with that link.
- When possible, the app should check the page title for the dropped link and use it as the node text.
- If the page title cannot be checked, use a readable version of the link.
- Dropping a file on a node creates a helpful message explaining that the intended file attachment behavior can be implemented by uploading the file somewhere reachable and adding it as a link.
- Dropping an image on a node creates an image child of the selected or target node.
- Dropping a link or file on the canvas uses the currently selected node as the parent.

## Export And Print

- Provide an icon button to reset/fix the layout by clearing manual node positions and reflowing the graph.
- Provide an icon button to export the graph as a `.drawio` graph.
- Provide an icon button to export the graph as a single page of interactive HTML.
- Provide an icon button to print the current graph.

## Help

- Keystroke reminders appear at the bottom of the page.
- Reminders include node creation, sibling creation, arrow navigation, deletion, drag and drop, and moving nodes.

## Keyboard Navigation

- `ArrowUp` moves to the previous visible sibling when that makes sense from the current editing position.
- `ArrowDown` moves to the next visible sibling when that makes sense from the current editing position.
- `ArrowRight` moves to the first visible child when it exists and that makes sense from the current editing position.
- `ArrowLeft` moves to the parent when it exists and that makes sense from the current editing position.

## Publishing

- The app must be compatible with GitHub Pages.
- The app must be ready to push as static root-level HTML, CSS, and JavaScript files.
