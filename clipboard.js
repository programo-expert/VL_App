const clipboard = {
    buffer: [],

    copy() {
        // Kopiuj wszystkie zaznaczone elementy wraz z ich powiązaniami do innych zaznaczonych
        if (!selection.selectedIds.length) return;
        const ids = selection.selectedIds;
        // Kopiujemy tylko te elementy, które są wybrane
        const copied = elements.all.filter(e => ids.includes(e.id))
            .map(e => JSON.parse(JSON.stringify(e))); // głęboka kopia

        // Dla każdej relacji: zostaw tylko takie, które wskazują na inny element z tej samej grupy
        const idSet = new Set(ids);
        copied.forEach(e => {
            if (Array.isArray(e.relatedIds)) {
                e.relatedIds = e.relatedIds.filter(id => idSet.has(id));
            }
        });
        this.buffer = copied;
    },

    paste() {
        if (!this.buffer.length) return;

        // Stwórz mapę: stareId => newId
        const idMap = {};
        this.buffer.forEach(e => {
            idMap[e.id] = elements.nextId++;
        });

        // Wklej elementy z nowymi ID i relacjami
        const pasted = this.buffer.map(e => {
            const el = JSON.parse(JSON.stringify(e));
            el.id = idMap[e.id];
            // Przesunięcie
            el.x += 40;
            el.y += 40;
            // Nowe powiązania
            if (Array.isArray(el.relatedIds)) {
                el.relatedIds = el.relatedIds
                    .map(oldId => idMap[oldId])
                    .filter(newId => newId); // tylko powiązania do skopiowanych
            }
            // Jeśli beam, sprawdź czy micId jest kopiowany
            if (el.type === "beam" && el.micId && idMap[el.micId]) {
                el.micId = idMap[el.micId];
            }
            return el;
        });

        // Dodaj do elements.all
        elements.all = elements.all.concat(pasted);
        elements.renumberAll();

        // Zaznacz wklejone
        selection.selectedIds = pasted.map(e => e.id);
        selection.validateSelection();
        gui.render();
        undoManager.push();
    }
};
