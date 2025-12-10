const elements = {
    all: [],
    nextId: 1,

    create(type, pos, micIdForBeam) {
        let el = {id: this.nextId++, type, x: pos.x, y: pos.y, number: null};
        if (type === 'speaker') {
            numbering.speakers.push(el);
            el.number = numbering.nextSpeaker();
        }
        if (type === 'mic') {
            numbering.mics.push(el);
            el.number = numbering.nextMic();
            el.beams = [];
        }
        if (type === 'beam') {
            el.micId = micIdForBeam || this.getLastMicId();
            if (!numbering.beams[el.micId]) numbering.beams[el.micId] = [];
            numbering.beams[el.micId].push(el);
            el.number = numbering.nextBeam(el.micId);
        }
        if (type === 'line') {
            el.lengthM = 1;    // długość linii w metrach
            el.widthM = 0.1;   // szerokość w metrach
            el.orientation = 'horizontal'; // lub 'vertical'
            el.relatedIds = [];
        }

        this.all.push(el);
        this.renumberAll();
        this.updateNames();
        selection.selectedIds = [el.id]; // zawsze zaznaczaj tylko nowo dodany element
        selection.validateSelection();
        return el;
    },

    remove(id) {
        const el = this.getById(id);
        if (!el) return;
        if (el.type === "mic") {
            this.all = this.all.filter(e => !(e.type === "beam" && e.micId === el.id));
            delete numbering.beams[el.id];
        }
        this.all = this.all.filter(e => e.id !== id);
        if (el.type === "speaker") numbering.speakers = numbering.speakers.filter(e => e.id !== id);
        if (el.type === "mic") numbering.mics = numbering.mics.filter(e => e.id !== id);
        if (el.type === "beam" && numbering.beams[el.micId]) numbering.beams[el.micId] =
            numbering.beams[el.micId].filter(e => e.id !== id);
        this.renumberAll();
        gui.render();
        selection.clear();
        undoManager.push();
    },

    renumberAll() {
        numbering.reset();
        numbering.speakers.forEach((e, idx) => e.number = config.values.speakerStartNumber + idx);
        numbering.mics.forEach((e, idx) => e.number = config.values.micStartNumber + idx);

        Object.keys(numbering.beams).forEach(micId => {
            numbering.beams[micId].forEach((b, idx) => b.number = idx + 1);
        });
        this.all.filter(e => e.type === "line").forEach((e, idx) => {
            e.number = idx + 1;
            e.name = `Linia_${e.number}`;
        });
        this.updateNames();
        selection.validateSelection();
    },

    updateNames() {
        this.all.filter(e => e.type === "speaker").forEach(e => e.name = `Głośnik_${e.number}`);
        this.all.filter(e => e.type === "mic").forEach(e => e.name = `Mikrofon_${e.number}`);
        this.all.filter(e => e.type === "beam").forEach(b => {
            const mic = this.getById(b.micId);
            const micName = mic ? mic.name : "brak";
            b.name = `Wiązka_${b.number}_${micName}`;
        });
        this.all.filter(e => e.type === "line").forEach((e, idx) => {
            e.number = idx + 1;
            if (!e.name) e.name = `Linia_${e.number}`;
        });
    },

    getLastMicId() {
        if (numbering.mics.length === 0) return null;
        return numbering.mics[numbering.mics.length - 1].id;
    },

    getLineEdgeUnderMouse(el, pos) {
        if (el.type !== 'line') return null;
        const edgeSize = 10; // px
        if (el.orientation === 'horizontal') {
            const start = {x: el.x - el.lengthM * 50, y: el.y};
            const end = {x: el.x + el.lengthM * 50, y: el.y};
            if (utils.dist(pos, start) < edgeSize) return 'start';
            if (utils.dist(pos, end) < edgeSize) return 'end';
        } else {
            const start = {x: el.x, y: el.y - el.lengthM * 50};
            const end = {x: el.x, y: el.y + el.lengthM * 50};
            if (utils.dist(pos, start) < edgeSize) return 'start';
            if (utils.dist(pos, end) < edgeSize) return 'end';
        }
        return null;
    },

    distToLine(el, point) {
        if (el.type !== 'line') return null;
        if (el.orientation === 'horizontal') {
            return Math.abs(point.y - el.y) * 0.01;
        } else {
            return Math.abs(point.x - el.x) * 0.01;
        }
    },

    draw(el, ctx, selected) {
        ctx.save();

        // === Przerywana otoczka dla wybranego ===
        if (selected) {
            ctx.save();
            ctx.setLineDash([6, 5]);
            ctx.lineWidth = 3;
            ctx.strokeStyle = "#009688";
            if (el.type === 'speaker') {
                ctx.beginPath();
                ctx.arc(el.x, el.y, 20, 0, 2 * Math.PI);
                ctx.stroke();
            }
            if (el.type === 'mic') {
                ctx.beginPath();
                ctx.rect(el.x - 18, el.y - 18, 36, 36);
                ctx.stroke();
            }
            if (el.type === 'beam') {
                ctx.beginPath();
                ctx.arc(el.x, el.y, 14, 0, 2 * Math.PI);
                ctx.stroke();
            }
            if (el.type === 'line') {
                ctx.save();
                ctx.setLineDash([4, 5]);
                ctx.strokeStyle = "#009688";
                ctx.lineWidth = (el.widthM * 100) + 6;
                ctx.beginPath();
                if (el.orientation === 'horizontal') {
                    ctx.moveTo(el.x - (el.lengthM * 50), el.y);
                    ctx.lineTo(el.x + (el.lengthM * 50), el.y);
                } else {
                    ctx.moveTo(el.x, el.y - (el.lengthM * 50));
                    ctx.lineTo(el.x, el.y + (el.lengthM * 50));
                }
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.restore();
            }
            ctx.setLineDash([]);
            ctx.restore();
        }

        // === GŁÓWNY ELEMENT ===
        if (el.type === 'speaker') {
            ctx.beginPath();
            ctx.fillStyle = selected ? "#29b6f6" : "#2196f3";
            ctx.arc(el.x, el.y, 15, 0, 2 * Math.PI);
            ctx.fill();
            if (config.values.showSpeakerNames) {
                ctx.fillStyle = config.values.canvasTextColor || "#222";
                ctx.font = "bold 14px Arial";
                ctx.textAlign = "center";
                ctx.fillText(el.name, el.x, el.y - 20);
            }
        }
        if (el.type === 'mic') {
            ctx.beginPath();
            ctx.fillStyle = selected ? "#cddc39" : "#ffeb3b";
            ctx.rect(el.x - 13, el.y - 13, 26, 26);
            ctx.fill();
            if (config.values.showMicNames) {
                ctx.fillStyle = config.values.canvasTextColor || "#222";
                ctx.font = "bold 14px Arial";
                ctx.textAlign = "center";
                ctx.fillText(el.name, el.x, el.y - 18);
            }
        }
        if (el.type === 'beam') {
            ctx.beginPath();
            ctx.fillStyle = selected ? "#ef5350" : "#e53935";
            ctx.arc(el.x, el.y, 9, 0, 2 * Math.PI);
            ctx.fill();
            if (config.values.showBeamNames) {
                ctx.font = "12px Arial";
                ctx.fillStyle = config.values.canvasTextColor || "#222";
                ctx.textAlign = "center";
                ctx.fillText(el.name, el.x, el.y - 15);
            }
        }
        if (el.type === 'line') {
            ctx.save();
            ctx.strokeStyle = "#888";
            ctx.lineWidth = el.widthM * 100;
            ctx.beginPath();
            let x1, y1, x2, y2;
            if (el.orientation === 'horizontal') {
                x1 = el.x - (el.lengthM * 50);
                y1 = el.y;
                x2 = el.x + (el.lengthM * 50);
                y2 = el.y;
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
            } else {
                x1 = el.x;
                y1 = el.y - (el.lengthM * 50);
                x2 = el.x;
                y2 = el.y + (el.lengthM * 50);
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
            }
            ctx.stroke();
            ctx.restore();

            // --- Wyświetl nazwę i długość linii zawsze na środku, obróconą dla pionowej ---
            const len = (el.lengthM * 2).toFixed(2);
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;

            ctx.save();
            ctx.font = "bold 14px Arial";
            ctx.fillStyle = config.values.canvasTextColor || "#222";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            if (el.orientation === 'horizontal') {
                ctx.fillText(el.name, midX, midY - 12);
                ctx.font = "13px Arial";
                ctx.fillText(len + " m", midX, midY + 16);
            } else {
                ctx.translate(midX - 16, midY);
                ctx.rotate(-Math.PI / 2);
                ctx.fillText(el.name, 0, -5);
                ctx.font = "13px Arial";
                ctx.fillText(len + " m", 0, 35);
            }
            ctx.restore();

            // --- Uchwyty do dragowania końcówek, tylko jeśli zaznaczona ---
            if (selected) {
                ctx.save();
                ctx.fillStyle = "#009688";
                let start, end;
                if (el.orientation === 'horizontal') {
                    start = {x: el.x - el.lengthM * 50, y: el.y};
                    end = {x: el.x + el.lengthM * 50, y: el.y};
                } else {
                    start = {x: el.x, y: el.y - el.lengthM * 50};
                    end = {x: el.x, y: el.y + el.lengthM * 50};
                }
                ctx.beginPath();
                ctx.arc(start.x, start.y, 7, 0, 2 * Math.PI);
                ctx.arc(end.x, end.y, 7, 0, 2 * Math.PI);
                ctx.fill();
                ctx.restore();
            }

            // --- Miarki prostopadłe do powiązanych elementów ---
            if (el.relatedIds && Array.isArray(el.relatedIds)) {
                el.relatedIds.forEach(relId => {
                    const rel = this.getById(relId);
                    if (!rel) return;
                    // Dystans prostopadły
                    let distM;
                    if (el.orientation === 'horizontal') {
                        distM = Math.abs(rel.y - el.y) * 0.01;
                    } else {
                        distM = Math.abs(rel.x - el.x) * 0.01;
                    }
                    // Punkt prostopadły na linii
                    let px, py;
                    if (el.orientation === 'horizontal') {
                        px = rel.x;
                        py = el.y;
                    } else {
                        px = el.x;
                        py = rel.y;
                    }
                    // Rysuj linię miarki (tylko prostopadła, NIE ze środka linii)
                    ctx.save();
                    ctx.strokeStyle = "#ff9800";
                    ctx.setLineDash([5, 5]);
                    ctx.beginPath();
                    ctx.moveTo(rel.x, rel.y);
                    ctx.lineTo(px, py);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.restore();
                    // Etykieta odległości na środku miarki
                    ctx.save();
                    ctx.font = "bold 13px Arial";
                    ctx.fillStyle = "#ff9800";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText(distM.toFixed(2) + " m", (rel.x + px) / 2, (rel.y + py) / 2 - 8);
                    ctx.restore();
                });
            }
        }


        ctx.restore();
    },

    getAtPosition(pos) {
        for (let el of [...this.all].reverse()) {
            if (el.type === 'beam' && utils.isNear(pos, el, 10)) return el;
            if (el.type === 'mic' && utils.isNearRect(pos, el, 13)) return el;
            if (el.type === 'speaker' && utils.isNear(pos, el, 15)) return el;
        }
        for (let el of [...this.all].reverse()) {
            if (el.type === 'line') {
                let dist = 0;
                if (el.orientation === 'horizontal') {
                    dist = Math.abs(pos.y - el.y);
                    const minX = el.x - (el.lengthM * 50);
                    const maxX = el.x + (el.lengthM * 50);
                    if (dist < Math.max(8, el.widthM * 50) && pos.x >= minX && pos.x <= maxX) return el;
                } else {
                    dist = Math.abs(pos.x - el.x);
                    const minY = el.y - (el.lengthM * 50);
                    const maxY = el.y + (el.lengthM * 50);
                    if (dist < Math.max(8, el.widthM * 50) && pos.y >= minY && pos.y <= maxY) return el;
                }
            }
        }
        return null;
    },

    move(el, x, y) {
        el.x = Math.round(x);
        el.y = Math.round(y);
    },

    getById(id) {
        return this.all.find(e => e.id === id);
    }
};
