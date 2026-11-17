import type { GetFishingWeatherResponse } from "@workspace/api-zod";

type Day = ReturnType<typeof GetFishingWeatherResponse.parse>["days"][number];
type Conditions = Pick<Day, "temperatureMin" | "temperatureMax" | "pressureChange" | "windGustsMax" | "windSpeedMax" | "weatherCode" | "precipitation" | "cloudCoverMean">;

/** Transparent starting points, not a model of bite probability. Air is not water temperature. */
export function fishingWeatherAdvice(day: Conditions, previousMax: number | null) {
  const advice: string[] = [];
  const warnings: string[] = [];
  const storm = day.weatherCode !== null && day.weatherCode >= 95;
  if (storm || (day.windGustsMax !== null && day.windGustsMax >= 60)) {
    warnings.push("Ryzyko burzy lub silnych porywów. Nie łów podczas burzy; odłóż wędki i szukaj bezpiecznego schronienia. Sprawdź ostrzeżenia IMGW.");
  }
  if (day.temperatureMin !== null && day.temperatureMin <= 0) {
    warnings.push("Możliwy przymrozek i śliskie pomosty. Uważaj przy brzegu.");
  }
  if (day.temperatureMax === null) {
    advice.push("Brakuje temperatury powietrza. Zacznij od małej porcji zanęty i obserwuj reakcję ryb.");
  } else if (day.temperatureMax < 10) {
    advice.push("Chłodne powietrze może towarzyszyć wolniejszemu żerowaniu ryb ciepłolubnych. Zacznij od małych porcji i rozważ spokojniejszą, głębszą wodę. Zmierz temperaturę wody — to ona jest ważniejsza.");
  } else if (day.temperatureMax >= 28) {
    advice.push("Przy utrzymujących się upałach woda może być mniej natleniona. Rozważ świt, zmierzch, cień lub dopływ; ogranicz nęcenie do czasu pierwszych oznak aktywności.");
  } else {
    advice.push("Umiarkowana temperatura powietrza nie wyklucza aktywnego żerowania. Sprawdź kilka dystansów i zacznij od oszczędnego nęcenia, zamiast zakładać, że ryby już żerują.");
  }
  if (day.temperatureMax !== null && previousMax !== null && day.temperatureMax - previousMax <= -5) {
    advice.push("Wyraźne ochłodzenie względem poprzedniego dnia może zmienić stanowiska i tempo żerowania. Daj sobie więcej czasu na obserwację, zanim zwiększysz porcję zanęty.");
  }
  if (day.pressureChange === null) {
    advice.push("Brak pełnego porównania ciśnienia z poprzednim dniem. Nie wyciągaj z tego wniosku o stabilnej pogodzie.");
  } else if (Math.abs(day.pressureChange) >= 6) {
    advice.push("Średnie ciśnienie zmienia się wyraźnie z dnia na dzień. Może to towarzyszyć przejściu frontu i zmiennemu żerowaniu; nie oznacza automatycznie lepszych ani gorszych brań.");
  } else if (Math.abs(day.pressureChange) < 3) {
    advice.push("Średnie ciśnienie jest względnie stabilne względem poprzedniego dnia. To ułatwia porównanie warunków, ale samo w sobie nie przewiduje brań.");
  } else {
    advice.push("Ciśnienie stopniowo się zmienia. Obserwuj przede wszystkim wiatr, temperaturę wody i zachowanie ryb, a nie pojedynczą wartość barometru.");
  }
  if (day.windSpeedMax !== null && day.windSpeedMax >= 8 && day.windSpeedMax <= 25 && !warnings.length) {
    advice.push("Umiarkowany wiatr może przemieszczać pokarm i mieszać wodę. Sprawdź bezpieczny brzeg, w którego stronę wieje, ale w zimnej wodzie porównaj też osłonięte stanowisko.");
  }
  if (day.cloudCoverMean !== null && day.cloudCoverMean >= 65 && !storm) {
    advice.push("Duże zachmurzenie ogranicza ostre światło. Warto sprawdzić płytszy dystans, jeśli temperatura wody i głębokość na to pozwalają.");
  }
  if (day.precipitation !== null && day.precipitation >= 10) {
    advice.push("Większy opad może zmienić przejrzystość i poziom wody. Sprawdź nurt oraz kolor wody na miejscu; nie zakładaj, że deszcz zawsze poprawia brania.");
  }
  return { advice, warnings };
}
