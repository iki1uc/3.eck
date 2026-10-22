export const OS_KOMPASS = {

  richtung: function(OU) {

    const { aura, mana, spiegel } = OU;

    // Vektor-Projektion
    const x = mana - spiegel;   // Ost-West Achse
    const y = aura - mana;      // Nord-Süd Achse

    // Zentrum (Continuum)
    if (Math.abs(x) < 1 && Math.abs(y) < 1)
      return "Zentrum";

    // Norden
    if (y >= 3 && Math.abs(x) < 2)
      return "Norden";

    // Süden
    if (y <= -3 && Math.abs(x) < 2)
      return "Süden";

    // Osten
    if (x >= 3 && Math.abs(y) < 2)
      return "Osten";

    // Westen
    if (x <= -3 && Math.abs(y) < 2)
      return "Westen";

    // Zwischenrichtungen (OCTA)
    if (x >= 2 && y >= 2)
      return "Nord-Ost";

    if (x >= 2 && y <= -2)
      return "Süd-Ost";

    if (x <= -2 && y <= -2)
      return "Süd-West";

    if (x <= -2 && y >= 2)
      return "Nord-West";

    // Fallback
    return "Zentrum";
  }
};
