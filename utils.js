const utils = {
    getMousePos(canvas, evt, scale) {
        const rect = canvas.getBoundingClientRect();
        scale = scale || 1;
        return {
            x: Math.round((evt.clientX - rect.left) / scale),
            y: Math.round((evt.clientY - rect.top) / scale)
        };
    },
    isNear(pos, el, r) {
        return Math.sqrt((el.x - pos.x) ** 2 + (el.y - pos.y) ** 2) < r;
    },
    isNearRect(pos, el, r) {
        return (Math.abs(el.x - pos.x) < r && Math.abs(el.y - pos.y) < r);
    },
    dist(a, b) {
        return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
    },
    // --- To była funkcja losowa ---
    // randomPosition(w, h) {
    //   return { x: 60 + Math.random() * (w - 120), y: 60 + Math.random() * (h - 120) };
    // },
    // --- Nowa funkcja centrum widoku ---
    centerOfViewportOnCanvas() {
        const wrap = document.getElementById('canvas-wrap');
        const canvas = document.getElementById('board');
        // Scroll offset
        const scrollLeft = wrap.scrollLeft || 0;
        const scrollTop = wrap.scrollTop || 0;
        // Widoczny rozmiar viewportu
        const viewportW = wrap.clientWidth;
        const viewportH = wrap.clientHeight;
        // Pozycja na planszy (canvas) środka widoku:
        const x = scrollLeft + Math.max(0, Math.min(canvas.width, viewportW / 2));
        const y = scrollTop + Math.max(0, Math.min(canvas.height, viewportH / 2));
        return {
            x: Math.max(0, Math.min(canvas.width, Math.round(x))),
            y: Math.max(0, Math.min(canvas.height, Math.round(y)))
        };
    }
};
