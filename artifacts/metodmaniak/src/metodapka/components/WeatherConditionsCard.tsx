import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Sun, Cloud, CloudRain, CloudSnow, CloudDrizzle, Thermometer, Wind, Gauge, 
  TrendingUp, TrendingDown, Minus, Lightbulb
} from "lucide-react";
import { useLanguage } from "../language";

interface WeatherConditionsCardProps {
  details: string[];
  weatherData?: {
    condition?: string;
    temperatureMin?: number;
    temperatureMax?: number;
    windSpeed?: number;
    windDirection?: string;
    pressure?: number;
    pressureTrend?: 'rising' | 'stable' | 'falling';
  };
}

const PRO_TIP_KEYWORDS = [
  'PRO TIP', 'PEŁNIA SEZONU', 'PEAK SEASON', 'HOCHSAISON', 'PLEINE SAISON',
  'ZIMA:', 'WINTER:', 'LATO:', 'SUMMER:', 'PAMIĘTAJ', 'REMEMBER'
];

const isProTip = (text: string): boolean => {
  const upperText = text.toUpperCase();
  return PRO_TIP_KEYWORDS.some(keyword => upperText.includes(keyword.toUpperCase()));
};

const getWeatherIcon = (condition?: string) => {
  switch (condition) {
    case "sunny": return Sun;
    case "cloudy": return Cloud;
    case "rainy": return CloudRain;
    case "snowy": return CloudSnow;
    case "drizzle": return CloudDrizzle;
    default: return Cloud;
  }
};

const getWeatherLabel = (condition?: string, language?: string) => {
  const labels: Record<string, Record<string, string>> = {
    sunny: { pl: 'Słonecznie', en: 'Sunny', de: 'Sonnig', fr: 'Ensoleillé', cs: 'Slunečno', hu: 'Napos', ro: 'Însorit' },
    cloudy: { pl: 'Pochmurno', en: 'Cloudy', de: 'Bewölkt', fr: 'Nuageux', cs: 'Oblačno', hu: 'Felhős', ro: 'Înnorat' },
    rainy: { pl: 'Deszczowo', en: 'Rainy', de: 'Regnerisch', fr: 'Pluvieux', cs: 'Deštivo', hu: 'Esős', ro: 'Ploios' },
    snowy: { pl: 'Śnieżnie', en: 'Snowy', de: 'Schnee', fr: 'Neigeux', cs: 'Sněžení', hu: 'Havas', ro: 'Ninsoare' },
    drizzle: { pl: 'Mżawka', en: 'Drizzle', de: 'Nieselregen', fr: 'Bruine', cs: 'Mrholení', hu: 'Szitálás', ro: 'Burniță' }
  };
  return labels[condition || 'cloudy']?.[language || 'pl'] || labels.cloudy.pl;
};

const getPressureTrendIcon = (trend?: string) => {
  switch (trend) {
    case 'rising': return TrendingUp;
    case 'falling': return TrendingDown;
    default: return Minus;
  }
};

export default function WeatherConditionsCard({ details, weatherData }: WeatherConditionsCardProps) {
  const { language } = useLanguage();
  const WeatherIcon = getWeatherIcon(weatherData?.condition);
  const PressureIcon = getPressureTrendIcon(weatherData?.pressureTrend);
  
  const regularDetails = details.filter(d => !isProTip(d));
  const proTips = details.filter(d => isProTip(d));

  const labels = {
    pl: { temp: 'Temperatura', wind: 'Wiatr', pressure: 'Ciśnienie', conditions: 'Warunki pogodowe' },
    en: { temp: 'Temperature', wind: 'Wind', pressure: 'Pressure', conditions: 'Weather conditions' },
    de: { temp: 'Temperatur', wind: 'Wind', pressure: 'Druck', conditions: 'Wetterbedingungen' },
    fr: { temp: 'Température', wind: 'Vent', pressure: 'Pression', conditions: 'Conditions météo' },
    cs: { temp: 'Teplota', wind: 'Vítr', pressure: 'Tlak', conditions: 'Počasí' },
    hu: { temp: 'Hőmérséklet', wind: 'Szél', pressure: 'Légnyomás', conditions: 'Időjárás' },
    ro: { temp: 'Temperatură', wind: 'Vânt', pressure: 'Presiune', conditions: 'Condiții meteo' }
  };

  const l = labels[language as keyof typeof labels] || labels.pl;

  return (
    <Card data-testid="card-weather-conditions" className="overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-lime-400/10 to-lime-400/5 rounded-t-xl">
        <CardTitle className="flex items-center gap-2 text-lg">
          <WeatherIcon className="h-5 w-5 text-lime-400" />
          {l.conditions}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {weatherData && (
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-border/50">
            <div className="p-4 flex flex-col items-center gap-2 bg-gradient-to-b from-lime-400/10 to-transparent">
              <WeatherIcon className="h-10 w-10 text-lime-400" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                {getWeatherLabel(weatherData.condition, language)}
              </span>
            </div>
            
            <div className="p-4 flex flex-col items-center gap-2 bg-gradient-to-b from-lime-400/5 to-transparent">
              <Thermometer className="h-8 w-8 text-lime-300" />
              <span className="font-mono font-bold text-lg">
                {weatherData.temperatureMin}° / {weatherData.temperatureMax}°C
              </span>
              <span className="text-xs text-muted-foreground uppercase tracking-wide">{l.temp}</span>
            </div>
            
            <div className="p-4 flex flex-col items-center gap-2 bg-gradient-to-b from-lime-400/5 to-transparent">
              <Wind className="h-8 w-8 text-lime-400" />
              <span className="font-mono font-bold text-lg">
                {weatherData.windSpeed} km/h
              </span>
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                {l.wind} {weatherData.windDirection}
              </span>
            </div>
            
            <div className="p-4 flex flex-col items-center gap-2 bg-gradient-to-b from-lime-400/10 to-transparent">
              <div className="flex items-center gap-1">
                <Gauge className="h-8 w-8 text-lime-300" />
                <PressureIcon className="h-4 w-4 text-lime-400" />
              </div>
              <span className="font-mono font-bold text-lg">
                {weatherData.pressure} hPa
              </span>
              <span className="text-xs text-muted-foreground uppercase tracking-wide">{l.pressure}</span>
            </div>
          </div>
        )}
        
        {regularDetails.length > 0 && (
          <div className="p-4 border-t border-border/50">
            <ul className="space-y-2 text-sm text-muted-foreground">
              {regularDetails.map((detail, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-lime-400 mt-1">•</span>
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {proTips.length > 0 && (
          <div className="p-4 border-t border-border/50 space-y-3">
            {proTips.map((tip, index) => (
              <div key={index} className="flex items-start gap-3" data-testid={`pro-tip-weather-${index}`}>
                <div className="flex-shrink-0 bg-lime-400 text-black p-2 rounded-md flex items-center justify-center shadow-md">
                  <Lightbulb className="h-4 w-4" />
                </div>
                <span className="text-sm text-muted-foreground pt-1.5">{tip}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
