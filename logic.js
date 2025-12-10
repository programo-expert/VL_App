const logic = {
    Lp2(Lp1, R2, R1) {
        if (R2 === 0) return Lp1;
        return +(Lp1 - 20 * Math.log10(R2 / R1)).toFixed(1);
    },
    Gain(Lp1, Lp2) {
        return +(Lp1 - Lp2).toFixed(1);
    },
    Lsum(R2, H) {
        return +Math.sqrt(R2 * R2 + H * H).toFixed(2);
    },
    Delay(Lsum) {
        return +(Lsum / 343 * 1000).toFixed(2);
    }
};
