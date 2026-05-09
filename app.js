(function () {
  const APP_NAME = "Mindful";
  const APP_VERSION = "0.1";
  const STORAGE_KEY = "mindful.mindmaps.v2";
  const LEGACY_STORAGE_KEY = "mindful.mindmap.v1";
  const NODE_WIDTH = 160;
  const TEXT_NODE_HEIGHT = 76;
  const IMAGE_NODE_HEIGHT = 150;
  const LEVEL_GAP = 245;
  const SIBLING_GAP = 112;
  const NODE_MARGIN = 28;
  const PASTELS = [
    "#ffd6d6",
    "#ffe8b8",
    "#fff6b8",
    "#d9f7c9",
    "#c9f0ff",
    "#dcd6ff",
    "#ffd5ef",
    "#d7f3e3",
  ];

  const app = document.getElementById("app");
  const viewport = document.getElementById("viewport");
  const board = document.getElementById("board");
  const canvas = document.getElementById("canvas");
  const links = document.getElementById("links");
  const mapList = document.getElementById("mapList");
  const mapTitle = document.getElementById("mapTitle");
  const newMapButton = document.getElementById("newMapButton");
  const sidebarToggle = document.getElementById("sidebarToggle");
  const sidebarOpen = document.getElementById("sidebarOpen");
  const fixLayoutButton = document.getElementById("fixLayout");
  const exportDrawioButton = document.getElementById("exportDrawio");
  const exportHtmlButton = document.getElementById("exportHtml");
  const printMapButton = document.getElementById("printMap");

  let library = loadLibrary();
  let selectedId = currentMap().rootId;
  let colorIndex = countNodes() % PASTELS.length;
  let drag = null;
  let pan = null;

  newMapButton.addEventListener("click", createMap);
  sidebarToggle.addEventListener("click", () => setSidebarCollapsed(true));
  sidebarOpen.addEventListener("click", () => setSidebarCollapsed(false));
  fixLayoutButton.addEventListener("click", fixLayout);
  exportDrawioButton.addEventListener("click", exportDrawio);
  exportHtmlButton.addEventListener("click", exportInteractiveHtml);
  printMapButton.addEventListener("click", printCurrentMap);
  mapTitle.addEventListener("input", () => {
    currentMap().title = mapTitle.value || "Untitled map";
    renderMapList();
    saveLibrary();
  });

  window.addEventListener("resize", () => {
    layoutTree();
    renderCanvas();
  });

  document.addEventListener("keydown", handleKeydown);
  document.addEventListener("pointermove", handlePointerMove);
  document.addEventListener("pointerup", stopPointerActions);
  document.addEventListener("pointercancel", stopPointerActions);
  window.addEventListener("blur", stopPointerActions);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopPointerActions();
  });
  canvas.addEventListener("dragover", handleCanvasDragOver);
  canvas.addEventListener("drop", handleCanvasDrop);
  canvas.addEventListener("dragleave", clearDropTargets);
  viewport.addEventListener("pointerdown", startPan);

  document.title = `${APP_NAME} ${APP_VERSION}`;

  layoutTree();
  render();
  requestAnimationFrame(() => {
    centerInitialView();
    selectNode(selectedId, { selectText: true, focus: true });
  });

  function createMap() {
    const map = createInitialMap("Untitled map");
    library.maps[map.id] = map;
    library.order.unshift(map.id);
    library.activeMapId = map.id;
    selectedId = map.rootId;
    colorIndex = countNodes() % PASTELS.length;
    layoutTree();
    render();
    saveLibrary();
    requestAnimationFrame(() => {
      mapTitle.focus();
      mapTitle.select();
    });
  }

  function switchMap(id) {
    if (!library.maps[id] || id === library.activeMapId) return;
    library.activeMapId = id;
    selectedId = currentMap().rootId;
    colorIndex = countNodes() % PASTELS.length;
    layoutTree();
    render();
    saveLibrary();
    requestAnimationFrame(() => selectNode(selectedId, { selectText: true, focus: true }));
  }

  function deleteMap(id) {
    const map = library.maps[id];
    if (!map) return;
    const confirmed = window.confirm(`Delete "${map.title || "Untitled map"}"? This cannot be undone.`);
    if (!confirmed) return;

    delete library.maps[id];
    library.order = library.order.filter((entryId) => entryId !== id);

    if (!library.order.length) {
      const replacement = createInitialMap("Mind map");
      library.maps[replacement.id] = replacement;
      library.order = [replacement.id];
      library.activeMapId = replacement.id;
    } else if (library.activeMapId === id) {
      library.activeMapId = library.order[0];
    }

    selectedId = currentMap().rootId;
    colorIndex = countNodes() % PASTELS.length;
    layoutTree();
    render();
    saveLibrary();
    requestAnimationFrame(() => selectNode(selectedId, { selectText: true, focus: true }));
  }

  function createInitialMap(title) {
    const id = `map-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return {
      id,
      title,
      rootId: "root",
      nodes: {
        root: {
          id: "root",
          parentId: null,
          text: "Central idea",
          color: "#fff6b8",
          children: [],
          collapsed: false,
          type: "text",
          manual: false,
          x: boardCenterX(),
          y: boardCenterY(),
        },
      },
    };
  }

  function loadLibrary() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return normalizeLibrary(JSON.parse(saved));

      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) {
        const map = normalizeMap({ ...JSON.parse(legacy), id: "map-legacy", title: "Mind map" });
        return { activeMapId: map.id, order: [map.id], maps: { [map.id]: map }, sidebarCollapsed: false };
      }
    } catch {
      return createInitialLibrary();
    }

    return createInitialLibrary();
  }

  function createInitialLibrary() {
    const map = createInitialMap("Mind map");
    return { activeMapId: map.id, order: [map.id], maps: { [map.id]: map }, sidebarCollapsed: false };
  }

  function normalizeLibrary(value) {
    if (!value || !value.maps || !value.activeMapId || !value.maps[value.activeMapId]) return createInitialLibrary();
    value.order = Array.isArray(value.order) ? value.order.filter((id) => value.maps[id]) : Object.keys(value.maps);
    if (!value.order.length) return createInitialLibrary();
    value.maps = Object.fromEntries(Object.entries(value.maps).map(([id, map]) => [id, normalizeMap({ ...map, id })]));
    value.activeMapId = value.maps[value.activeMapId] ? value.activeMapId : value.order[0];
    value.sidebarCollapsed = Boolean(value.sidebarCollapsed);
    return value;
  }

  function normalizeMap(map) {
    const fallback = createInitialMap(map.title || "Mind map");
    const nodes = map.nodes || fallback.nodes;
    Object.values(nodes).forEach((node) => {
      node.children = Array.isArray(node.children) ? node.children : [];
      node.collapsed = Boolean(node.collapsed);
      node.manual = Boolean(node.manual);
      node.type = node.type || "text";
      node.imageData = node.imageData || "";
      node.url = node.url || "";
      node.color = node.color || PASTELS[0];
      node.text = typeof node.text === "string" ? node.text : "New idea";
    });
    return {
      ...fallback,
      ...map,
      title: map.title || "Untitled map",
      rootId: map.rootId || "root",
      nodes,
    };
  }

  function saveLibrary() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
  }

  function currentMap() {
    return library.maps[library.activeMapId];
  }

  function countNodes() {
    return Object.keys(currentMap().nodes).length;
  }

  function handleKeydown(event) {
    if (event.target === mapTitle) return;

    const map = currentMap();
    const selected = map.nodes[selectedId];
    if (!selected) return;

    if (handleArrowNavigation(event, selected)) return;

    if (event.key === "Tab") {
      event.preventDefault();
      addChild(selectedId);
      return;
    }

    if (event.key === "Enter" && !event.shiftKey && selected.parentId) {
      event.preventDefault();
      addSibling(selectedId);
      return;
    }

    if (event.key === "Delete" && selected.text.trim() === "" && selected.parentId) {
      event.preventDefault();
      deleteNode(selectedId);
    }
  }

  function handleArrowNavigation(event, selected) {
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return false;

    const targetId = getArrowTargetId(event.key, selected);
    if (!targetId || !shouldNavigateFromCaret(event.key)) return false;

    event.preventDefault();
    selectNode(targetId, { selectText: true, focus: true });
    return true;
  }

  function getArrowTargetId(key, selected) {
    const map = currentMap();

    if (key === "ArrowRight" && selected.children.length && !selected.collapsed) {
      return selected.children[0];
    }

    if (key === "ArrowLeft" && selected.parentId) {
      return selected.parentId;
    }

    if ((key === "ArrowUp" || key === "ArrowDown") && selected.parentId) {
      const siblings = map.nodes[selected.parentId].children.filter((id) => getVisibleNodeIds().includes(id));
      const index = siblings.indexOf(selected.id);
      const siblingIndex = key === "ArrowUp" ? index - 1 : index + 1;
      return siblings[siblingIndex] || "";
    }

    return "";
  }

  function shouldNavigateFromCaret(key) {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return true;
    const range = selection.getRangeAt(0);
    const element = document.querySelector(`.node[data-id="${CSS.escape(selectedId)}"]`);
    if (!element || !element.contains(range.commonAncestorContainer)) return true;
    if (selection.toString() === element.textContent) return true;

    const caretOffset = getCaretOffset(element, range);
    const textLength = element.textContent.length;
    if (key === "ArrowLeft") return caretOffset === 0;
    if (key === "ArrowRight") return caretOffset === textLength;
    if (key === "ArrowUp") return isCaretOnFirstLine(element, range);
    if (key === "ArrowDown") return isCaretOnLastLine(element, range);
    return false;
  }

  function getCaretOffset(element, range) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let offset = 0;
    let node = walker.nextNode();

    while (node) {
      if (node === range.startContainer) return offset + range.startOffset;
      offset += node.textContent.length;
      node = walker.nextNode();
    }

    return offset;
  }

  function isCaretOnFirstLine(element, range) {
    const caretRect = getCaretRect(range);
    if (!caretRect) return true;
    return caretRect.top <= element.getBoundingClientRect().top + 24;
  }

  function isCaretOnLastLine(element, range) {
    const caretRect = getCaretRect(range);
    if (!caretRect) return true;
    return caretRect.bottom >= element.getBoundingClientRect().bottom - 24;
  }

  function getCaretRect(range) {
    const rect = range.getBoundingClientRect();
    if (rect && (rect.width || rect.height)) return rect;

    const marker = document.createElement("span");
    marker.textContent = "\u200b";
    const probe = range.cloneRange();
    probe.insertNode(marker);
    const markerRect = marker.getBoundingClientRect();
    marker.remove();
    return markerRect;
  }

  function addChild(parentId) {
    const map = currentMap();
    const node = makeNode(parentId);
    map.nodes[parentId].children.push(node.id);
    map.nodes[node.id] = node;
    layoutTree();
    renderCanvas();
    selectNode(node.id, { selectText: true, focus: true });
    saveLibrary();
  }

  function addSibling(id) {
    const map = currentMap();
    const parentId = map.nodes[id].parentId;
    if (!parentId) return;
    const node = makeNode(parentId);
    const siblings = map.nodes[parentId].children;
    siblings.splice(siblings.indexOf(id) + 1, 0, node.id);
    map.nodes[node.id] = node;
    layoutTree();
    renderCanvas();
    selectNode(node.id, { selectText: true, focus: true });
    saveLibrary();
  }

  function makeNode(parentId) {
    const map = currentMap();
    const id = `node-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const parent = map.nodes[parentId];
    const node = {
      id,
      parentId,
      text: "New idea",
      color: PASTELS[colorIndex % PASTELS.length],
      children: [],
      collapsed: false,
      type: "text",
      manual: false,
      x: parent.x + LEVEL_GAP,
      y: parent.y,
    };
    colorIndex += 1;
    return node;
  }

  function deleteNode(id) {
    const map = currentMap();
    const node = map.nodes[id];
    const parent = map.nodes[node.parentId];
    const nextSelection = node.parentId;
    parent.children = parent.children.filter((childId) => childId !== id);
    collectDescendants(id).forEach((nodeId) => delete map.nodes[nodeId]);
    layoutTree();
    renderCanvas();
    selectNode(nextSelection);
    saveLibrary();
  }

  function collectDescendants(id, list = []) {
    const map = currentMap();
    list.push(id);
    map.nodes[id].children.forEach((childId) => collectDescendants(childId, list));
    return list;
  }

  function layoutTree() {
    const map = currentMap();
    const root = map.nodes[map.rootId];
    if (!root) return;

    const levels = assignDepths(map.rootId);
    const usableWidth = board.clientWidth || window.innerWidth;
    const usableHeight = board.clientHeight || window.innerHeight;
    const rootX = clamp(root.manual ? root.x : usableWidth / 2, 95, usableWidth - 95);
    const rootY = clamp(root.manual ? root.y : usableHeight / 2, 82, usableHeight - 72);
    root.x = rootX;
    root.y = rootY;

    const leafCursor = { y: rootY };
    assignTreePositions(map.rootId, levels, leafCursor);
    resolveLevelOverlaps(levels);
    recenterParents(map.rootId);
  }

  function assignDepths(rootId, depth = 0, levels = {}) {
    const map = currentMap();
    levels[rootId] = depth;
    if (!map.nodes[rootId].collapsed) {
      map.nodes[rootId].children.forEach((childId) => assignDepths(childId, depth + 1, levels));
    }
    return levels;
  }

  function assignTreePositions(id, levels, leafCursor) {
    const map = currentMap();
    const node = map.nodes[id];
    const visibleChildren = node.collapsed ? [] : node.children;
    const childYs = visibleChildren.map((childId) => assignTreePositions(childId, levels, leafCursor));

    if (!node.manual) {
      node.x = map.nodes[map.rootId].x + levels[id] * LEVEL_GAP;
      if (childYs.length) {
        node.y = (Math.min(...childYs) + Math.max(...childYs)) / 2;
      } else if (id !== map.rootId) {
        node.y = leafCursor.y;
        leafCursor.y += getNodeHeight(node) + NODE_MARGIN;
      }
    }

    return node.y;
  }

  function resolveLevelOverlaps(levels) {
    const map = currentMap();
    const visible = getVisibleNodeIds();
    const grouped = new Map();

    visible.forEach((id) => {
      const node = map.nodes[id];
      if (node.manual) return;
      const level = levels[id] ?? 0;
      if (!grouped.has(level)) grouped.set(level, []);
      grouped.get(level).push(node);
    });

    grouped.forEach((nodes) => {
      nodes.sort((a, b) => a.y - b.y);
      for (let index = 1; index < nodes.length; index += 1) {
        const prev = nodes[index - 1];
        const current = nodes[index];
        const minGap = (getNodeHeight(prev) + getNodeHeight(current)) / 2 + NODE_MARGIN;
        if (current.y - prev.y < minGap) {
          current.y = prev.y + minGap;
        }
      }
    });
  }

  function recenterParents(id) {
    const map = currentMap();
    const node = map.nodes[id];
    if (!node || node.collapsed) return node?.y || 0;

    const childYs = node.children.map((childId) => recenterParents(childId));
    if (!node.manual && childYs.length) {
      node.y = (Math.min(...childYs) + Math.max(...childYs)) / 2;
    }
    return node.y;
  }

  function render() {
    app.classList.toggle("sidebar-collapsed", library.sidebarCollapsed);
    renderMapList();
    mapTitle.value = currentMap().title;
    renderCanvas();
  }

  function renderMapList() {
    mapList.replaceChildren();
    library.order.forEach((id) => {
      const map = library.maps[id];
      const item = document.createElement("div");
      item.className = `map-list-item${id === library.activeMapId ? " active" : ""}`;

      const row = document.createElement("div");
      row.className = "map-list-item-row";

      const selectButton = document.createElement("button");
      selectButton.type = "button";
      selectButton.className = "map-select-button";
      selectButton.textContent = map.title || "Untitled map";
      selectButton.title = map.title || "Untitled map";
      selectButton.addEventListener("click", () => switchMap(id));

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "map-delete-button";
      deleteButton.title = "Delete map";
      deleteButton.setAttribute("aria-label", `Delete ${map.title || "Untitled map"}`);
      deleteButton.innerHTML = '<span aria-hidden="true">🗑</span>';
      deleteButton.addEventListener("click", (event) => {
        event.stopPropagation();
        deleteMap(id);
      });

      row.append(selectButton, deleteButton);
      item.appendChild(row);
      mapList.appendChild(item);
    });
  }

  function renderCanvas() {
    const map = currentMap();
    const visibleIds = new Set(getVisibleNodeIds());
    canvas.replaceChildren();
    links.replaceChildren();

    visibleIds.forEach((id) => {
      const node = map.nodes[id];
      if (!node.collapsed) {
        node.children.filter((childId) => visibleIds.has(childId)).forEach((childId) => drawLink(node, map.nodes[childId]));
      }
    });

    visibleIds.forEach((id) => {
      const node = map.nodes[id];
      const element = document.createElement("div");
      element.className = `node${node.id === selectedId ? " selected" : ""}`;
      element.contentEditable = "false";
      element.spellcheck = false;
      element.dataset.id = node.id;
      element.style.left = `${node.x}px`;
      element.style.top = `${node.y}px`;
      element.style.background = node.color;
      element.setAttribute("role", "textbox");
      element.setAttribute("aria-label", node.parentId ? "Mind map node" : "Root mind map node");
      if (node.type === "image" && node.imageData) {
        element.classList.add("image-node");
        element.contentEditable = "false";
        const image = document.createElement("img");
        image.src = node.imageData;
        image.alt = node.text || "Dropped image";
        const caption = document.createElement("span");
        caption.textContent = node.text || "Image";
        element.append(image, caption);
      } else if (node.url) {
        element.innerHTML = "";
        const anchor = document.createElement("a");
        anchor.href = node.url;
        anchor.target = "_blank";
        anchor.rel = "noreferrer";
        anchor.textContent = node.text;
        element.appendChild(anchor);
      } else {
        element.textContent = node.text;
      }
      element.tabIndex = 0;
      element.addEventListener("focus", () => {
        selectedId = node.id;
        updateSelectedClasses();
      });
      element.addEventListener("blur", () => {
        if (!element.classList.contains("image-node")) element.contentEditable = "false";
      });
      element.addEventListener("click", () => selectNode(node.id));
      element.addEventListener("dblclick", () => enterEditMode(node.id));
      element.addEventListener("input", () => {
        currentMap().nodes[node.id].text = element.textContent.trim();
        if (currentMap().nodes[node.id].url && element.textContent.trim() !== node.text) {
          currentMap().nodes[node.id].url = "";
        }
        saveLibrary();
      });
      element.addEventListener("pointerdown", (event) => startDrag(event, node.id));
      element.addEventListener("dragover", (event) => handleNodeDragOver(event, node.id));
      element.addEventListener("dragleave", () => element.classList.remove("drop-target"));
      element.addEventListener("drop", (event) => handleNodeDrop(event, node.id));
      canvas.appendChild(element);

      if (node.children.length) {
        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = `branch-toggle${node.collapsed ? " collapsed" : ""}`;
        toggle.textContent = node.collapsed ? "+" : "-";
        toggle.style.left = `${node.x + NODE_WIDTH / 2 + 20}px`;
        toggle.style.top = `${node.y}px`;
        toggle.title = node.collapsed ? "Expand branch" : "Collapse branch";
        toggle.setAttribute("aria-label", node.collapsed ? "Expand branch" : "Collapse branch");
        toggle.addEventListener("click", (event) => {
          event.stopPropagation();
          toggleBranch(node.id);
        });
        canvas.appendChild(toggle);
      }
    });
  }

  function getVisibleNodeIds(id = currentMap().rootId, list = []) {
    const map = currentMap();
    const node = map.nodes[id];
    if (!node) return list;
    list.push(id);
    if (!node.collapsed) {
      node.children.forEach((childId) => getVisibleNodeIds(childId, list));
    }
    return list;
  }

  function drawLink(parent, child) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const startX = parent.x + NODE_WIDTH / 2 - 14;
    const endX = child.x - NODE_WIDTH / 2 + 14;
    const midX = (startX + endX) / 2;
    path.setAttribute("class", "link");
    path.setAttribute("d", `M ${startX} ${parent.y} C ${midX} ${parent.y}, ${midX} ${child.y}, ${endX} ${child.y}`);
    links.appendChild(path);
  }

  function selectNode(id, options = {}) {
    const { selectText = false, focus = false } = options;
    selectedId = id;
    updateSelectedClasses();
    const element = document.querySelector(`.node[data-id="${CSS.escape(id)}"]`);
    if (!element) return;
    element.contentEditable = "false";
    if (focus) {
      element.focus({ preventScroll: true });
    }
    if (selectText) {
      const range = document.createRange();
      range.selectNodeContents(element);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  function updateSelectedClasses() {
    document.querySelectorAll(".node").forEach((node) => node.classList.toggle("selected", node.dataset.id === selectedId));
  }

  function enterEditMode(id) {
    const element = document.querySelector(`.node[data-id="${CSS.escape(id)}"]`);
    if (!element || element.classList.contains("image-node")) return;
    selectedId = id;
    updateSelectedClasses();
    element.contentEditable = "true";
    element.focus({ preventScroll: true });
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function startDrag(event, id) {
    if (event.target.tagName === "A") return;
    event.stopPropagation();
    if (event.currentTarget.setPointerCapture) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    selectNode(id);
    drag = {
      id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      nodeX: currentMap().nodes[id].x,
      nodeY: currentMap().nodes[id].y,
      moved: false,
    };
  }

  function handlePointerMove(event) {
    if ((drag || pan) && event.buttons === 0) {
      stopPointerActions();
      return;
    }

    if (pan) {
      viewport.scrollLeft = pan.scrollLeft - (event.clientX - pan.startX);
      viewport.scrollTop = pan.scrollTop - (event.clientY - pan.startY);
      return;
    }

    if (!drag) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
    if (!drag.moved) return;

    const node = currentMap().nodes[drag.id];
    node.manual = true;
    node.x = clamp(drag.nodeX + dx, 70, Math.max(70, board.clientWidth - 70));
    node.y = clamp(drag.nodeY + dy, 35, Math.max(35, board.clientHeight - 35));
    renderCanvas();
    updateSelectedClasses();
  }

  function stopPointerActions() {
    if (drag?.moved) saveLibrary();
    drag = null;
    pan = null;
    viewport.classList.remove("panning");
  }

  function startPan(event) {
    if (event.target !== viewport && event.target !== board && event.target !== canvas) return;
    pan = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: viewport.scrollLeft,
      scrollTop: viewport.scrollTop,
    };
    viewport.classList.add("panning");
  }

  function setSidebarCollapsed(collapsed) {
    library.sidebarCollapsed = collapsed;
    app.classList.toggle("sidebar-collapsed", collapsed);
    saveLibrary();
    requestAnimationFrame(() => {
      layoutTree();
      renderCanvas();
    });
  }

  function fixLayout() {
    const map = currentMap();
    Object.values(map.nodes).forEach((node) => {
      node.manual = false;
    });
    layoutTree();
    renderCanvas();
    selectNode(selectedId);
    saveLibrary();
  }

  function toggleBranch(id) {
    const node = currentMap().nodes[id];
    if (!node || !node.children.length) return;
    node.collapsed = !node.collapsed;
    if (node.collapsed && !getVisibleNodeIds().includes(selectedId)) selectedId = id;
    layoutTree();
    renderCanvas();
    selectNode(selectedId);
    saveLibrary();
  }

  function handleCanvasDragOver(event) {
    if (hasDroppableData(event)) event.preventDefault();
  }

  function handleCanvasDrop(event) {
    if (!hasDroppableData(event)) return;
    event.preventDefault();
    clearDropTargets();
    handleDropData(event, selectedId);
  }

  function handleNodeDragOver(event, id) {
    if (!hasDroppableData(event)) return;
    event.preventDefault();
    clearDropTargets();
    selectNode(id);
    event.currentTarget.classList.add("drop-target");
  }

  function handleNodeDrop(event, parentId) {
    if (!hasDroppableData(event)) return;
    event.preventDefault();
    event.stopPropagation();
    clearDropTargets();
    handleDropData(event, parentId);
  }

  function hasDroppableData(event) {
    const transfer = event.dataTransfer;
    if (!transfer) return false;
    return transfer.files.length > 0 || Array.from(transfer.types).some((type) => ["text/uri-list", "text/plain"].includes(type));
  }

  function handleDropData(event, parentId) {
    const transfer = event.dataTransfer;
    if (transfer.files.length) {
      const file = transfer.files[0];
      if (file.type.startsWith("image/")) {
        addImageChild(parentId, file);
        return;
      }
      addFilePlaceholder(parentId, file.name);
      return;
    }

    const uri = transfer.getData("text/uri-list") || extractFirstUrl(transfer.getData("text/plain"));
    if (uri) {
      addLinkChild(parentId, uri);
    }
  }

  async function addLinkChild(parentId, url) {
    const node = makeNode(parentId);
    node.text = readableUrlTitle(url);
    node.url = url;
    currentMap().nodes[parentId].collapsed = false;
    currentMap().nodes[parentId].children.push(node.id);
    currentMap().nodes[node.id] = node;
    layoutTree();
    renderCanvas();
    selectNode(node.id);
    saveLibrary();

    const title = await fetchPageTitle(url);
    if (title && currentMap().nodes[node.id]) {
      currentMap().nodes[node.id].text = title;
      renderCanvas();
      selectNode(node.id);
      saveLibrary();
    }
  }

  function addFilePlaceholder(parentId, fileName) {
    const node = makeNode(parentId);
    node.text = `${fileName}\nTo attach this file, upload it somewhere reachable and drop or paste that link here.`;
    currentMap().nodes[parentId].collapsed = false;
    currentMap().nodes[parentId].children.push(node.id);
    currentMap().nodes[node.id] = node;
    layoutTree();
    renderCanvas();
    selectNode(node.id);
    saveLibrary();
  }

  async function addImageChild(parentId, file) {
    const imageData = await resizeImageFile(file, 128);
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const node = makeNode(parentId);
      node.type = "image";
      node.text = file.name || "Image";
      node.imageData = imageData || reader.result;
      currentMap().nodes[parentId].collapsed = false;
      currentMap().nodes[parentId].children.push(node.id);
      currentMap().nodes[node.id] = node;
      layoutTree();
      renderCanvas();
      selectNode(node.id);
      saveLibrary();
    });
    reader.readAsDataURL(file);
  }

  function resizeImageFile(file, smallestSide) {
    return new Promise((resolve) => {
      const image = new Image();
      const url = URL.createObjectURL(file);

      image.addEventListener("load", () => {
        const scale = Math.min(1, smallestSide / Math.min(image.naturalWidth, image.naturalHeight));
        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));
        const canvasElement = document.createElement("canvas");
        const context = canvasElement.getContext("2d");

        canvasElement.width = width;
        canvasElement.height = height;
        context.drawImage(image, 0, 0, width, height);
        URL.revokeObjectURL(url);
        resolve(canvasElement.toDataURL("image/jpeg", 0.82));
      });

      image.addEventListener("error", () => {
        URL.revokeObjectURL(url);
        resolve("");
      });

      image.src = url;
    });
  }

  function exportDrawio() {
    const map = currentMap();
    const cells = [
      '<mxCell id="0"/>',
      '<mxCell id="1" parent="0"/>',
    ];

    Object.values(map.nodes).forEach((node) => {
      const label = escapeXml(node.url ? `${node.text}\n${node.url}` : node.text);
      const style = node.type === "image" ? "rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;" : `ellipse;whiteSpace=wrap;html=1;fillColor=${node.color};strokeColor=#455A64;`;
      const width = node.type === "image" ? 220 : 160;
      const height = node.type === "image" ? 150 : 76;
      cells.push(
        `<mxCell id="${escapeXml(node.id)}" value="${label}" style="${style}" vertex="1" parent="1"><mxGeometry x="${Math.round(node.x)}" y="${Math.round(node.y)}" width="${width}" height="${height}" as="geometry"/></mxCell>`,
      );
    });

    Object.values(map.nodes).forEach((node) => {
      node.children.forEach((childId) => {
        cells.push(
          `<mxCell id="edge-${escapeXml(node.id)}-${escapeXml(childId)}" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeColor=#607D8B;" edge="1" parent="1" source="${escapeXml(node.id)}" target="${escapeXml(childId)}"><mxGeometry relative="1" as="geometry"/></mxCell>`,
        );
      });
    });

    const xml = `<mxfile host="Mindful" modified="${new Date().toISOString()}" agent="Mindful ${APP_VERSION}" version="${APP_VERSION}"><diagram name="${escapeXml(map.title)}"><mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1100" pageHeight="850" math="0" shadow="0"><root>${cells.join("")}</root></mxGraphModel></diagram></mxfile>`;
    downloadFile(`${safeFileName(map.title)}.drawio`, xml, "application/xml");
  }

  function exportInteractiveHtml() {
    const map = currentMap();
    const html = buildInteractiveHtmlDocument(map, false);
    downloadFile(`${safeFileName(map.title)}.html`, html, "text/html");
  }

  function printCurrentMap() {
    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(buildInteractiveHtmlDocument(currentMap(), true));
    printWindow.document.close();
  }

  function buildInteractiveHtmlDocument(map, autoPrint) {
    const payload = JSON.stringify(map).replace(/</g, "\\u003c");
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(map.title)} - Mindful</title>
<style>
body{margin:0;font-family:"Trebuchet MS",Arial,sans-serif;color:#263238;background:#fff;overflow:auto}
#board{position:relative;width:2400px;height:1600px;background:#fff}
.node{position:absolute;min-width:142px;min-height:62px;max-width:260px;padding:13px 24px;border:2px solid rgba(38,50,56,.5);border-radius:999px;display:flex;align-items:center;justify-content:center;text-align:center;white-space:pre-wrap;overflow-wrap:anywhere;transform:translate(-50%,-50%);box-shadow:0 8px 18px rgba(38,50,56,.12);font-size:20px;font-weight:700}
.image-node{width:220px;min-height:150px;border-radius:28px;gap:8px;flex-direction:column;font-size:15px}
.image-node img{max-width:196px;max-height:112px;border-radius:16px;object-fit:contain}
svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.link{fill:none;stroke:rgba(69,90,100,.45);stroke-width:3;stroke-linecap:round}
 @media print { body{overflow:visible} }
</style>
</head>
<body>
<div id="board"><svg id="links"></svg><div id="nodes"></div></div>
<script>
const map=${payload};
const links=document.getElementById("links");
const nodes=document.getElementById("nodes");
function visible(id=map.rootId,list=[]){const n=map.nodes[id];if(!n)return list;list.push(id);if(!n.collapsed)n.children.forEach(c=>visible(c,list));return list}
function path(parent,child){const p=document.createElementNS("http://www.w3.org/2000/svg","path");const sx=parent.x+66,ex=child.x-66,mx=(sx+ex)/2;p.setAttribute("class","link");p.setAttribute("d",\`M \${sx} \${parent.y} C \${mx} \${parent.y}, \${mx} \${child.y}, \${ex} \${child.y}\`);links.appendChild(p)}
const ids=new Set(visible());ids.forEach(id=>{const n=map.nodes[id];if(!n.collapsed)n.children.filter(c=>ids.has(c)).forEach(c=>path(n,map.nodes[c]))});
ids.forEach(id=>{const n=map.nodes[id];const el=document.createElement("div");el.className="node"+(n.type==="image"?" image-node":"");el.style.left=n.x+"px";el.style.top=n.y+"px";el.style.background=n.color||"#fff6b8";if(n.type==="image"&&n.imageData){const img=document.createElement("img");img.src=n.imageData;img.alt=n.text||"Image";const cap=document.createElement("span");cap.textContent=n.text||"Image";el.append(img,cap)}else if(n.url){const a=document.createElement("a");a.href=n.url;a.target="_blank";a.rel="noreferrer";a.textContent=n.text;el.appendChild(a)}else{el.textContent=n.text}nodes.appendChild(el)});
${autoPrint ? 'window.addEventListener("load",()=>{window.print();setTimeout(()=>window.close(),300);});' : ""}
</script>
</body>
</html>`;
  }

  function downloadFile(fileName, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function fetchPageTitle(url) {
    try {
      const response = await fetch(url, { mode: "cors" });
      if (!response.ok) return "";
      const html = await response.text();
      const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      return match ? decodeHtml(match[1].trim()) : "";
    } catch {
      return "";
    }
  }

  function readableUrlTitle(url) {
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace(/^www\./, "") || url;
    } catch {
      return url;
    }
  }

  function extractFirstUrl(text) {
    const match = text.match(/https?:\/\/\S+/i);
    return match ? match[0] : "";
  }

  function decodeHtml(value) {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = value;
    return textarea.value;
  }

  function clearDropTargets() {
    document.querySelectorAll(".drop-target").forEach((node) => node.classList.remove("drop-target"));
  }

  function centerInitialView() {
    viewport.scrollLeft = Math.max(0, boardCenterX() - viewport.clientWidth / 2);
    viewport.scrollTop = Math.max(0, boardCenterY() - viewport.clientHeight / 2);
  }

  function boardCenterX() {
    return (board?.clientWidth || 2400) / 2;
  }

  function boardCenterY() {
    return (board?.clientHeight || 1600) / 2;
  }

  function getNodeHeight(node) {
    return node?.type === "image" ? IMAGE_NODE_HEIGHT : TEXT_NODE_HEIGHT;
  }

  function safeFileName(value) {
    return (value || "mindful-map").trim().replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "") || "mindful-map";
  }

  function escapeXml(value) {
    return String(value ?? "").replace(/[<>&'"]/g, (char) => ({
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      "'": "&apos;",
      '"': "&quot;",
    })[char]);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[<>&"]/g, (char) => ({
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      '"': "&quot;",
    })[char]);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
})();
