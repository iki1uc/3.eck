export const OS_KOMPASS = {

  richtung(OU) {
    const { aura, mana, spiegel } = OU;

    // Meta-Zonen
    if (aura >= 8 && mana >= 8 && spiegel >= 8) return "ZENITH";
    if (aura <= 2 && mana <= 2 && spiegel <= 2) return "NADIR";

    // Haupt-Richtungen
    if (aura >= 6 && mana >= 6) return "Norden";
    if (mana >= 6 && spiegel >= 6) return "Osten";
    if (mana <= 3 && spiegel >= 5) return "Süden";
    if (spiegel >= 6 && aura <= 4) return "Westen";

    // Zwischenrichtungen
    if (aura >= 6 && mana >= 6 && spiegel >= 6) return "Nord-Ost";
    if (mana >= 6 && spiegel >= 6 && aura <= 5) return "Süd-Ost";
    if (spiegel >= 6 && aura <= 4 && mana <= 4) return "Süd-West";
    if (aura >= 6 && spiegel >= 6 && mana <= 4) return "Nord-West";

    // Zentrum
    return "Zentrum";
  }
};
