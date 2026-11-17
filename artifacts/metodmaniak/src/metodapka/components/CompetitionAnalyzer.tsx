import { useState } from "react";
import { Trophy, ChevronUp, ChevronDown, TrendingUp, Clock, Target, Lightbulb, Medal, Scale, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "../language";

const analyzerTranslations = {
  pl: {
    title: "Analizator zawodów",
    totalFish: "Złowione ryby",
    avgWaitTime: "Średni czas brania",
    competitionTime: "Czas zawodów",
    minutes: "min",
    hours: "godz",
    analyze: "Analizuj",
    estimatedCasts: "Szacowana liczba rzutów",
    castsPerHour: "Rzutów na godzinę",
    efficiency: "Efektywność",
    recommendations: "Rekomendacje optymalizacji",
    tacticalTips: "Taktyka na podstawie analizy",
    noFish: "Dodaj ryby w liczniku powyżej",
    yourWeight: "Twoja waga",
    leaderWeight: "Waga przeciwnika",
    kg: "kg",
    g: "g",
    comparison: "Porównanie z przeciwnikiem",
    weightDifference: "Różnica wagi",
    youNeed: "Potrzebujesz jeszcze",
    fishToWin: "ryb aby dogonić przeciwnika",
    leaderWeightLabel: "Waga przeciwnika",
    percentOfLeader: "% wagi lidera",
    greatResult: "Świetny wynik! Jesteś na prowadzeniu!",
    closeToLeader: "Blisko lidera! Jeszcze kilka ryb i jesteś na podium!",
    needMore: "Potrzebujesz znacznie zwiększyć tempo łowienia",
    sector: "Sektor",
    competition: "Zawody",
    tips: {
      reduceWait: "Skróć czas oczekiwania o 1-2 min - możesz zyskać dodatkowe",
      casts: "rzutów",
      changeWafter: "Zmień kolor waftersa co 2-3 rzuty bez brania",
      smallerFeeder: "Użyj mniejszego koszyczka dla szybszego opadania",
      activeFeeding: "Zwiększ częstotliwość dokarmiana - ryby są aktywne",
      lessFeeding: "Zmniejsz ilość zanęty - ryby mogą być przejadzone",
      tryDifferentSpot: "Przenieś się o 2-3 metry w lewo lub prawo",
      patternFound: "Wzorzec brań: co",
      keepRhythm: "Utrzymuj ten rytm rzutów",
      goodEfficiency: "Dobra efektywność! Utrzymuj obecną strategię.",
      lowEfficiency: "Niska efektywność - rozważ zmiany w technice.",
      mediumEfficiency: "Średnia efektywność - drobne poprawki mogą pomóc.",
      potentialExtra: "Potencjał: +",
      fishMore: "ryb przy optymalizacji",
      catchUpTip: "Aby dogonić lidera, spróbuj skrócić czas między rzutami",
      wafterChangeEvery: "Zmiana waftersa: co",
      castsNoResponse: "rzutów bez odpowiedzi",
      reduceTimeTo: "Skróć czas oczekiwania do",
      toGainExtra: "aby zyskać dodatkowe",
      changeLine30min: "Jeśli przez 30 min nie było brania na żaden kolor - zmień linię łowienia o 2-3 metry!",
      leaderPace: "Tempo lidera:",
      fishPerHour: "szt/godz",
      yourPace: "Twoje tempo:",
      needToIncrease: "Musisz zwiększyć tempo o",
      toMatchLeader: "aby dorównać liderowi",
      tryBrighterWafter: "Spróbuj jaśniejszego waftersa (żółty, pomarańczowy)",
      tryDarkerWafter: "Spróbuj ciemniejszego waftersa (brązowy, czerwony)",
      leaderCatching: "Lider łowi średnio",
      perCast: "na rzut - dopasuj swoją strategię"
    }
  },
  en: {
    title: "Competition Analyzer",
    totalFish: "Fish caught",
    avgWaitTime: "Average bite time",
    competitionTime: "Competition time",
    minutes: "min",
    hours: "hrs",
    analyze: "Analyze",
    estimatedCasts: "Estimated casts",
    castsPerHour: "Casts per hour",
    efficiency: "Efficiency",
    recommendations: "Optimization tips",
    tacticalTips: "Tactics based on analysis",
    noFish: "Add fish in the counter above",
    yourWeight: "Your weight",
    leaderWeight: "Opponent weight",
    kg: "kg",
    g: "g",
    comparison: "Comparison with opponent",
    weightDifference: "Weight difference",
    youNeed: "You need",
    fishToWin: "more fish to catch up",
    leaderWeightLabel: "Opponent weight",
    percentOfLeader: "% of leader",
    greatResult: "Great result! You're in the lead!",
    closeToLeader: "Close to leader! A few more fish and you're on the podium!",
    needMore: "You need to significantly increase your fishing pace",
    sector: "Sector",
    competition: "Competition",
    tips: {
      reduceWait: "Reduce wait time by 1-2 min - you can gain extra",
      casts: "casts",
      changeWafter: "Change wafter color every 2-3 casts without bites",
      smallerFeeder: "Use smaller feeder for faster sinking",
      activeFeeding: "Increase feeding frequency - fish are active",
      lessFeeding: "Reduce groundbait - fish may be overfed",
      tryDifferentSpot: "Move 2-3 meters left or right",
      patternFound: "Bite pattern: every",
      keepRhythm: "Keep this casting rhythm",
      goodEfficiency: "Good efficiency! Maintain current strategy.",
      lowEfficiency: "Low efficiency - consider technique changes.",
      mediumEfficiency: "Medium efficiency - small adjustments may help.",
      potentialExtra: "Potential: +",
      fishMore: "fish with optimization",
      catchUpTip: "To catch up with leader, try reducing time between casts",
      wafterChangeEvery: "Wafter change: every",
      castsNoResponse: "casts without response",
      reduceTimeTo: "Reduce wait time to",
      toGainExtra: "to gain extra",
      changeLine30min: "If no bites for 30 min on any color - change fishing line by 2-3 meters!",
      leaderPace: "Leader pace:",
      fishPerHour: "pcs/hour",
      yourPace: "Your pace:",
      needToIncrease: "You need to increase pace by",
      toMatchLeader: "to match leader",
      tryBrighterWafter: "Try brighter wafter (yellow, orange)",
      tryDarkerWafter: "Try darker wafter (brown, red)",
      leaderCatching: "Leader catches average",
      perCast: "per cast - adjust your strategy"
    }
  },
  de: {
    title: "Wettkampf-Analysator",
    totalFish: "Gefangene Fische",
    avgWaitTime: "Durchschnittliche Bisszeit",
    competitionTime: "Wettkampfzeit",
    minutes: "Min",
    hours: "Std",
    analyze: "Analysieren",
    estimatedCasts: "Geschätzte Würfe",
    castsPerHour: "Würfe pro Stunde",
    efficiency: "Effizienz",
    recommendations: "Optimierungstipps",
    tacticalTips: "Taktik basierend auf Analyse",
    noFish: "Fügen Sie Fische im Zähler hinzu",
    yourWeight: "Ihr Gewicht",
    leaderWeight: "Gewicht des Gegners",
    kg: "kg",
    g: "g",
    comparison: "Vergleich mit dem Gegner",
    weightDifference: "Gewichtsunterschied",
    youNeed: "Sie brauchen noch",
    fishToWin: "Fische um aufzuholen",
    leaderWeightLabel: "Gewicht des Gegners",
    percentOfLeader: "% des Führenden",
    greatResult: "Tolles Ergebnis! Sie führen!",
    closeToLeader: "Nahe am Führenden! Noch ein paar Fische und Sie sind auf dem Podium!",
    needMore: "Sie müssen Ihr Tempo deutlich erhöhen",
    sector: "Sektor",
    competition: "Wettkampf",
    tips: {
      reduceWait: "Wartezeit um 1-2 Min reduzieren - Sie können gewinnen",
      casts: "Würfe",
      changeWafter: "Wafter-Farbe alle 2-3 Würfe ohne Biss wechseln",
      smallerFeeder: "Kleineren Korb für schnelleres Sinken verwenden",
      activeFeeding: "Fütterungsfrequenz erhöhen - Fische sind aktiv",
      lessFeeding: "Grundfutter reduzieren - Fische können überfüttert sein",
      tryDifferentSpot: "2-3 Meter nach links oder rechts bewegen",
      patternFound: "Bissmuster: alle",
      keepRhythm: "Diesen Wurfrhythmus beibehalten",
      goodEfficiency: "Gute Effizienz! Aktuelle Strategie beibehalten.",
      lowEfficiency: "Niedrige Effizienz - Technikänderungen erwägen.",
      mediumEfficiency: "Mittlere Effizienz - kleine Anpassungen können helfen.",
      potentialExtra: "Potenzial: +",
      fishMore: "Fische bei Optimierung",
      catchUpTip: "Um aufzuholen, versuchen Sie die Zeit zwischen den Würfen zu verkürzen",
      wafterChangeEvery: "Wafter-Wechsel: alle",
      castsNoResponse: "Würfe ohne Reaktion",
      reduceTimeTo: "Wartezeit reduzieren auf",
      toGainExtra: "um extra zu gewinnen",
      changeLine30min: "Wenn 30 Min kein Biss bei keiner Farbe - Angelplatz um 2-3 Meter ändern!",
      leaderPace: "Tempo des Führenden:",
      fishPerHour: "Stk/Std",
      yourPace: "Ihr Tempo:",
      needToIncrease: "Sie müssen das Tempo erhöhen um",
      toMatchLeader: "um mit dem Führenden mitzuhalten",
      tryBrighterWafter: "Helleren Wafter versuchen (gelb, orange)",
      tryDarkerWafter: "Dunkleren Wafter versuchen (braun, rot)",
      leaderCatching: "Führender fängt durchschnittlich",
      perCast: "pro Wurf - Strategie anpassen"
    }
  },
  fr: {
    title: "Analyseur de compétition",
    totalFish: "Poissons pêchés",
    avgWaitTime: "Temps de touche moyen",
    competitionTime: "Temps de compétition",
    minutes: "min",
    hours: "h",
    analyze: "Analyser",
    estimatedCasts: "Lancers estimés",
    castsPerHour: "Lancers par heure",
    efficiency: "Efficacité",
    recommendations: "Conseils d'optimisation",
    tacticalTips: "Tactique basée sur l'analyse",
    noFish: "Ajoutez des poissons dans le compteur",
    yourWeight: "Votre poids",
    leaderWeight: "Poids adversaire",
    kg: "kg",
    g: "g",
    comparison: "Comparaison avec l'adversaire",
    weightDifference: "Différence de poids",
    youNeed: "Vous avez besoin de",
    fishToWin: "poissons de plus pour rattraper",
    leaderWeightLabel: "Poids adversaire",
    percentOfLeader: "% du leader",
    greatResult: "Excellent résultat! Vous êtes en tête!",
    closeToLeader: "Proche du leader! Encore quelques poissons et vous êtes sur le podium!",
    needMore: "Vous devez augmenter significativement votre rythme",
    sector: "Secteur",
    competition: "Compétition",
    tips: {
      reduceWait: "Réduisez le temps d'attente de 1-2 min - vous pouvez gagner",
      casts: "lancers",
      changeWafter: "Changez la couleur du wafter tous les 2-3 lancers sans touche",
      smallerFeeder: "Utilisez un feeder plus petit pour une descente plus rapide",
      activeFeeding: "Augmentez la fréquence d'amorçage - les poissons sont actifs",
      lessFeeding: "Réduisez l'amorce - les poissons peuvent être suralimentés",
      tryDifferentSpot: "Déplacez-vous de 2-3 mètres à gauche ou à droite",
      patternFound: "Schéma de touches: tous les",
      keepRhythm: "Gardez ce rythme de lancers",
      goodEfficiency: "Bonne efficacité! Maintenez la stratégie actuelle.",
      lowEfficiency: "Faible efficacité - envisagez des changements techniques.",
      mediumEfficiency: "Efficacité moyenne - de petits ajustements peuvent aider.",
      potentialExtra: "Potentiel: +",
      fishMore: "poissons avec optimisation",
      catchUpTip: "Pour rattraper le leader, essayez de réduire le temps entre les lancers",
      wafterChangeEvery: "Changement de wafter: tous les",
      castsNoResponse: "lancers sans réponse",
      reduceTimeTo: "Réduisez le temps d'attente à",
      toGainExtra: "pour gagner extra",
      changeLine30min: "Si pas de touche pendant 30 min sur aucune couleur - changez de ligne de 2-3 mètres!",
      leaderPace: "Rythme du leader:",
      fishPerHour: "pcs/h",
      yourPace: "Votre rythme:",
      needToIncrease: "Vous devez augmenter le rythme de",
      toMatchLeader: "pour égaler le leader",
      tryBrighterWafter: "Essayez un wafter plus clair (jaune, orange)",
      tryDarkerWafter: "Essayez un wafter plus foncé (marron, rouge)",
      leaderCatching: "Le leader attrape en moyenne",
      perCast: "par lancer - ajustez votre stratégie"
    }
  },
  cs: {
    title: "Analyzátor soutěže",
    totalFish: "Chycené ryby",
    avgWaitTime: "Průměrný čas záběru",
    competitionTime: "Čas soutěže",
    minutes: "min",
    hours: "hod",
    analyze: "Analyzovat",
    estimatedCasts: "Odhadovaný počet hodů",
    castsPerHour: "Hodů za hodinu",
    efficiency: "Efektivita",
    recommendations: "Tipy na optimalizaci",
    tacticalTips: "Taktika na základě analýzy",
    noFish: "Přidejte ryby v počítadle výše",
    yourWeight: "Vaše váha",
    leaderWeight: "Váha soupeře",
    kg: "kg",
    g: "g",
    comparison: "Srovnání se soupeřem",
    weightDifference: "Rozdíl váhy",
    youNeed: "Potřebujete ještě",
    fishToWin: "ryb k doběhnutí",
    leaderWeightLabel: "Váha soupeře",
    percentOfLeader: "% lídra",
    greatResult: "Skvělý výsledek! Vedete!",
    closeToLeader: "Blízko lídra! Ještě pár ryb a jste na stupních!",
    needMore: "Musíte výrazně zvýšit tempo",
    sector: "Sektor",
    competition: "Soutěž",
    tips: {
      reduceWait: "Zkraťte čekací dobu o 1-2 min - můžete získat navíc",
      casts: "hodů",
      changeWafter: "Měňte barvu wafteru každé 2-3 hody bez záběru",
      smallerFeeder: "Použijte menší krmítko pro rychlejší klesání",
      activeFeeding: "Zvyšte frekvenci krmení - ryby jsou aktivní",
      lessFeeding: "Snižte množství krmiva - ryby mohou být překrmené",
      tryDifferentSpot: "Přesuňte se o 2-3 metry vlevo nebo vpravo",
      patternFound: "Vzorec záběrů: každých",
      keepRhythm: "Udržujte tento rytmus hodů",
      goodEfficiency: "Dobrá efektivita! Udržujte současnou strategii.",
      lowEfficiency: "Nízká efektivita - zvažte změny techniky.",
      mediumEfficiency: "Střední efektivita - drobné úpravy mohou pomoci.",
      potentialExtra: "Potenciál: +",
      fishMore: "ryb při optimalizaci",
      catchUpTip: "Pro doběhnutí lídra zkuste zkrátit čas mezi hody",
      wafterChangeEvery: "Změna wafteru: každých",
      castsNoResponse: "hodů bez reakce",
      reduceTimeTo: "Zkraťte čekací dobu na",
      toGainExtra: "pro získání navíc",
      changeLine30min: "Pokud 30 min žádný záběr na žádnou barvu - změňte linii o 2-3 metry!",
      leaderPace: "Tempo lídra:",
      fishPerHour: "ks/hod",
      yourPace: "Vaše tempo:",
      needToIncrease: "Musíte zvýšit tempo o",
      toMatchLeader: "pro vyrovnání s lídrem",
      tryBrighterWafter: "Zkuste světlejší wafter (žlutý, oranžový)",
      tryDarkerWafter: "Zkuste tmavší wafter (hnědý, červený)",
      leaderCatching: "Lídr chytá průměrně",
      perCast: "na hod - upravte strategii"
    }
  },
  hu: {
    title: "Verseny elemző",
    totalFish: "Fogott halak",
    avgWaitTime: "Átlagos kapásidő",
    competitionTime: "Versenyidő",
    minutes: "perc",
    hours: "óra",
    analyze: "Elemzés",
    estimatedCasts: "Becsült dobások",
    castsPerHour: "Dobás/óra",
    efficiency: "Hatékonyság",
    recommendations: "Optimalizálási tippek",
    tacticalTips: "Taktika az elemzés alapján",
    noFish: "Adjon hozzá halakat a számlálóban",
    yourWeight: "A te súlyod",
    leaderWeight: "Ellenfél súlya",
    kg: "kg",
    g: "g",
    comparison: "Összehasonlítás az ellenféllel",
    weightDifference: "Súlykülönbség",
    youNeed: "Még szükséged van",
    fishToWin: "halra a felzárkózáshoz",
    leaderWeightLabel: "Ellenfél súlya",
    percentOfLeader: "% a vezetőből",
    greatResult: "Remek eredmény! Te vezetsz!",
    closeToLeader: "Közel a vezetőhöz! Még pár hal és a dobogón vagy!",
    needMore: "Jelentősen növelned kell a tempót",
    sector: "Szektor",
    competition: "Verseny",
    tips: {
      reduceWait: "Csökkentse a várakozási időt 1-2 perccel - nyerhet extra",
      casts: "dobást",
      changeWafter: "Változtassa a wafter színét minden 2-3 dobás után kapás nélkül",
      smallerFeeder: "Használjon kisebb kosarat a gyorsabb süllyedéshez",
      activeFeeding: "Növelje az etetés gyakoriságát - a halak aktívak",
      lessFeeding: "Csökkentse az etetőanyagot - a halak túl lehetnek etetve",
      tryDifferentSpot: "Mozduljon 2-3 métert balra vagy jobbra",
      patternFound: "Kapási minta: minden",
      keepRhythm: "Tartsa ezt a dobási ritmust",
      goodEfficiency: "Jó hatékonyság! Tartsa a jelenlegi stratégiát.",
      lowEfficiency: "Alacsony hatékonyság - fontolja meg a technika változtatást.",
      mediumEfficiency: "Közepes hatékonyság - apró módosítások segíthetnek.",
      potentialExtra: "Potenciál: +",
      fishMore: "hal optimalizálással",
      catchUpTip: "A felzárkózáshoz próbálja csökkenteni a dobások közti időt",
      wafterChangeEvery: "Wafter váltás: minden",
      castsNoResponse: "dobás reakció nélkül",
      reduceTimeTo: "Csökkentse a várakozási időt",
      toGainExtra: "extra nyeréshez",
      changeLine30min: "Ha 30 percig nincs kapás egyetlen színre sem - változtassa a horgászvonalat 2-3 méterrel!",
      leaderPace: "Vezető tempója:",
      fishPerHour: "db/óra",
      yourPace: "Az Ön tempója:",
      needToIncrease: "Növelnie kell a tempót",
      toMatchLeader: "hogy utolérje a vezetőt",
      tryBrighterWafter: "Próbáljon világosabb waftert (sárga, narancssárga)",
      tryDarkerWafter: "Próbáljon sötétebb waftert (barna, piros)",
      leaderCatching: "A vezető átlagosan fog",
      perCast: "dobásonként - igazítsa stratégiáját"
    }
  },
  ro: {
    title: "Analizator competiție",
    totalFish: "Pești prinși",
    avgWaitTime: "Timp mediu de mușcătură",
    competitionTime: "Timp competiție",
    minutes: "min",
    hours: "ore",
    analyze: "Analizează",
    estimatedCasts: "Lansări estimate",
    castsPerHour: "Lansări pe oră",
    efficiency: "Eficiență",
    recommendations: "Sfaturi de optimizare",
    tacticalTips: "Tactică bazată pe analiză",
    noFish: "Adăugați pești în contor",
    yourWeight: "Greutatea ta",
    leaderWeight: "Greutatea adversarului",
    kg: "kg",
    g: "g",
    comparison: "Comparație cu adversarul",
    weightDifference: "Diferență greutate",
    youNeed: "Mai ai nevoie de",
    fishToWin: "pești pentru a ajunge din urmă",
    leaderWeightLabel: "Greutatea adversarului",
    percentOfLeader: "% din lider",
    greatResult: "Rezultat excelent! Ești în frunte!",
    closeToLeader: "Aproape de lider! Încă câțiva pești și ești pe podium!",
    needMore: "Trebuie să crești semnificativ ritmul",
    sector: "Sector",
    competition: "Competiție",
    tips: {
      reduceWait: "Reduceți timpul de așteptare cu 1-2 min - puteți câștiga",
      casts: "lansări",
      changeWafter: "Schimbați culoarea wafter-ului la fiecare 2-3 lansări fără mușcătură",
      smallerFeeder: "Folosiți un coș mai mic pentru scufundare mai rapidă",
      activeFeeding: "Creșteți frecvența hrănirii - peștii sunt activi",
      lessFeeding: "Reduceți nada - peștii pot fi suprahăniți",
      tryDifferentSpot: "Mutați-vă 2-3 metri la stânga sau la dreapta",
      patternFound: "Model de mușcături: la fiecare",
      keepRhythm: "Mențineți acest ritm de lansare",
      goodEfficiency: "Eficiență bună! Mențineți strategia actuală.",
      lowEfficiency: "Eficiență scăzută - luați în considerare schimbări de tehnică.",
      mediumEfficiency: "Eficiență medie - ajustări mici pot ajuta.",
      potentialExtra: "Potențial: +",
      fishMore: "pești cu optimizare",
      catchUpTip: "Pentru a ajunge din urmă, încercați să reduceți timpul între lansări",
      wafterChangeEvery: "Schimbare wafter: la fiecare",
      castsNoResponse: "lansări fără răspuns",
      reduceTimeTo: "Reduceți timpul de așteptare la",
      toGainExtra: "pentru a câștiga extra",
      changeLine30min: "Dacă nu aveți mușcătură 30 min pe nicio culoare - schimbați linia de pescuit cu 2-3 metri!",
      leaderPace: "Ritmul liderului:",
      fishPerHour: "buc/oră",
      yourPace: "Ritmul tău:",
      needToIncrease: "Trebuie să crești ritmul cu",
      toMatchLeader: "pentru a egala liderul",
      tryBrighterWafter: "Încercați un wafter mai deschis (galben, portocaliu)",
      tryDarkerWafter: "Încercați un wafter mai închis (maro, roșu)",
      leaderCatching: "Liderul prinde în medie",
      perCast: "pe lansare - ajustați strategia"
    }
  }
};

interface CompetitionAnalyzerProps {
  totalFish: number;
  totalWeightGrams: number;
}

export default function CompetitionAnalyzer({ totalFish, totalWeightGrams }: CompetitionAnalyzerProps) {
  const { language } = useLanguage();
  const t = analyzerTranslations[language] || analyzerTranslations.pl;
  
  const [avgWaitMinutes, setAvgWaitMinutes] = useState(5);
  const [competitionHours, setCompetitionHours] = useState(6);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [yourWeightKg, setYourWeightKg] = useState(0);
  const [leaderWeightKg, setLeaderWeightKg] = useState(0);

  const incrementWait = () => setAvgWaitMinutes(prev => Math.min(30, prev + 1));
  const decrementWait = () => setAvgWaitMinutes(prev => Math.max(1, prev - 1));
  const incrementHours = () => setCompetitionHours(prev => Math.min(99, prev + 1));
  const decrementHours = () => setCompetitionHours(prev => Math.max(1, prev - 1));
  

  const competitionMinutes = competitionHours * 60;
  const estimatedCasts = Math.floor(competitionMinutes / avgWaitMinutes);
  const castsPerHour = Math.round(60 / avgWaitMinutes);
  const efficiency = totalFish > 0 ? Math.round((totalFish / estimatedCasts) * 100) : 0;
  
  const optimizedWaitTime = Math.max(2, avgWaitMinutes - 2);
  const optimizedCasts = Math.floor(competitionMinutes / optimizedWaitTime);
  const potentialExtraFish = Math.round((optimizedCasts - estimatedCasts) * (efficiency / 100));

  const yourWeightGrams = Math.round(yourWeightKg * 1000);
  const leaderWeightGrams = Math.round(leaderWeightKg * 1000);
  const weightDifference = leaderWeightGrams - yourWeightGrams;
  const avgFishWeight = totalFish > 0 ? yourWeightGrams / totalFish : 200;
  const fishNeededToCatchUp = weightDifference > 0 ? Math.ceil(weightDifference / avgFishWeight) : 0;
  const percentOfLeader = leaderWeightGrams > 0 ? Math.round((yourWeightGrams / leaderWeightGrams) * 100) : 0;

  const wafterChangeCasts = Math.max(2, Math.min(4, Math.floor(castsPerHour / 4)));
  const recommendedWaitTime = Math.max(3, avgWaitMinutes - 1);
  const castsIn30Min = Math.floor(30 / avgWaitMinutes);
  
  const leaderFishPerHour = leaderWeightGrams > 0 && avgFishWeight > 0 
    ? (leaderWeightGrams / avgFishWeight) / competitionHours 
    : 0;
  const yourFishPerHour = totalFish / competitionHours;
  const paceIncrease = leaderFishPerHour > yourFishPerHour 
    ? Math.round(((leaderFishPerHour - yourFishPerHour) / yourFishPerHour) * 100) 
    : 0;

  const formatWeight = (grams: number) => {
    if (grams >= 1000) {
      return `${(grams / 1000).toFixed(2)} ${t.kg}`;
    }
    return `${grams} ${t.g}`;
  };

  const getEfficiencyColor = () => {
    if (efficiency >= 30) return "text-green-500";
    if (efficiency >= 15) return "text-yellow-500";
    return "text-red-500";
  };

  const getEfficiencyText = () => {
    if (efficiency >= 30) return t.tips.goodEfficiency;
    if (efficiency >= 15) return t.tips.mediumEfficiency;
    return t.tips.lowEfficiency;
  };

  const getComparisonColor = () => {
    if (percentOfLeader >= 100) return "text-green-500";
    if (percentOfLeader >= 80) return "text-yellow-500";
    return "text-red-500";
  };

  const getComparisonText = () => {
    if (percentOfLeader >= 100) return t.greatResult;
    if (percentOfLeader >= 80) return t.closeToLeader;
    return t.needMore;
  };

  const generateTacticalTips = () => {
    const tips: { text: string; urgent?: boolean }[] = [];
    
    tips.push({ 
      text: `${t.tips.wafterChangeEvery} ${wafterChangeCasts} ${t.tips.castsNoResponse}` 
    });
    
    if (avgWaitMinutes > 3) {
      const extraCasts = Math.floor(competitionMinutes / recommendedWaitTime) - estimatedCasts;
      tips.push({ 
        text: `${t.tips.reduceTimeTo} ${recommendedWaitTime} ${t.minutes} ${t.tips.toGainExtra} ~${extraCasts} ${t.tips.casts}` 
      });
    }
    
    tips.push({ 
      text: t.tips.changeLine30min,
      urgent: true 
    });
    
    if (efficiency < 15) {
      tips.push({ text: t.tips.tryBrighterWafter });
      tips.push({ text: t.tips.tryDarkerWafter });
    }
    
    return tips;
  };

  const generateLeaderTips = () => {
    const tips: { text: string; urgent?: boolean }[] = [];
    
    if (leaderWeightGrams > 0 && leaderFishPerHour > 0) {
      tips.push({ 
        text: `${t.tips.leaderPace} ${leaderFishPerHour.toFixed(1)} ${t.tips.fishPerHour}` 
      });
      tips.push({ 
        text: `${t.tips.yourPace} ${yourFishPerHour.toFixed(1)} ${t.tips.fishPerHour}` 
      });
      
      if (paceIncrease > 0) {
        tips.push({ 
          text: `${t.tips.needToIncrease} ${paceIncrease}% ${t.tips.toMatchLeader}`,
          urgent: paceIncrease > 50
        });
      }
      
      const leaderAvgPerCast = leaderWeightGrams / estimatedCasts;
      if (leaderAvgPerCast > avgFishWeight) {
        tips.push({ 
          text: `${t.tips.leaderCatching} ${formatWeight(Math.round(leaderAvgPerCast))} ${t.tips.perCast}` 
        });
      }
      
    }
    
    return tips;
  };

  const generateRecommendations = () => {
    const tips: string[] = [];
    
    if (avgWaitMinutes > 4) {
      tips.push(`${t.tips.reduceWait} ${potentialExtraFish > 0 ? potentialExtraFish : 2-3} ${t.tips.casts}`);
    }
    
    if (efficiency < 20) {
      tips.push(t.tips.changeWafter);
    }
    
    if (avgWaitMinutes > 6) {
      tips.push(t.tips.smallerFeeder);
    }
    
    if (efficiency > 25 && totalFish > 5) {
      tips.push(t.tips.activeFeeding);
    }
    
    if (efficiency < 10 && totalFish > 0) {
      tips.push(t.tips.lessFeeding);
      tips.push(t.tips.tryDifferentSpot);
    }
    
    if (totalFish > 0 && avgWaitMinutes > 0) {
      tips.push(`${t.tips.patternFound} ${avgWaitMinutes} ${t.minutes}. ${t.tips.keepRhythm}`);
    }
    
    return tips;
  };

  return (
    <Card className="mm-tool-section w-full rounded-none border-0 bg-transparent shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="h-5 w-5 text-lime-400" />
          {t.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {t.avgWaitTime}
            </label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={decrementWait}
                className="h-10 w-10"
                data-testid="button-decrement-wait"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <div className="flex-1 h-10 flex items-center justify-center border-2 border-border rounded-lg bg-muted/30">
                <span className="text-xl font-mono font-bold" data-testid="display-wait-time">
                  {avgWaitMinutes}
                </span>
                <span className="text-sm text-muted-foreground ml-1">{t.minutes}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={incrementWait}
                className="h-10 w-10"
                data-testid="button-increment-wait"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Target className="h-3 w-3" />
              {t.competitionTime}
            </label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={decrementHours}
                className="h-10 w-10"
                data-testid="button-decrement-hours"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <div className="flex-1 h-10 flex items-center justify-center border-2 border-border rounded-lg bg-muted/30">
                <span className="text-xl font-mono font-bold" data-testid="display-competition-hours">
                  {competitionHours}
                </span>
                <span className="text-sm text-muted-foreground ml-1">{t.hours}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={incrementHours}
                className="h-10 w-10"
                data-testid="button-increment-hours"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Scale className="h-3 w-3" />
              {t.yourWeight}
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="999"
                step="0.1"
                value={yourWeightKg || ''}
                onChange={(e) => setYourWeightKg(Math.min(999, Math.max(0, parseFloat(e.target.value) || 0)))}
                className="h-10 w-full text-center text-xl font-mono font-bold border-2 border-border rounded-lg bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary"
                data-testid="input-your-weight-kg"
                placeholder="0"
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">{t.kg}</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Medal className="h-3 w-3" />
              {t.leaderWeight}
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="999"
                step="0.1"
                value={leaderWeightKg || ''}
                onChange={(e) => setLeaderWeightKg(Math.min(999, Math.max(0, parseFloat(e.target.value) || 0)))}
                className="h-10 w-full text-center text-xl font-mono font-bold border-2 border-border rounded-lg bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary"
                data-testid="input-leader-kg"
                placeholder="0"
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">{t.kg}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
          <span className="text-sm font-medium">{t.totalFish}:</span>
          <span className="text-xl font-mono font-bold text-primary">
            {totalFish}
          </span>
        </div>

        <Button
          onClick={() => setShowAnalysis(true)}
          className="w-full gap-2 bg-lime-400 hover:bg-lime-500 text-black font-bold"
          disabled={totalFish === 0}
          data-testid="button-analyze"
        >
          <TrendingUp className="h-4 w-4" />
          {t.analyze}
        </Button>

        {totalFish === 0 && (
          <p className="text-sm text-muted-foreground text-center">{t.noFish}</p>
        )}

        {showAnalysis && totalFish > 0 && (
          <div className="space-y-4 pt-4 border-t">
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="text-2xl font-mono font-bold text-primary">{estimatedCasts}</div>
                <div className="text-xs text-muted-foreground">{t.estimatedCasts}</div>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="text-2xl font-mono font-bold text-primary">{castsPerHour}</div>
                <div className="text-xs text-muted-foreground">{t.castsPerHour}</div>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className={`text-2xl font-mono font-bold ${getEfficiencyColor()}`}>{efficiency}%</div>
                <div className="text-xs text-muted-foreground">{t.efficiency}</div>
              </div>
            </div>

            <div className={`p-3 rounded-lg border ${getEfficiencyColor()} bg-opacity-10`}>
              <p className="text-sm font-medium">{getEfficiencyText()}</p>
              {potentialExtraFish > 0 && (
                <p className="text-sm mt-1 text-muted-foreground">
                  {t.tips.potentialExtra}{potentialExtraFish} {t.tips.fishMore}
                </p>
              )}
            </div>

            <div className="space-y-2 p-3 bg-lime-400/10 rounded-lg border border-lime-400/30">
              <div className="flex items-center gap-2 text-sm font-medium text-lime-400">
                <Zap className="h-4 w-4" />
                {t.tacticalTips}
              </div>
              <ul className="space-y-2">
                {generateTacticalTips().map((tip, index) => (
                  <li key={index} className={`text-sm flex items-start gap-2 ${tip.urgent ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                    <span className={tip.urgent ? 'text-red-500' : 'text-lime-400'}>•</span>
                    {tip.text}
                  </li>
                ))}
              </ul>
            </div>

            {leaderWeightGrams > 0 && (
              <div className="space-y-3 p-4 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 rounded-lg border border-amber-500/30">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Users className="h-4 w-4 text-amber-500" />
                  {t.comparison}
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-2 bg-background/50 rounded">
                    <div className="text-lg font-mono font-bold">{formatWeight(yourWeightGrams)}</div>
                    <div className="text-xs text-muted-foreground">{t.yourWeight}</div>
                  </div>
                  <div className="text-center p-2 bg-background/50 rounded">
                    <div className="text-lg font-mono font-bold">{formatWeight(leaderWeightGrams)}</div>
                    <div className="text-xs text-muted-foreground">{t.leaderWeightLabel}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">{t.percentOfLeader}:</span>
                  <span className={`text-xl font-mono font-bold ${getComparisonColor()}`}>
                    {percentOfLeader}%
                  </span>
                </div>

                {weightDifference > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{t.weightDifference}:</span>
                    <span className="text-lg font-mono font-bold text-red-500">
                      -{formatWeight(weightDifference)}
                    </span>
                  </div>
                )}

                <div className={`p-2 rounded text-sm ${getComparisonColor()}`}>
                  {getComparisonText()}
                  {fishNeededToCatchUp > 0 && (
                    <span className="block mt-1 text-muted-foreground">
                      {t.youNeed} ~{fishNeededToCatchUp} {t.fishToWin}
                    </span>
                  )}
                </div>

                <ul className="space-y-1 pt-2 border-t border-amber-500/20">
                  {generateLeaderTips().map((tip, index) => (
                    <li key={index} className={`text-sm flex items-start gap-2 ${tip.urgent ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                      <span className={tip.urgent ? 'text-red-500' : 'text-amber-500'}>•</span>
                      {tip.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                {t.recommendations}
              </div>
              <ul className="space-y-2">
                {generateRecommendations().map((tip, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
