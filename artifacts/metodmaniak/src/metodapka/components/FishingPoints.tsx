import { useState, useRef } from "react";
import { Target, RotateCcw, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLanguage } from "../language";

const pointsTranslations = {
  pl: {
    title: "Punkty łowienia",
    points: "Punkty",
    meters: "m",
    reset: "Resetuj",
    point: "Punkt"
  },
  en: {
    title: "Fishing points",
    points: "Points",
    meters: "m",
    reset: "Reset",
    point: "Point"
  },
  de: {
    title: "Angelstellen",
    points: "Punkte",
    meters: "m",
    reset: "Zurücksetzen",
    point: "Punkt"
  },
  fr: {
    title: "Points de pêche",
    points: "Points",
    meters: "m",
    reset: "Réinitialiser",
    point: "Point"
  },
  cs: {
    title: "Rybářská místa",
    points: "Body",
    meters: "m",
    reset: "Resetovat",
    point: "Bod"
  },
  hu: {
    title: "Horgászpontok",
    points: "Pontok",
    meters: "m",
    reset: "Visszaállítás",
    point: "Pont"
  },
  ro: {
    title: "Puncte de pescuit",
    points: "Puncte",
    meters: "m",
    reset: "Resetare",
    point: "Punct"
  }
};

export default function FishingPoints() {
  const { language } = useLanguage();
  const t = pointsTranslations[language] || pointsTranslations.pl;
  
  const [pointCount, setPointCount] = useState(3);
  const [distances, setDistances] = useState([0, 0, 0, 0, 0, 0]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const activeDistances = distances.slice(0, pointCount);

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditValue(distances[index].toString());
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const finishEditing = () => {
    if (editingIndex !== null) {
      const value = parseInt(editValue) || 1;
      const clampedValue = Math.max(1, Math.min(150, value));
      setDistances(prev => {
        const newDistances = [...prev];
        newDistances[editingIndex] = clampedValue;
        return newDistances;
      });
      setEditingIndex(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      finishEditing();
    } else if (e.key === "Escape") {
      setEditingIndex(null);
    }
  };

  const incrementDistance = (index: number) => {
    setDistances(prev => {
      const newDistances = [...prev];
      newDistances[index] = Math.min(150, newDistances[index] + 1);
      return newDistances;
    });
  };

  const decrementDistance = (index: number) => {
    setDistances(prev => {
      const newDistances = [...prev];
      newDistances[index] = Math.max(1, newDistances[index] - 1);
      return newDistances;
    });
  };

  const resetAll = () => {
    setDistances([0, 0, 0, 0, 0, 0]);
  };

  const getGridCols = () => {
    switch (pointCount) {
      case 1: return "grid-cols-1 max-w-[100px] mx-auto";
      case 2: return "grid-cols-2 max-w-[220px] mx-auto";
      case 3: return "grid-cols-3 max-w-[330px] mx-auto";
      case 4: return "grid-cols-4 max-w-[440px] mx-auto";
      case 5: return "grid-cols-5 max-w-[550px] mx-auto";
      case 6: return "grid-cols-6";
      default: return "grid-cols-3";
    }
  };

  return (
    <Card className="mm-tool-section w-full rounded-none border-0 bg-transparent shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5" />
            {t.title}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={resetAll}
            className="gap-1"
            data-testid="button-reset-points"
          >
            <RotateCcw className="h-4 w-4" />
            {t.reset}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center gap-3 pb-3 border-b">
          <span className="text-sm font-medium">{t.points}:</span>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <Button
                key={num}
                variant={pointCount === num ? "default" : "outline"}
                size="sm"
                onClick={() => setPointCount(num)}
                className="w-9 h-9"
                data-testid={`button-select-points-${num}`}
              >
                {num}
              </Button>
            ))}
          </div>
        </div>

        <div className={`grid gap-3 ${getGridCols()}`}>
          {activeDistances.map((distance, index) => (
            <div key={index} className="flex flex-col items-center">
              <div className="flex items-center gap-1 text-muted-foreground mb-1">
                <Target className="h-4 w-4" />
                <span className="text-xs font-bold">{index + 1}</span>
              </div>
              <div className="flex flex-col items-center border-2 border-border rounded-lg overflow-hidden bg-background w-full">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => incrementDistance(index)}
                  className="w-full h-10 rounded-none hover:bg-green-500/20 hover:text-green-500"
                  data-testid={`button-increment-point-${index + 1}`}
                >
                  <ChevronUp className="h-5 w-5" />
                </Button>
                <div 
                  className="w-full h-14 flex flex-col items-center justify-center border-y border-border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => startEditing(index)}
                  data-testid={`display-distance-point-${index + 1}`}
                >
                  {editingIndex === index ? (
                    <Input
                      ref={inputRef}
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={finishEditing}
                      onKeyDown={handleKeyDown}
                      className="w-16 h-10 text-center text-2xl font-mono font-bold p-0 border-0 bg-transparent focus-visible:ring-1"
                      min={1}
                      max={150}
                      data-testid={`input-distance-point-${index + 1}`}
                    />
                  ) : (
                    <>
                      <span className="text-2xl font-mono font-bold text-lime-400">
                        {distance}
                      </span>
                      <span className="text-[10px] text-muted-foreground leading-tight">
                        {t.meters}
                      </span>
                    </>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => decrementDistance(index)}
                  className="w-full h-10 rounded-none hover:bg-red-500/20 hover:text-red-500"
                  data-testid={`button-decrement-point-${index + 1}`}
                >
                  <ChevronDown className="h-5 w-5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
