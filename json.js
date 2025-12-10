const json = {
    exportJSON() {
        selection.clear();
        const data = {
            elements: elements.all,
            config: config.values,
            numbering: {
                speakers: numbering.speakers.map(e => e.id),
                mics: numbering.mics.map(e => e.id),
                beams: Object.fromEntries(
                    Object.entries(numbering.beams).map(([micId, arr]) => [micId, arr.map(b => b.id)])
                )
            }
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "voicelift-project.json";
        a.click();
        URL.revokeObjectURL(url);
    },

    importJSON(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (evt) {
            try {
                const data = JSON.parse(evt.target.result);
                elements.all = data.elements || [];
                // --- KLUCZOWA POPRAWKA ---
                elements.nextId = Math.max(0, ...elements.all.map(e => e.id)) + 1;
                // --- ------------------- ---
                elements.renumberAll();
                config.values = {...config.values, ...(data.config || {})};
                if (data.numbering) {
                    numbering.speakers = (data.numbering.speakers || []).map(id =>
                        elements.getById(id)
                    ).filter(e => e);
                    numbering.mics = (data.numbering.mics || []).map(id =>
                        elements.getById(id)
                    ).filter(e => e);
                    numbering.beams = {};
                    if (data.numbering.beams) {
                        Object.entries(data.numbering.beams).forEach(([micId, ids]) => {
                            numbering.beams[micId] = ids.map(id => elements.getById(id)).filter(e => e);
                        });
                    }
                } else {
                    numbering.reset();
                }
                selection.clear();
                selection.validateSelection();
                gui.setBoardSize(config.values.boardWidth, config.values.boardHeight);
                gui.render();
            } catch (e) {
                alert("Błędny plik JSON.");
            }
            event.target.value = "";
        };
        reader.readAsText(file);
        undoManager.push();
    }

};
