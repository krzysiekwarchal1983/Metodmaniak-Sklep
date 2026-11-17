import type { PrecisionEpisode } from "./index";

export const FOUNDATIONS: PrecisionEpisode[] = [
  {
    number: 1, slug: "manifest-metodmaniaka",
    title: "Manifest Metodmaniaka – Kim jesteśmy i dlaczego łowimy inaczej?",
    topic: "Filozofia metody",
    lead: "Nie pojedyncza przynęta, lecz kompletny system. Poznaj ludzi, wartości i sposób myślenia stojący za MetodManiakiem.",
    goal: "Pokazać filozofię kompletnego rozwiązania Method Feeder — od przygotowania towaru do prezentacji zestawu na dnie.",
    chapters: [
      { title: "Czym jest MetodManiak?", points: ["Pasja, dążenie do perfekcji i powtarzalności zamiast zdawania się wyłącznie na przypadek.", "Zanęta i pellet o odpowiedniej mechanice, skalibrowany wafters, haczyk, mocowanie oraz dopasowany podajnik.", "Układanka detali: za ciężki hak, źle dobrany bagnet lub niewłaściwa konsystencja mogą zmienić pracę całego zestawu."] },
      { title: "Dlaczego robimy to po swojemu?", points: ["Jakość i praktyczne testy na wodach komercyjnych oraz PZW jako kierunek rozwoju marki.", "Mała rodzinna polska firma, świadoma społeczność i edukacja zamiast samej sprzedaży.", "Seria krok po kroku pokazująca Method Feeder w naszych oczach."] },
      { title: "Filozofia powtarzalnej pułapki", points: ["Celne, powtarzalne podawanie przemyślanego zestawu.", "Obserwacja efektu i zmienianie jednego elementu naraz."] },
    ],
    products: [
      { category: "zanety", subcategory: "Komercyjne", why: "Baza do rozmowy o przygotowaniu i mechanice mieszanki." },
      { category: "pellety", subcategory: "2mm", why: "Drobna frakcja jako jeden z elementów kompletnego zestawu." },
      { category: "waftersy", subcategory: "8mm", color: "Żółty musztardowy", why: "Przynęta do sprawdzenia balansu z wybranym haczykiem i mocowaniem." },
    ],
  },
  {
    number: 2, slug: "anatomia-pulapki",
    title: "Anatomia Pułapki – Od klipsa po wyjęcie trofeum z wody",
    topic: "Rzut i prezentacja",
    lead: "Cały cykl jednego skutecznego podania: przygotowanie miksu, klips, lądowanie zestawu, branie i bezpieczny hol.",
    goal: "Połączyć precyzję rzutu z prezentacją przynęty i sprawną, bezpieczną reakcją na branie.",
    chapters: [
      { title: "Precyzja dystansu", points: ["Klipsowanie i powtarzalność miejsca lądowania.", "Budowanie niewielkiego pola nęcenia zamiast rozpraszania towaru."] },
      { title: "Przygotowanie mieszanki", points: ["Stopień nawilżenia zanęty i pelletu a wytrzymałość podczas lotu.", "Sprawdzenie zachowania mieszanki podczas opadania."] },
      { title: "Ułożenie przynęty i lądowanie", points: ["Pozycja waftersa w podajniku przed nabiciem.", "Kontrolowany rzut, wyhamowanie do klipsa i możliwie ciche wejście zestawu do wody."] },
      { title: "Branie, hol, podbieranie", points: ["Odczytanie szczytówki i odpowiednia reakcja.", "Praca wędki i hamulca podczas holu oraz bezpieczne podbieranie ryby."] },
    ],
    products: [
      { category: "pellety", subcategory: "2mm", why: "Do ćwiczenia powtarzalnego przygotowania porcji do podajnika." },
      { category: "przypony", subcategory: "10cm", why: "Punkt wyjścia do omówienia krótkiego zestawu końcowego." },
      { category: "waftersy", subcategory: "8mm", color: "Biały", why: "Przynęta do testu ułożenia w podajniku i balansu zestawu." },
    ],
  },
  {
    number: 3, slug: "mechanika-pod-woda",
    title: "Mechanika Pod Wodą – Praca zanęty, uwolnienie przynęty i atak ryby",
    topic: "Praca mieszanki",
    lead: "Co dzieje się po zniknięciu podajnika pod taflą? Rozkładamy pracę miksu i uwolnienie waftersa na kolejne etapy.",
    goal: "Wyjaśnić zachowanie podajnika, mieszanki i przynęty na dnie oraz sposób obserwowania ich pracy.",
    chapters: [
      { title: "Osypywanie się miksu", points: ["Ścieralność, tempo rozpadu i uwalnianie frakcji zanęty oraz pelletu.", "Powstawanie smugi i sygnału zapachowo-smakowego zależnie od użytej mieszanki."] },
      { title: "Moment uwolnienia waftersa", points: ["Kiedy przynęta wydostaje się z mieszanki i jak układa się przy haczyku.", "Dlaczego trzeba sprawdzić cały zestaw w wodzie, a nie tylko samą wyporność przynęty."] },
      { title: "Reakcja ryby", points: ["Impuls optyczny, zapach i dostępność pokarmu.", "Rywalizacja o pokarm i zasysanie przynęty — obserwacje, nie gwarancja kolejności brań."] },
    ],
    products: [
      { category: "zanety", subcategory: "Komercyjne", why: "Baza do obserwowania rozpadu i pracy mieszanki w wodzie." },
      { category: "pellety", subcategory: "2mm", why: "Do porównania czasu uwalniania drobnej frakcji z podajnika." },
      { category: "waftersy", subcategory: "6mm", color: "Żółty fluo", why: "Wyraźny kolor ułatwiający obserwację położenia przynęty w próbie wodnej." },
    ],
  },
  {
    number: 4, slug: "wafters-pod-lupa",
    title: "Wafters pod Lupą – Kształt, miękkość, wyporność i detal wykonania",
    topic: "Przynęty zbalansowane",
    lead: "Dumbells z bliska: struktura, wyporność, połączenie barw i przechowywanie. Detale, które warto sprawdzić przed łowieniem.",
    goal: "Pokazać, jak oceniać parametry przynęty i testować ją razem z uzbrojeniem.",
    chapters: [
      { title: "Parametry fizyczne", points: ["Dumbell a kulka: różnice kształtu oraz twardość i miękkość.", "Wyporność w połączeniu z wagą haczyka i mocowania; kontrola w pojemniku z wodą."] },
      { title: "Detale wykonania i kolory Duo", points: ["Rozmyte przejście i wyraźna linia połączenia barw jako różne efekty wykonania.", "Ocena powtarzalności — sam wygląd linii koloru nie zastępuje testu wyporności."] },
      { title: "Szczelność opakowania", points: ["Słoik, zakrętka i wkładka uszczelniająca.", "Ochrona przed wysychaniem, wilgocią, utratą aromatu i promieniowaniem UV."] },
    ],
    productNote: "Nasze obecne waftersy mają kształt dumbells. Kulka pojawia się w planie jako porównanie kształtów, nie jako oferowany tutaj wariant.",
    products: [
      { category: "waftersy", subcategory: "6mm", color: "Biało-różowy", why: "Mały wariant Duo do oglądania połączenia barw i testu balansu." },
      { category: "waftersy", subcategory: "8mm", color: "Żółty fluo z pomarańczowym", why: "Dwukolorowy dumbells do porównania wielkości i prezentacji." },
      { category: "waftersy", subcategory: "10mm", color: "Jasny brązowy z ciemnym brązowym", why: "Większy wariant do sprawdzenia z odpowiednio dobranym uzbrojeniem." },
    ],
  },
  {
    number: 5, slug: "uzbrojenie-waftersa",
    title: "Uzbrojenie Waftersa – Haczyki, mocowania, grubość i długość bagnetów",
    topic: "Balans i mocowanie",
    lead: "Bagnet czy gumka? Sprawdzamy, jak masa i geometria mocowania zmieniają zachowanie tego samego waftersa.",
    goal: "Wyjaśnić dobór haczyka i mocowania oraz pokazać praktyczny test całego zestawu.",
    chapters: [
      { title: "Test balansu przed rzutem", points: ["Przezroczysty pojemnik z wodą i kontrola waftersa razem z haczykiem.", "Wpływ masy mocowania na wysokość i stabilność prezentacji."] },
      { title: "Grubość bagnetu", points: ["Porównanie drutów 0,5–0,6 mm przy małych i miękkich waftersach oraz 0,7–0,8 mm przy większych lub twardszych.", "Sprawdzanie pękania przynęty, trzymania i wyginania drutu — rozmiary są punktem do testów, nie uniwersalną tabelą doboru."] },
      { title: "Długość bagnetu", points: ["Krótkie mocowania 5–7 mm oraz dłuższe 8–11 mm w porównaniu do długości przynęty.", "Długość i grubość oznaczają także dodatkową masę, która może zatopić niewielkiego waftersa."] },
      { title: "Bagnet czy gumka?", points: ["Szybkość wymiany, odporność miękkiej przynęty i trwałość mocowania.", "Geometria przyponu, zachowanie na dnie i swoboda pracy haczyka."] },
    ],
    productNote: "Osobnych bagnetów i gumek nie ma jeszcze w obecnym katalogu. Pokazujemy przynęty oraz przypon do prób; rodzaj mocowania sprawdź w opisie konkretnego produktu.",
    products: [
      { category: "waftersy", subcategory: "6mm", color: "Różowy wyprany", why: "Mała przynęta do sprawdzenia wpływu masy mocowania." },
      { category: "waftersy", subcategory: "10mm", color: "Żółty musztardowy", why: "Większy dumbells do porównania dopasowania długości mocowania." },
      { category: "przypony", subcategory: "10cm", why: "Element zestawu do obserwacji geometrii prezentacji." },
    ],
  },
  {
    number: 6, slug: "barwy-i-rozmiary",
    title: "Barwy i Rozmiary – Kolorologia oraz taktyka na łowisku",
    topic: "Kolor i rozmiar",
    lead: "Jaskrawy akcent, wyprany róż czy Duo? Dobór do widoczności wody, presji i aktywności ryb zamiast jednego koloru na wszystko.",
    goal: "Uporządkować sposób porównywania barw oraz rozmiarów 6, 8 i 10 mm.",
    chapters: [
      { title: "Jaskrawe i stonowane kolory", points: ["Żółty, różowy i fluo jako kontrastowe opcje do porównania w mętnej lub chłodnej wodzie.", "Washed-out, brązy i naturalne odcienie na przejrzystą wodę i ostrożne ryby."] },
      { title: "Przynęty dwukolorowe", points: ["Duo jako kolejna opcja przy szukaniu skutecznej prezentacji.", "Zmiana jednej cechy naraz i notowanie reakcji ryb, bez traktowania koloru jako gwarancji brania."] },
      { title: "Kalibracja 6 / 8 / 10 mm", points: ["Dostosowanie wielkości do aktywności, presji i pory roku.", "Ponowna kontrola balansu po każdej zmianie wielkości przynęty."] },
    ],
    products: [
      { category: "waftersy", subcategory: "6mm", color: "Żółty fluo", why: "Mały, kontrastowy wariant do porównania widoczności przynęty." },
      { category: "waftersy", subcategory: "8mm", color: "Różowy wyprany", why: "Stonowana alternatywa do testów przy ostrożnym żerowaniu." },
      { category: "waftersy", subcategory: "10mm", color: "Ciemny brązowy z żółtym musztardowym", why: "Większy wariant Duo pokazujący trzeci sposób prezentacji." },
    ],
  },
  {
    number: 7, slug: "podajniki-bez-tajemnic",
    title: "Podajniki bez Tajemnic – Banjo vs. Żeberkowy, kształty i lotki",
    topic: "Podajnik i aerodynamika",
    lead: "Konstrukcja, masa, powierzchnia i lotki. Dobieramy podajnik do warunków oraz sprawdzamy sens modyfikacji.",
    goal: "Porównać konstrukcje podajników i wyjaśnić ich rolę podczas rzutu, opadania oraz uwalniania mieszanki.",
    chapters: [
      { title: "Banjo i klasyczny podajnik żeberkowy", points: ["Ochrona miksu a szybkość jego uwalniania.", "Próby na różnej głębokości i dystansie zamiast sztywnego przypisania jednego typu do każdej sytuacji."] },
      { title: "Gramatura, rozmiar i podłoże", points: ["Muł, żwir i piasek: masa oraz powierzchnia podparcia.", "Co dzieje się przy uderzeniu o wodę i podczas opadania zestawu."] },
      { title: "Lotki i tuning DIY", points: ["Stabilizacja lotu przy rzutach dystansowych.", "Plan demonstracji modyfikacji z węglową lotką, kontrola mocowania i bezpieczeństwa zestawu."] },
    ],
    productNote: "Podajników ani węglowych lotek nie ma jeszcze w katalogu sprzedaży; lotki zapowiadamy w Nowościach. Poniżej trzy pasujące elementy zestawu do pracy z podajnikiem.",
    products: [
      { category: "pellety", subcategory: "2mm", why: "Mieszanka do porównania trzymania towaru w różnych konstrukcjach." },
      { category: "przypony", subcategory: "10cm", why: "Element końcowy do kontroli całego zestawu po zmianie podajnika." },
      { category: "waftersy", subcategory: "8mm", color: "Żółty musztardowy", why: "Przynęta do obserwacji uwalniania z przygotowanego podajnika." },
    ],
  },
];
