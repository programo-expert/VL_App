// Eksport danych crosspointów do backendu (tylko powiązane wiązka-głośnik)

function exportBackendJSON() {
    selection.clear();
    const microphones = elements.all.filter(e => e.type === "mic").sort((a, b) => a.number - b.number);
    const speakers = elements.all.filter(e => e.type === "speaker").sort((a, b) => a.number - b.number);
    const beams = elements.all.filter(e => e.type === "beam");

    let result = [];
    let crosspointIndex = 1; // Zaczynamy od I6

    microphones.forEach((mic, micIdx) => {
        let micBeams = beams.filter(b => b.micId === mic.id).sort((a, b) => a.number - b.number);

        for (let slot = 0; slot < 8; slot++) {
            let beam = micBeams[slot] || null;
            let inputLabel = `I${crosspointIndex++}`; // I6, I7, ...

            if (!beam) continue;

            // Sprawdź tylko te powiązania, które są w relatedIds
            speakers.forEach(speaker => {
                // Powiązanie istnieje TYLKO gdy beam.relatedIds zawiera id głośnika
                if (
                    beam.relatedIds &&
                    Array.isArray(beam.relatedIds) &&
                    beam.relatedIds.includes(speaker.id) &&
                    beam.calc &&
                    beam.calc[speaker.id]
                ) {
                    let c = beam.calc[speaker.id];
                    let outputLabel = `O${speaker.number}`;
                    result.push({
                        crosspoint: inputLabel + outputLabel,
                        gainSymetrix: c.gainSymetrix,
                        delaySymetrix: c.delaySymetrix
                    });
                }
            });
        }
    });

    // Sortowanie wg numeru głośnika, potem wejścia
    result.sort((a, b) => {
        let oA = parseInt(a.crosspoint.match(/O(\d+)/)[1]);
        let oB = parseInt(b.crosspoint.match(/O(\d+)/)[1]);
        if (oA !== oB) return oA - oB;
        let iA = parseInt(a.crosspoint.match(/I(\d+)/)[1]);
        let iB = parseInt(b.crosspoint.match(/I(\d+)/)[1]);
        return iA - iB;
    });

    const blob = new Blob([JSON.stringify(result, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "crosspoints-backend.json";
    a.click();
    URL.revokeObjectURL(url);

    return result;
}

// Dodaj przycisk do eksportu (jeśli jeszcze nie ma)
(function addExportBtn() {
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('export-backend-btn')) return;
        const btn = document.createElement('button');
        btn.id = 'export-backend-btn';
        btn.textContent = 'Eksport crosspointów (backend)';
        btn.onclick = exportBackendJSON;
        document.getElementById('toolbar').appendChild(btn);
    })

})();
