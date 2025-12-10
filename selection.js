const selection = {
    selectedIds: [],

    init() {
        this.selectedIds = [];
    },
    select(id, multi = false) {
        if (multi) {
            if (!this.selectedIds.includes(id)) this.selectedIds.push(id);
        } else {
            this.selectedIds = [id];
        }
        this.validateSelection();
        gui.render();
    },
    clear() {
        this.selectedIds = [];
        gui.render();
    },
    isSelected(id) {
        return this.selectedIds.includes(id);
    },
    deleteSelected() {
        let ids = [...this.selectedIds];
        this.clear();
        ids.forEach(id => elements.remove(id));
        gui.render();
    },
    validateSelection() {
        // Usuwa z selectedIds te ID, które już nie istnieją
        this.selectedIds = this.selectedIds.filter(id =>
            elements.all.some(e => e.id === id)
        );
    }
};
