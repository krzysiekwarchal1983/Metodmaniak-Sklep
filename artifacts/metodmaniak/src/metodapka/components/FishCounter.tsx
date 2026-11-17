import { useState, useEffect } from "react";
import { Fish, Plus, Minus, RotateCcw, Scale, ChevronUp, ChevronDown, X, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLanguage } from "../language";

function NetIcon({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={className}
    >
      <ellipse cx="12" cy="6" rx="8" ry="3" />
      <path d="M4 6v2c0 1.5 3.5 3 8 3s8-1.5 8-3V6" />
      <path d="M4 8c0 3 2 8 8 14 6-6 8-11 8-14" />
      <path d="M8 9c0 2 1.5 5 4 8 2.5-3 4-6 4-8" />
      <path d="M6 11h12" />
      <path d="M7 14h10" />
      <path d="M9 17h6" />
    </svg>
  );
}

const counterTranslations = {
  pl: {
    title: "Licznik ryb",
    net: "Siatka",
    total: "Razem",
    reset: "Resetuj",
    avgWeight: "Średnia waga ryby",
    grams: "g",
    kg: "kg",
    fish: "ryb",
    estimatedWeight: "Przybliżona waga",
    nets: "Siatki",
    weightAnalyzer: "Analizator wagi",
    enterWeight: "Wpisz wagę (g)",
    addWeight: "Dodaj",
    calculateAvg: "Oblicz średnią",
    enteredWeights: "Wprowadzone wagi",
    calculatedAvg: "Obliczona średnia"
  },
  en: {
    title: "Fish Counter",
    net: "Net",
    total: "Total",
    reset: "Reset",
    avgWeight: "Average fish weight",
    grams: "g",
    kg: "kg",
    fish: "fish",
    estimatedWeight: "Estimated weight",
    nets: "Nets",
    weightAnalyzer: "Weight Analyzer",
    enterWeight: "Enter weight (g)",
    addWeight: "Add",
    calculateAvg: "Calculate average",
    enteredWeights: "Entered weights",
    calculatedAvg: "Calculated average"
  },
  de: {
    title: "Fischzähler",
    net: "Netz",
    total: "Gesamt",
    reset: "Zurücksetzen",
    avgWeight: "Durchschnittliches Fischgewicht",
    grams: "g",
    kg: "kg",
    fish: "Fische",
    estimatedWeight: "Geschätztes Gewicht",
    nets: "Netze",
    weightAnalyzer: "Gewichtsanalysator",
    enterWeight: "Gewicht eingeben (g)",
    addWeight: "Hinzufügen",
    calculateAvg: "Durchschnitt berechnen",
    enteredWeights: "Eingegebene Gewichte",
    calculatedAvg: "Berechneter Durchschnitt"
  },
  fr: {
    title: "Compteur de poissons",
    net: "Filet",
    total: "Total",
    reset: "Réinitialiser",
    avgWeight: "Poids moyen du poisson",
    grams: "g",
    kg: "kg",
    fish: "poissons",
    estimatedWeight: "Poids estimé",
    nets: "Filets",
    weightAnalyzer: "Analyseur de poids",
    enterWeight: "Entrez le poids (g)",
    addWeight: "Ajouter",
    calculateAvg: "Calculer la moyenne",
    enteredWeights: "Poids entrés",
    calculatedAvg: "Moyenne calculée"
  },
  cs: {
    title: "Počítadlo ryb",
    net: "Síť",
    total: "Celkem",
    reset: "Resetovat",
    avgWeight: "Průměrná váha ryby",
    grams: "g",
    kg: "kg",
    fish: "ryb",
    estimatedWeight: "Odhadovaná váha",
    nets: "Sítě",
    weightAnalyzer: "Analyzátor váhy",
    enterWeight: "Zadejte váhu (g)",
    addWeight: "Přidat",
    calculateAvg: "Vypočítat průměr",
    enteredWeights: "Zadané váhy",
    calculatedAvg: "Vypočítaný průměr"
  },
  hu: {
    title: "Halszámláló",
    net: "Háló",
    total: "Összesen",
    reset: "Visszaállítás",
    avgWeight: "Átlagos halsúly",
    grams: "g",
    kg: "kg",
    fish: "hal",
    estimatedWeight: "Becsült súly",
    nets: "Hálók",
    weightAnalyzer: "Súlyelemző",
    enterWeight: "Súly megadása (g)",
    addWeight: "Hozzáadás",
    calculateAvg: "Átlag számítása",
    enteredWeights: "Megadott súlyok",
    calculatedAvg: "Számított átlag"
  },
  ro: {
    title: "Contor pești",
    net: "Plasă",
    total: "Total",
    reset: "Resetare",
    avgWeight: "Greutatea medie a peștelui",
    grams: "g",
    kg: "kg",
    fish: "pești",
    estimatedWeight: "Greutate estimată",
    nets: "Plase",
    weightAnalyzer: "Analizor greutate",
    enterWeight: "Introduceți greutatea (g)",
    addWeight: "Adaugă",
    calculateAvg: "Calculează media",
    enteredWeights: "Greutăți introduse",
    calculatedAvg: "Medie calculată"
  }
};

interface FishCounterProps {
  onDataChange?: (totalFish: number, totalWeightGrams: number) => void;
}

export default function FishCounter({ onDataChange }: FishCounterProps) {
  const { language } = useLanguage();
  const t = counterTranslations[language] || counterTranslations.pl;
  
  const [netCount, setNetCount] = useState(3);
  const [counts, setCounts] = useState([0, 0, 0, 0, 0]);
  const [avgWeightKg, setAvgWeightKg] = useState(0);
  const [avgWeightG, setAvgWeightG] = useState(0);
  
  const [fishWeights, setFishWeights] = useState<number[]>([]);
  const [newWeight, setNewWeight] = useState("");
  const [showAnalyzer, setShowAnalyzer] = useState(false);

  const avgWeightGrams = avgWeightKg * 1000 + avgWeightG;
  const activeCounts = counts.slice(0, netCount);
  const total = activeCounts.reduce((sum, count) => sum + count, 0);
  const totalWeightGrams = total * avgWeightGrams;

  useEffect(() => {
    onDataChange?.(total, totalWeightGrams);
  }, [total, totalWeightGrams, onDataChange]);

  const increment = (index: number) => {
    setCounts(prev => {
      const newCounts = [...prev];
      newCounts[index] = Math.min(999, newCounts[index] + 1);
      return newCounts;
    });
  };

  const decrement = (index: number) => {
    setCounts(prev => {
      const newCounts = [...prev];
      newCounts[index] = Math.max(0, newCounts[index] - 1);
      return newCounts;
    });
  };

  const resetAll = () => {
    setCounts([0, 0, 0, 0, 0]);
  };

  const addFishWeight = () => {
    const weight = parseInt(newWeight);
    if (weight > 0 && weight <= 99999) {
      setFishWeights(prev => [...prev, weight]);
      setNewWeight("");
    }
  };

  const removeFishWeight = (index: number) => {
    setFishWeights(prev => prev.filter((_, i) => i !== index));
  };

  const calculateAndApplyAverage = () => {
    if (fishWeights.length > 0) {
      const avg = Math.round(fishWeights.reduce((a, b) => a + b, 0) / fishWeights.length);
      const kg = Math.floor(avg / 1000);
      const g = avg % 1000;
      setAvgWeightKg(kg);
      setAvgWeightG(Math.round(g / 50) * 50);
    }
  };

  const clearWeights = () => {
    setFishWeights([]);
  };

  const calculatedAverage = fishWeights.length > 0 
    ? Math.round(fishWeights.reduce((a, b) => a + b, 0) / fishWeights.length) 
    : 0;

  const incrementKg = () => setAvgWeightKg(prev => Math.min(99, prev + 1));
  const decrementKg = () => setAvgWeightKg(prev => Math.max(0, prev - 1));
  const incrementG = () => {
    setAvgWeightG(prev => {
      if (prev >= 950) {
        if (avgWeightKg < 99) {
          setAvgWeightKg(k => k + 1);
          return 0;
        }
        return 999;
      }
      return prev + 50;
    });
  };
  const decrementG = () => {
    setAvgWeightG(prev => {
      if (prev <= 0) {
        if (avgWeightKg > 0) {
          setAvgWeightKg(k => k - 1);
          return 950;
        }
        return 0;
      }
      return prev - 50;
    });
  };
  
  const formatWeight = (grams: number) => {
    if (grams >= 1000) {
      return `${(grams / 1000).toFixed(2)} ${t.kg}`;
    }
    return `${grams} ${t.grams}`;
  };

  const getGridCols = () => {
    switch (netCount) {
      case 1: return "grid-cols-1 max-w-[120px] mx-auto";
      case 2: return "grid-cols-2 max-w-[250px] mx-auto";
      case 3: return "grid-cols-3";
      case 4: return "grid-cols-4";
      case 5: return "grid-cols-5";
      default: return "grid-cols-3";
    }
  };

  return (
    <Card className="mm-tool-section w-full rounded-none border-0 bg-transparent shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg">
            <Fish className="h-5 w-5" />
            {t.title}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={resetAll}
            className="gap-1"
            data-testid="button-reset-counters"
          >
            <RotateCcw className="h-4 w-4" />
            {t.reset}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center gap-3 pb-3 border-b">
          <span className="text-sm font-medium">{t.nets}:</span>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((num) => (
              <Button
                key={num}
                variant={netCount === num ? "default" : "outline"}
                size="sm"
                onClick={() => setNetCount(num)}
                className="w-9 h-9"
                data-testid={`button-select-nets-${num}`}
              >
                {num}
              </Button>
            ))}
          </div>
        </div>

        <div className="pb-3 border-b">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Scale className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{t.avgWeight}</span>
          </div>
          <div className="flex items-center justify-center gap-4">
            <div className="flex flex-col items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={incrementKg}
                className="h-8 w-16 hover:bg-green-500/20 hover:text-green-500"
                data-testid="button-increment-kg"
              >
                <ChevronUp className="h-5 w-5" />
              </Button>
              <div className="flex items-center justify-center w-16 h-12 border-2 border-border rounded-lg bg-muted/30">
                <span className="text-2xl font-mono font-bold text-lime-400" data-testid="display-avg-kg">
                  {avgWeightKg}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={decrementKg}
                className="h-8 w-16 hover:bg-red-500/20 hover:text-red-500"
                data-testid="button-decrement-kg"
              >
                <ChevronDown className="h-5 w-5" />
              </Button>
              <span className="text-xs text-muted-foreground mt-1">{t.kg}</span>
            </div>
            
            <div className="flex flex-col items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={incrementG}
                className="h-8 w-20 hover:bg-green-500/20 hover:text-green-500"
                data-testid="button-increment-g"
              >
                <ChevronUp className="h-5 w-5" />
              </Button>
              <div className="flex items-center justify-center w-20 h-12 border-2 border-border rounded-lg bg-muted/30">
                <span className="text-2xl font-mono font-bold text-lime-400" data-testid="display-avg-g">
                  {avgWeightG}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={decrementG}
                className="h-8 w-20 hover:bg-red-500/20 hover:text-red-500"
                data-testid="button-decrement-g"
              >
                <ChevronDown className="h-5 w-5" />
              </Button>
              <span className="text-xs text-muted-foreground mt-1">{t.grams}</span>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t border-dashed">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAnalyzer(!showAnalyzer)}
              className="w-full gap-2 text-muted-foreground hover:text-foreground"
              data-testid="button-toggle-analyzer"
            >
              <Calculator className="h-4 w-4" />
              {t.weightAnalyzer}
              <ChevronDown className={`h-4 w-4 transition-transform ${showAnalyzer ? 'rotate-180' : ''}`} />
            </Button>
            
            {showAnalyzer && (
              <div className="mt-3 space-y-3">
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder={t.enterWeight}
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addFishWeight()}
                    className="flex-1"
                    min="1"
                    max="99999"
                    data-testid="input-fish-weight"
                  />
                  <Button
                    size="default"
                    onClick={addFishWeight}
                    disabled={!newWeight || parseInt(newWeight) <= 0}
                    data-testid="button-add-weight"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {fishWeights.length > 0 && (
                  <>
                    <div className="flex flex-wrap gap-1">
                      {fishWeights.map((weight, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md text-sm"
                          data-testid={`badge-weight-${index}`}
                        >
                          <span>{weight}{t.grams}</span>
                          <button
                            onClick={() => removeFishWeight(index)}
                            className="text-muted-foreground hover:text-destructive"
                            data-testid={`button-remove-weight-${index}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {t.calculatedAvg}: <span className="font-bold text-lime-400">{calculatedAverage}{t.grams}</span>
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={clearWeights}
                          data-testid="button-clear-weights"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={calculateAndApplyAverage}
                          className="gap-1"
                          data-testid="button-apply-average"
                        >
                          <Calculator className="h-3 w-3" />
                          {t.calculateAvg}
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className={`grid gap-2 ${getGridCols()}`}>
          {activeCounts.map((count, index) => (
            <div key={index} className="flex flex-col items-center">
              <div className="flex items-center gap-1 text-muted-foreground mb-1">
                <NetIcon className="h-4 w-4" />
                <span className="text-xs font-bold">{index + 1}</span>
              </div>
              <div className="flex flex-col items-center border-2 border-border rounded-lg overflow-hidden bg-background w-full">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => increment(index)}
                  className="w-full h-10 rounded-none hover:bg-green-500/20 hover:text-green-500"
                  data-testid={`button-increment-net-${index + 1}`}
                >
                  <Plus className="h-5 w-5" />
                </Button>
                <div className="w-full h-14 flex flex-col items-center justify-center border-y border-border bg-muted/30">
                  <span className="text-2xl font-mono font-bold text-lime-400" data-testid={`display-count-net-${index + 1}`}>
                    {count}
                  </span>
                  <span className="text-[10px] text-muted-foreground leading-tight">
                    {formatWeight(count * avgWeightGrams)}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => decrement(index)}
                  className="w-full h-10 rounded-none hover:bg-red-500/20 hover:text-red-500"
                  data-testid={`button-decrement-net-${index + 1}`}
                >
                  <Minus className="h-5 w-5" />
                </Button>
              </div>
              <div className="flex flex-wrap justify-center gap-0.5 mt-1 min-h-[16px] max-w-full px-1">
                {count > 0 && count <= 12 && (
                  [...Array(count)].map((_, i) => (
                    <Fish key={i} className="h-3 w-3 text-lime-400" />
                  ))
                )}
                {count > 12 && (
                  <>
                    {[...Array(10)].map((_, i) => (
                      <Fish key={i} className="h-3 w-3 text-lime-400" />
                    ))}
                    <span className="text-[10px] text-muted-foreground ml-0.5">+{count - 10}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-base font-medium text-muted-foreground">{t.total}:</span>
            <span className="text-2xl font-mono font-bold text-lime-400" data-testid="display-total-fish">
              {total} {t.fish}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-base font-medium text-muted-foreground">{t.estimatedWeight}:</span>
            <span className="text-2xl font-mono font-bold text-lime-400" data-testid="display-total-weight">
              {formatWeight(totalWeightGrams)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
