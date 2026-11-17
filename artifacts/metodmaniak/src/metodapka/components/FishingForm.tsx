import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Fish, Target, Settings, Loader2, ChevronUp, ChevronDown, Building2, TreePine, Check, Waves } from "lucide-react";
import { useLanguage } from "../language";
import { useTranslations } from "../lib/i18n";
import { useToast } from "@/hooks/use-toast";

interface FishingFormProps {
  integrated?: boolean;
  fisheryType: string;
  onFisheryTypeChange: (type: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
  castingDistance?: number;
  onCastingDistanceChange?: (distance: number | undefined) => void;
  location?: string;
  disabled?: boolean;
}

export default function FishingForm({
  integrated = false,
  fisheryType,
  onFisheryTypeChange,
  onSubmit,
  isLoading = false,
  castingDistance,
  onCastingDistanceChange,
  location,
  disabled = false,
}: FishingFormProps) {
  const { language } = useLanguage();
  const t = useTranslations(language);
  const { toast } = useToast();

  return (
    <Card className={integrated ? "rounded-none border-0 bg-transparent shadow-none" : undefined}>
      {!integrated && <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
        <CardTitle className="text-2xl font-semibold">{t.fishingForm.title}</CardTitle>
        <Fish className="h-6 w-6 text-primary" />
      </CardHeader>}
      <CardContent className={`space-y-6 ${integrated ? "px-0 pb-0" : ""}`}>
        <div className="flex flex-col gap-6">
          <div className="grid gap-6 sm:grid-cols-[1.3fr_1fr]">
            <div className="flex flex-col">
              <div className="flex items-center justify-center gap-1 mb-2">
                <Waves className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">{t.fishingForm.fisheryType}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 flex-1">
                <button
                  type="button"
                  onClick={() => onFisheryTypeChange("commercial-lake")}
                  className={`relative flex flex-col items-center justify-center gap-1 rounded-lg border-2 transition-all cursor-pointer p-2 ${
                    fisheryType === "commercial-lake"
                      ? "border-lime-400 bg-lime-400/10"
                      : "border-border bg-muted/30 hover:border-muted-foreground/50"
                  }`}
                  data-testid="button-fishery-commercial"
                >
                  {fisheryType === "commercial-lake" && (
                    <div className="absolute top-1 right-1">
                      <Check className="h-3 w-3 text-lime-400" />
                    </div>
                  )}
                  <Building2 className={`h-8 w-8 ${fisheryType === "commercial-lake" ? "text-lime-400" : "text-muted-foreground"}`} />
                  <span className={`text-sm font-bold text-center leading-tight ${fisheryType === "commercial-lake" ? "text-lime-400" : "text-foreground"}`}>
                    {t.fishingForm.fisheryTypes["commercial-lake"]}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onFisheryTypeChange("wild-lake")}
                  className={`relative flex flex-col items-center justify-center gap-1 rounded-lg border-2 transition-all cursor-pointer p-2 ${
                    fisheryType === "wild-lake"
                      ? "border-lime-400 bg-lime-400/10"
                      : "border-border bg-muted/30 hover:border-muted-foreground/50"
                  }`}
                  data-testid="button-fishery-wild"
                >
                  {fisheryType === "wild-lake" && (
                    <div className="absolute top-1 right-1">
                      <Check className="h-3 w-3 text-lime-400" />
                    </div>
                  )}
                  <TreePine className={`h-8 w-8 ${fisheryType === "wild-lake" ? "text-lime-400" : "text-muted-foreground"}`} />
                  <span className={`text-sm font-bold text-center leading-tight ${fisheryType === "wild-lake" ? "text-lime-400" : "text-foreground"}`}>
                    {t.fishingForm.fisheryTypes["wild-lake"]}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center justify-center gap-1 mb-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">{t.fishingForm.castingDistance || "Dystans"}</span>
              </div>
              <div className="flex flex-col items-center border-2 border-border rounded-lg overflow-hidden bg-background flex-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCastingDistanceChange?.(Math.min(150, (castingDistance || 0) + 5))}
                  className="w-full h-10 rounded-none hover:bg-green-500/20 hover:text-green-500"
                  data-testid="button-distance-up"
                >
                  <ChevronUp className="h-5 w-5" />
                </Button>
                <div className="w-full flex-1 flex items-center justify-center border-y border-border bg-muted/30 gap-1">
                  <span className="text-2xl font-mono font-bold text-lime-400" data-testid="display-distance">
                    {castingDistance || 0}
                  </span>
                  <span className="text-lg font-mono text-muted-foreground">{t.fishingForm.distanceUnit || "m"}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCastingDistanceChange?.(Math.max(0, (castingDistance || 0) - 5))}
                  className="w-full h-10 rounded-none hover:bg-red-500/20 hover:text-red-500"
                  data-testid="button-distance-down"
                >
                  <ChevronDown className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <Button 
              onClick={onSubmit} 
              className="min-h-12 w-full rounded-full bg-lime-400 px-8 text-base font-bold text-black hover:bg-lime-500 sm:w-auto"
              disabled={disabled || isLoading || !fisheryType}
              data-testid="button-get-recommendations"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Settings className="h-5 w-5 mr-2" />}
              {t.fishingForm.getRecommendations}
            </Button>
          </div>
          {!fisheryType && <p className="text-center text-sm text-muted-foreground">Wybierz typ łowiska, aby przygotować zalecenia.</p>}
        </div>
      </CardContent>
    </Card>
  );
}
