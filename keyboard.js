const keyboard = {
    init() {
        document.addEventListener("keydown", this.onKeyDown);
    },
    onKeyDown(e) {
        if (document.getElementById('modal') && !document.getElementById('modal').classList.contains('hidden')) return;
        let dx = 0, dy = 0;
        if (e.key === "ArrowLeft") dx = -1;
        if (e.key === "ArrowRight") dx = 1;
        if (e.key === "ArrowUp") dy = -1;
        if (e.key === "ArrowDown") dy = 1;
        if (dx || dy) {
            selection.selectedIds.forEach(id => {
                const el = elements.getById(id);
                elements.move(el, el.x + dx, el.y + dy);
            });
            gui.render();
            gui.showSelectedCoords();
            e.preventDefault();
        }
        if (e.key === "Delete" && selection.selectedIds.length > 0) {
            selection.deleteSelected();
            gui.render();
            gui.showSelectedCoords();
            e.preventDefault();
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
            undoManager.undo();
            e.preventDefault();
            return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
            undoManager.redo();
            e.preventDefault();
            return;
        }
        // Ctrl+C: kopiuj
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
            clipboard.copy();
            e.preventDefault();
            return;
        }
        // Ctrl+V: wklej
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
            clipboard.paste();
            e.preventDefault();
            return;
        }


    }
};
