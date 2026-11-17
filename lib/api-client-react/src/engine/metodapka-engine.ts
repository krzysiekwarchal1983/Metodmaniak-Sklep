// Original rule engine from krzysiekwarchal1983/metodmaniak.
// Only the type import is adapted to this workspace's generated API contract.
import type { FishingRecommendations, WafterColor, HookType } from "./metodapka-types";

type Language = 'pl' | 'en' | 'de' | 'fr' | 'cs' | 'hu' | 'ro';
type Season = 'spring' | 'summer' | 'autumn' | 'winter';
type FisheryType = 'commercial-lake' | 'wild-lake';
type Depth = 'shallow' | 'deep' | '';
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

interface RecommendationContext {
  language: Language;
  season: Season;
  fisheryType: FisheryType;
  depth: Depth;
  castingDistance?: number;
  weather: {
    today: DayWeather;
    yesterday: DayWeather;
    dayBeforeYesterday: DayWeather;
    currentTemperature?: number;
  };
}

type TranslatedText = Record<Language, string>;

const t = (translations: TranslatedText, lang: Language): string => {
  return translations[lang] || translations['pl'];
};

const getTempBand = (temp: number): 'cold' | 'cool' | 'warm' | 'hot' => {
  if (temp <= 5) return 'cold';
  if (temp <= 12) return 'cool';
  if (temp <= 20) return 'warm';
  return 'hot';
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

const WAFTER_COLORS: Record<string, WafterColor> = {
  orange: { name: 'Pomarańczowy', hex: '#FF6B35' },
  yellow: { name: 'Żółty', hex: '#FFD93D' },
  'yellow-dark': { name: 'Ciemny żółty', hex: '#DAA520' },
  'yellow-light': { name: 'Jasny żółty', hex: '#FFFF99' },
  white: { name: 'Biały', hex: '#FFFFFF' },
  pink: { name: 'Różowy', hex: '#FF69B4' },
  red: { name: 'Czerwony', hex: '#DC143C' },
  brown: { name: 'Brązowy', hex: '#8B4513' },
  green: { name: 'Zielony', hex: '#228B22' },
  black: { name: 'Czarny', hex: '#1a1a1a' },
  natural: { name: 'Naturalny', hex: '#C4A484' },
  'fluo-celadon-orange': { name: 'Dwukolorowy Seledyn / Orange', hex: '#7FFF00' },
};

const getLocalizedWafterColor = (colorKey: string, lang: Language): WafterColor => {
  const colorNames: Record<string, TranslatedText> = {
    orange: { pl: 'Pomarańczowy', en: 'Orange', de: 'Orange', fr: 'Orange', cs: 'Oranžová', hu: 'Narancssárga', ro: 'Portocaliu' },
    yellow: { pl: 'Żółty', en: 'Yellow', de: 'Gelb', fr: 'Jaune', cs: 'Žlutá', hu: 'Sárga', ro: 'Galben' },
    'yellow-dark': { pl: 'Ciemny żółty', en: 'Dark yellow', de: 'Dunkelgelb', fr: 'Jaune foncé', cs: 'Tmavě žlutá', hu: 'Sötét sárga', ro: 'Galben închis' },
    'yellow-light': { pl: 'Jasny żółty', en: 'Light yellow', de: 'Hellgelb', fr: 'Jaune clair', cs: 'Světle žlutá', hu: 'Világos sárga', ro: 'Galben deschis' },
    white: { pl: 'Biały', en: 'White', de: 'Weiß', fr: 'Blanc', cs: 'Bílá', hu: 'Fehér', ro: 'Alb' },
    pink: { pl: 'Różowy', en: 'Pink', de: 'Rosa', fr: 'Rose', cs: 'Růžová', hu: 'Rózsaszín', ro: 'Roz' },
    'fluo-pink': { pl: 'Fluo różowy', en: 'Fluo pink', de: 'Fluo Rosa', fr: 'Rose fluo', cs: 'Fluo růžová', hu: 'Fluo rózsaszín', ro: 'Roz fluo' },
    'fluo-celadon-orange': { pl: 'Dwukolorowy Seledyn / Orange', en: 'Two-color Celadon / Orange', de: 'Zweifarbig Seladon / Orange', fr: 'Bicolore Céladon / Orange', cs: 'Dvoubarevný Celadon / Orange', hu: 'Kétszínű Celadon / Orange', ro: 'Bicolor Celadon / Orange' },
    purple: { pl: 'Fioletowy', en: 'Purple', de: 'Lila', fr: 'Violet', cs: 'Fialová', hu: 'Lila', ro: 'Violet' },
    red: { pl: 'Czerwony', en: 'Red', de: 'Rot', fr: 'Rouge', cs: 'Červená', hu: 'Piros', ro: 'Roșu' },
    brown: { pl: 'Brązowy', en: 'Brown', de: 'Braun', fr: 'Marron', cs: 'Hnědá', hu: 'Barna', ro: 'Maro' },
    green: { pl: 'Zielony', en: 'Green', de: 'Grün', fr: 'Vert', cs: 'Zelená', hu: 'Zöld', ro: 'Verde' },
    black: { pl: 'Czarny', en: 'Black', de: 'Schwarz', fr: 'Noir', cs: 'Černá', hu: 'Fekete', ro: 'Negru' },
    natural: { pl: 'Naturalny', en: 'Natural', de: 'Natürlich', fr: 'Naturel', cs: 'Přírodní', hu: 'Természetes', ro: 'Natural' },
  };
  
  const baseColor = WAFTER_COLORS[colorKey] || WAFTER_COLORS.orange;
  return {
    name: t(colorNames[colorKey] || colorNames.orange, lang),
    hex: baseColor.hex
  };
};

export function generateRecommendations(ctx: RecommendationContext): FishingRecommendations {
  const { language: lang, season, fisheryType, depth, castingDistance, weather } = ctx;
  const { today, yesterday, dayBeforeYesterday } = weather;
  
  const avgTemp = (today.temperatureMin + today.temperatureMax) / 2;
  const tempBand = getTempBand(avgTemp);
  const windLevel = getWindLevel(today.windSpeed);
  const pressureTrend = getPressureTrend(today.pressure, yesterday.pressure, dayBeforeYesterday.pressure);
  const isCommercial = fisheryType === 'commercial-lake';
  const isDeep = depth === 'deep';

  return {
    summary: generateSummary(lang, today, yesterday, tempBand, windLevel, pressureTrend, season),
    sprzęt: generateEquipment(lang, windLevel, isDeep, season, tempBand, castingDistance, today.condition, avgTemp, isCommercial, today.windSpeed),
    towar: generateGroundbait(lang, season, tempBand, today.condition, isCommercial),
    miejsce: generateLocation(lang, tempBand, pressureTrend, today.windDirection, isDeep, season, today.condition),
    zestaw: generateSetup(lang, season, tempBand, today.condition, isCommercial, isDeep),
    strategie: generateStrategy(lang, isCommercial, season, tempBand)
  };
}

function generateSummary(
  lang: Language, 
  today: DayWeather, 
  yesterday: DayWeather,
  tempBand: string, 
  windLevel: string,
  pressureTrend: string,
  season: Season
): FishingRecommendations['summary'] {
  
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
    },
    {
      pl: `Ciśnienie ${today.pressure} hPa - ${pressureTrend === 'rising' ? 'tendencja wzrostowa, ryby aktywniejsze.' : pressureTrend === 'falling' ? 'tendencja spadkowa, ryby będą delikatnie pobierać pokarm, co może skutkować spadaniem ryb podczas holowania.' : 'stabilne, normalna aktywność ryb.'}`,
      en: `Pressure ${today.pressure} hPa - ${pressureTrend === 'rising' ? 'rising trend, fish more active.' : pressureTrend === 'falling' ? 'falling trend, fish will take bait delicately, which may result in fish falling off during reeling.' : 'stable, normal fish activity.'}`,
      de: `Druck ${today.pressure} hPa - ${pressureTrend === 'rising' ? 'steigender Trend, Fische aktiver.' : pressureTrend === 'falling' ? 'fallender Trend, Fische nehmen den Köder vorsichtig auf, was zum Abfallen beim Einholen führen kann.' : 'stabil, normale Fischaktivität.'}`,
      fr: `Pression ${today.pressure} hPa - ${pressureTrend === 'rising' ? 'tendance à la hausse, poissons plus actifs.' : pressureTrend === 'falling' ? 'tendance à la baisse, les poissons mordent délicatement, risque de décrochage lors de la récupération.' : 'stable, activité normale des poissons.'}`,
      cs: `Tlak ${today.pressure} hPa - ${pressureTrend === 'rising' ? 'stoupající trend, ryby aktivnější.' : pressureTrend === 'falling' ? 'klesající trend, ryby berou jemně, což může vést k jejich uvolnění při vytahování.' : 'stabilní, normální aktivita ryb.'}`,
      hu: `Nyomás ${today.pressure} hPa - ${pressureTrend === 'rising' ? 'emelkedő tendencia, halak aktívabbak.' : pressureTrend === 'falling' ? 'csökkenő tendencia, a halak finoman veszik fel a csalit, ami leakadáshoz vezethet behúzáskor.' : 'stabil, normális halaktivitás.'}`,
      ro: `Presiune ${today.pressure} hPa - ${pressureTrend === 'rising' ? 'tendință crescătoare, pești mai activi.' : pressureTrend === 'falling' ? 'tendință descrescătoare, peștii vor lua momeala delicat, ceea ce poate duce la pierderea lor în timpul tragerii.' : 'stabilă, activitate normală a peștilor.'}`
    }
  ];

  const feedingConditionsMap: Record<string, TranslatedText[]> = {
    cold: [
      { pl: 'Bardzo niska temperatura (poniżej 5°C) - aktywność ryb BARDZO NISKA. Ryby żerują minimalnie i bardzo ostrożnie.', en: 'Very low temperature (below 5°C) - fish activity VERY LOW. Fish feed minimally and very cautiously.', de: 'Sehr niedrige Temperatur (unter 5°C) - Fischaktivität SEHR NIEDRIG. Fische fressen minimal und sehr vorsichtig.', fr: 'Température très basse (en dessous de 5°C) - activité des poissons TRÈS FAIBLE. Les poissons se nourrissent très peu.', cs: 'Velmi nízká teplota (pod 5°C) - aktivita ryb VELMI NÍZKÁ. Ryby se krmí minimálně a velmi opatrně.', hu: 'Nagyon alacsony hőmérséklet (5°C alatt) - halaktivitás NAGYON ALACSONY. A halak minimálisan és nagyon óvatosan táplálkoznak.', ro: 'Temperatură foarte scăzută (sub 5°C) - activitatea peștilor FOARTE SCĂZUTĂ. Peștii se hrănesc minim și foarte precaut.' },
      { pl: 'Stosuj bardzo małe porcje zanęty - ryby nie potrzebują pokarmu. Mniejszy koszyczek zanętowy.', en: 'Use very small portions of groundbait - fish barely need food. Smaller feeder.', de: 'Sehr kleine Portionen Grundfutter - Fische brauchen kaum Nahrung. Kleinerer Futterkorb.', fr: 'Très petites portions d\'amorce - les poissons n\'ont presque pas besoin de nourriture. Plus petit feeder.', cs: 'Velmi malé porce krmiva - ryby téměř nepotřebují potravu. Menší krmítko.', hu: 'Nagyon kis adag etetőanyag - a halaknak alig kell étel. Kisebb etető.', ro: 'Porții foarte mici de nadă - peștii aproape nu au nevoie de hrană. Feeder mai mic.' },
      { pl: 'Czas na branie: 15 minut i więcej! Cierpliwość jest kluczowa. Najlepsza aktywność w środku dnia (11:00-14:00), gdy woda się minimalnie nagrzeje.', en: 'Bite time: 15 minutes or more! Patience is key. Best activity midday (11:00-14:00) when water warms up slightly.', de: 'Bisszeit: 15 Minuten oder mehr! Geduld ist entscheidend. Beste Aktivität mittags (11:00-14:00).', fr: 'Temps de touche: 15 minutes ou plus! La patience est essentielle. Meilleure activité en milieu de journée (11h-14h).', cs: 'Doba záběru: 15 minut a více! Trpělivost je klíčová. Nejlepší aktivita kolem poledne (11:00-14:00).', hu: 'Kapásidő: 15 perc vagy több! A türelem a kulcs. Legjobb aktivitás déltájban (11:00-14:00).', ro: 'Timp de mușcătură: 15 minute sau mai mult! Răbdarea este cheia. Cea mai bună activitate la prânz (11:00-14:00).' }
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
      { pl: 'Spadające ciśnienie - ryby pobierają pokarm bardzo delikatnie.', en: 'Falling pressure - fish take bait very delicately.', de: 'Fallender Druck - Fische nehmen den Köder sehr vorsichtig.', fr: 'Pression en baisse - les poissons prennent l\'appât très délicatement.', cs: 'Klesající tlak - ryby berou návnadu velmi jemně.', hu: 'Csökkenő nyomás - a halak nagyon finoman veszik a csalit.', ro: 'Presiune în scădere - peștii iau momeala foarte delicat.' },
      { pl: 'Holuj ostrożnie - ryby mogą łatwo spaść z haczyka!', en: 'Reel in carefully - fish may easily fall off the hook!', de: 'Vorsichtig einholen - Fische können leicht vom Haken fallen!', fr: 'Récupérez doucement - les poissons peuvent facilement décrocher!', cs: 'Vytahujte opatrně - ryby mohou snadno spadnout z háčku!', hu: 'Óvatosan húzza be - a halak könnyen leeshetnek a horogról!', ro: 'Trageți cu grijă - peștii pot cădea ușor de pe cârlig!' },
      { pl: 'Używaj mniejszych haczyków i delikatniejszej żyłki.', en: 'Use smaller hooks and finer line.', de: 'Verwenden Sie kleinere Haken und feinere Schnur.', fr: 'Utilisez des hameçons plus petits et une ligne plus fine.', cs: 'Používejte menší háčky a jemnější vlasec.', hu: 'Használjon kisebb horgokat és finomabb zsinórt.', ro: 'Folosiți cârlige mai mici și fir mai fin.' }
    ]
  };

  return {
    weatherConditions: weatherConditions.map(text => t(text, lang)),
    feedingConditions: (feedingConditionsMap[tempBand] || feedingConditionsMap.cool).map(text => t(text, lang)),
    keyFactors: (keyFactorsMap[pressureTrend] || keyFactorsMap.stable).map(text => t(text, lang)),
    weatherData: {
      condition: today.condition,
      temperatureMin: today.temperatureMin,
      temperatureMax: today.temperatureMax,
      windSpeed: today.windSpeed,
      windDirection: today.windDirection,
      pressure: today.pressure,
      pressureTrend: pressureTrend as 'rising' | 'stable' | 'falling'
    }
  };
}

function generateEquipment(
  lang: Language,
  windLevel: string,
  isDeep: boolean,
  season: Season,
  tempBand: string,
  castingDistance?: number,
  condition?: WeatherCondition,
  avgTemp?: number,
  isCommercial?: boolean,
  windSpeed?: number
): FishingRecommendations['sprzęt'] {
  
  // Rod selection based on casting distance (user's rules)
  // do 40m -> 3m, ~50m -> 3.3m, 60-70m -> 3.6m, >70m -> 3.9m, >100m -> 4.2m
  const getRodLength = (distance?: number): string => {
    if (!distance) return '3.6'; // default universal
    if (distance <= 40) return '3.0';
    if (distance <= 55) return '3.3';
    if (distance <= 75) return '3.6';
    if (distance <= 100) return '3.9';
    return '4.2';
  };
  
  const getRodDistanceRange = (distance?: number): { pl: string, en: string, de: string, fr: string, cs: string, hu: string, ro: string } => {
    if (!distance) return { pl: 'uniwersalny dystans', en: 'universal distance', de: 'universelle Distanz', fr: 'distance universelle', cs: 'univerzální vzdálenost', hu: 'univerzális távolság', ro: 'distanță universală' };
    if (distance <= 40) return { pl: 'do 40m', en: 'up to 40m', de: 'bis 40m', fr: 'jusqu\'à 40m', cs: 'do 40m', hu: '40m-ig', ro: 'până la 40m' };
    if (distance <= 55) return { pl: 'około 50m', en: 'around 50m', de: 'ca. 50m', fr: 'environ 50m', cs: 'kolem 50m', hu: 'kb. 50m', ro: 'aproximativ 50m' };
    if (distance <= 75) return { pl: '60-70m', en: '60-70m', de: '60-70m', fr: '60-70m', cs: '60-70m', hu: '60-70m', ro: '60-70m' };
    if (distance <= 100) return { pl: 'powyżej 70m', en: 'over 70m', de: 'über 70m', fr: 'plus de 70m', cs: 'nad 70m', hu: '70m felett', ro: 'peste 70m' };
    return { pl: 'ponad 100m', en: 'over 100m', de: 'über 100m', fr: 'plus de 100m', cs: 'nad 100m', hu: '100m felett', ro: 'peste 100m' };
  };
  
  const rodLength = getRodLength(castingDistance);
  const distanceRange = getRodDistanceRange(castingDistance);
  
  const rodRecommendations: TranslatedText[] = [
    { 
      pl: `Wędka ${rodLength}m - optymalna na dystans ${distanceRange.pl}.`, 
      en: `${rodLength}m rod - optimal for ${distanceRange.en}.`, 
      de: `${rodLength}m Rute - optimal für ${distanceRange.de}.`, 
      fr: `Canne ${rodLength}m - optimale pour ${distanceRange.fr}.`, 
      cs: `Prut ${rodLength}m - optimální pro ${distanceRange.cs}.`, 
      hu: `${rodLength}m bot - optimális ${distanceRange.hu}.`, 
      ro: `Lansetă ${rodLength}m - optimă pentru ${distanceRange.ro}.` 
    }
  ];
  
  // Add tip recommendation based on wind
  if (windLevel === 'strong') {
    rodRecommendations.push({ 
      pl: 'Szczytówka medium-heavy (2-3oz) dla stabilności przy wietrze.', 
      en: 'Medium-heavy tip (2-3oz) for stability in wind.', 
      de: 'Medium-heavy Spitze (2-3oz) für Stabilität bei Wind.', 
      fr: 'Scion medium-heavy (2-3oz) pour stabilité au vent.', 
      cs: 'Medium-heavy špička (2-3oz) pro stabilitu ve větru.', 
      hu: 'Medium-heavy csúcs (2-3oz) stabilitáshoz szélben.', 
      ro: 'Vârf medium-heavy (2-3oz) pentru stabilitate în vânt.' 
    });
  } else {
    rodRecommendations.push({ 
      pl: 'Szczytówka light (1oz) - lepiej pokazuje subtelne brania.', 
      en: 'Light tip (1oz) - shows subtle bites better.', 
      de: 'Light Spitze (1oz) - zeigt subtile Bisse besser.', 
      fr: 'Scion light (1oz) - montre mieux les touches subtiles.', 
      cs: 'Light špička (1oz) - lépe ukazuje jemné záběry.', 
      hu: 'Light csúcs (1oz) - jobban mutatja a finom kapásokat.', 
      ro: 'Vârf light (1oz) - arată mai bine mușcăturile subtile.' 
    });
  }
  
  rodRecommendations.push({ 
    pl: 'Delikatna szczytówka quiver tip do rejestracji brań.', 
    en: 'Delicate quiver tip for registering bites.', 
    de: 'Empfindliche Quiver-Spitze für Bissanzeige.', 
    fr: 'Scion quiver délicat pour détecter les touches.', 
    cs: 'Jemná quiver špička pro registraci záběrů.', 
    hu: 'Finom quiver csúcs a kapások észleléséhez.', 
    ro: 'Vârf quiver delicat pentru detectarea mușcăturilor.' 
  });

  // Seasonal distance recommendations
  if (castingDistance !== undefined) {
    // Winter: fish move away from shore - distance over 40m is good
    if (season === 'winter' && castingDistance > 40) {
      rodRecommendations.push({
        pl: 'ZIMA: Odległość wybrana poprawnie! Ryby odsuwają się od brzegu w okresie zimowym, szukając głębszych i cieplejszych wód.',
        en: 'WINTER: Distance chosen correctly! Fish move away from the shore in winter, seeking deeper and warmer waters.',
        de: 'WINTER: Distanz richtig gewählt! Fische entfernen sich im Winter vom Ufer auf der Suche nach tieferen, wärmeren Gewässern.',
        fr: 'HIVER: Distance correctement choisie! Les poissons s\'éloignent du bord en hiver, cherchant des eaux plus profondes et chaudes.',
        cs: 'ZIMA: Vzdálenost zvolena správně! Ryby se v zimě vzdalují od břehu a hledají hlubší a teplejší vody.',
        hu: 'TÉL: A távolság helyesen van kiválasztva! A halak télen eltávolodnak a parttól, mélyebb és melegebb vizeket keresve.',
        ro: 'IARNĂ: Distanța aleasă corect! Peștii se îndepărtează de mal iarna, căutând ape mai adânci și mai calde.'
      });
    }
    
    // Summer: fish come closer to shore - distance 20-30m is optimal
    if (season === 'summer' && castingDistance >= 20 && castingDistance <= 30) {
      rodRecommendations.push({
        pl: 'LATO: Optymalny dystans! W ciepłych miesiącach ryby podchodzą bliżej brzegu, szukając pokarmu w płytszych, dobrze natlenionych wodach.',
        en: 'SUMMER: Optimal distance! In warm months fish come closer to shore, seeking food in shallower, well-oxygenated waters.',
        de: 'SOMMER: Optimale Distanz! In warmen Monaten kommen Fische näher ans Ufer, um in flacheren, gut mit Sauerstoff versorgten Gewässern Nahrung zu suchen.',
        fr: 'ÉTÉ: Distance optimale! Dans les mois chauds, les poissons se rapprochent du bord, cherchant de la nourriture dans les eaux peu profondes et bien oxygénées.',
        cs: 'LÉTO: Optimální vzdálenost! V teplých měsících ryby přicházejí blíže k břehu a hledají potravu v mělčích, dobře okysličených vodách.',
        hu: 'NYÁR: Optimális távolság! A meleg hónapokban a halak közelebb jönnek a parthoz, táplálékot keresve a sekélyebb, jól oxigénezett vizekben.',
        ro: 'VARĂ: Distanță optimă! În lunile calde, peștii se apropie de mal, căutând hrană în apele mai puțin adânci și bine oxigenate.'
      });
    }
  }

  // Feeder weight logic based on distance:
  // Distance <= 40m → always 30g feeder
  // Distance > 90m → 50g+ feeder
  // Distance 41-90m → 40g feeder
  const actualWindSpeed = windSpeed || 0;
  const distance = castingDistance || 0;
  
  let feederWeight: string;
  let feederWeightsArr: number[];
  
  if (distance <= 40) {
    // Short distance (up to 40m) = always 30g feeder
    feederWeight = '30g';
    feederWeightsArr = [30];
  } else if (distance > 90) {
    // Very long distance = 50g+ feeders
    feederWeight = '50g+';
    feederWeightsArr = [50, 60, 80];
  } else {
    // Medium distance (41-90m) = 40g feeder
    feederWeight = '40g';
    feederWeightsArr = [40];
  }
  
  const feederType = isDeep ? 'cage feeder' : 'method feeder';
  
  const feederSelection: TranslatedText[] = [
    { pl: `Koszyczek ${feederWeight} - dostosowany do dystansu łowienia.`, en: `Feeder ${feederWeight} - adjusted to casting distance.`, de: `Futterkorb ${feederWeight} - an Wurfweite angepasst.`, fr: `Feeder ${feederWeight} - adapté à la distance de lancer.`, cs: `Krmítko ${feederWeight} - přizpůsobeno vzdálenosti.`, hu: `Kosár ${feederWeight} - dobási távolsághoz igazítva.`, ro: `Coș ${feederWeight} - adaptat la distanța de aruncare.` },
    { pl: 'Preferowany typ: flat method feeder - idealny do zanęty i pelletu.', en: 'Preferred type: flat method feeder - ideal for groundbait and pellet.', de: 'Bevorzugter Typ: Flat Method Feeder - ideal für Grundfutter und Pellets.', fr: 'Type préféré: flat method feeder - idéal pour l\'amorce et les pellets.', cs: 'Preferovaný typ: flat method feeder - ideální pro krmivo a pelety.', hu: 'Preferált típus: flat method feeder - ideális etetőanyaghoz és pellethez.', ro: 'Tip preferat: flat method feeder - ideal pentru nadă și pelete.' },
    { pl: 'Miej w zapasie 2-3 różne wagi koszyczków.', en: 'Have 2-3 different feeder weights in reserve.', de: 'Halten Sie 2-3 verschiedene Gewichte bereit.', fr: 'Ayez 2-3 poids différents en réserve.', cs: 'Mějte v záloze 2-3 různé váhy krmítek.', hu: 'Tartson készenlétben 2-3 különböző súlyt.', ro: 'Aveți 2-3 greutăți diferite în rezervă.' }
  ];

  // Strong wind warning (>30 km/h) - recommend heavier feeder for accuracy
  if (actualWindSpeed > 30) {
    feederSelection.push({
      pl: 'SILNY WIATR (>30 km/h): Rozważ użycie cięższego podajnika, żeby zestaw celniej leciał i utrzymywał się na stanowisku!',
      en: 'STRONG WIND (>30 km/h): Consider using a heavier feeder for more accurate casting and better position holding!',
      de: 'STARKER WIND (>30 km/h): Erwägen Sie einen schwereren Futterkorb für präzisere Würfe und besseren Halt!',
      fr: 'VENT FORT (>30 km/h): Envisagez un feeder plus lourd pour des lancers plus précis et un meilleur maintien!',
      cs: 'SILNÝ VÍTR (>30 km/h): Zvažte těžší krmítko pro přesnější hody a lepší udržení pozice!',
      hu: 'ERŐS SZÉL (>30 km/h): Fontolja meg nehezebb kosár használatát a pontosabb dobáshoz és jobb pozíciótartáshoz!',
      ro: 'VÂNT PUTERNIC (>30 km/h): Luați în considerare un coș mai greu pentru aruncări mai precise și menținere mai bună a poziției!'
    });
  }

  const additionalGear: TranslatedText[] = [
    { pl: 'Podbierak z długą rączką (min. 3m) i siatką karpiową.', en: 'Landing net with long handle (min. 3m) and carp mesh.', de: 'Kescher mit langem Griff (min. 3m).', fr: 'Épuisette à long manche (min. 3m).', cs: 'Podběrák s dlouhou rukojetí (min. 3m).', hu: 'Merítő hosszú nyéllel (min. 3m).', ro: 'Minciog cu mâner lung (min. 3m).' },
    { pl: 'Podpórki pod wędkę - stabilne, regulowane.', en: 'Rod rests - stable, adjustable.', de: 'Rutenhalter - stabil, verstellbar.', fr: 'Supports de canne - stables, réglables.', cs: 'Podpěry pod prut - stabilní, nastavitelné.', hu: 'Bottartók - stabil, állítható.', ro: 'Suporturi pentru lansetă - stabile, reglabile.' }
  ];

  if (condition === 'rainy' || condition === 'drizzle') {
    additionalGear.push({
      pl: 'PAMIĘTAJ O PARASOLU! Prognoza zapowiada deszcz.',
      en: 'REMEMBER THE UMBRELLA! Forecast shows rain.',
      de: 'REGENSCHIRM NICHT VERGESSEN! Vorhersage zeigt Regen.',
      fr: 'N\'OUBLIEZ PAS LE PARAPLUIE! Prévisions de pluie.',
      cs: 'NEZAPOMEŇTE NA DEŠTNÍK! Předpověď hlásí déšť.',
      hu: 'NE FELEJTSE EL AZ ESERNYŐT! Az előrejelzés esőt mutat.',
      ro: 'NU UITAȚI UMBRELA! Prognoza arată ploaie.'
    });
  }

  const isHighTemp = avgTemp !== undefined && avgTemp > 24;
  if (isHighTemp) {
    additionalGear.push({
      pl: 'WYSOKA TEMPERATURA (>24°C): Ryby wolniej żerują z uwagi na mniejszą ilość tlenu. Częściej żerują przy powierzchni wody - rozważ użycie pellet wagglera lub slow sinking bomb do odławiania ryb z toni!',
      en: 'HIGH TEMPERATURE (>24°C): Fish feed slower due to less oxygen. They often feed near the surface - consider using pellet waggler or slow sinking bomb to catch fish from mid-water!',
      de: 'HOHE TEMPERATUR (>24°C): Fische fressen langsamer wegen weniger Sauerstoff. Sie fressen oft an der Oberfläche - verwenden Sie Pellet-Waggler oder Slow Sinking Bomb!',
      fr: 'HAUTE TEMPÉRATURE (>24°C): Les poissons se nourrissent plus lentement à cause du manque d\'oxygène. Ils se nourrissent souvent en surface - utilisez un pellet waggler ou slow sinking bomb!',
      cs: 'VYSOKÁ TEPLOTA (>24°C): Ryby žerou pomaleji kvůli méně kyslíku. Často žerou u hladiny - zvažte pellet waggler nebo slow sinking bomb!',
      hu: 'MAGAS HŐMÉRSÉKLET (>24°C): A halak lassabban táplálkoznak a kevesebb oxigén miatt. Gyakran a felszínen táplálkoznak - fontolja meg a pellet waggler vagy slow sinking bomb használatát!',
      ro: 'TEMPERATURĂ RIDICATĂ (>24°C): Peștii se hrănesc mai lent din cauza oxigenului scăzut. Se hrănesc adesea la suprafață - luați în considerare pellet waggler sau slow sinking bomb!'
    });
  }

  const isPeakSeason = season === 'summer' && isCommercial;
  if (isPeakSeason) {
    feederSelection.push({
      pl: 'PEŁNIA SEZONU NA KOMERCJACH: Rozważ użycie Bomb Feeder zamiast method feeder - ryby chętniej pobierają pojedyncze kawałki (pellety, ziarna) niż zanętę. Metabolizm ryb jest wysoki!',
      en: 'PEAK SEASON ON COMMERCIALS: Consider using Bomb Feeder instead of method feeder - fish prefer single pieces (pellets, grains) over groundbait. Fish metabolism is high!',
      de: 'HOCHSAISON AUF KOMMERZIELLEN: Erwägen Sie Bomb Feeder statt Method Feeder - Fische bevorzugen einzelne Stücke (Pellets, Körner).',
      fr: 'PLEINE SAISON SUR COMMERCIAUX: Envisagez le Bomb Feeder au lieu du method feeder - les poissons préfèrent les morceaux individuels (pellets, graines).',
      cs: 'VRCHOL SEZÓNY NA KOMERČNÍCH: Zvažte Bomb Feeder místo method feeder - ryby preferují jednotlivé kousky (pelety, zrna).',
      hu: 'SZEZON CSÚCSA KERESKEDELMI VIZEKEN: Fontolja meg a Bomb Feeder használatát method feeder helyett - a halak inkább az egyedi darabokat (pellet, mag) részesítik előnyben.',
      ro: 'VÂRF DE SEZON PE COMERCIALE: Luați în considerare Bomb Feeder în loc de method feeder - peștii preferă bucățile individuale (pelete, boabe).'
    });
  }

  return {
    rodRecommendation: rodRecommendations.map(text => t(text, lang)),
    feederSelection: feederSelection.map(text => t(text, lang)),
    feederWeights: feederWeightsArr,
    additionalGear: additionalGear.map(text => t(text, lang))
  };
}

function generateGroundbait(
  lang: Language,
  season: Season,
  tempBand: string,
  condition: WeatherCondition,
  isCommercial: boolean
): FishingRecommendations['towar'] {
  
  const isCold = tempBand === 'cold' || tempBand === 'cool';
  const isSunny = condition === 'sunny';
  
  const groundbaitColor: TranslatedText[] = isCold
    ? [
        { pl: 'Ciemna zanęta (brązowa, czarna) - mniej odstrasza ryby w chłodnej wodzie.', en: 'Dark groundbait (brown, black) - less scary for fish in cold water.', de: 'Dunkles Grundfutter (braun, schwarz).', fr: 'Amorce sombre (marron, noir).', cs: 'Tmavé krmivo (hnědé, černé).', hu: 'Sötét etetőanyag (barna, fekete).', ro: 'Nadă întunecată (maro, negru).' },
        { pl: 'Ciemne kolory wtapiają się w dno, ryby czują się bezpieczniej.', en: 'Dark colors blend with bottom, fish feel safer.', de: 'Dunkle Farben verschmelzen mit dem Grund.', fr: 'Les couleurs sombres se fondent avec le fond.', cs: 'Tmavé barvy splývají se dnem.', hu: 'A sötét színek beleolvadnak a fenékbe.', ro: 'Culorile întunecate se confundă cu fundul.' },
        { pl: 'Unikaj jaskrawych, kontrastowych zanęt.', en: 'Avoid bright, contrasting groundbaits.', de: 'Vermeiden Sie helle, kontrastreiche Grundfutter.', fr: 'Évitez les amorces vives et contrastées.', cs: 'Vyhněte se jasným, kontrastním krmivům.', hu: 'Kerülje az élénk, kontrasztos etetőanyagokat.', ro: 'Evitați nadele luminoase și contrastante.' }
      ]
    : [
        { pl: 'Jaśniejsza zanęta (żółta, pomarańczowa) - przyciąga aktywne ryby.', en: 'Lighter groundbait (yellow, orange) - attracts active fish.', de: 'Helleres Grundfutter (gelb, orange).', fr: 'Amorce plus claire (jaune, orange).', cs: 'Světlejší krmivo (žluté, oranžové).', hu: 'Világosabb etetőanyag (sárga, narancssárga).', ro: 'Nadă mai deschisă (galbenă, portocalie).' },
        { pl: 'W ciepłej wodzie ryby aktywnie szukają pokarmu.', en: 'In warm water fish actively seek food.', de: 'Im warmen Wasser suchen Fische aktiv nach Nahrung.', fr: 'Dans l\'eau chaude, les poissons cherchent activement la nourriture.', cs: 'V teplé vodě ryby aktivně hledají potravu.', hu: 'Meleg vízben a halak aktívan keresik az élelmet.', ro: 'În apă caldă, peștii caută activ hrană.' },
        { pl: 'Kontrastowe kolory dobrze działają przy dobrej widoczności.', en: 'Contrasting colors work well with good visibility.', de: 'Kontrastfarben funktionieren gut bei guter Sicht.', fr: 'Les couleurs contrastées fonctionnent bien avec une bonne visibilité.', cs: 'Kontrastní barvy dobře fungují při dobré viditelnosti.', hu: 'A kontrasztos színek jól működnek jó láthatóságnál.', ro: 'Culorile contrastante funcționează bine cu vizibilitate bună.' }
      ];

  // Seasonal pellet logic:
  // Winter & Autumn: 100% groundbait, 0% pellet
  // Spring: 95% groundbait, 5% pellet (transitioning towards summer)
  // Summer: 90% groundbait, 10% pellet (maximum pellet allowed)
  let pelletPercent: number;
  let groundbaitPercent: number;
  let pelletRatio: string;
  let pelletAdvice: TranslatedText;

  if (season === 'winter' || season === 'autumn') {
    groundbaitPercent = 100;
    pelletPercent = 0;
    pelletRatio = '100% zanęta';
    pelletAdvice = { 
      pl: 'ZIMA/JESIEŃ: Używaj wyłącznie zanęty - pellet w zimnej wodzie jest trudno trawiony przez ryby.', 
      en: 'WINTER/AUTUMN: Use only groundbait - pellet is hard to digest for fish in cold water.', 
      de: 'WINTER/HERBST: Nur Grundfutter verwenden - Pellets sind in kaltem Wasser schwer verdaulich.', 
      fr: 'HIVER/AUTOMNE: Utilisez uniquement de l\'amorce - les pellets sont difficiles à digérer en eau froide.', 
      cs: 'ZIMA/PODZIM: Používejte pouze krmivo - pelety jsou v studené vodě těžko stravitelné.', 
      hu: 'TÉL/ŐSZ: Csak etetőanyagot használjon - a pellet hideg vízben nehezen emészthető.', 
      ro: 'IARNĂ/TOAMNĂ: Folosiți doar nadă - peletele sunt greu de digerat în apă rece.' 
    };
  } else if (season === 'spring') {
    groundbaitPercent = 95;
    pelletPercent = 5;
    pelletRatio = '95% zanęta / 5% pellet';
    pelletAdvice = { 
      pl: 'WIOSNA: Możesz dodać maksymalnie 5% pelletu - ryby zaczynają się budzić, ale woda jest jeszcze chłodna.', 
      en: 'SPRING: You can add maximum 5% pellet - fish are waking up but water is still cool.', 
      de: 'FRÜHLING: Maximal 5% Pellets hinzufügen - Fische werden aktiver, aber Wasser ist noch kühl.', 
      fr: 'PRINTEMPS: Ajoutez maximum 5% de pellets - les poissons se réveillent mais l\'eau est encore fraîche.', 
      cs: 'JARO: Můžete přidat maximálně 5% peletek - ryby se probouzejí, ale voda je stále chladná.', 
      hu: 'TAVASZ: Maximum 5% pelletet adhat hozzá - a halak ébrednek, de a víz még hűvös.', 
      ro: 'PRIMĂVARĂ: Puteți adăuga maxim 5% pelete - peștii se trezesc dar apa e încă răcoroasă.' 
    };
  } else {
    // Summer - maximum 10% pellet
    groundbaitPercent = 90;
    pelletPercent = 10;
    pelletRatio = '90% zanęta / 10% pellet';
    pelletAdvice = { 
      pl: 'LATO: Możesz dodać do 10% pelletu - ryby są aktywne i lepiej trawią pokarm.', 
      en: 'SUMMER: You can add up to 10% pellet - fish are active and digest food better.', 
      de: 'SOMMER: Bis zu 10% Pellets hinzufügen - Fische sind aktiv und verdauen besser.', 
      fr: 'ÉTÉ: Ajoutez jusqu\'à 10% de pellets - les poissons sont actifs et digèrent mieux.', 
      cs: 'LÉTO: Můžete přidat až 10% peletek - ryby jsou aktivní a lépe tráví.', 
      hu: 'NYÁR: Akár 10% pelletet is hozzáadhat - a halak aktívak és jobban emésztik az ételt.', 
      ro: 'VARĂ: Puteți adăuga până la 10% pelete - peștii sunt activi și digeră mai bine.' 
    };
  }
  
  const groundbaitMix: TranslatedText[] = [
    { pl: `Proporcja mieszanki: ${pelletRatio}.`, en: `Mix ratio: ${pelletRatio.replace('zanęta', 'groundbait')}.`, de: `Mischungsverhältnis: ${pelletRatio.replace('zanęta', 'Grundfutter')}.`, fr: `Ratio du mélange: ${pelletRatio.replace('zanęta', 'amorce')}.`, cs: `Poměr směsi: ${pelletRatio.replace('zanęta', 'krmivo')}.`, hu: `Keverési arány: ${pelletRatio.replace('zanęta', 'etetőanyag')}.`, ro: `Raportul amestecului: ${pelletRatio.replace('zanęta', 'nadă')}.` },
    pelletAdvice,
    { pl: 'PRO TIP: Mniej mączek rybnych w zimie, więcej mączek rybnych w lecie. W zimnych miesiącach dobrze działają ostre przyprawy. Testuj na swojej wodzie która jest najbardziej efektywna!', en: 'PRO TIP: Less fishmeal in winter, more fishmeal in summer. In cold months sharp spices work well. Test on your water which is most effective!', de: 'PRO TIPP: Weniger Fischmehl im Winter, mehr Fischmehl im Sommer. In kalten Monaten wirken scharfe Gewürze gut. Testen Sie an Ihrem Gewässer!', fr: 'PRO TIP: Moins de farine de poisson en hiver, plus en été. En mois froids les épices fortes fonctionnent bien. Testez sur votre eau!', cs: 'PRO TIP: Méně rybí moučky v zimě, více v létě. V chladných měsících fungují ostré koření dobře. Testujte na své vodě!', hu: 'PRO TIPP: Kevesebb halliszt télen, több nyáron. Hideg hónapokban a csípős fűszerek jól működnek. Tesztelje a saját vizén!', ro: 'PRO TIP: Mai puțină făină de pește iarna, mai multă vara. În lunile reci condimentele iuți funcționează bine. Testați pe apa dumneavoastră!' },
    { pl: 'Dodaj aromatyczne dodatki: kukurydza, konopie, wanilia.', en: 'Add aromatic additives: corn, hemp, vanilla.', de: 'Fügen Sie aromatische Zusätze hinzu: Mais, Hanf, Vanille.', fr: 'Ajoutez des additifs aromatiques: maïs, chanvre, vanille.', cs: 'Přidejte aromatické přísady: kukuřice, konopí, vanilka.', hu: 'Adjon hozzá aromás adalékokat: kukorica, kender, vanília.', ro: 'Adăugați aditivi aromatici: porumb, cânepă, vanilie.' }
  ];

  const isColdSeason = season === 'winter' || season === 'autumn';
  const isWarmSeason = season === 'summer' || season === 'spring';
  
  const preparation: TranslatedText[] = [
    { pl: 'Odczekaj 10-15 minut przed użyciem zanęty.', en: 'Wait 10-15 minutes before using groundbait.', de: 'Warten Sie 10-15 Minuten vor der Verwendung des Grundfutters.', fr: 'Attendez 10-15 minutes avant d\'utiliser l\'amorce.', cs: 'Počkejte 10-15 minut před použitím krmiva.', hu: 'Várjon 10-15 percet az etetőanyag használata előtt.', ro: 'Așteptați 10-15 minute înainte de a folosi nada.' }
  ];

  if (isColdSeason) {
    preparation.push({
      pl: 'JESIEŃ/ZIMA: Zanęta powinna być rozrobiona bardziej SUCHO - żeby smużyła w wodzie i tworzyła chmurę wabiącą ryby.',
      en: 'AUTUMN/WINTER: Groundbait should be mixed more DRY - so it clouds in water and creates an attractive cloud for fish.',
      de: 'HERBST/WINTER: Grundfutter sollte TROCKENER gemischt werden - damit es im Wasser wolkt.',
      fr: 'AUTOMNE/HIVER: L\'amorce doit être mélangée plus SÈCHE - pour qu\'elle nuage dans l\'eau.',
      cs: 'PODZIM/ZIMA: Krmivo by mělo být namícháno více NASUCHO - aby se v vodě mlžilo.',
      hu: 'ŐSZ/TÉL: Az etetőanyagot SZÁRAZABBAN kell keverni - hogy felhőzzön a vízben.',
      ro: 'TOAMNĂ/IARNĂ: Nada trebuie amestecată mai USCAT - pentru a forma nor în apă.'
    });
  }

  if (isWarmSeason) {
    preparation.push({
      pl: 'WIOSNA/LATO: Zanęta może być lekko przemoczona - wolniej wysycha na słońcu i lepiej ściele się na dnie łowiska.',
      en: 'SPRING/SUMMER: Groundbait can be slightly wetter - dries slower in sun and spreads better on the bottom.',
      de: 'FRÜHLING/SOMMER: Grundfutter kann etwas feuchter sein - trocknet langsamer in der Sonne.',
      fr: 'PRINTEMPS/ÉTÉ: L\'amorce peut être légèrement plus humide - sèche plus lentement au soleil.',
      cs: 'JARO/LÉTO: Krmivo může být mírně vlhčí - schne pomaleji na slunci.',
      hu: 'TAVASZ/NYÁR: Az etetőanyag lehet kissé nedvesebb - lassabban szárad a napon.',
      ro: 'PRIMĂVARĂ/VARĂ: Nada poate fi ușor mai umedă - se usucă mai lent la soare.'
    });
  }

  preparation.push(
    { pl: 'Konsystencja: zanęta powinna trzymać się w koszyczku, ale rozpadać na dnie.', en: 'Consistency: groundbait should hold in feeder but break up on bottom.', de: 'Konsistenz: Grundfutter sollte im Korb halten.', fr: 'Consistance: l\'amorce doit tenir dans le feeder.', cs: 'Konzistence: krmivo by mělo držet v krmítku.', hu: 'Konzisztencia: az etetőanyag tartson a kosárban.', ro: 'Consistență: nada trebuie să țină în coș.' }
  );

  if (isColdSeason && isCommercial) {
    preparation.push({
      pl: 'JESIEŃ/ZIMA NA KOMERCJACH: Użyj zalewajek i boosterów słodkich na bazie glikolu - działają dobrze w zimnej wodzie.',
      en: 'AUTUMN/WINTER ON COMMERCIALS: Use sweet liquids and glycol-based boosters - they work well in cold water.',
      de: 'HERBST/WINTER AUF KOMMERZIELLEN: Verwenden Sie süße Flüssigkeiten und Glykolbooster.',
      fr: 'AUTOMNE/HIVER SUR COMMERCIAUX: Utilisez des liquides sucrés et des boosters à base de glycol.',
      cs: 'PODZIM/ZIMA NA KOMERČNÍCH: Použijte sladké tekutiny a boostery na bázi glykolu.',
      hu: 'ŐSZ/TÉL KERESKEDELMI VIZEKEN: Használjon édes folyadékokat és glikol alapú boostereket.',
      ro: 'TOAMNĂ/IARNĂ PE COMERCIALE: Folosiți lichide dulci și boostere pe bază de glicol.'
    });
  }

  if (isWarmSeason && isCommercial) {
    preparation.push({
      pl: 'WIOSNA/LATO NA KOMERCJACH: Użyj olejów rybnych jako boosterów - dobrze wabią ryby w ciepłej wodzie.',
      en: 'SPRING/SUMMER ON COMMERCIALS: Use fish oils as boosters - they attract fish well in warm water.',
      de: 'FRÜHLING/SOMMER AUF KOMMERZIELLEN: Verwenden Sie Fischöle als Booster.',
      fr: 'PRINTEMPS/ÉTÉ SUR COMMERCIAUX: Utilisez des huiles de poisson comme boosters.',
      cs: 'JARO/LÉTO NA KOMERČNÍCH: Použijte rybí oleje jako boostery.',
      hu: 'TAVASZ/NYÁR KERESKEDELMI VIZEKEN: Használjon halolajokat boosterként.',
      ro: 'PRIMĂVARĂ/VARĂ PE COMERCIALE: Folosiți uleiuri de pește ca boostere.'
    });
  }

  const sunnyTip: TranslatedText = {
    pl: 'W słoneczny dzień: użyj jasnej "czapki" z zanęty na wierzchu koszyczka - lepiej widoczna dla ryb.',
    en: 'On sunny day: use light "cap" of groundbait on top of feeder - more visible for fish.',
    de: 'An sonnigen Tagen: helle "Kappe" aus Grundfutter oben auf dem Korb.',
    fr: 'Par temps ensoleillé: utilisez une "casquette" claire d\'amorce sur le feeder.',
    cs: 'Za slunečného dne: použijte světlou "čepičku" z krmiva nahoře.',
    hu: 'Napos időben: használjon világos "sapkát" az etetőanyagból.',
    ro: 'În zi însorită: folosiți o "căciulă" deschisă de nadă deasupra.'
  };

  return {
    groundbaitColor: groundbaitColor.map(text => t(text, lang)),
    groundbaitMix: groundbaitMix.map(text => t(text, lang)),
    mixRatio: {
      groundbaitPercent,
      pelletPercent
    },
    preparation: preparation.map(text => t(text, lang)),
    sunnyWeatherTip: isSunny ? t(sunnyTip, lang) : undefined
  };
}

function generateLocation(
  lang: Language,
  tempBand: string,
  pressureTrend: string,
  windDirection: string,
  isDeep: boolean,
  season: Season,
  condition: WeatherCondition
): FishingRecommendations['miejsce'] {
  
  const depthRecommendation: TranslatedText[] = isDeep
    ? [
        { pl: 'Łów na głębokości 4-6 metrów, gdzie woda jest chłodniejsza.', en: 'Fish at 4-6 meters depth where water is cooler.', de: 'Angeln Sie in 4-6 Metern Tiefe.', fr: 'Pêchez à 4-6 mètres de profondeur.', cs: 'Lovte v hloubce 4-6 metrů.', hu: 'Horgásszon 4-6 méter mélységben.', ro: 'Pescuiți la 4-6 metri adâncime.' },
        { pl: 'Głębsze stanowiska są stabilniejsze termicznie.', en: 'Deeper spots are more thermally stable.', de: 'Tiefere Stellen sind thermisch stabiler.', fr: 'Les spots plus profonds sont plus stables thermiquement.', cs: 'Hlubší místa jsou teplotně stabilnější.', hu: 'A mélyebb helyek hőmérsékletileg stabilabbak.', ro: 'Locurile mai adânci sunt mai stabile termic.' }
      ]
    : [
        { pl: 'Łów na głębokości 2-4 metrów, gdzie ryby aktywnie żerują.', en: 'Fish at 2-4 meters depth where fish actively feed.', de: 'Angeln Sie in 2-4 Metern Tiefe.', fr: 'Pêchez à 2-4 mètres de profondeur.', cs: 'Lovte v hloubce 2-4 metrů.', hu: 'Horgásszon 2-4 méter mélységben.', ro: 'Pescuiți la 2-4 metri adâncime.' },
        { pl: 'Płytsze strefy szybciej się nagrzewają - podczas dnia ryby mogą się tam przemieszczać szukając cieplejszej wody.', en: 'Shallower zones warm up faster - during the day fish may move there seeking warmer water.', de: 'Flachere Zonen erwärmen sich schneller - tagsüber können Fische dorthin ziehen, um wärmeres Wasser zu suchen.', fr: 'Les zones moins profondes se réchauffent plus vite - pendant la journée, les poissons peuvent s\'y déplacer à la recherche d\'une eau plus chaude.', cs: 'Mělčí zóny se rychleji ohřívají - během dne se tam ryby mohou přesouvat za teplejší vodou.', hu: 'A sekélyebb zónák gyorsabban melegszenek - napközben a halak odavándorolhatnak melegebb vizet keresve.', ro: 'Zonele mai puțin adânci se încălzesc mai repede - în timpul zilei peștii se pot deplasa acolo căutând apă mai caldă.' }
      ];

  const bottomType: TranslatedText[] = [
    { pl: 'Szukaj twardszego dna - piasek, żwir lub glina.', en: 'Look for harder bottom - sand, gravel or clay.', de: 'Suchen Sie nach härterem Grund - Sand, Kies oder Ton.', fr: 'Cherchez un fond plus dur - sable, gravier ou argile.', cs: 'Hledejte tvrdší dno - písek, štěrk nebo jíl.', hu: 'Keressen keményebb feneket - homok, kavics vagy agyag.', ro: 'Căutați fund mai dur - nisip, pietriș sau argilă.' },
    { pl: 'Unikaj zbyt mulistego dna - koszyczek może się zapadać.', en: 'Avoid too muddy bottom - feeder may sink in.', de: 'Vermeiden Sie zu schlammigen Grund.', fr: 'Évitez un fond trop boueux.', cs: 'Vyhněte se příliš bahnitému dnu.', hu: 'Kerülje a túl iszapos feneket.', ro: 'Evitați fundul prea noroios.' },
    { pl: 'Sprawdź dno ciężarkiem przed rozpoczęciem łowienia.', en: 'Check bottom with weight before starting to fish.', de: 'Prüfen Sie den Grund mit einem Gewicht.', fr: 'Vérifiez le fond avec un plomb.', cs: 'Zkontrolujte dno závažím.', hu: 'Ellenőrizze a feneket súllyal.', ro: 'Verificați fundul cu o greutate.' }
  ];

  // Seasonal fish movement behavior
  const fishMovementTip: TranslatedText = (season === 'winter' || season === 'autumn')
    ? { 
        pl: 'Ryby mniej się przemieszczają w chłodne miesiące - kluczem jest znalezienie gdzie żerują i cierpliwe łowienie w tym miejscu.', 
        en: 'Fish move less in cold months - the key is finding where they feed and fishing patiently in that spot.', 
        de: 'Fische bewegen sich in kalten Monaten weniger - der Schlüssel ist, ihren Futterplatz zu finden und geduldig dort zu angeln.', 
        fr: 'Les poissons bougent moins par temps froid - la clé est de trouver où ils se nourrissent et de pêcher patiemment.', 
        cs: 'Ryby se v chladných měsících méně pohybují - klíčem je najít kde žerou a trpělivě tam lovit.', 
        hu: 'A halak kevesebbet mozognak hideg hónapokban - a kulcs megtalálni hol táplálkoznak és türelmesen ott horgászni.', 
        ro: 'Peștii se mișcă mai puțin în lunile reci - cheia este să găsiți unde se hrănesc și să pescuiți cu răbdare acolo.' 
      }
    : { 
        pl: 'Ryby aktywnie przemieszczają się po całym zbiorniku szukając pokarmu - bądź elastyczny z lokalizacją.', 
        en: 'Fish actively move around the entire water seeking food - be flexible with your location.', 
        de: 'Fische bewegen sich aktiv im gesamten Gewässer auf Nahrungssuche - seien Sie flexibel mit Ihrem Standort.', 
        fr: 'Les poissons se déplacent activement dans tout le plan d\'eau à la recherche de nourriture - soyez flexible avec votre emplacement.', 
        cs: 'Ryby se aktivně pohybují po celé vodě a hledají potravu - buďte flexibilní s umístěním.', 
        hu: 'A halak aktívan mozognak az egész vízterületen élelmet keresve - legyen rugalmas a helyszínnel.', 
        ro: 'Peștii se deplasează activ în tot bazinul căutând hrană - fiți flexibil cu locația.' 
      };

  const fishLocation: TranslatedText[] = pressureTrend === 'rising'
    ? [
        { pl: 'Przy rosnącym ciśnieniu ryby wychodzą z ukrycia.', en: 'With rising pressure fish come out of hiding.', de: 'Bei steigendem Druck kommen Fische aus dem Versteck.', fr: 'Avec une pression en hausse, les poissons sortent.', cs: 'Při stoupajícím tlaku ryby vycházejí z úkrytu.', hu: 'Emelkedő nyomásnál a halak előjönnek.', ro: 'Cu presiune în creștere, peștii ies din ascunzătoare.' },
        { pl: 'Szukaj ryb w środkowej i bliższej strefie.', en: 'Look for fish in middle and closer zone.', de: 'Suchen Sie Fische in der mittleren Zone.', fr: 'Cherchez les poissons dans la zone centrale.', cs: 'Hledejte ryby ve střední zóně.', hu: 'Keressen halakat a középső zónában.', ro: 'Căutați pești în zona centrală.' },
        fishMovementTip
      ]
    : [
        { pl: 'Szukaj ryb przy strukturach - pęcherzach, kamieniach, roślinności.', en: 'Look for fish near structures - weeds, rocks, vegetation.', de: 'Suchen Sie Fische bei Strukturen.', fr: 'Cherchez les poissons près des structures.', cs: 'Hledejte ryby u struktur.', hu: 'Keressen halakat struktúrák közelében.', ro: 'Căutați pești lângă structuri.' },
        { pl: `Wiatr z ${windDirection} - ryby mogą być po nawietrznej stronie.`, en: `Wind from ${windDirection} - fish may be on windward side.`, de: `Wind aus ${windDirection} - Fische könnten an der Luvseite sein.`, fr: `Vent de ${windDirection} - poissons peuvent être du côté du vent.`, cs: `Vítr z ${windDirection} - ryby mohou být na návětrné straně.`, hu: `Szél ${windDirection} irányból - halak lehetnek a szél felőli oldalon.`, ro: `Vânt din ${windDirection} - peștii pot fi pe partea vântului.` },
        fishMovementTip
      ];

  const spotSelection: TranslatedText[] = [
    { pl: 'Wybierz miejsce z dostępem do głębokiej i płytkiej wody.', en: 'Choose spot with access to deep and shallow water.', de: 'Wählen Sie einen Platz mit Zugang zu tiefem und flachem Wasser.', fr: 'Choisissez un endroit avec accès à l\'eau profonde et peu profonde.', cs: 'Vyberte místo s přístupem k hluboké i mělké vodě.', hu: 'Válasszon helyet mély és sekély víz hozzáféréssel.', ro: 'Alegeți un loc cu acces la apă adâncă și puțin adâncă.' },
    { pl: 'Unikaj miejsc z dużym ruchem innych wędkarzy.', en: 'Avoid spots with heavy traffic from other anglers.', de: 'Vermeiden Sie Plätze mit viel Verkehr anderer Angler.', fr: 'Évitez les endroits avec beaucoup de passage d\'autres pêcheurs.', cs: 'Vyhněte se místům s velkým provozem jiných rybářů.', hu: 'Kerülje a más horgászok által forgalmas helyeket.', ro: 'Evitați locurile cu mult trafic de la alți pescari.' },
    { pl: 'PRO TIP: Obserwuj wodę gdzie pokazują się bańki na powierzchni wody. Pamiętaj - więcej drobnych bąbelków to ławica małych karpi, kilka większych bąbelków oznacza większe osobniki.', en: 'PRO TIP: Watch the water where bubbles appear on the surface. Remember - more small bubbles mean a school of small carp, a few larger bubbles indicate bigger fish.', de: 'PRO TIPP: Beobachten Sie das Wasser, wo Blasen an der Oberfläche erscheinen. Denken Sie daran - mehr kleine Blasen bedeuten einen Schwarm kleiner Karpfen, wenige größere Blasen deuten auf größere Fische hin.', fr: 'PRO TIP: Observez l\'eau où des bulles apparaissent à la surface. Rappelez-vous - plus de petites bulles signifient un banc de petites carpes, quelques grosses bulles indiquent de plus gros poissons.', cs: 'PRO TIP: Sledujte vodu, kde se na hladině objevují bubliny. Pamatujte - více malých bublin znamená hejno malých kaprů, několik větších bublin značí větší kusy.', hu: 'PRO TIPP: Figyelje a vizet, ahol buborékok jelennek meg a felszínen. Ne feledje - több apró buborék kis pontyok rajára utal, néhány nagyobb buborék nagyobb példányokat jelez.', ro: 'PRO TIP: Urmăriți apa unde apar bule la suprafață. Amintiți-vă - mai multe bule mici înseamnă un banc de crapi mici, câteva bule mai mari indică pești mai mari.' }
  ];

  if (season === 'winter') {
    spotSelection.push({
      pl: 'ZIMA: Szukaj głębokich partii zbiornika - tam ryby przebywają zimą.',
      en: 'WINTER: Look for deep parts of the water - fish stay there in winter.',
      de: 'WINTER: Suchen Sie tiefe Bereiche - dort halten sich Fische im Winter auf.',
      fr: 'HIVER: Cherchez les parties profondes - les poissons y restent en hiver.',
      cs: 'ZIMA: Hledejte hluboké části - ryby tam v zimě pobývají.',
      hu: 'TÉL: Keressen mély részeket - a halak télen ott tartózkodnak.',
      ro: 'IARNĂ: Căutați părțile adânci - peștii stau acolo iarna.'
    });
  }

  if (condition === 'sunny') {
    spotSelection.push({
      pl: 'SŁONECZNIE: Przy słonecznej pogodzie ryby lubią wychodzić na płytkie partie, wygrzewając się na słońcu.',
      en: 'SUNNY: In sunny weather fish like to come to shallow parts, warming up in the sun.',
      de: 'SONNIG: Bei sonnigem Wetter kommen Fische gerne in flache Bereiche, um sich zu wärmen.',
      fr: 'ENSOLEILLÉ: Par temps ensoleillé, les poissons aiment venir dans les parties peu profondes pour se réchauffer.',
      cs: 'SLUNEČNO: Za slunečného počasí ryby rády přicházejí do mělkých částí a vyhřívají se.',
      hu: 'NAPOS: Napos időben a halak szeretnek sekély részekre jönni és sütkérezni.',
      ro: 'ÎNSORIT: Pe vreme însorită, peștilor le place să vină în părțile puțin adânci pentru a se încălzi.'
    });
  }

  return {
    depthRecommendation: depthRecommendation.map(text => t(text, lang)),
    bottomType: bottomType.map(text => t(text, lang)),
    fishLocation: fishLocation.map(text => t(text, lang)),
    spotSelection: spotSelection.map(text => t(text, lang))
  };
}

function generateSetup(
  lang: Language,
  season: Season,
  tempBand: string,
  condition: WeatherCondition,
  isCommercial: boolean,
  isDeep: boolean
): FishingRecommendations['zestaw'] {
  
  const isCold = tempBand === 'cold' || tempBand === 'cool';
  const hookSizeNum = isCold ? '12-14' : '10-12';
  
  const hookSize: TranslatedText[] = [
    { pl: `Haczyk rozmiar ${hookSizeNum} - ${isCold ? 'mniejszy dla ostrożnych ryb' : 'większy dla aktywnych ryb'}.`, en: `Hook size ${hookSizeNum} - ${isCold ? 'smaller for cautious fish' : 'larger for active fish'}.`, de: `Hakengröße ${hookSizeNum}.`, fr: `Hameçon taille ${hookSizeNum}.`, cs: `Háček velikost ${hookSizeNum}.`, hu: `Horog méret ${hookSizeNum}.`, ro: `Cârlig mărime ${hookSizeNum}.` },
    { pl: `Materiał: wysokowęglowa stal z antykorozyjną powłoką dla trwałości.`, en: `Material: high-carbon steel with anti-corrosion coating for durability.`, de: `Material: Hochkohlenstoffstahl mit Korrosionsschutz.`, fr: `Matériau: acier haute teneur en carbone avec revêtement anti-corrosion.`, cs: `Materiál: vysokouhlíková ocel s protikorozní úpravou.`, hu: `Anyag: magas széntartalmú acél korrózióálló bevonattal.`, ro: `Material: oțel cu conținut ridicat de carbon cu acoperire anticorozivă.` }
  ];

  // Seasonal hook type selection
  // Summer = wide gape/curve hook for aggressive bites
  // Winter/Autumn/Spring = long shank hook for delicate bites
  const isSummer = season === 'summer';
  
  const hookTypeTranslations: Record<'longShank' | 'wideGape', { name: TranslatedText; description: TranslatedText }> = {
    longShank: {
      name: { 
        pl: 'Haczyk z długim trzonkiem', 
        en: 'Long shank hook', 
        de: 'Langschenkel-Haken', 
        fr: 'Hameçon à longue hampe', 
        cs: 'Háček s dlouhou stopkou', 
        hu: 'Hosszú szárú horog', 
        ro: 'Cârlig cu tijă lungă' 
      },
      description: { 
        pl: 'ZIMA/JESIEŃ/WIOSNA: Idealny do delikatnych brań. Długi trzonek zapewnia lepsze zahaczenie przy ostrożnym pobieraniu przynęty.', 
        en: 'WINTER/AUTUMN/SPRING: Perfect for delicate bites. Long shank ensures better hooking when fish take bait cautiously.', 
        de: 'WINTER/HERBST/FRÜHLING: Perfekt für vorsichtige Bisse. Langer Schenkel für besseres Haken.', 
        fr: 'HIVER/AUTOMNE/PRINTEMPS: Parfait pour les touches délicates. Longue hampe pour un meilleur ferrage.', 
        cs: 'ZIMA/PODZIM/JARO: Ideální pro jemné záběry. Dlouhá stopka zajišťuje lepší zaseknutí.', 
        hu: 'TÉL/ŐSZ/TAVASZ: Tökéletes a finom kapásokhoz. Hosszú szár biztosítja a jobb beakadást.', 
        ro: 'IARNĂ/TOAMNĂ/PRIMĂVARĂ: Perfect pentru mușcături delicate. Tija lungă asigură agățare mai bună.' 
      }
    },
    wideGape: {
      name: { 
        pl: 'Haczyk sierpowaty (Wide Gape)', 
        en: 'Wide gape hook (Curve)', 
        de: 'Wide Gape Haken', 
        fr: 'Hameçon à grande ouverture', 
        cs: 'Háček s širokým obloukem', 
        hu: 'Széles ívű horog', 
        ro: 'Cârlig cu deschidere largă' 
      },
      description: { 
        pl: 'LATO: Idealny do agresywnych brań. Szeroki łuk haczyka zapewnia pewne zahaczenie przy dynamicznym pobieraniu.', 
        en: 'SUMMER: Perfect for aggressive bites. Wide gape ensures secure hooking during dynamic takes.', 
        de: 'SOMMER: Perfekt für aggressive Bisse. Breiter Bogen für sicheres Haken.', 
        fr: 'ÉTÉ: Parfait pour les touches agressives. Grande ouverture pour un ferrage sûr.', 
        cs: 'LÉTO: Ideální pro agresivní záběry. Široký oblouk zajišťuje jisté zaseknutí.', 
        hu: 'NYÁR: Tökéletes az agresszív kapásokhoz. Széles ív biztosítja a biztos beakadást.', 
        ro: 'VARĂ: Perfect pentru mușcături agresive. Deschiderea largă asigură agățare sigură.' 
      }
    }
  };

  const selectedHookType = isSummer ? 'wideGape' : 'longShank';
  
  // Wire thickness based on fishery type
  const wireThicknessInfo: TranslatedText = isCommercial
    ? {
        pl: ' | KOMERCJA: Używaj haczyka z GRUBEGO drutu - ryby są silniejsze i bardziej agresywne.',
        en: ' | COMMERCIAL: Use THICK wire hook - fish are stronger and more aggressive.',
        de: ' | KOMMERZIELL: Verwenden Sie Haken aus DICKEM Draht - Fische sind stärker und aggressiver.',
        fr: ' | COMMERCIAL: Utilisez un hameçon en fil ÉPAIS - les poissons sont plus forts et agressifs.',
        cs: ' | KOMERČNÍ: Použijte háček z TLUSTÉHO drátu - ryby jsou silnější a agresivnější.',
        hu: ' | KERESKEDELMI: Használjon VASTAG huzalú horgot - a halak erősebbek és agresszívebbek.',
        ro: ' | COMERCIAL: Folosiți cârlig din sârmă GROASĂ - peștii sunt mai puternici și agresivi.'
      }
    : {
        pl: ' | DZIKA WODA: Używaj haczyka z CIENKIEGO drutu - ryby są bardziej ostrożne i płochliwe.',
        en: ' | WILD WATER: Use THIN wire hook - fish are more cautious and skittish.',
        de: ' | WILDGEWÄSSER: Verwenden Sie Haken aus DÜNNEM Draht - Fische sind vorsichtiger und scheuer.',
        fr: ' | EAU SAUVAGE: Utilisez un hameçon en fil FIN - les poissons sont plus prudents et méfiants.',
        cs: ' | DIVOKÁ VODA: Použijte háček z TENKÉHO drátu - ryby jsou opatrnější a plašší.',
        hu: ' | VADON ÉLŐ VÍZ: Használjon VÉKONY huzalú horgot - a halak óvatosabbak és ijedősebbek.',
        ro: ' | APĂ SĂLBATICĂ: Folosiți cârlig din sârmă SUBȚIRE - peștii sunt mai precauți și sperioși.'
      };

  const hookType: HookType = {
    name: t(hookTypeTranslations[selectedHookType].name, lang),
    description: t(hookTypeTranslations[selectedHookType].description, lang) + t(wireThicknessInfo, lang),
    image: selectedHookType // Frontend will map this to the actual image
  };

  const mainLine = isCold ? '0.18-0.20mm' : '0.22-0.25mm';
  const leader = isCold ? '0.14-0.16mm' : '0.16-0.18mm';
  
  const lineSetup: TranslatedText[] = [
    { pl: `Żyłka główna: ${mainLine} - ${isCold ? 'cieńsza dla ostrożnych ryb' : 'grubsza dla większych ryb'}.`, en: `Main line: ${mainLine} - ${isCold ? 'thinner for cautious fish' : 'thicker for larger fish'}.`, de: `Hauptschnur: ${mainLine}.`, fr: `Ligne principale: ${mainLine}.`, cs: `Hlavní vlasec: ${mainLine}.`, hu: `Főzsinór: ${mainLine}.`, ro: `Fir principal: ${mainLine}.` },
    { pl: `Przypon: ${leader}.`, en: `Leader: ${leader}.`, de: `Vorfach: ${leader}.`, fr: `Bas de ligne: ${leader}.`, cs: `Návazec: ${leader}.`, hu: `Előke: ${leader}.`, ro: `Lider: ${leader}.` },
    { pl: 'Długość przyponu na karpie, jesiotry, amury, tołpygi: 8-10cm.', en: 'Leader length for carp, sturgeon, grass carp, silver carp: 8-10cm.', de: 'Vorfachlänge für Karpfen, Stör, Graskarpfen, Silberkarpfen: 8-10cm.', fr: 'Longueur du bas de ligne pour carpe, esturgeon, amour blanc, carpe argentée: 8-10cm.', cs: 'Délka návazce pro kapry, jesetery, amury, tolstolobiky: 8-10cm.', hu: 'Előke hossza pontyra, tokra, amurra, busa: 8-10cm.', ro: 'Lungimea liderului pentru crap, sturion, sânger, novac: 8-10cm.' },
    { pl: 'Długość przyponu na leszcza, karasia i inne ryby: 10-15cm.', en: 'Leader length for bream, crucian carp and other fish: 10-15cm.', de: 'Vorfachlänge für Brassen, Karausche und andere Fische: 10-15cm.', fr: 'Longueur du bas de ligne pour brème, carassin et autres poissons: 10-15cm.', cs: 'Délka návazce pro cejny, karase a jiné ryby: 10-15cm.', hu: 'Előke hossza dévérre, kárászra és más halakra: 10-15cm.', ro: 'Lungimea liderului pentru plătică, caras și alți pești: 10-15cm.' },
    { pl: 'Używaj plecionki jako włosa do przyponu - poprawia prezentację przynęty.', en: 'Use braid as hair for the leader - improves bait presentation.', de: 'Verwenden Sie Geflechtschnur als Haar für das Vorfach - verbessert die Köder-Präsentation.', fr: 'Utilisez de la tresse comme cheveu pour le bas de ligne - améliore la présentation de l\'appât.', cs: 'Použijte pleteninu jako vlásek k návazci - zlepšuje prezentaci nástrahy.', hu: 'Használjon fonott zsinórt hajként az előkéhez - javítja a csali bemutatását.', ro: 'Folosiți împletitură ca fir de păr pentru lider - îmbunătățește prezentarea momelii.' },
    { pl: 'Zawsze sprawdzaj węzły przed każdą sesją.', en: 'Always check knots before each session.', de: 'Immer Knoten vor jeder Sitzung prüfen.', fr: 'Vérifiez toujours les nœuds avant chaque session.', cs: 'Vždy kontrolujte uzly před každou relací.', hu: 'Mindig ellenőrizze a csomókat minden ülés előtt.', ro: 'Verificați întotdeauna nodurile înainte de fiecare sesiune.' },
    { pl: 'PRO TIP: Staraj się używać przyponów z jednakowym bagnetem, które mają duży wpływ na pracę przynęty.', en: 'PRO TIP: Try to use leaders with uniform barb, which greatly affect bait action.', de: 'PRO TIPP: Verwenden Sie Vorfächer mit einheitlichem Widerhaken, die großen Einfluss auf die Köderaktion haben.', fr: 'PRO TIP: Essayez d\'utiliser des bas de ligne avec ardillon uniforme, qui ont un grand impact sur l\'action de l\'appât.', cs: 'PRO TIP: Snažte se používat návazce s jednotným protihrotem, které mají velký vliv na práci nástrahy.', hu: 'PRO TIPP: Próbáljon egyforma szakállal rendelkező előkéket használni, amelyek nagy hatással vannak a csali munkájára.', ro: 'PRO TIP: Încercați să folosiți lideri cu cârlig uniform, care au un impact mare asupra acțiunii momelii.' }
  ];

  const isColdSeason = season === 'winter' || season === 'autumn';
  
  const rigSetup: TranslatedText[] = [
    { pl: 'Jeśli można, staraj się używać zestawu skróconego na fluorocarbonie 0.25-0.30mm aby poprawić prezentację.', en: 'If possible, try to use a shortened rig on 0.25-0.30mm fluorocarbon to improve presentation.', de: 'Wenn möglich, verwenden Sie ein verkürztes Rig mit 0.25-0.30mm Fluorocarbon für bessere Präsentation.', fr: 'Si possible, utilisez un montage raccourci en fluorocarbone 0.25-0.30mm pour améliorer la présentation.', cs: 'Pokud je to možné, používejte zkrácený návazec na fluorocarbonu 0.25-0.30mm pro lepší prezentaci.', hu: 'Ha lehet, használjon rövidített szerelést 0.25-0.30mm fluorocarbonon a jobb bemutatáshoz.', ro: 'Dacă este posibil, folosiți un montaj scurtat pe fluorocarbon 0.25-0.30mm pentru o prezentare mai bună.' },
    { pl: 'Używaj dłuższych rurek do podajników aby zestawy leciały dalej i celniej.', en: 'Use longer tubes for feeders so rigs fly further and more accurately.', de: 'Verwenden Sie längere Röhrchen für Futterkörbe, damit die Montagen weiter und genauer fliegen.', fr: 'Utilisez des tubes plus longs pour les feeders afin que les montages volent plus loin et plus précisément.', cs: 'Používejte delší trubičky ke krmítkům, aby montáže letěly dále a přesněji.', hu: 'Használjon hosszabb csöveket az etetőkhöz, hogy a szerelések messzebbre és pontosabban repüljenek.', ro: 'Folosiți tuburi mai lungi pentru feedere pentru ca montajele să zboare mai departe și mai precis.' },
    { pl: 'Używaj podajnika na przelot, bardziej oddaje brania na szczytówkę.', en: 'Use inline feeder, it transmits bites to the tip better.', de: 'Verwenden Sie Inline-Futterkorb, er überträgt Bisse besser zur Spitze.', fr: 'Utilisez un feeder en ligne, il transmet mieux les touches au scion.', cs: 'Používejte průběžné krmítko, lépe přenáší záběry na špičku.', hu: 'Használjon átfutó etetőt, jobban közvetíti a kapásokat a csúcsra.', ro: 'Folosiți feeder inline, transmite mai bine mușcăturile la vârf.' },
    { pl: 'Do pelletu używaj podajników w stylu Banjo, do zanęty podajników z żeberkami.', en: 'For pellet use Banjo style feeders, for groundbait use ribbed feeders.', de: 'Für Pellets verwenden Sie Banjo-Futterkörbe, für Grundfutter gerippte Futterkörbe.', fr: 'Pour les pellets utilisez des feeders style Banjo, pour l\'amorce des feeders à nervures.', cs: 'Pro pelety používejte krmítka stylu Banjo, pro krmivo žebrovaná krmítka.', hu: 'Pellethez használjon Banjo stílusú etetőt, etetőanyaghoz bordázott etetőt.', ro: 'Pentru pelete folosiți feedere stil Banjo, pentru nadă feedere cu nervuri.' },
    { pl: 'Staraj się hamować zestaw przed wpadnięciem do wody, żeby robić jak najmniej hałasu podczas rzucania.', en: 'Try to feather the rig before it hits the water to minimize splash noise when casting.', de: 'Bremsen Sie die Montage vor dem Eintauchen ab, um beim Werfen möglichst wenig Lärm zu machen.', fr: 'Essayez de freiner le montage avant qu\'il n\'entre dans l\'eau pour minimiser le bruit lors du lancer.', cs: 'Snažte se brzdit montáž před dopadem do vody, abyste při nahazování dělali co nejméně hluku.', hu: 'Próbálja meg fékezni a szerelék becsapódását, hogy dobáskor minél kevesebb zajt okozzon.', ro: 'Încercați să frânați montajul înainte de a intra în apă pentru a face cât mai puțin zgomot la lansare.' }
  ];

  if (isColdSeason || tempBand === 'cold') {
    rigSetup.push(tempBand === 'cold'
      ? {
          pl: 'PRO TIP: Poniżej 5°C czekaj na branie MINIMUM 15 minut! Aktywność ryb jest bardzo niska. Nie przerzucaj zbyt często - każdy rzut płoszy ryby. Jeśli po 20 minutach brak brań - zmień miejsce łowienia.',
          en: 'PRO TIP: Below 5°C wait for bites at LEAST 15 minutes! Fish activity is very low. Don\'t recast too often - every cast scares fish. If no bites after 20 minutes - change fishing spot.',
          de: 'PRO TIPP: Unter 5°C mindestens 15 Minuten auf Bisse warten! Fischaktivität ist sehr niedrig. Nicht zu oft werfen - jeder Wurf verschreckt Fische. Nach 20 Minuten ohne Biss - Platz wechseln.',
          fr: 'PRO TIP: En dessous de 5°C attendez MINIMUM 15 minutes! Activité très faible. Ne relancez pas trop - chaque lancer effraie les poissons. Sans touche après 20 minutes - changez de poste.',
          cs: 'PRO TIP: Pod 5°C čekejte na záběr MINIMÁLNĚ 15 minut! Aktivita ryb je velmi nízká. Nepřehazujte příliš často. Pokud po 20 minutách není záběr - změňte místo.',
          hu: 'PRO TIPP: 5°C alatt várjon kapásra MINIMUM 15 percet! A halaktivitás nagyon alacsony. Ne dobjon túl gyakran. Ha 20 perc után nincs kapás - váltson helyet.',
          ro: 'PRO TIP: Sub 5°C așteptați MINIMUM 15 minute! Activitatea peștilor este foarte scăzută. Nu relansați prea des. Dacă nu sunt mușcături după 20 minute - schimbați locul.'
        }
      : {
          pl: 'PRO TIP: Czekaj na branie nawet do 15 minut. Zacznij od 8 minut i systematycznie wydłużaj czas. Jeśli po 15 minutach brak brań - zmień miejsce łowienia.',
          en: 'PRO TIP: Wait for bites up to 15 minutes. Start with 8 minutes and gradually extend the time. If no bites after 15 minutes - change fishing spot.',
          de: 'PRO TIPP: Warten Sie bis zu 15 Minuten auf Bisse. Beginnen Sie mit 8 Minuten und verlängern Sie schrittweise. Nach 15 Minuten ohne Biss - Platz wechseln.',
          fr: 'PRO TIP: Attendez les touches jusqu\'à 15 minutes. Commencez par 8 minutes et prolongez progressivement. Sans touche après 15 minutes - changez de poste.',
          cs: 'PRO TIP: Čekejte na záběr až 15 minut. Začněte od 8 minut a postupně prodlužujte. Pokud po 15 minutách není záběr - změňte místo.',
          hu: 'PRO TIPP: Várjon a kapásra akár 15 percet. Kezdje 8 perccel és fokozatosan hosszabbítsa. Ha 15 perc után nincs kapás - váltson helyet.',
          ro: 'PRO TIP: Așteptați mușcătura până la 15 minute. Începeți cu 8 minute și prelungiți treptat. Dacă nu sunt mușcături după 15 minute - schimbați locul.'
        }
    );
  }

  const wafterColorsArr: string[] = condition === 'sunny'
    ? ['pink', 'yellow-dark', 'yellow-light']
    : ['white', 'fluo-celadon-orange', 'orange'];

  // Seasonal wafter size recommendations
  const wafterSizeTip: TranslatedText = isColdSeason
    ? { 
        pl: 'ZIMA/JESIEŃ: Wafter maksymalnie 8mm, leszcze preferują 6mm. Małe przynęty = więcej brań w zimnej wodzie.', 
        en: 'WINTER/AUTUMN: Wafter max 8mm, bream prefer 6mm. Small baits = more bites in cold water.', 
        de: 'WINTER/HERBST: Wafter max 8mm, Brassen bevorzugen 6mm. Kleine Köder = mehr Bisse in kaltem Wasser.', 
        fr: 'HIVER/AUTOMNE: Wafter max 8mm, les brèmes préfèrent 6mm. Petits appâts = plus de touches en eau froide.', 
        cs: 'ZIMA/PODZIM: Wafter max 8mm, cejni preferují 6mm. Malé nástrahy = více záběrů ve studené vodě.', 
        hu: 'TÉL/ŐSZ: Wafter max 8mm, a dévérek a 6mm-t preferálják. Kis csalik = több kapás hideg vízben.', 
        ro: 'IARNĂ/TOAMNĂ: Wafter max 8mm, plăticile preferă 6mm. Momeli mici = mai multe mușcături în apă rece.' 
      }
    : { 
        pl: 'LATO/WIOSNA: Duże waftery 8-10mm - ryby są aktywne i chętnie biorą większe przynęty.', 
        en: 'SUMMER/SPRING: Large wafters 8-10mm - fish are active and eagerly take bigger baits.', 
        de: 'SOMMER/FRÜHLING: Große Wafter 8-10mm - Fische sind aktiv und nehmen gerne größere Köder.', 
        fr: 'ÉTÉ/PRINTEMPS: Grands wafters 8-10mm - les poissons sont actifs et prennent volontiers de gros appâts.', 
        cs: 'LÉTO/JARO: Velké waftery 8-10mm - ryby jsou aktivní a ochotně berou větší nástrahy.', 
        hu: 'NYÁR/TAVASZ: Nagy wafterek 8-10mm - a halak aktívak és szívesen veszik a nagyobb csalikat.', 
        ro: 'VARĂ/PRIMĂVARĂ: Waftere mari 8-10mm - peștii sunt activi și iau cu plăcere momeli mai mari.' 
      };

  const wafterTips: TranslatedText[] = [
    wafterSizeTip,
    { pl: 'Testuj różne kolory co dwa-trzy rzuty.', en: 'Test different colors every two-three casts.', de: 'Testen Sie verschiedene Farben alle zwei-drei Würfe.', fr: 'Testez différentes couleurs tous les deux-trois lancers.', cs: 'Testujte různé barvy každé dva-tři hody.', hu: 'Teszteljen különböző színeket minden két-három dobás után.', ro: 'Testați diferite culori la fiecare două-trei lansări.' },
    { pl: 'Możesz dopalić wafter dipem dla lepszego aromatu.', en: 'You can boost wafter with dip for better aroma.', de: 'Sie können Wafter mit Dip aufladen.', fr: 'Vous pouvez booster le wafter avec du dip.', cs: 'Můžete wafter nabít dipem.', hu: 'Feltöltheti a waftert dippel.', ro: 'Puteți încărca wafterul cu dip.' }
  ];

  if (isDeep) {
    wafterTips.push({
      pl: 'W głębokich zbiornikach (powyżej 4m) sprawdzają się przynęty fioletowe i fluo różowe.',
      en: 'In deep waters (over 4m) purple and fluo pink baits work well.',
      de: 'In tiefen Gewässern (über 4m) funktionieren lila und fluo-rosa Köder gut.',
      fr: 'Dans les eaux profondes (plus de 4m) les appâts violets et rose fluo fonctionnent bien.',
      cs: 'V hlubokých vodách (nad 4m) fungují fialové a fluo růžové nástrahy dobře.',
      hu: 'Mély vízben (4m felett) a lila és fluo rózsaszín csaik jól működnek.',
      ro: 'În apele adânci (peste 4m) momelile violet și roz fluo funcționează bine.'
    });
  }

  if (condition !== 'sunny') {
    wafterTips.push({
      pl: 'ZACHMURZENIE: Najlepiej sprawdzają się kulki białe lub dwukolorowy wafter Seledyn / Orange.',
      en: 'CLOUDY: White balls or two-color wafter Celadon / Orange work best.',
      de: 'BEWÖLKT: Weiße Kugeln oder zweifarbiger Wafter Seladon / Orange funktionieren am besten.',
      fr: 'NUAGEUX: Les boules blanches ou wafter bicolore Céladon / Orange fonctionnent le mieux.',
      cs: 'ZATAŽENO: Nejlépe fungují bílé kuličky nebo dvoubarevný wafter Celadon / Orange.',
      hu: 'FELHŐS: A fehér golyók vagy a kétszínű wafter Celadon / Orange működnek a legjobban.',
      ro: 'ÎNNORAT: Bilele albe sau wafter bicolor Celadon / Orange funcționează cel mai bine.'
    });
  }

  return {
    hookSize: hookSize.map(text => t(text, lang)),
    hookType,
    lineSetup: lineSetup.map(text => t(text, lang)),
    rigSetup: rigSetup.map(text => t(text, lang)),
    wafterColors: wafterColorsArr.map(color => getLocalizedWafterColor(color, lang)),
    wafterTips: wafterTips.map(text => t(text, lang))
  };
}

function generateStrategy(
  lang: Language,
  isCommercial: boolean,
  season: Season,
  tempBand: string
): FishingRecommendations['strategie'] {
  
  const isColdSeason = season === 'winter' || season === 'autumn';
  
  const firstHourCommercial = isColdSeason
    ? {
        hour: '0-1h',
        strategy: { pl: 'Bez nęcenia wstępnego - zacznij od razu łowić.', en: 'No pre-feeding - start fishing immediately.', de: 'Kein Vorfüttern - sofort mit dem Angeln beginnen.', fr: 'Pas d\'amorçage préalable - commencez à pêcher immédiatement.', cs: 'Bez předkrmení - začněte hned lovit.', hu: 'Nincs előetetés - azonnal kezdjen horgászni.', ro: 'Fără hrănire prealabilă - începeți să pescuiți imediat.' },
        tips: [
          { pl: 'Jesienią i zimą nie rób nęcenia wstępnego lub bardzo śladowo.', en: 'In autumn and winter do not pre-feed or only very lightly.', de: 'Im Herbst und Winter nicht vorfüttern oder nur sehr sparsam.', fr: 'En automne et hiver ne pas amorcer ou très légèrement.', cs: 'Na podzim a v zimě nepřikrmujte nebo jen velmi slabě.', hu: 'Ősszel és télen ne etessen előre vagy csak nagyon keveset.', ro: 'Toamna și iarna nu hrăniți în prealabil sau doar foarte puțin.' },
          { pl: 'Małe koszyczki - ryby jedzą mało w zimnej wodzie.', en: 'Small feeders - fish eat little in cold water.', de: 'Kleine Körbe - Fische fressen wenig in kaltem Wasser.', fr: 'Petits feeders - les poissons mangent peu en eau froide.', cs: 'Malá krmítka - ryby jedí málo ve studené vodě.', hu: 'Kis kosarak - a halak keveset esznek hideg vízben.', ro: 'Coșuri mici - peștii mănâncă puțin în apă rece.' }
        ]
      }
    : {
        hour: '0-1h',
        strategy: { pl: 'Buduj łowisko - systematyczne nęcenie.', en: 'Build your swim - systematic feeding.', de: 'Bauen Sie Ihren Platz auf - systematisches Füttern.', fr: 'Construisez votre poste - amorçage systématique.', cs: 'Budujte místo - systematické krmení.', hu: 'Építse fel a helyét - szisztematikus etetés.', ro: 'Construiți-vă locul - hrănire sistematică.' },
        tips: [
          { pl: '5-7 koszyczków na start.', en: '5-7 feeders at the start.', de: '5-7 Körbe am Start.', fr: '5-7 feeders au départ.', cs: '5-7 krmítek na začátek.', hu: '5-7 kosár az elején.', ro: '5-7 coșuri la început.' },
          { pl: 'Rzuty co 2-3 minuty.', en: 'Casts every 2-3 minutes.', de: 'Würfe alle 2-3 Minuten.', fr: 'Lancers toutes les 2-3 minutes.', cs: 'Vrhy každé 2-3 minuty.', hu: 'Dobások 2-3 percenként.', ro: 'Lansări la fiecare 2-3 minute.' }
        ]
      };

  // When temp is below 5°C (cold band), always use 15+ min bite time regardless of season
  // Otherwise use seasonal defaults: Winter: 8-15 min, Autumn: 7-10 min, Spring: 5-8 min, Summer: 3-5 min
  const waitTimeTip: TranslatedText = tempBand === 'cold'
    ? { pl: 'Temperatura poniżej 5°C: Czekaj na branie minimum 15 minut! Aktywność ryb bardzo niska.', en: 'Temperature below 5°C: Wait for bites at least 15 minutes! Fish activity very low.', de: 'Temperatur unter 5°C: Warten Sie mindestens 15 Minuten auf Bisse! Fischaktivität sehr niedrig.', fr: 'Température en dessous de 5°C: Attendez au moins 15 minutes! Activité très faible.', cs: 'Teplota pod 5°C: Čekejte na záběr minimálně 15 minut! Aktivita ryb velmi nízká.', hu: 'Hőmérséklet 5°C alatt: Várjon kapásra legalább 15 percet! Halaktivitás nagyon alacsony.', ro: 'Temperatură sub 5°C: Așteptați cel puțin 15 minute! Activitate foarte scăzută.' }
    : season === 'winter'
    ? { pl: 'Zima: Czekaj na branie 8-15 minut.', en: 'Winter: Wait for bites 8-15 minutes.', de: 'Winter: Warten Sie 8-15 Minuten auf Bisse.', fr: 'Hiver: Attendez les touches 8-15 minutes.', cs: 'Zima: Čekejte na záběr 8-15 minut.', hu: 'Tél: Várjon kapásra 8-15 percet.', ro: 'Iarnă: Așteptați mușcătura 8-15 minute.' }
    : season === 'summer'
    ? { pl: 'Lato: Czekaj na branie 3-5 minut.', en: 'Summer: Wait for bites 3-5 minutes.', de: 'Sommer: Warten Sie 3-5 Minuten auf Bisse.', fr: 'Été: Attendez les touches 3-5 minutes.', cs: 'Léto: Čekejte na záběr 3-5 minut.', hu: 'Nyár: Várjon kapásra 3-5 percet.', ro: 'Vară: Așteptați mușcătura 3-5 minute.' }
    : season === 'autumn'
    ? { pl: 'Jesień: Czekaj na branie 7-10 minut.', en: 'Autumn: Wait for bites 7-10 minutes.', de: 'Herbst: Warten Sie 7-10 Minuten auf Bisse.', fr: 'Automne: Attendez les touches 7-10 minutes.', cs: 'Podzim: Čekejte na záběr 7-10 minut.', hu: 'Ősz: Várjon kapásra 7-10 percet.', ro: 'Toamnă: Așteptați mușcătura 7-10 minute.' }
    : { pl: 'Wiosna: Czekaj na branie 5-8 minut.', en: 'Spring: Wait for bites 5-8 minutes.', de: 'Frühling: Warten Sie 5-8 Minuten auf Bisse.', fr: 'Printemps: Attendez les touches 5-8 minutes.', cs: 'Jaro: Čekejte na záběr 5-8 minut.', hu: 'Tavasz: Várjon kapásra 5-8 percet.', ro: 'Primăvară: Așteptați mușcătura 5-8 minute.' };

  const hourlyPlanCommercial: Array<{ hour: string; strategy: TranslatedText; tips: TranslatedText[] }> = [
    firstHourCommercial,
    {
      hour: '1-2h',
      strategy: { pl: 'Utrzymuj rytm - obserwuj brania.', en: 'Maintain rhythm - observe bites.', de: 'Rhythmus halten - Bisse beobachten.', fr: 'Maintenez le rythme - observez les touches.', cs: 'Udržujte rytmus - sledujte záběry.', hu: 'Tartsa a ritmust - figyelje a kapásokat.', ro: 'Mențineți ritmul - observați mușcăturile.' },
      tips: [
        waitTimeTip,
        { pl: 'Notuj które kolory wafterów działają.', en: 'Note which wafter colors work.', de: 'Notieren Sie welche Wafter-Farben funktionieren.', fr: 'Notez quelles couleurs de wafters fonctionnent.', cs: 'Zaznamenejte které barvy wafterů fungují.', hu: 'Jegyezze fel mely wafter színek működnek.', ro: 'Notați ce culori de wafter funcționează.' }
      ]
    },
    {
      hour: '2-3h',
      strategy: { pl: 'Korekty - zmień kolor/rozmiar jeśli nie ma brań.', en: 'Adjustments - change color/size if no bites.', de: 'Anpassungen - Farbe/Größe ändern wenn keine Bisse.', fr: 'Ajustements - changez couleur/taille si pas de touches.', cs: 'Úpravy - změňte barvu/velikost pokud nejsou záběry.', hu: 'Módosítások - változtasson színt/méretet ha nincs kapás.', ro: 'Ajustări - schimbați culoarea/mărimea dacă nu sunt mușcături.' },
      tips: [
        { pl: 'Wydłuż czas oczekiwania nawet do 15 minut jeśli nie ma brań.', en: 'Extend waiting time up to 15 minutes if no bites.', de: 'Verlängern Sie die Wartezeit auf bis zu 15 Minuten wenn keine Bisse.', fr: 'Prolongez le temps d\'attente jusqu\'à 15 minutes si pas de touches.', cs: 'Prodlužte čekací dobu až na 15 minut pokud nejsou záběry.', hu: 'Hosszabbítsa meg a várakozási időt akár 15 percre ha nincs kapás.', ro: 'Prelungiți timpul de așteptare până la 15 minute dacă nu sunt mușcături.' },
        { pl: 'Eksperymentuj z mniejszymi wafterami.', en: 'Experiment with smaller wafters.', de: 'Experimentieren Sie mit kleineren Waftern.', fr: 'Expérimentez avec des wafters plus petits.', cs: 'Experimentujte s menšími waftery.', hu: 'Kísérletezzen kisebb wafterekkel.', ro: 'Experimentați cu waftere mai mici.' },
        { pl: 'Rozważ zmianę dystansu.', en: 'Consider changing distance.', de: 'Erwägen Sie die Distanz zu ändern.', fr: 'Envisagez de changer la distance.', cs: 'Zvažte změnu vzdálenosti.', hu: 'Fontolja meg a távolság változtatását.', ro: 'Luați în considerare schimbarea distanței.' }
      ]
    },
    {
      hour: '3-4h',
      strategy: tempBand === 'cold'
        ? { pl: 'Niska aktywność - cierpliwość i minimalne nęcenie.', en: 'Low activity - patience and minimal feeding.', de: 'Niedrige Aktivität - Geduld und minimales Füttern.', fr: 'Faible activité - patience et amorçage minimal.', cs: 'Nízká aktivita - trpělivost a minimální krmení.', hu: 'Alacsony aktivitás - türelem és minimális etetés.', ro: 'Activitate scăzută - răbdare și hrănire minimală.' }
        : { pl: 'Szczyt aktywności - zwiększ tempo.', en: 'Peak activity - increase pace.', de: 'Spitzenaktivität - Tempo erhöhen.', fr: 'Pic d\'activité - augmentez le rythme.', cs: 'Vrchol aktivity - zvyšte tempo.', hu: 'Csúcsaktivitás - fokozza a tempót.', ro: 'Activitate de vârf - creșteți ritmul.' },
      tips: tempBand === 'cold'
        ? [
            { pl: 'Czekaj na branie 15+ minut. Nie przerzucaj zbyt często!', en: 'Wait 15+ minutes for bites. Don\'t recast too often!', de: 'Warten Sie 15+ Minuten auf Bisse. Nicht zu oft werfen!', fr: 'Attendez 15+ minutes. Ne relancez pas trop souvent!', cs: 'Čekejte 15+ minut na záběr. Nepřehazujte příliš často!', hu: 'Várjon 15+ percet kapásra. Ne dobjon túl gyakran!', ro: 'Așteptați 15+ minute. Nu relansați prea des!' },
            { pl: 'Minimalna ilość zanęty - ryby jedzą bardzo mało poniżej 5°C.', en: 'Minimal groundbait - fish eat very little below 5°C.', de: 'Minimales Grundfutter - Fische fressen sehr wenig unter 5°C.', fr: 'Amorce minimale - les poissons mangent très peu sous 5°C.', cs: 'Minimální krmivo - ryby jedí velmi málo pod 5°C.', hu: 'Minimális etetőanyag - a halak nagyon keveset esznek 5°C alatt.', ro: 'Nadă minimală - peștii mănâncă foarte puțin sub 5°C.' }
          ]
        : [
            { pl: 'Więcej zanęty w koszyczku.', en: 'More groundbait in feeder.', de: 'Mehr Grundfutter im Korb.', fr: 'Plus d\'amorce dans le feeder.', cs: 'Více krmiva v krmítku.', hu: 'Több etetőanyag a kosárba.', ro: 'Mai multă nadă în coș.' },
            { pl: 'Krótsze przerwy między rzutami.', en: 'Shorter breaks between casts.', de: 'Kürzere Pausen zwischen Würfen.', fr: 'Pauses plus courtes entre les lancers.', cs: 'Kratší pauzy mezi vrhy.', hu: 'Rövidebb szünetek a dobások között.', ro: 'Pauze mai scurte între lansări.' }
          ]
    },
    {
      hour: '4-5h',
      strategy: { pl: 'Utrzymaj momentum - konsekwentnie.', en: 'Maintain momentum - consistently.', de: 'Momentum halten - konsequent.', fr: 'Maintenez l\'élan - régulièrement.', cs: 'Udržujte momentum - konzistentně.', hu: 'Tartsa a lendületet - következetesen.', ro: 'Mențineți impulsul - consecvent.' },
      tips: [
        { pl: 'Używaj sprawdzonych kolorów.', en: 'Use proven colors.', de: 'Verwenden Sie bewährte Farben.', fr: 'Utilisez les couleurs éprouvées.', cs: 'Používejte osvědčené barvy.', hu: 'Használja a bevált színeket.', ro: 'Folosiți culorile dovedite.' },
        { pl: 'Nie eksperymentuj zbytnio.', en: 'Don\'t experiment too much.', de: 'Experimentieren Sie nicht zu viel.', fr: 'N\'expérimentez pas trop.', cs: 'Neexperimentujte příliš.', hu: 'Ne kísérletezzen túl sokat.', ro: 'Nu experimentați prea mult.' }
      ]
    },
    {
      hour: '5-6h',
      strategy: { pl: 'Finisz - maksymalny wysiłek na końcówkę.', en: 'Finish - maximum effort at the end.', de: 'Finish - maximale Anstrengung am Ende.', fr: 'Finish - effort maximum à la fin.', cs: 'Finish - maximální úsilí na konci.', hu: 'Befejezés - maximális erőfeszítés a végén.', ro: 'Final - efort maxim la sfârșit.' },
      tips: [
        { pl: 'Szybkie zmiany zestawów.', en: 'Quick rig changes.', de: 'Schnelle Montage-Wechsel.', fr: 'Changements rapides de montages.', cs: 'Rychlé výměny montáží.', hu: 'Gyors szerelékváltások.', ro: 'Schimbări rapide de montaj.' },
        { pl: 'Każda ryba się liczy!', en: 'Every fish counts!', de: 'Jeder Fisch zählt!', fr: 'Chaque poisson compte!', cs: 'Každá ryba se počítá!', hu: 'Minden hal számít!', ro: 'Fiecare pește contează!' }
      ]
    }
  ];

  const hourlyPlanWild: Array<{ hour: string; strategy: TranslatedText; tips: TranslatedText[] }> = [
    {
      hour: '0-1h',
      strategy: { pl: 'Delikatne nęcenie - nie spłosz ryb.', en: 'Gentle feeding - don\'t scare fish.', de: 'Sanftes Füttern - verschrecken Sie keine Fische.', fr: 'Amorçage délicat - n\'effrayez pas les poissons.', cs: 'Jemné krmení - nevystrašte ryby.', hu: 'Óvatos etetés - ne riassza el a halakat.', ro: 'Hrănire blândă - nu speriați peștii.' },
      tips: [
        { pl: '3-4 koszyczki na start.', en: '3-4 feeders at the start.', de: '3-4 Körbe am Start.', fr: '3-4 feeders au départ.', cs: '3-4 krmítka na začátek.', hu: '3-4 kosár az elején.', ro: '3-4 coșuri la început.' },
        { pl: 'Obserwuj wodę - szukaj oznak ryb.', en: 'Observe water - look for signs of fish.', de: 'Beobachten Sie das Wasser.', fr: 'Observez l\'eau - cherchez des signes de poissons.', cs: 'Sledujte vodu - hledejte známky ryb.', hu: 'Figyelje a vizet - keressen haljeleket.', ro: 'Observați apa - căutați semne de pești.' }
      ]
    },
    {
      hour: '1-2h',
      strategy: { pl: 'Testuj rozmiary wafterów.', en: 'Test wafter sizes.', de: 'Testen Sie Wafter-Größen.', fr: 'Testez les tailles de wafters.', cs: 'Testujte velikosti wafterů.', hu: 'Tesztelje a wafter méreteket.', ro: 'Testați mărimile de wafter.' },
      tips: [
        waitTimeTip,
        { pl: '6mm, 8mm, 10mm - znajdź optymalny.', en: '6mm, 8mm, 10mm - find optimal.', de: '6mm, 8mm, 10mm - finden Sie optimal.', fr: '6mm, 8mm, 10mm - trouvez l\'optimal.', cs: '6mm, 8mm, 10mm - najděte optimální.', hu: '6mm, 8mm, 10mm - találja meg az optimálist.', ro: '6mm, 8mm, 10mm - găsiți optim.' }
      ]
    },
    {
      hour: '2-3h',
      strategy: { pl: 'Zwiększ czas oczekiwania na branie jeśli nic się nie dzieje do 15 minut.', en: 'Increase waiting time for bites up to 15 minutes if nothing happens.', de: 'Erhöhen Sie die Wartezeit auf Bisse bis zu 15 Minuten wenn nichts passiert.', fr: 'Augmentez le temps d\'attente pour les touches jusqu\'à 15 minutes si rien ne se passe.', cs: 'Prodlužte čekací dobu na záběry až na 15 minut pokud se nic neděje.', hu: 'Növelje a kapásra várakozási időt akár 15 percig ha semmi nem történik.', ro: 'Măriți timpul de așteptare pentru mușcături până la 15 minute dacă nu se întâmplă nimic.' },
      tips: [
        { pl: 'Rzuty co 5-7 minut.', en: 'Casts every 5-7 minutes.', de: 'Würfe alle 5-7 Minuten.', fr: 'Lancers toutes les 5-7 minutes.', cs: 'Vrhy každých 5-7 minut.', hu: 'Dobások 5-7 percenként.', ro: 'Lansări la fiecare 5-7 minute.' },
        { pl: 'Skup się na prezentacji.', en: 'Focus on presentation.', de: 'Konzentrieren Sie sich auf die Präsentation.', fr: 'Concentrez-vous sur la présentation.', cs: 'Zaměřte se na prezentaci.', hu: 'Koncentráljon a prezentációra.', ro: 'Concentrați-vă pe prezentare.' }
      ]
    },
    {
      hour: '3-4h',
      strategy: { pl: 'Wykorzystaj sprawdzone wzorce.', en: 'Use proven patterns.', de: 'Verwenden Sie bewährte Muster.', fr: 'Utilisez les modèles éprouvés.', cs: 'Použijte osvědčené vzorce.', hu: 'Használja a bevált mintákat.', ro: 'Folosiți modelele dovedite.' },
      tips: [
        { pl: 'Kontynuuj z działającym rozmiarem.', en: 'Continue with working size.', de: 'Fahren Sie mit der funktionierenden Größe fort.', fr: 'Continuez avec la taille qui fonctionne.', cs: 'Pokračujte s fungující velikostí.', hu: 'Folytassa a működő mérettel.', ro: 'Continuați cu mărimea care funcționează.' },
        { pl: 'Mniejsze koszyczki dla delikatności.', en: 'Smaller feeders for delicacy.', de: 'Kleinere Körbe für Feingefühl.', fr: 'Feeders plus petits pour la délicatesse.', cs: 'Menší krmítka pro jemnost.', hu: 'Kisebb kosarak a finomságért.', ro: 'Coșuri mai mici pentru delicatețe.' }
      ]
    },
    {
      hour: '4-5h',
      strategy: { pl: 'Notuj wzorce dla przyszłości.', en: 'Note patterns for future.', de: 'Notieren Sie Muster für die Zukunft.', fr: 'Notez les modèles pour l\'avenir.', cs: 'Zaznamenejte vzorce pro budoucnost.', hu: 'Jegyezze fel a mintákat a jövőre.', ro: 'Notați modelele pentru viitor.' },
      tips: [
        { pl: 'Co działało najlepiej?', en: 'What worked best?', de: 'Was hat am besten funktioniert?', fr: 'Qu\'est-ce qui a le mieux fonctionné?', cs: 'Co fungovalo nejlépe?', hu: 'Mi működött legjobban?', ro: 'Ce a funcționat cel mai bine?' },
        { pl: 'Utrzymuj rytm który działa.', en: 'Maintain rhythm that works.', de: 'Halten Sie den Rhythmus der funktioniert.', fr: 'Maintenez le rythme qui fonctionne.', cs: 'Udržujte rytmus který funguje.', hu: 'Tartsa a működő ritmust.', ro: 'Mențineți ritmul care funcționează.' }
      ]
    },
    {
      hour: '5-6h',
      strategy: { pl: 'Spokojne zakończenie z ostrożnością.', en: 'Calm finish with caution.', de: 'Ruhiges Ende mit Vorsicht.', fr: 'Fin calme avec prudence.', cs: 'Klidný závěr s opatrností.', hu: 'Nyugodt befejezés óvatossággal.', ro: 'Final calm cu precauție.' },
      tips: [
        { pl: 'Nie spłosz łowiska.', en: 'Don\'t scare the swim.', de: 'Verschrecken Sie den Platz nicht.', fr: 'N\'effrayez pas le poste.', cs: 'Nevystrašte místo.', hu: 'Ne riassza el a helyét.', ro: 'Nu speriați locul.' },
        { pl: 'Każda ryba jest cenna na dzikich wodach.', en: 'Every fish is valuable on wild waters.', de: 'Jeder Fisch ist wertvoll an Wildgewässern.', fr: 'Chaque poisson est précieux en eaux sauvages.', cs: 'Každá ryba je cenná na divokých vodách.', hu: 'Minden hal értékes a vadviznél.', ro: 'Fiecare pește este valoros în apele sălbatice.' }
      ]
    }
  ];

  const hourlyPlan = isCommercial ? hourlyPlanCommercial : hourlyPlanWild;
  
  const keyTakeaways: TranslatedText[] = isCommercial
    ? [
        { pl: 'Na komercji: systematyczne nęcenie i szybkie reakcje.', en: 'On commercial: systematic feeding and quick reactions.', de: 'Bei kommerziell: systematisches Füttern und schnelle Reaktionen.', fr: 'Sur commercial: amorçage systématique et réactions rapides.', cs: 'Na komerci: systematické krmení a rychlé reakce.', hu: 'Kereskedelmi vízen: szisztematikus etetés és gyors reakciók.', ro: 'Pe apă comercială: hrănire sistematică și reacții rapide.' },
        { pl: 'Szybkie reakcje i zmiany są kluczowe.', en: 'Quick reactions and changes are key.', de: 'Schnelle Reaktionen und Änderungen sind der Schlüssel.', fr: 'Les réactions rapides et les changements sont clés.', cs: 'Rychlé reakce a změny jsou klíčové.', hu: 'A gyors reakciók és változtatások kulcsfontosságúak.', ro: 'Reacțiile rapide și schimbările sunt cheie.' },
        { pl: 'Każda minuta się liczy na zawodach.', en: 'Every minute counts in competitions.', de: 'Jede Minute zählt bei Wettkämpfen.', fr: 'Chaque minute compte en compétition.', cs: 'Každá minuta se počítá na soutěžích.', hu: 'Minden perc számít a versenyeken.', ro: 'Fiecare minut contează în competiții.' },
        { pl: 'Miej w zapasie różne zestawy gotowe do użycia.', en: 'Have different rigs ready to use in reserve.', de: 'Halten Sie verschiedene Montagen bereit.', fr: 'Ayez différents montages prêts en réserve.', cs: 'Mějte různé montáže připravené k použití.', hu: 'Tartson különböző szerelékeket készenlétben.', ro: 'Aveți diferite montaje pregătite în rezervă.' }
      ]
    : [
        { pl: 'Na dzikich wodach: cierpliwość i obserwacja.', en: 'On wild waters: patience and observation.', de: 'An Wildgewässern: Geduld und Beobachtung.', fr: 'Sur eaux sauvages: patience et observation.', cs: 'Na divokých vodách: trpělivost a pozorování.', hu: 'Vad vizeken: türelem és megfigyelés.', ro: 'Pe ape sălbatice: răbdare și observație.' },
        { pl: 'Mniej znaczy więcej - delikatne podejście.', en: 'Less is more - delicate approach.', de: 'Weniger ist mehr - sanfter Ansatz.', fr: 'Moins c\'est plus - approche délicate.', cs: 'Méně je více - jemný přístup.', hu: 'Kevesebb több - finom megközelítés.', ro: 'Mai puțin înseamnă mai mult - abordare delicată.' },
        { pl: 'Eksperymentuj z rozmiarami wafterów.', en: 'Experiment with wafter sizes.', de: 'Experimentieren Sie mit Wafter-Größen.', fr: 'Expérimentez avec les tailles de wafters.', cs: 'Experimentujte s velikostmi wafterů.', hu: 'Kísérletezzen a wafter méretekkel.', ro: 'Experimentați cu mărimile de wafter.' },
        { pl: 'Notuj co działa - buduj doświadczenie.', en: 'Note what works - build experience.', de: 'Notieren Sie was funktioniert.', fr: 'Notez ce qui fonctionne.', cs: 'Zaznamenejte co funguje.', hu: 'Jegyezze fel mi működik.', ro: 'Notați ce funcționează.' }
      ];

  if (isColdSeason) {
    keyTakeaways.push({
      pl: 'Zima i jesień: Nie nęć wstępnie lub bardzo mało. Używaj towaru z mniejszą zawartością mączek rybnych.',
      en: 'Winter and autumn: Don\'t pre-feed or very little. Use groundbait with lower fishmeal content.',
      de: 'Winter und Herbst: Nicht vorfüttern oder nur sehr wenig. Verwenden Sie Futter mit weniger Fischmehl.',
      fr: 'Hiver et automne: Ne pas amorcer ou très peu. Utilisez des amorces avec moins de farine de poisson.',
      cs: 'Zima a podzim: Nepřikrmujte předem nebo jen velmi málo. Používejte krmivo s nižším obsahem rybí moučky.',
      hu: 'Tél és ősz: Ne etessen előre vagy csak nagyon keveset. Használjon alacsonyabb halliszttartalmú etetőanyagot.',
      ro: 'Iarnă și toamnă: Nu hrăniți în prealabil sau foarte puțin. Folosiți nadă cu conținut mai scăzut de făină de pește.'
    });
    keyTakeaways.push({
      pl: 'Zima i jesień: Łów w jednym punkcie - nie przerzucaj zbyt często, ryby potrzebują czasu żeby znaleźć zanętę.',
      en: 'Winter and autumn: Fish in one spot - don\'t recast too often, fish need time to find the bait.',
      de: 'Winter und Herbst: Angeln Sie an einem Punkt - werfen Sie nicht zu oft um.',
      fr: 'Hiver et automne: Pêchez sur un seul point - ne relancez pas trop souvent.',
      cs: 'Zima a podzim: Lovte na jednom místě - nepřehazujte příliš často.',
      hu: 'Tél és ősz: Horgásszon egy ponton - ne dobjon át túl gyakran.',
      ro: 'Iarnă și toamnă: Pescuiți într-un singur punct - nu relansați prea des.'
    });
  }

  const isWarmSeason = season === 'summer' || season === 'spring';
  if (isWarmSeason) {
    keyTakeaways.push({
      pl: 'LATEM: Zwróć uwagę na częstsze przerzucanie - ryby są aktywne i szybko znajdują zanętę. Rzuty co 3-5 minut.',
      en: 'SUMMER: Pay attention to more frequent recasting - fish are active and find bait quickly. Casts every 3-5 minutes.',
      de: 'SOMMER: Achten Sie auf häufigeres Umwerfen - Fische sind aktiv.',
      fr: 'ÉTÉ: Faites attention aux relances plus fréquentes - les poissons sont actifs.',
      cs: 'LÉTO: Věnujte pozornost častějšímu přehazování - ryby jsou aktivní.',
      hu: 'NYÁR: Figyeljen a gyakoribb átdobásokra - a halak aktívak.',
      ro: 'VARĂ: Acordați atenție relansărilor mai frecvente - peștii sunt activi.'
    });
  }

  return {
    hourlyPlan: hourlyPlan.map(item => ({
      hour: item.hour,
      strategy: t(item.strategy, lang),
      tips: item.tips.map(tip => t(tip, lang))
    })),
    keyTakeaways: keyTakeaways.map(text => t(text, lang))
  };
}
