const gui = {
    scale: 1,
    width: 1400,
    height: 900,
    grid: 0.01,
    dragging: false,
    dragOffset: {x: 0, y: 0},
    dragElement: null,

    // Obsługa dragowania końcówki linii
    lineDrag: {
        el: null,
        edge: null,
        startMouse: null,
        startLength: null
    },

    // BOX SELECT (prostokątne zaznaczanie)
    boxSelecting: false,
    boxSelectStart: null,
    boxSelectCurrent: null,

    // Grupowy drag
    dragStartPositions: null,
    dragReferenceId: null,

    init() {
        this.width = config.values.boardWidth || 1400;
        this.height = config.values.boardHeight || 900;
        this.canvas = document.getElementById('board');
        this.ctx = this.canvas.getContext('2d');
        this.setBoardSize(this.width, this.height);
        window.addEventListener('resize', this.centerCoordsBox.bind(this));
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.canvas.addEventListener('dblclick', this.onDoubleClick.bind(this));
        this.canvas.addEventListener('wheel', this.onWheel.bind(this));
        this.render();
    },

    setBoardSize(w, h) {
        this.width = w;
        this.height = h;
        this.canvas.width = w;
        this.canvas.height = h;
        this.centerCoordsBox();
        this.render();
    },

    centerCoordsBox() {
    },

    addElement(type) {
        if (type === 'beam') {
            const selectedMics = selection.selectedIds
                .map(id => elements.getById(id))
                .filter(e => e && e.type === 'mic');
            if (selectedMics.length !== 1) {
                alert("Aby dodać wiązkę, zaznacz najpierw jeden mikrofon!");
                return;
            }
            const mic = selectedMics[0];

            // Sprawdzenie liczby wiązek
            const beamsForMic = elements.all.filter(
                e => e.type === 'beam' && e.micId === mic.id
            );
            if (beamsForMic.length >= 8) {
                alert("Maksymalna liczba wiązek dla jednego mikrofonu to 8.");
                return;
            }

            const pos = {x: mic.x, y: mic.y}; // <-- dokładnie tam, gdzie mikrofon!
            const beam = elements.create('beam', pos, mic.id);
            selection.selectedIds = [beam.id];
            selection.validateSelection();
            this.render();
            return;
        }
        if (type === 'line') {
            const pos = utils.centerOfViewportOnCanvas();
            const line = elements.create('line', pos);
            selection.selectedIds = [line.id];
            selection.validateSelection();
            this.render();
            undoManager.push();
            return;
        }

        const pos = utils.centerOfViewportOnCanvas();
        const el = elements.create(type, pos);
        selection.selectedIds = [el.id];
        selection.validateSelection();
        this.render();
        undoManager.push();
    },

    render() {
        distance.recalculateAll();
        this.ctx.save();
        this.ctx.fillStyle = config.values.canvasBgColor || "#fff";
        this.ctx.fillRect(0, 0, this.width, this.height);
        this.ctx.restore();

        this.drawGrid();
        elements.all.forEach(el => elements.draw(el, this.ctx, selection.isSelected(el.id)));
        distance.drawAllDistances(this.ctx);
        this.showSelectedCoords();

        // Rysowanie prostokąta zaznaczenia (box select)
        if (this.boxSelecting && this.boxSelectStart && this.boxSelectCurrent) {
            this.ctx.save();
            const rect = this._getBoxSelectRect();
            this.ctx.strokeStyle = "#4a90e2";
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([6, 5]);
            this.ctx.strokeRect(rect.x1, rect.y1, rect.x2 - rect.x1, rect.y2 - rect.y1);
            this.ctx.fillStyle = "rgba(74, 144, 226, 0.12)";
            this.ctx.fillRect(rect.x1, rect.y1, rect.x2 - rect.x1, rect.y2 - rect.y1);
            this.ctx.restore();
        }
    },

    drawGrid() {
        this.ctx.save();
        this.ctx.strokeStyle = config.values.canvasGridColor || "#eaeaea";
        const gridWidthPx = config.values.gridWidth * 100;
        const gridHeightPx = config.values.gridHeight * 100;
        for (let x = 0; x <= this.width; x += gridWidthPx) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();
        }
        for (let y = 0; y <= this.height; y += gridHeightPx) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }
        this.ctx.restore();
    },

    onMouseDown(e) {
        const pos = utils.getMousePos(this.canvas, e, 1);

        // Najpierw sprawdź uchwyty końcówek linii
        let handledEdge = false;
        for (const el of [...elements.all].reverse()) {
            if (el.type === "line") {
                const edge = elements.getLineEdgeUnderMouse(el, pos);
                if (edge) {
                    this.lineDrag = {
                        el,
                        edge,
                        startMouse: pos,
                        startLength: el.lengthM
                    };
                    selection.select(el.id, e.shiftKey);
                    this.render();
                    handledEdge = true;
                    break;
                }
            }
        }
        if (handledEdge) return;

        const el = elements.getAtPosition(pos);
        if (el) {
            // Grupowy drag – jeśli wybrano kilka
            if (selection.isSelected(el.id) && selection.selectedIds.length > 1) {
                this.dragging = true;
                this.dragElement = null;
                this.dragStartPositions = selection.selectedIds.map(id => {
                    const obj = elements.getById(id);
                    return obj ? {id: obj.id, x: obj.x, y: obj.y} : null;
                }).filter(Boolean);
                this.dragReferenceId = el.id; // <--- kluczowe!
                this.dragOffset = {
                    x: pos.x - el.x,
                    y: pos.y - el.y
                };
            } else {
                this.dragging = true;
                this.dragElement = el;
                this.dragOffset = {x: pos.x - el.x, y: pos.y - el.y};
                selection.select(el.id, e.shiftKey);
            }
            this.render();
        } else {
            // Zaznaczanie prostokątne (tylko lewy przycisk myszy)
            if (e.button === 0) {
                this.boxSelecting = true;
                this.boxSelectStart = pos;
                this.boxSelectCurrent = pos;
                this.render();
            }
        }

        // PANEL INFO GŁOŚNIKA/WIĄZKI
        if (el && el.type === "speaker") {
            gui.showSpeakerInfo(el);
        } else if (el && el.type === "beam") {
            gui.showBeamInfo(el);
        } else {
            gui.hideSpeakerInfo();
        }
    },

    onMouseMove(e) {
        const pos = utils.getMousePos(this.canvas, e, 1);

        // Drag grupowy — offset liczony względem klikniętego!
        if (this.dragging && !this.dragElement && this.dragStartPositions && this.dragStartPositions.length > 1) {
            const refStart = this.dragStartPositions.find(p => p.id === this.dragReferenceId);
            const dx = pos.x - refStart.x - this.dragOffset.x;
            const dy = pos.y - refStart.y - this.dragOffset.y;
            this.dragStartPositions.forEach(start => {
                const el = elements.getById(start.id);
                if (el) {
                    elements.move(el, start.x + dx, start.y + dy);
                }
            });
            this.render();
            this.showSelectedCoords();
            return;
        }

        // Obsługa dragowania końcówki linii
        if (this.lineDrag && this.lineDrag.el) {
            const el = this.lineDrag.el;
            let deltaPx;
            if (el.orientation === "horizontal") {
                deltaPx = pos.x - el.x;
            } else {
                deltaPx = pos.y - el.y;
            }
            if (this.lineDrag.edge === "start") deltaPx = -deltaPx;
            let newHalfLength = Math.abs(deltaPx);
            let newLengthM = Math.max(0.05, newHalfLength / 50); // min 5cm
            el.lengthM = newLengthM;
            this.render();
            return;
        }

        // Drag pojedynczy
        if (this.dragging && this.dragElement) {
            elements.move(this.dragElement, pos.x - this.dragOffset.x, pos.y - this.dragOffset.y);
            this.render();
            this.showSelectedCoords();

            const box = document.getElementById('speaker-info-box');
            if (box && box.style.display !== 'none') {
                if (this.dragElement.type === "speaker") {
                    gui.showSpeakerInfo(this.dragElement);
                }
                if (this.dragElement.type === "beam") {
                    gui.showBeamInfo(this.dragElement);
                }
            }
        }

        // Prostokątne zaznaczanie
        if (this.boxSelecting) {
            this.boxSelectCurrent = pos;
            this.render();
        }

        // Obsługa kursora przy uchwycie linii
        if (!this.dragging && !(this.lineDrag && this.lineDrag.el) && !this.boxSelecting) {
            const pos2 = utils.getMousePos(this.canvas, e, 1);
            const el2 = elements.getAtPosition(pos2);
            if (el2 && el2.type === "line") {
                const edge = elements.getLineEdgeUnderMouse(el2, pos2);
                if (edge) {
                    this.canvas.style.cursor = (el2.orientation === "horizontal") ? "ew-resize" : "ns-resize";
                    return;
                }
            }
            this.canvas.style.cursor = "";
        }
    },

    onMouseUp(e) {
        // Jeśli trwa zaznaczanie prostokątne
        if (this.boxSelecting) {
            this.boxSelecting = false;
            const rect = this._getBoxSelectRect();
            // Zaznacz wszystkie elementy wewnątrz prostokąta (mic, speaker, beam)
            const boxElements = elements.all.filter(el => {
                if (!["speaker", "mic", "beam"].includes(el.type)) return false;
                return (
                    el.x >= rect.x1 && el.x <= rect.x2 &&
                    el.y >= rect.y1 && el.y <= rect.y2
                );
            }).map(el => el.id);
            if (boxElements.length) {
                // Shift dodaje do selection
                if (window.event && window.event.shiftKey) {
                    selection.selectedIds = Array.from(new Set([...selection.selectedIds, ...boxElements]));
                } else {
                    selection.selectedIds = boxElements;
                }
                selection.validateSelection();
                this.render();
            } else {
                // Jeśli nie zaznaczono nic — wyczyść selection
                selection.clear();
            }
            this.boxSelectStart = null;
            this.boxSelectCurrent = null;
            return;
        }

        if (this.lineDrag && this.lineDrag.el) {
            undoManager.push();
            this.lineDrag = {el: null, edge: null, startMouse: null, startLength: null};
            return;
        }

        // Drag grupowy
        if (this.dragStartPositions && this.dragStartPositions.length > 1) {
            undoManager.push();
            this.dragStartPositions = null;
            this.dragReferenceId = null;
        }

        this.dragging = false;
        this.dragElement = null;
        undoManager.push();
    },

    onDoubleClick(e) {
        const pos = utils.getMousePos(this.canvas, e, 1);
        const el = elements.getAtPosition(pos);
        if (el) {
            modal.openElementModal(el);
        }
    },

    onWheel(e) {
        e.preventDefault();
    },

    showSelectedCoords() {
        const coordsBox = document.getElementById('coords-box');
        if (selection.selectedIds.length === 1) {
            const el = elements.getById(selection.selectedIds[0]);
            if (!el) {
                coordsBox.style.display = 'none';
                return;
            }
            const x = (el.x * 0.01).toFixed(2);
            const y = (el.y * 0.01).toFixed(2);
            coordsBox.textContent = `${el.name || ''}\nX: ${x} m\nY: ${y} m`;
            coordsBox.style.display = 'block';
        } else {
            coordsBox.style.display = 'none';
        }
    },

    // PANEL INFO GŁOŚNIKA
    showSpeakerInfo(speaker) {
        const box = document.getElementById('speaker-info-box');
        const title = document.getElementById('speaker-info-title');
        const table = document.getElementById('speaker-info-table');
        title.textContent = `${speaker.name} – parametry wszystkich powiązanych wiązek`;

        // Tylko połączone wiązki!
        const beams = elements.all.filter(
            e => e.type === "beam" &&
                e.calc && e.calc[speaker.id] &&
                Array.isArray(speaker.relatedIds) &&
                speaker.relatedIds.includes(e.id)
        );
        let html = '';
        if (beams.length === 0) {
            html = '<div style="color:#888;font-size:14px">Brak powiązanych wiązek dla tego głośnika.</div>';
        } else {
            html = `<table style="width:100%;font-size:15px;border-collapse:collapse;">
        <tr style="background:#f5f5f5">
            <th style="padding:6px 8px">Wiązka</th>
            <th style="padding:6px 8px">gainSymetrix [dB]</th>
            <th style="padding:6px 8px">delaySymetrix [ms]</th>
        </tr>`;
            beams.forEach(beam => {
                const c = beam.calc[speaker.id];
                html += `<tr>
            <td style="padding:4px 8px">${beam.name}</td>
            <td style="padding:4px 8px">${c.gainSymetrix}</td>
            <td style="padding:4px 8px">${c.delaySymetrix}</td>
        </tr>`;
            });
            html += '</table>';
        }
        table.innerHTML = html;
        box.style.display = 'block';
    },

// PANEL INFO WIĄZKI
    showBeamInfo(beam) {
        const box = document.getElementById('speaker-info-box');
        const title = document.getElementById('speaker-info-title');
        const table = document.getElementById('speaker-info-table');
        title.textContent = `${beam.name} – parametry dla wszystkich powiązanych głośników`;

        // Tylko połączone głośniki!
        const speakers = elements.all.filter(
            e => e.type === "speaker" &&
                beam.calc && beam.calc[e.id] &&
                Array.isArray(beam.relatedIds) &&
                beam.relatedIds.includes(e.id)
        );
        let html = '';
        if (speakers.length === 0) {
            html = '<div style="color:#888;font-size:14px">Brak powiązanych głośników dla tej wiązki.</div>';
        } else {
            html = `<table style="width:100%;font-size:15px;border-collapse:collapse;">
        <tr style="background:#f5f5f5">
            <th style="padding:6px 8px">Głośnik</th>
            <th style="padding:6px 8px">gainSymetrix [dB]</th>
            <th style="padding:6px 8px">delaySymetrix [ms]</th>
        </tr>`;
            speakers.forEach(speaker => {
                const c = beam.calc[speaker.id];
                html += `<tr>
            <td style="padding:4px 8px">${speaker.name}</td>
            <td style="padding:4px 8px">${c.gainSymetrix}</td>
            <td style="padding:4px 8px">${c.delaySymetrix}</td>
        </tr>`;
            });
            html += '</table>';
        }
        table.innerHTML = html;
        box.style.display = 'block';
    },

    hideSpeakerInfo() {
        document.getElementById('speaker-info-box').style.display = 'none';
    },

    _getBoxSelectRect() {
        // Zwraca {x1, y1, x2, y2} (lewy-górny, prawy-dolny) w px
        const x1 = Math.min(this.boxSelectStart.x, this.boxSelectCurrent.x);
        const y1 = Math.min(this.boxSelectStart.y, this.boxSelectCurrent.y);
        const x2 = Math.max(this.boxSelectStart.x, this.boxSelectCurrent.x);
        const y2 = Math.max(this.boxSelectStart.y, this.boxSelectCurrent.y);
        return {x1, y1, x2, y2};
    }
};

document.getElementById('speaker-info-close').onclick = gui.hideSpeakerInfo;
