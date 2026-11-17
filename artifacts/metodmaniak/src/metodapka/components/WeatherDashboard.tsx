import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Thermometer, Wind, Gauge, Cloud, CloudRain, Sun, CloudSnow, CloudDrizzle, ArrowRight, ArrowUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { useLanguage } from "../language";
import { useTranslations } from "../lib/i18n";
import { useCallback } from "react";

interface DayWeather {
  date: string;
  offset: number;
  temperatureMin: number | null;
  temperatureMax: number | null;
  windSpeed: number | null;
  windDirection: string | null;
  pressure: number | null;
  condition: "sunny" | "cloudy" | "rainy" | "snowy" | "drizzle" | null;
}

interface WeatherDashboardProps {
  weatherData?: DayWeather[];
  currentTemperature?: number | null;
  isLoading?: boolean;
}

const v = (n: number | string | null) => (n === null ? "—" : n);

const getWeatherIcon = (condition: string | null) => {
  switch (condition) {
    case "sunny":
      return Sun;
    case "rainy":
      return CloudRain;
    case "snowy":
      return CloudSnow;
    case "drizzle":
      return CloudDrizzle;
    default:
      return Cloud;
  }
};

const getWindRotation = (direction: string | null): number => {
  if (!direction) return 0;
  const rotations: { [key: string]: number } = {
    "N": 0,
    "NNE": 22.5,
    "NE": 45,
    "ENE": 67.5,
    "E": 90,
    "ESE": 112.5,
    "SE": 135,
    "SSE": 157.5,
    "S": 180,
    "SSW": 202.5,
    "SW": 225,
    "WSW": 247.5,
    "W": 270,
    "WNW": 292.5,
    "NW": 315,
    "NNW": 337.5,
  };
  return rotations[direction] || 0;
};

export default function WeatherDashboard({ weatherData, currentTemperature, isLoading = false }: WeatherDashboardProps) {
  const { language } = useLanguage();
  const t = useTranslations(language);
  
  // Find today's index in the weather data
  const findTodayIndex = useCallback(() => {
    if (!weatherData) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const index = weatherData.findIndex((day) => {
      const [yy, mm, dd] = day.date.split("-").map(Number);
      const dayDate = new Date(yy, mm - 1, dd);
      dayDate.setHours(0, 0, 0, 0);
      return dayDate.getTime() === today.getTime();
    });
    
    return index >= 0 ? index : 0;
  }, [weatherData]);
  
  
  // Convert ISO dates to relative day labels
  const formatDate = (dateStr: string, diffDays: number): string => {
    
    if (diffDays === 0) return t.weather.dayLabels["today"];
    if (diffDays === 1) return t.weather.dayLabels["tomorrow"];
    if (diffDays === 2) return t.weather.dayLabels["2-days-ahead"];
    if (diffDays === 3) return t.weather.dayLabels["3-days-ahead"];
    if (diffDays === 4) return t.weather.dayLabels["4-days-ahead"];
    if (diffDays === -1) return t.weather.dayLabels["yesterday"];
    if (diffDays === -2) return t.weather.dayLabels["2-days-ago"];
    
    return dateStr;
  };

  // Format weather data with translated dates
  const displayData: DayWeather[] = weatherData?.map((day: DayWeather) => ({
    ...day,
    date: formatDate(day.date, day.offset)
  })) || [];
  
  const renderWeatherDay = (day: DayWeather, index: number, compact: boolean = false) => {
    const WeatherIcon = getWeatherIcon(day.condition);
    const isToday = day.date === t.weather.dayLabels["today"];
    
    if (compact) {
      return (
        <div 
          key={index} 
          className={`flex flex-col items-center gap-0.5 ${isToday ? 'bg-primary/10 rounded-lg p-1.5' : ''} flex-1`}
          data-testid={`day-${index}`}
        >
          <span className={`font-medium text-xs ${isToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
            {day.date}
          </span>
          
          <WeatherIcon className={`${isToday ? 'h-8 w-8 text-primary' : 'h-6 w-6 text-foreground'}`} />
          
          {isToday && currentTemperature !== null && currentTemperature !== undefined && (
            <span className="font-mono font-bold text-base text-lime-400">{currentTemperature}°C</span>
          )}
          <span className="font-mono text-xs">{v(day.temperatureMin)}°/{v(day.temperatureMax)}°</span>
          <div className="flex items-center gap-0.5">
            <Wind className="h-2.5 w-2.5 text-muted-foreground" />
            <span className="font-mono text-[10px]">{v(day.windSpeed)}</span>
            <ArrowUp 
              className="h-2.5 w-2.5 text-primary" 
              style={{ transform: `rotate(${getWindRotation(day.windDirection)}deg)` }}
            />
          </div>
        </div>
      );
    }
    
    return (
      <div 
        key={index} 
        className={`flex flex-col items-center gap-1 md:gap-3 ${isToday ? 'bg-primary/10 rounded-xl p-2 md:p-3 md:-m-3' : ''} w-full flex-shrink-0`}
        data-testid={`day-${index}`}
      >
        <span className={`font-medium ${isToday ? 'text-base md:text-lg text-primary font-bold' : 'text-sm md:text-sm text-muted-foreground'}`}>
          {day.date}
        </span>
        
        <WeatherIcon className={`${isToday ? 'h-12 w-12 md:h-16 md:w-16 text-primary' : 'h-10 w-10 md:h-8 md:w-8 text-foreground'}`} />
        
        <div className="flex flex-col items-center gap-1 md:gap-2 w-full">
          {isToday && currentTemperature !== null && currentTemperature !== undefined && (
            <div className="flex items-center gap-1 text-lime-400">
              <Thermometer className="h-4 w-4 md:h-5 md:w-5" />
              <span className="font-mono font-bold text-xl md:text-2xl">{currentTemperature}°C</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Thermometer className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            <span className="font-mono font-semibold text-xs md:text-sm">{v(day.temperatureMin)}°C / {v(day.temperatureMax)}°C</span>
          </div>
          
          <div className="flex items-center gap-1">
            <Wind className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            <span className="font-mono text-xs md:text-sm">{v(day.windSpeed)}</span>
            <ArrowUp 
              className="h-3 w-3 md:h-4 md:w-4 text-primary" 
              style={{ transform: `rotate(${getWindRotation(day.windDirection)}deg)` }}
            />
            <span className="font-mono text-xs md:text-sm">{v(day.windDirection)}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <Gauge className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            <span className="font-mono text-xs md:text-sm">{v(day.pressure)}</span>
          </div>
        </div>
      </div>
    );
  };

  const getTodayAndNeighbors = () => {
    const todayIndex = findTodayIndex();
    const start = Math.max(0, todayIndex - 1);
    const end = Math.min(displayData.length, start + 3);
    return displayData.slice(start, end);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle>{t.weather.title}</CardTitle>
          <Link href="/aplikacja/pogoda" className="inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid="button-weather-trends">
            {t.weather.details}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </CardHeader>
        <CardContent className="p-3 md:p-6 pt-2">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <>
              {/* Mobile: 3 days side by side (yesterday, today, tomorrow) */}
              <div className="md:hidden">
                <div className="flex gap-2">
                  {getTodayAndNeighbors().map((day, index) => renderWeatherDay(day, index, true))}
                </div>
              </div>
              
              {/* Desktop: all 5 days in grid */}
              <div className="hidden md:block">
                <div className="grid grid-cols-5 gap-6">
                  {displayData.map((day, index) => (
                    <div key={index}>
                      {renderWeatherDay(day, index)}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
