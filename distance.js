const distance = {
    recalculateAll() {
        const gainCal = config.values.gainCal || 0;
        const Lp1 = config.values.Lp1 || 70;
        const R1 = config.values.R1 || 1;
        const H = config.values.H || 2.2;
        const Hm = config.values.Hm || 2.2;
        const hPerson = config.values.speakerHeight || 1.2;

        const mics = elements.all.filter(e => e.type === "mic");
        const speakers = elements.all.filter(e => e.type === "speaker");
        const beams = elements.all.filter(e => e.type === "beam");

        // --- 1. MIC–SPEAKER (pozostaje bez zmian)
        mics.forEach(mic => {
            mic.calc = {};
            speakers.forEach(speaker => {
                const distM = +(utils.dist(mic, speaker) * 0.01).toFixed(2);
                const Lp2 = logic.Lp2(Lp1, distM, R1);
                const Gain = logic.Gain(Lp1, Lp2);
                const Lsum = logic.Lsum(distM, H);
                const Delay = logic.Delay(Lsum);
                mic.calc[speaker.id] = {Lp2, Gain, Lsum, Delay, distM};
            });
        });

        // --- 2. WIĄZKA–GŁOŚNIK oraz WIĄZKA–MIKROFON z uwzględnieniem wysokości mówcy
        beams.forEach(beam => {
            const mic = elements.getById(beam.micId);
            if (!mic) return;
            beam.calc = {};

            // Rm: po podłodze
            const Rm_flat = +(utils.dist(beam, mic) * 0.01).toFixed(2);
            // Rm rzeczywiste (wiązka-mikrofon, z wysokością mówcy)
            const Hm = config.values.Hm || 2.2;
            const hPerson = config.values.speakerHeight || 1.2;
            const Rm_vert = +(Math.sqrt(Math.pow(Rm_flat, 2) + Math.pow(Math.abs(Hm - hPerson), 2))).toFixed(2);

            speakers.forEach(speaker => {
                // R2: po podłodze
                const R2_flat = +(utils.dist(beam, speaker) * 0.01).toFixed(2);
                // R2 rzeczywiste (wiązka-głośnik, z wysokością mówcy)
                const H = config.values.H || 3.0;
                const R2_vert = +(Math.sqrt(Math.pow(R2_flat, 2) + Math.pow(Math.abs(H - hPerson), 2))).toFixed(2);

                // Delay (dla rzeczywistej odległości wiązka-głośnik)
                const Lsum = logic.Lsum(R2_vert, H);
                const Delay = logic.Delay(Lsum);

                // Kluczowa linia – Twój wzór!
                const delaySymetrix = +(Delay - Math.sqrt(Math.pow(Rm_vert, 2) + Math.pow(Hm, 2)) + (config.values.delayShift || 0)).toFixed(2);


                // gainSymetrix bez zmian
                const Lp2 = logic.Lp2(config.values.Lp1, R2_vert, config.values.R1);
                const Gain = logic.Gain(config.values.Lp1, Lp2);
                const gainSymetrix = +(Gain + (config.values.gainCal || 0)).toFixed(2);

                beam.calc[speaker.id] = {
                    gainSymetrix,
                    delaySymetrix,
                    distM_flat: R2_flat,
                    distM_vert: R2_vert,
                    Rm_flat,
                    Rm_vert,
                    Hm,
                    H,
                    hPerson
                };
            });

            beam.Rm_flat = Rm_flat;
            beam.Rm_vert = Rm_vert;
        });

    },

    drawAllDistances(ctx) {
        if (!config.values.showElementConnections) return;
        elements.all.forEach(el => {
            if (el.relatedIds) {
                el.relatedIds.forEach(id2 => {
                    const el2 = elements.getById(id2);
                    if (!el2 || el.type === "line" || el2.type === "line") return;
                    if (
                        !config.values.showSpeakerBeamConnections &&
                        (
                            (el.type === "speaker" && el2.type === "beam") ||
                            (el.type === "beam" && el2.type === "speaker")
                        )
                    ) {
                        return;
                    }
                    ctx.save();
                    ctx.beginPath();
                    ctx.strokeStyle = "#ff9800";
                    ctx.setLineDash([5, 4]);
                    ctx.moveTo(el.x, el.y);
                    ctx.lineTo(el2.x, el2.y);
                    ctx.stroke();
                    ctx.setLineDash([]);

                    // --- Nowa logika wyświetlania dla beam–speaker i beam–mic ---
                    let dist_flat = +(utils.dist(el, el2) * 0.01).toFixed(2);
                    let dist_vert = dist_flat;

                    // Jeśli speaker–beam lub beam–speaker: wyciągamy dane z .calc
                    if (
                        ((el.type === "speaker" && el2.type === "beam") || (el.type === "beam" && el2.type === "speaker"))
                        && (el.calc && el.calc[el2.id] || el2.calc && el2.calc[el.id])
                    ) {
                        let beam, speaker;
                        if (el.type === "beam") {
                            beam = el;
                            speaker = el2;
                        } else {
                            beam = el2;
                            speaker = el;
                        }

                        if (beam.calc[speaker.id]) {
                            dist_flat = beam.calc[speaker.id].distM_flat;
                            dist_vert = beam.calc[speaker.id].distM_vert;
                        }
                        ctx.font = "13px Arial";
                        ctx.fillStyle = config.values.canvasTextColor || "#222";
                        ctx.textAlign = "center";
                        ctx.fillText(dist_flat + " m (podłoga)", (el.x + el2.x) / 2, (el.y + el2.y) / 2);
                        ctx.fillText(dist_vert + " m (rzeczywista)", (el.x + el2.x) / 2, (el.y + el2.y) / 2 + 16);

                        // Szczegóły techniczne
                        if (config.values.showConnectionDescriptions && beam.calc[speaker.id]) {
                            const c = beam.calc[speaker.id];
                            let txt = `Lp2: ${logic.Lp2(config.values.Lp1, c.distM_vert, config.values.R1)} dB, Gain: ${logic.Gain(config.values.Lp1, logic.Lp2(config.values.Lp1, c.distM_vert, config.values.R1))} dB, Lsum: ${logic.Lsum(c.distM_vert, config.values.H)} m, Delay: ${logic.Delay(logic.Lsum(c.distM_vert, config.values.H))} ms`;
                            txt += `, gainSymetrix: ${c.gainSymetrix} dB, delaySymetrix: ${c.delaySymetrix} ms`;
                            ctx.fillText(txt, (el.x + el2.x) / 2, (el.y + el2.y) / 2 + 32);
                        }
                        ctx.restore();
                        return;
                    }

                    // Jeśli beam–mic (wiązka–mikrofon) – analogicznie
                    if (
                        ((el.type === "mic" && el2.type === "beam") || (el.type === "beam" && el2.type === "mic"))
                    ) {
                        let beam, mic;
                        if (el.type === "beam") {
                            beam = el;
                            mic = el2;
                        } else {
                            beam = el2;
                            mic = el;
                        }

                        // Rysujemy odległość po podłodze i rzeczywistą
                        if (beam.Rm_flat !== undefined && beam.Rm_vert !== undefined) {
                            ctx.font = "13px Arial";
                            ctx.fillStyle = config.values.canvasTextColor || "#222";
                            ctx.textAlign = "center";
                            ctx.fillText(beam.Rm_flat + " m (podłoga)", (el.x + el2.x) / 2, (el.y + el2.y) / 2);
                            ctx.fillText(beam.Rm_vert + " m (rzeczywista)", (el.x + el2.x) / 2, (el.y + el2.y) / 2 + 16);
                        }
                        ctx.restore();
                        return;
                    }

                    // Pozostałe powiązania (np. mic–speaker): tylko po podłodze
                    ctx.font = "13px Arial";
                    ctx.fillStyle = config.values.canvasTextColor || "#222";
                    ctx.textAlign = "center";
                    ctx.fillText(dist_flat + " m", (el.x + el2.x) / 2, (el.y + el2.y) / 2);
                    ctx.restore();
                });
            }
        });
    }
};
