export const OS_mind = {

  // ------------------------------------------------------------
  // 1 · Energetische Grundwerte (OUreal)
  // ------------------------------------------------------------
  aura: 1,
  mana: 1,
  spiegel: 1,

  // ------------------------------------------------------------
  // 2 · Sichtbarkeit (Continuum)
  // ------------------------------------------------------------
  sicht() {
    return (this.aura + this.mana + this.spiegel) / 3;
  },

  // ------------------------------------------------------------
  // 3 · Blockade (realitätsnah)
  // ------------------------------------------------------------
  blockade() {
    let b = 0;
    if (this.aura < 3) b++;
    if (this.mana < 3) b++;
    if (this.spiegel < 3) b++;
    return b;
  },

  // ------------------------------------------------------------
  // 4 · Status (kontinuierlich)
  // ------------------------------------------------------------
  status() {
    if (this.blockade() >= 2) return "unsichtbar";
    if (this.sicht() >= 6) return "sichtbar";
    return "neutral";
  },

  // ------------------------------------------------------------
  // 5 · OCTA-KOMPASS (vektor-gerecht)
  // ------------------------------------------------------------
  kompass() {
    const x = this.mana - this.spiegel;
    const y = this.aura - this.mana;

    if (Math.abs(x) < 1 && Math.abs(y) < 1) return "Zentrum";
    if (y >= 3 && Math.abs(x) < 2) return "Norden";
    if (y <= -3 && Math.abs(x) < 2) return "Süden";
    if (x >= 3 && Math.abs(y) < 2) return "Osten";
    if (x <= -3 && Math.abs(y) < 2) return "Westen";
    if (x >= 2 && y >= 2) return "Nord-Ost";
    if (x >= 2 && y <= -2) return "Süd-Ost";
    if (x <= -2 && y <= -2) return "Süd-West";
    if (x <= -2 && y >= 2) return "Nord-West";

    return "Zentrum";
  },

  // ------------------------------------------------------------
  // 6 · Verhalten (realitätsnah)
  // ------------------------------------------------------------
  verhalten() {
    return {
      wirkung:
        this.aura >= 6 ? "hohe Präsenz" :
        this.aura <= 3 ? "geringe Sichtbarkeit" :
        "neutral",

      energie:
        this.mana >= 6 ? "aktive Handlung" :
        this.mana <= 3 ? "niedrige Aktivität" :
        "stabile Aktivität",

      resonanz:
        this.spiegel >= 6 ? "hohe soziale Resonanz" :
        this.spiegel <= 3 ? "geringe Resonanz" :
        "normale Resonanz"
    };
  },

  // ------------------------------------------------------------
  // 7 · Statistik (legal, realitätsnah)
  // ------------------------------------------------------------
  stats() {
    let s = [];

    if (this.aura >= 7) s.push("starke Außenwirkung");
    if (this.mana >= 7) s.push("hohe Energieentwicklung");
    if (this.spiegel >= 7) s.push("soziale Resonanzsteigerung");

    if (this.aura <= 2) s.push("niedrige Sichtbarkeit");
    if (this.mana <= 2) s.push("Energieverlust");
    if (this.spiegel <= 2) s.push("soziale Isolation");

    return s;
  },

  // ------------------------------------------------------------
  // 8 · SYNC‑Trigger (NEU)
  // ------------------------------------------------------------
  needSync() {
    return (
      this.blockade() >= 2 ||
      this.sicht() < 4 ||
      Math.abs(this.aura - this.mana) > 4 ||
      Math.abs(this.mana - this.spiegel) > 4 ||
      (this.kompass() === "Zentrum" && this.blockade() >= 1)
    );
  }
};
