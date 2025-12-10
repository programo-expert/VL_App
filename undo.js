const undoManager = {
    stack: [],
    redoStack: [],
    max: 100,

    push() {
        // Zapisz snapshot tylko jeśli stan się zmienił
        const snapshot = JSON.stringify({
            elements: elements.all,
            config: config.values
        });
        if (this.stack.length === 0 || this.stack[this.stack.length - 1] !== snapshot) {
            this.stack.push(snapshot);
            if (this.stack.length > this.max) this.stack.shift();
            // Każda akcja kasuje REDO
            this.redoStack = [];
        }
    },

    undo() {
        if (this.stack.length < 2) return;
        const curr = this.stack.pop();
        this.redoStack.push(curr);
        this._restore(this.stack[this.stack.length - 1]);
    },

    redo() {
        if (!this.redoStack.length) return;
        const next = this.redoStack.pop();
        this.stack.push(next);
        this._restore(next);
    },

    _restore(jsonStr) {
        try {
            const data = JSON.parse(jsonStr);
            elements.all = JSON.parse(JSON.stringify(data.elements));
            config.values = { ...config.values, ...data.config };
            numbering.reset();
            gui.setBoardSize(config.values.boardWidth, config.values.boardHeight);
            gui.render();
        } catch (e) {
            alert("Błąd podczas przywracania stanu.");
        }
    }
};
