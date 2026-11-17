// Dynamic weather-based recommendations that update with current conditions

type Language = 'pl' | 'en' | 'de' | 'fr' | 'cs' | 'hu' | 'ro';
type WeatherCondition = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'drizzle';

interface DayWeather {
  date: string;
  temperatureMin: number;
  temperatureMax: number;
  windSpeed: number;
  windDirection: string;
  pressure: number;
  condition: WeatherCondition;
}

interface TranslatedText {
  pl: string;
  en: string;
  de: string;
  fr: string;
  cs: string;
  hu: string;
  ro: string;
}

const t = (translations: TranslatedText, lang: Language): string => {
  return translations[lang] || translations['pl'];
};

const getTempBand = (temp: number): 'cold' | 'cool' | 'warm' | 'hot' => {
  if (temp < 10) return 'cold';   // < 10°C - Zimno
  if (temp <= 15) return 'cool';  // 10-15°C - Chłodno
  if (temp <= 22) return 'warm';  // 16-22°C - Ciepło
  return 'hot';                   // > 22°C - Gorąco
};

const getWindLevel = (speed: number): 'calm' | 'moderate' | 'strong' => {
  if (speed < 8) return 'calm';
  if (speed <= 18) return 'moderate';
  return 'strong';
};

const getPressureTrend = (today: number, yesterday: number, dayBefore: number): 'rising' | 'stable' | 'falling' => {
  const change = today - dayBefore;
  if (change > 3) return 'rising';
  if (change < -3) return 'falling';
  return 'stable';
};

export function generateDynamicWeatherConditions(
  lang: Language,
  today: DayWeather,
  yesterday: DayWeather
): string[] {
  const windLevel = getWindLevel(today.windSpeed);
  const tempChange = today.temperatureMax - yesterday.temperatureMax;
  const tempDirection = tempChange > 1 ? 'rising' : tempChange < -1 ? 'falling' : 'stable';

  const weatherConditions: TranslatedText[] = [
    {
      pl: `Temperatura dziś: ${today.temperatureMin}°C do ${today.temperatureMax}°C. ${tempDirection === 'rising' ? 'Ocieplenie względem wczoraj.' : tempDirection === 'falling' ? 'Ochłodzenie względem wczoraj.' : 'Temperatura stabilna.'}`,
      en: `Temperature today: ${today.temperatureMin}°C to ${today.temperatureMax}°C. ${tempDirection === 'rising' ? 'Warming compared to yesterday.' : tempDirection === 'falling' ? 'Cooling compared to yesterday.' : 'Temperature stable.'}`,
      de: `Temperatur heute: ${today.temperatureMin}°C bis ${today.temperatureMax}°C. ${tempDirection === 'rising' ? 'Erwärmung im Vergleich zu gestern.' : tempDirection === 'falling' ? 'Abkühlung im Vergleich zu gestern.' : 'Temperatur stabil.'}`,
      fr: `Température aujourd'hui: ${today.temperatureMin}°C à ${today.temperatureMax}°C. ${tempDirection === 'rising' ? 'Réchauffement par rapport à hier.' : tempDirection === 'falling' ? 'Refroidissement par rapport à hier.' : 'Température stable.'}`,
      cs: `Teplota dnes: ${today.temperatureMin}°C až ${today.temperatureMax}°C. ${tempDirection === 'rising' ? 'Oteplení oproti včerejšku.' : tempDirection === 'falling' ? 'Ochlazení oproti včerejšku.' : 'Teplota stabilní.'}`,
      hu: `Mai hőmérséklet: ${today.temperatureMin}°C - ${today.temperatureMax}°C. ${tempDirection === 'rising' ? 'Melegedés a tegnapihoz képest.' : tempDirection === 'falling' ? 'Lehűlés a tegnapihoz képest.' : 'Stabil hőmérséklet.'}`,
      ro: `Temperatura azi: ${today.temperatureMin}°C până la ${today.temperatureMax}°C. ${tempDirection === 'rising' ? 'Încălzire față de ieri.' : tempDirection === 'falling' ? 'Răcire față de ieri.' : 'Temperatură stabilă.'}`
    },
    {
      pl: `Wiatr ${today.windSpeed} km/h z kierunku ${today.windDirection}. ${windLevel === 'strong' ? 'Silny wiatr utrudni łowienie.' : windLevel === 'moderate' ? 'Umiarkowany wiatr - dobre warunki.' : 'Cisza - idealne warunki.'}`,
      en: `Wind ${today.windSpeed} km/h from ${today.windDirection}. ${windLevel === 'strong' ? 'Strong wind will make fishing difficult.' : windLevel === 'moderate' ? 'Moderate wind - good conditions.' : 'Calm - ideal conditions.'}`,
      de: `Wind ${today.windSpeed} km/h aus ${today.windDirection}. ${windLevel === 'strong' ? 'Starker Wind erschwert das Angeln.' : windLevel === 'moderate' ? 'Mäßiger Wind - gute Bedingungen.' : 'Windstille - ideale Bedingungen.'}`,
      fr: `Vent ${today.windSpeed} km/h de ${today.windDirection}. ${windLevel === 'strong' ? 'Vent fort rendra la pêche difficile.' : windLevel === 'moderate' ? 'Vent modéré - bonnes conditions.' : 'Calme - conditions idéales.'}`,
      cs: `Vítr ${today.windSpeed} km/h z ${today.windDirection}. ${windLevel === 'strong' ? 'Silný vítr ztíží rybaření.' : windLevel === 'moderate' ? 'Mírný vítr - dobré podmínky.' : 'Bezvětří - ideální podmínky.'}`,
      hu: `Szél ${today.windSpeed} km/h ${today.windDirection} irányból. ${windLevel === 'strong' ? 'Erős szél nehezíti a horgászatot.' : windLevel === 'moderate' ? 'Mérsékelt szél - jó körülmények.' : 'Szélcsend - ideális körülmények.'}`,
      ro: `Vânt ${today.windSpeed} km/h din ${today.windDirection}. ${windLevel === 'strong' ? 'Vântul puternic va îngreuna pescuitul.' : windLevel === 'moderate' ? 'Vânt moderat - condiții bune.' : 'Liniște - condiții ideale.'}`
    }
  ];

  return weatherConditions.map(text => t(text, lang));
}

export function generateDynamicFeedingConditions(
  lang: Language,
  today: DayWeather,
  yesterday: DayWeather,
  dayBefore: DayWeather
): string[] {
  const avgTemp = (today.temperatureMin + today.temperatureMax) / 2;
  const tempBand = getTempBand(avgTemp);
  const pressureTrend = getPressureTrend(today.pressure, yesterday.pressure, dayBefore.pressure);

  const feedingConditionsMap: Record<string, TranslatedText[]> = {
    cold: [
      { pl: 'Niska temperatura - ryby żerują powoli i ostrożnie.', en: 'Low temperature - fish feed slowly and cautiously.', de: 'Niedrige Temperatur - Fische fressen langsam und vorsichtig.', fr: 'Basse température - les poissons se nourrissent lentement.', cs: 'Nízká teplota - ryby se krmí pomalu a opatrně.', hu: 'Alacsony hőmérséklet - a halak lassan és óvatosan táplálkoznak.', ro: 'Temperatură scăzută - peștii se hrănesc încet.' },
      { pl: 'Stosuj małe porcje zanęty, ryby nie potrzebują dużo pokarmu.', en: 'Use small portions of groundbait, fish don\'t need much food.', de: 'Verwenden Sie kleine Portionen Grundfutter.', fr: 'Utilisez de petites portions d\'amorce.', cs: 'Používejte malé porce krmiva.', hu: 'Használjon kis adag etetőanyagot.', ro: 'Folosiți porții mici de nadă.' },
      { pl: 'Najlepsza aktywność w środku dnia, gdy woda się nagrzeje.', en: 'Best activity in the middle of the day when water warms up.', de: 'Beste Aktivität zur Tagesmitte.', fr: 'Meilleure activité en milieu de journée.', cs: 'Nejlepší aktivita uprostřed dne.', hu: 'Legjobb aktivitás a nap közepén.', ro: 'Cea mai bună activitate la prânz.' }
    ],
    cool: [
      { pl: 'Umiarkowana temperatura - ryby żerują regularnie.', en: 'Moderate temperature - fish feed regularly.', de: 'Moderate Temperatur - Fische fressen regelmäßig.', fr: 'Température modérée - les poissons se nourrissent régulièrement.', cs: 'Mírná teplota - ryby se krmí pravidelně.', hu: 'Mérsékelt hőmérséklet - a halak rendszeresen táplálkoznak.', ro: 'Temperatură moderată - peștii se hrănesc regulat.' },
      { pl: 'Dobre warunki na całodniowe łowienie.', en: 'Good conditions for all-day fishing.', de: 'Gute Bedingungen für ganztägiges Angeln.', fr: 'Bonnes conditions pour la pêche toute la journée.', cs: 'Dobré podmínky pro celodenní rybaření.', hu: 'Jó körülmények az egész napos horgászathoz.', ro: 'Condiții bune pentru pescuit toată ziua.' },
      { pl: 'Standardowe porcje zanęty będą skuteczne.', en: 'Standard portions of groundbait will be effective.', de: 'Standardportionen Grundfutter werden effektiv sein.', fr: 'Des portions standard d\'amorce seront efficaces.', cs: 'Standardní porce krmiva budou účinné.', hu: 'A standard adagok etetőanyag hatékonyak lesznek.', ro: 'Porțiile standard de nadă vor fi eficiente.' }
    ],
    warm: [
      { pl: 'Ciepła woda - ryby bardzo aktywne, żerują intensywnie.', en: 'Warm water - fish very active, feeding intensively.', de: 'Warmes Wasser - Fische sehr aktiv.', fr: 'Eau chaude - poissons très actifs.', cs: 'Teplá voda - ryby velmi aktivní.', hu: 'Meleg víz - halak nagyon aktívak.', ro: 'Apă caldă - pești foarte activi.' },
      { pl: 'Można stosować większe ilości zanęty.', en: 'Can use larger amounts of groundbait.', de: 'Größere Mengen Grundfutter möglich.', fr: 'On peut utiliser de plus grandes quantités d\'amorce.', cs: 'Lze použít větší množství krmiva.', hu: 'Nagyobb mennyiségű etetőanyag használható.', ro: 'Se pot folosi cantități mai mari de nadă.' },
      { pl: 'Szczytowa aktywność rano i wieczorem.', en: 'Peak activity in morning and evening.', de: 'Höchste Aktivität morgens und abends.', fr: 'Activité maximale le matin et le soir.', cs: 'Vrcholná aktivita ráno a večer.', hu: 'Csúcsaktivitás reggel és este.', ro: 'Activitate de vârf dimineața și seara.' }
    ],
    hot: [
      { pl: 'Gorąco - ryby szukają głębszej, chłodniejszej wody.', en: 'Hot - fish seek deeper, cooler water.', de: 'Heiß - Fische suchen tieferes, kühleres Wasser.', fr: 'Chaud - les poissons cherchent une eau plus profonde et fraîche.', cs: 'Horko - ryby hledají hlubší, chladnější vodu.', hu: 'Forróság - a halak mélyebb, hűvösebb vizet keresnek.', ro: 'Cald - peștii caută apă mai adâncă și mai rece.' },
      { pl: 'Łów wcześnie rano lub późnym wieczorem.', en: 'Fish early morning or late evening.', de: 'Angeln Sie früh morgens oder spät abends.', fr: 'Pêchez tôt le matin ou tard le soir.', cs: 'Lovte brzy ráno nebo pozdě večer.', hu: 'Horgásszon kora reggel vagy késő este.', ro: 'Pescuiți dis-de-dimineață sau seara târziu.' },
      { pl: 'Stosuj lżejsze, bardziej aromatyczne zanęty.', en: 'Use lighter, more aromatic groundbaits.', de: 'Verwenden Sie leichtere, aromatischere Grundfutter.', fr: 'Utilisez des amorces plus légères et aromatiques.', cs: 'Používejte lehčí, aromatičtější krmiva.', hu: 'Használjon könnyebb, aromásabb etetőanyagokat.', ro: 'Folosiți nade mai ușoare și mai aromate.' }
    ]
  };

  const keyFactorsMap: Record<string, TranslatedText[]> = {
    rising: [
      { pl: 'Rosnące ciśnienie - doskonałe warunki na branie!', en: 'Rising pressure - excellent conditions for bites!', de: 'Steigender Druck - ausgezeichnete Bedingungen!', fr: 'Pression en hausse - excellentes conditions!', cs: 'Stoupající tlak - vynikající podmínky!', hu: 'Emelkedő nyomás - kiváló körülmények!', ro: 'Presiune în creștere - condiții excelente!' },
      { pl: 'Ryby będą aktywnie poszukiwać pokarmu.', en: 'Fish will actively seek food.', de: 'Fische suchen aktiv nach Nahrung.', fr: 'Les poissons chercheront activement de la nourriture.', cs: 'Ryby budou aktivně hledat potravu.', hu: 'A halak aktívan keresik az élelmet.', ro: 'Peștii vor căuta activ hrană.' }
    ],
    stable: [
      { pl: 'Stabilne ciśnienie - przewidywalne żerowanie ryb.', en: 'Stable pressure - predictable fish feeding.', de: 'Stabiler Druck - vorhersehbares Fressverhalten.', fr: 'Pression stable - alimentation prévisible.', cs: 'Stabilní tlak - předvídatelné krmení ryb.', hu: 'Stabil nyomás - kiszámítható táplálkozás.', ro: 'Presiune stabilă - hrănire previzibilă.' },
      { pl: 'Standardowe podejście do łowienia powinno zadziałać.', en: 'Standard fishing approach should work.', de: 'Standard-Ansatz sollte funktionieren.', fr: 'L\'approche standard devrait fonctionner.', cs: 'Standardní přístup by měl fungovat.', hu: 'A standard megközelítés működhet.', ro: 'Abordarea standard ar trebui să funcționeze.' }
    ],
    falling: [
      { pl: 'Spadające ciśnienie - ryby mogą być kapryśne.', en: 'Falling pressure - fish may be finicky.', de: 'Fallender Druck - Fische können wählerisch sein.', fr: 'Pression en baisse - les poissons peuvent être difficiles.', cs: 'Klesající tlak - ryby mohou být vybíravé.', hu: 'Csökkenő nyomás - a halak válogatósak lehetnek.', ro: 'Presiune în scădere - peștii pot fi pretențioși.' },
      { pl: 'Eksperymentuj z różnymi przynętami i kolorami.', en: 'Experiment with different baits and colors.', de: 'Experimentieren Sie mit verschiedenen Ködern.', fr: 'Expérimentez avec différents appâts et couleurs.', cs: 'Experimentujte s různými návnadami a barvami.', hu: 'Kísérletezzen különböző csalikkal és színekkel.', ro: 'Experimentați cu diferite momeli și culori.' }
    ]
  };

  const feedingTexts = (feedingConditionsMap[tempBand] || feedingConditionsMap.cool).map(text => t(text, lang));
  const keyTexts = (keyFactorsMap[pressureTrend] || keyFactorsMap.stable).map(text => t(text, lang));
  
  return [...feedingTexts, ...keyTexts];
}

export function generateDynamicFishActivity(
  lang: Language,
  today: DayWeather,
  yesterday: DayWeather,
  dayBefore: DayWeather
): { activity: string; rhythm: string; portions: string } {
  const avgTemp = (today.temperatureMin + today.temperatureMax) / 2;
  const tempBand = getTempBand(avgTemp);
  const pressureTrend = getPressureTrend(today.pressure, yesterday.pressure, dayBefore.pressure);

  // Check if current month is winter season (October - February)
  const currentMonth = new Date().getMonth(); // 0-11
  const isWinterSeason = currentMonth >= 9 || currentMonth <= 1; // October(9), November(10), December(11), January(0), February(1)

  const activityMap: Record<string, TranslatedText> = {
    cold: { pl: 'Niska', en: 'Low', de: 'Niedrig', fr: 'Faible', cs: 'Nízká', hu: 'Alacsony', ro: 'Scăzută' },
    cool: { pl: 'Średnia', en: 'Medium', de: 'Mittel', fr: 'Moyenne', cs: 'Střední', hu: 'Közepes', ro: 'Medie' },
    warm: { pl: 'Wysoka', en: 'High', de: 'Hoch', fr: 'Élevée', cs: 'Vysoká', hu: 'Magas', ro: 'Ridicată' },
    hot: { pl: 'Zmienna', en: 'Variable', de: 'Variabel', fr: 'Variable', cs: 'Proměnlivá', hu: 'Változó', ro: 'Variabilă' }
  };

  const rhythmMap: Record<string, TranslatedText> = {
    cold: { pl: '5-7 min', en: '5-7 min', de: '5-7 min', fr: '5-7 min', cs: '5-7 min', hu: '5-7 perc', ro: '5-7 min' },
    cool: { pl: '3-5 min', en: '3-5 min', de: '3-5 min', fr: '3-5 min', cs: '3-5 min', hu: '3-5 perc', ro: '3-5 min' },
    warm: { pl: '2-3 min', en: '2-3 min', de: '2-3 min', fr: '2-3 min', cs: '2-3 min', hu: '2-3 perc', ro: '2-3 min' },
    hot: { pl: '4-6 min', en: '4-6 min', de: '4-6 min', fr: '4-6 min', cs: '4-6 min', hu: '4-6 perc', ro: '4-6 min' }
  };

  // Winter season rhythm (October - February): 7-10 minutes
  const winterRhythm: TranslatedText = { pl: '7-10 min', en: '7-10 min', de: '7-10 min', fr: '7-10 min', cs: '7-10 min', hu: '7-10 perc', ro: '7-10 min' };

  const portionsMap: Record<string, TranslatedText> = {
    cold: { pl: 'Małe', en: 'Small', de: 'Klein', fr: 'Petites', cs: 'Malé', hu: 'Kicsi', ro: 'Mici' },
    cool: { pl: 'Średnie', en: 'Medium', de: 'Mittel', fr: 'Moyennes', cs: 'Střední', hu: 'Közepes', ro: 'Medii' },
    warm: { pl: 'Duże', en: 'Large', de: 'Groß', fr: 'Grandes', cs: 'Velké', hu: 'Nagy', ro: 'Mari' },
    hot: { pl: 'Średnie', en: 'Medium', de: 'Mittel', fr: 'Moyennes', cs: 'Střední', hu: 'Közepes', ro: 'Medii' }
  };

  // Adjust activity based on pressure trend
  let activityLevel = tempBand;
  if (pressureTrend === 'rising' && tempBand !== 'hot') {
    activityLevel = tempBand === 'cold' ? 'cool' : tempBand === 'cool' ? 'warm' : 'warm';
  } else if (pressureTrend === 'falling' && tempBand !== 'cold') {
    activityLevel = tempBand === 'hot' ? 'warm' : tempBand === 'warm' ? 'cool' : 'cold';
  }

  // Use winter rhythm (7-10 min) from October to February
  const rhythm = isWinterSeason ? t(winterRhythm, lang) : t(rhythmMap[tempBand] || rhythmMap.cool, lang);

  return {
    activity: t(activityMap[activityLevel] || activityMap.cool, lang),
    rhythm: rhythm,
    portions: t(portionsMap[tempBand] || portionsMap.cool, lang)
  };
}
