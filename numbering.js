const numbering = {
    speakers: [],
    mics: [],
    beams: {},

    reset() {
        this.speakers = [];
        this.mics = [];
        this.beams = {};
        elements.all.filter(e => e.type === "speaker")
            .sort((a, b) => a.id - b.id).forEach(e => this.speakers.push(e));
        elements.all.filter(e => e.type === "mic")
            .sort((a, b) => a.id - b.id).forEach(e => this.mics.push(e));
        elements.all.filter(e => e.type === "beam")
            .sort((a, b) => a.id - b.id).forEach(e => {
            if (!this.beams[e.micId]) this.beams[e.micId] = [];
            this.beams[e.micId].push(e);
        });
    },

    nextSpeaker() {
        return config.values.speakerStartNumber + this.speakers.length;
    },

    nextMic() {
        return config.values.micStartNumber + this.mics.length;
    },

    nextBeam(micId) {
        if (!this.beams[micId]) this.beams[micId] = [];
        return this.beams[micId].length + 1;
    }
};
