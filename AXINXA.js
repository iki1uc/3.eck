// ============================================================
// AXINXA.js — Ultra‑Version
// ============================================================
// Features:
// ✔ Achsenmatrix (B°, C°, D°)
// ✔ Stationen (MARKT, DOM, EOS, EVO, INDUSTRY, RESPO, FUNKTION, TOOL48, ORBIT‑8, b/h/t)
// ✔ Orbit‑Layer (1–8)
// ✔ Vektor‑Gewichte
// ✔ RUN‑Moves (RUN‑3, RUN‑21)
// ✔ Holiday‑Move (Sondermodus)
// ✔ Deep‑Check
// ✔ Auto‑Recovery
// ✔ Self‑Protect
// ✔ Log‑System
// ============================================================

export const AXINXA = {

    id: "AXINXA",
    version: "4.0.0",
    axis: "B°",
    state: "INIT",
    timestamp: null,
    log: [],
    stations: {},
    orbit: 1,
    weights: {},

    // ------------------------------------------------------------
    // INIT
    // ------------------------------------------------------------
    init(config = {}) {
        this.axis = config.axis || this.axis;
        this.timestamp = Date.now();
        this.state = "ACTIVE";

        this._log("INIT", `AXINXA gestartet (Axis=${this.axis})`);

        this._initStations();
        this._initWeights();

        return this._status();
    },

    // ------------------------------------------------------------
    // STATIONEN
    // ------------------------------------------------------------
    _initStations() {
        this.stations = {
            MARKT: "PRICE",
            BOERSE: "MOMENTUM",
            EVO: "GROWTH",
            INDUSTRY: "PRODUCTION",
            DOM: "AXIS",
            RESPO: "SERVICE",
            EOS: "ROTATION",
            TOOL48: "WORKFLOW",
            FUNKTION: "CALL",
            ORBIT8: "LAYER",
            b: "WIDTH",
            h: "HEIGHT",
            t: "DEPTH"
        };

        this._log("STATIONS", "Stationen geladen");
    },

    // ------------------------------------------------------------
    // GEWICHTE
    // ------------------------------------------------------------
    _initWeights() {
        this.weights = {
            MARKT: 0.15,
            BOERSE: 0.14,
            EVO: 0.12,
            INDUSTRY: 0.11,
            DOM: 0.10,
            RESPO: 0.09,
            EOS: 0.08,
            TOOL48: 0.06,
            FUNKTION: 0.05,
            ORBIT8: 0.04,
            b: 0.03,
            h: 0.02,
            t: 0.01
        };

        this._log("WEIGHTS", "Gewichte geladen");
    },

    // ------------------------------------------------------------
    // ORBIT‑LAYER
    // ------------------------------------------------------------
    setOrbit(n) {
        if (n < 1 || n > 8) return this.error("Orbit außerhalb des Bereichs");
        this.orbit = n;
        this._log("ORBIT", `Orbit gesetzt auf Layer ${n}`);
        return this.orbit;
    },

    // ------------------------------------------------------------
    // RUN‑MOVES
    // ------------------------------------------------------------
    run3() {
        this._log("RUN‑3", "RUN‑3 Move ausgeführt");
        return { move: "RUN‑3", axis: this.axis, orbit: this.orbit };
    },

    run21() {
        this._log("RUN‑21", "RUN‑21 Move ausgeführt");
        return { move: "RUN‑21", axis: this.axis, orbit: this.orbit };
    },

    // ------------------------------------------------------------
    // HOLIDAY‑MOVE (Sondermodus)
    // ------------------------------------------------------------
    holiday() {
        this._log("HOLIDAY", "Holiday‑Move aktiviert (Sondermodus)");
        return {
            mode: "HOLIDAY",
            axis: this.axis,
            orbit: this.orbit,
            relax: true,
            boost: Math.random() * 3.9 + 1.1
        };
    },

    // ------------------------------------------------------------
    // LOGGING
    // ------------------------------------------------------------
    _log(type, msg) {
        this.log.push({
            type,
            msg,
            time: new Date().toISOString()
        });
    },

    // ------------------------------------------------------------
    // STATUS
    // ------------------------------------------------------------
    _status() {
        return {
            id: this.id,
            version: this.version,
            axis: this.axis,
            state: this.state,
            orbit: this.orbit,
            stations: Object.keys(this.stations).length,
            weights: this.weights,
            logCount: this.log.length,
            lastEvent: this.log[this.log.length - 1] || null
        };
    },

    // ------------------------------------------------------------
    // ERROR
    // ------------------------------------------------------------
    error(msg) {
        this.state = "ERROR";
        this._log("ERROR", msg);
        return this._status();
    },

    // ------------------------------------------------------------
    // AUTO‑RECOVERY
    // ------------------------------------------------------------
    recover() {
        this._log("RECOVER", "Auto‑Recovery gestartet");
        this.state = "RECOVER";

        setTimeout(() => {
            this.state = "ACTIVE";
            this._log("RECOVER", "Recovery abgeschlossen");
        }, 300);

        return
