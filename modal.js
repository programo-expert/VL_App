const modal = {
    openElementModal(el) {
        distance.recalculateAll(); // <-- DODAJ NA POCZĄTKU
        let content = `<div class="modal-content">
      <h3>${el.name || ""}</h3>
      <label>Numer: <input id="modal-number" type="number" value="${el.number || ""}" disabled></label><br>`;

        if (el.type === 'beam') {
            // Wiązka – wybierz mikrofon, do którego należy
            let micOptions = elements.all.filter(e => e.type === "mic").map(mic =>
                `<option value="${mic.id}" ${mic.id === el.micId ? 'selected' : ''}>${mic.name}</option>`
            ).join("");
            content += `<label>Mikrofon: <select id="modal-mic">${micOptions}</select></label><br>`;
        }
        if (el.type === 'line') {
            content += `
                <label>Długość (m): <input id="modal-len" type="number" step="0.01" min="0.05" value="${el.lengthM}"></label><br>
                <label>Szerokość (m): <input id="modal-wid" type="number" step="0.01" min="0.01" value="${el.widthM}"></label><br>
                <label>Orientacja:
                    <select id="modal-orient">
                        <option value="horizontal" ${el.orientation === 'horizontal' ? 'selected' : ''}>Pozioma</option>
                        <option value="vertical" ${el.orientation === 'vertical' ? 'selected' : ''}>Pionowa</option>
                    </select>
                </label><br>
                `;
        }

        // Zbierz powiązania wg typów
        const grouped = {
            speaker: [],
            mic: [],
            beam: []
        };
        elements.all.filter(e2 => e2.id !== el.id).forEach(e2 => {
            if (grouped[e2.type]) {
                grouped[e2.type].push(e2);
            }
        });

        // --- GŁÓWNY HTML MODALA Z POWIĄZANIAMI ---
        content += `<div><strong>Powiązania do obliczeń:</strong><div class="rel-row">`;

        // --- Głośniki ---
        if (grouped.speaker.length) {
            content += `<div class="rel-col"><b>Głośniki:</b><div class="checkbox-list">`;
            // Zaznacz wszystkie
            content += `<label>
                <input type="checkbox" class="modal-rel-all" data-type="speaker">
                <b>Zaznacz wszystkie</b>
            </label><br>`;
            grouped.speaker.forEach(e2 => {
                content += `<label>
                    <input type="checkbox" class="modal-rel" data-type="speaker" value="${e2.id}"
                        ${el.relatedIds && el.relatedIds.includes(e2.id) ? 'checked' : ''}>
                    ${e2.name}
                </label><br>`;
            });
            content += `</div></div>`;
        }
        // --- Mikrofony ---
        if (grouped.mic.length) {
            content += `<div class="rel-col"><b>Mikrofony:</b><div class="checkbox-list">`;
            content += `<label>
                <input type="checkbox" class="modal-rel-all" data-type="mic">
                <b>Zaznacz wszystkie</b>
            </label><br>`;
            grouped.mic.forEach(e2 => {
                content += `<label>
                    <input type="checkbox" class="modal-rel" data-type="mic" value="${e2.id}"
                        ${el.relatedIds && el.relatedIds.includes(e2.id) ? 'checked' : ''}>
                    ${e2.name}
                </label><br>`;
            });
            content += `</div></div>`;
        }
        // --- Wiązki ---
        if (grouped.beam.length) {
            // Sortowanie względem numeru mikrofonu, a potem własnego numeru
            grouped.beam.sort((a, b) => {
                const ma = elements.getById(a.micId);
                const mb = elements.getById(b.micId);
                if (ma && mb) {
                    if (ma.number !== mb.number) return ma.number - mb.number;
                    return (a.number || 0) - (b.number || 0);
                }
                return 0;
            });
            content += `<div class="rel-col"><b>Wiązki:</b><div class="checkbox-list">`;
            content += `<label>
                <input type="checkbox" class="modal-rel-all" data-type="beam">
                <b>Zaznacz wszystkie</b>
            </label><br>`;
            grouped.beam.forEach(e2 => {
                content += `<label>
                    <input type="checkbox" class="modal-rel" data-type="beam" value="${e2.id}"
                        ${el.relatedIds && el.relatedIds.includes(e2.id) ? 'checked' : ''}>
                    ${e2.name}
                </label><br>`;
            });
            content += `</div></div>`;
        }

        content += `
      <button onclick="modal.save(${el.id})">Zapisz</button>
      <button onclick="modal.close()">Zamknij</button>
      <button onclick="modal.remove(${el.id})" style="float:right;color:red;">Usuń</button>
    </div>`;
        const div = document.getElementById('modal');
        div.innerHTML = content;
        div.classList.remove('hidden');
        window.onkeydown = e => {
            if (e.key === "Escape") modal.close();
        };

        // --- Funkcja obsługująca "Zaznacz wszystkie" ---
        setTimeout(() => {
            document.querySelectorAll('.modal-rel-all').forEach(masterCheckbox => {
                masterCheckbox.addEventListener('change', function () {
                    const type = this.getAttribute('data-type');
                    const checkboxes = document.querySelectorAll('.modal-rel[data-type="' + type + '"]');
                    checkboxes.forEach(cb => {
                        cb.checked = masterCheckbox.checked;
                    });
                });
                // Synchronizuj stan "Zaznacz wszystkie" z pojedynczymi
                const type = masterCheckbox.getAttribute('data-type');
                const checkboxes = document.querySelectorAll('.modal-rel[data-type="' + type + '"]');
                const updateMaster = () => {
                    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
                    masterCheckbox.checked = allChecked;
                };
                checkboxes.forEach(cb => {
                    cb.addEventListener('change', updateMaster);
                });
                // Ustaw stan początkowy
                updateMaster();
            });
        }, 0);
    },

    save(id) {
        // --- Zbierz wszystkie elementy do masowej edycji (jeśli multi-select) ---
        const el = elements.getById(id);
        let targets = [el];
        if (
            Array.isArray(selection.selectedIds) &&
            selection.selectedIds.length > 1
        ) {
            const sameType = selection.selectedIds
                .map(eid => elements.getById(eid))
                .filter(e2 => e2 && e2.type === el.type);
            if (sameType.length > 1) targets = sameType;
        }

        // Zbieramy nowe relacje ze wszystkich checkboxów z modala
        const newRels = [...document.querySelectorAll('.modal-rel:checked')].map(c => parseInt(c.value));

        targets.forEach(t => {
            // Zmiana mikrofonu dla wiązki (jeśli dotyczy)
            if (t.type === "beam") {
                const newMicId = parseInt(document.getElementById('modal-mic').value);
                if (t.micId !== newMicId) {
                    t.micId = newMicId;
                    elements.renumberAll();
                }
            }
            if (t.type === "line") {
                t.lengthM = parseFloat(document.getElementById('modal-len').value) || 1;
                t.widthM = parseFloat(document.getElementById('modal-wid').value) || 0.1;
                t.orientation = document.getElementById('modal-orient').value || "horizontal";
            }

            // Zapamiętaj stare relacje, by zsynchronizować dwukierunkowo
            const prevRels = t.relatedIds || [];

            // 1. Aktualizuj własną listę
            t.relatedIds = newRels.slice();

            // 2. Synchronizuj drugą stronę (każdy id z prevRels i newRels)
            const allRelIds = Array.from(new Set([...prevRels, ...newRels]));
            allRelIds.forEach(relId => {
                const relEl = elements.getById(relId);
                if (!relEl) return;
                relEl.relatedIds = relEl.relatedIds || [];
                if (newRels.includes(relId)) {
                    // Dodano relację: upewnij się, że po drugiej stronie jest
                    if (!relEl.relatedIds.includes(t.id)) {
                        relEl.relatedIds.push(t.id);
                    }
                } else {
                    // Usunięto relację: usuń po drugiej stronie
                    relEl.relatedIds = relEl.relatedIds.filter(id2 => id2 !== t.id);
                    if (relEl.relatedIds.length === 0) delete relEl.relatedIds;
                }
            });
        });

        undoManager.push();
        modal.close();
        gui.render();
    },


    remove(id) {
        elements.remove(id);
        modal.close();
        gui.render();
    },

    close() {
        document.getElementById('modal').classList.add('hidden');
        window.onkeydown = null;
    }
};
