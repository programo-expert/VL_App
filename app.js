window.onload = function () {
    config.init();
    gui.init();
    selection.init();
    keyboard.init();
    if (typeof undoManager !== 'undefined') {
        undoManager.push(); // Zapisz stan początkowy do historii cofania
    }

    // Scroll planszy kółkiem myszy (w pionie) lub shift+kółko (w poziomie)
    const wrap = document.getElementById('canvas-wrap');
    wrap.addEventListener('wheel', function (e) {
        // Zapobiegaj przewijaniu całej strony jeśli nad planszą
        e.preventDefault();
        if (e.shiftKey) {
            this.scrollLeft += e.deltaY;
        } else {
            this.scrollTop += e.deltaY;
        }
    }, {passive: false});
};
