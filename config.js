const config = {
    values: {
        gainCal: 0,
        targetLevel: 53,//Docelowy poziom dźwięku
        Lp1: 60,//Poziom dźwięku odniesienia głośnika studyjnego
        R1: 1,//Odległość odniesienia głośnika studyjnego
        H: 3, //Wysokość głośnika
        Hm: 3,//Wysokość mikrofonu
        speakerHeight: 1.20,//Wysokość mówcy
        delayShift: 0,//Przesunięcie opóźnienia symetrix
        speakerStartNumber: 1,
        micStartNumber: 1,
        canvasTextColor: "#222222",
        canvasBgColor: "#ffffff",
        canvasGridColor: "#eaeaea",
        showSpeakerNames: true,
        showMicNames: true,
        showBeamNames: true,
        showElementConnections: true,
        showSpeakerBeamConnections: true,
        showConnectionDescriptions: false,
        boardWidth: 1800,
        boardHeight: 850,
        gridWidth: 0.6,
        gridHeight: 0.6
    },

    init() {
    },

    openGlobalConfig() {
        let html = `<div class="modal-content">
    <h3>Ustawienia globalne</h3>
    <label>Wzmocnienie kalibracyjne (dB): 
        <input id="cfg-gain" type="number" value="${config.values.gainCal}">
        <button id="cfg-gain-auto" style="margin-left:8px;">Auto</button>
    </label><br>
    <label>Poziom docelowy (dBA): <input id="cfg-target" type="number" value="${config.values.targetLevel}"></label><br>
    <label>Lp1 – poziom odniesienia (Db): <input id="cfg-lp1" type="number" value="${config.values.Lp1}"></label><br>
    <label>R1 – odległość odniesienia (m): <input id="cfg-r1" type="number" step="0.01" value="${config.values.R1}"></label><br>
    <label>H – wysokość głośnika (m): <input id="cfg-h" type="number" step="0.01" value="${config.values.H}"></label><br>
    <label>Hm – wysokość mikrofonu (m): <input id="cfg-hm" type="number" step="0.01" value="${config.values.Hm}"></label><br>
    <label>Wysokość mówcy (m): <input id="cfg-speakerHeight" type="number" step="0.01" value="${config.values.speakerHeight}"></label><br>
    <label>Delay shift (ms): <input id="cfg-delayShift" type="number" step="0.01" value="${config.values.delayShift}"></label><br>
    <label>Początkowy numer głośnika: <input id="cfg-speakerStartNumber" type="number" step="1" value="${config.values.speakerStartNumber}" min="1"></label><br>
    <label>Początkowy numer mikrofonu: <input id="cfg-micStartNumber" type="number" step="1" value="${config.values.micStartNumber}" min="1"></label><br>
    <hr>
    <label>Rozmiar pola roboczego:</label>
    <input type="number" id="cfg-boardWidth" value="${config.values.boardWidth}" min="400" max="5000" step="10" style="width:80px;"> px
    (<span id="cfg-boardWidth-m">${(config.values.boardWidth * 0.01).toFixed(2)}</span> m)
    ×
    <input type="number" id="cfg-boardHeight" value="${config.values.boardHeight}" min="400" max="5000" step="10" style="width:80px;"> px
    (<span id="cfg-boardHeight-m">${(config.values.boardHeight * 0.01).toFixed(2)}</span> m)
    <br>
    <hr>
    <label>Kolor tekstu: <input type="color" id="cfg-canvasTextColor" value="${config.values.canvasTextColor}"></label><br>
    <label>Kolor tła planszy: <input type="color" id="cfg-canvasBgColor" value="${config.values.canvasBgColor}"></label><br>
    <label>Kolor siatki: <input type="color" id="cfg-canvasGridColor" value="${config.values.canvasGridColor}"></label><br>
    <hr>
    <label>Siatka: </label>
    <input type="number" id="cfg-gridWidth" value="${config.values.gridWidth}" step="0.01" min="0.05" style="width:65px;"> m
    ×
    <input type="number" id="cfg-gridHeight" value="${config.values.gridHeight}" step="0.01" min="0.05" style="width:65px;"> m
    <br>
    <label><input type="checkbox" id="cfg-showSpeakerNames" ${config.values.showSpeakerNames ? "checked" : ""}> Pokazuj nazwy głośników</label><br>
    <label><input type="checkbox" id="cfg-showMicNames" ${config.values.showMicNames ? "checked" : ""}> Pokazuj nazwy mikrofonów</label><br>
    <label><input type="checkbox" id="cfg-showBeamNames" ${config.values.showBeamNames ? "checked" : ""}> Pokazuj nazwy wiązek</label><br>
    <label><input type="checkbox" id="toggle-connections" ${config.values.showElementConnections ? "checked" : ""}>Pokazuj połączenia pomiędzy elementami</label><br>
    <label><input type="checkbox" id="cfg-showSpeakerBeamConnections" ${config.values.showSpeakerBeamConnections ? "checked" : ""}>Pokazuj połączenia głośnik-wiązka</label><br>
    <label><input type="checkbox" id="cfg-showConnectionDescriptions" ${config.values.showConnectionDescriptions ? "checked" : ""}> <span style="color:#ffa500">Pokazuj opisy połączeń (zaawansowane)</span></label><br>
    <button onclick="config.save()">Zapisz</button>
    <button onclick="modal.close()">Anuluj</button>
    </div>`;

        document.getElementById('modal').innerHTML = html;
        document.getElementById('modal').classList.remove('hidden');

        document.getElementById('cfg-boardWidth').addEventListener('input', function () {
            document.getElementById('cfg-boardWidth-m').textContent = (this.value * 0.01).toFixed(2);
        });
        document.getElementById('cfg-boardHeight').addEventListener('input', function () {
            document.getElementById('cfg-boardHeight-m').textContent = (this.value * 0.01).toFixed(2);
        });

        document.getElementById('cfg-gain-auto').addEventListener('click', function () {
            config.autoGainCal();
        });

        document.getElementById('cfg-delayShift').addEventListener('input', function () {
            config.values.delayShift = parseFloat(this.value) || 0;
            distance.recalculateAll();
            gui.render();
        });

        window.onkeydown = e => {
            if (e.key === "Escape") modal.close();
        };
    },

    autoGainCal() {
        config.values.gainCal = 0;
        distance.recalculateAll();

        let maxDist = -Infinity;
        let targetGainSym = null;
        const beams = elements.all.filter(e => e.type === "beam");
        const speakers = elements.all.filter(e => e.type === "speaker");
        beams.forEach(beam => {
            if (!Array.isArray(beam.relatedIds)) return;
            speakers.forEach(speaker => {
                if (!beam.relatedIds.includes(speaker.id)) return;
                if (!beam.calc || !beam.calc[speaker.id]) return;
                const c = beam.calc[speaker.id];
                if (c.distM_vert > maxDist) {
                    maxDist = c.distM_vert;
                    targetGainSym = c.gainSymetrix;
                }
            });
        });
        if (targetGainSym !== null) {
            const autoGain = -targetGainSym;
            config.values.gainCal = +autoGain.toFixed(2);
            document.getElementById('cfg-gain').value = config.values.gainCal;
            distance.recalculateAll();
            gui.render();
        } else {
            alert("Brak powiązanych par wiązka-głośnik z obliczonymi parametrami!");
        }
    },

    save() {
        config.values.gainCal = parseFloat(document.getElementById('cfg-gain').value);
        config.values.targetLevel = parseFloat(document.getElementById('cfg-target').value);
        config.values.Lp1 = parseFloat(document.getElementById('cfg-lp1').value);
        config.values.R1 = parseFloat(document.getElementById('cfg-r1').value);
        config.values.H = parseFloat(document.getElementById('cfg-h').value);
        config.values.Hm = parseFloat(document.getElementById('cfg-hm').value);
        config.values.speakerHeight = parseFloat(document.getElementById('cfg-speakerHeight').value);
        config.values.delayShift = parseFloat(document.getElementById('cfg-delayShift').value) || 0;
        config.values.speakerStartNumber = parseInt(document.getElementById('cfg-speakerStartNumber').value) || 1;
        config.values.micStartNumber = parseInt(document.getElementById('cfg-micStartNumber').value) || 1;
        config.values.canvasTextColor = document.getElementById('cfg-canvasTextColor').value;
        config.values.canvasBgColor = document.getElementById('cfg-canvasBgColor').value;
        config.values.canvasGridColor = document.getElementById('cfg-canvasGridColor').value;
        config.values.showSpeakerNames = document.getElementById('cfg-showSpeakerNames').checked;
        config.values.showMicNames = document.getElementById('cfg-showMicNames').checked;
        config.values.showBeamNames = document.getElementById('cfg-showBeamNames').checked;
        config.values.showElementConnections = document.getElementById('toggle-connections').checked;
        config.values.boardWidth = parseInt(document.getElementById('cfg-boardWidth').value);
        config.values.boardHeight = parseInt(document.getElementById('cfg-boardHeight').value);
        config.values.showSpeakerBeamConnections = document.getElementById('cfg-showSpeakerBeamConnections').checked;
        config.values.gridWidth = parseFloat(document.getElementById('cfg-gridWidth').value);
        config.values.gridHeight = parseFloat(document.getElementById('cfg-gridHeight').value);
        config.values.showConnectionDescriptions = document.getElementById('cfg-showConnectionDescriptions').checked;

        elements.renumberAll(); // <---- WAŻNE: renumeracja po zmianie!
        modal.close();
        gui.setBoardSize(config.values.boardWidth, config.values.boardHeight);
        gui.render();
        undoManager.push();
    }
};
