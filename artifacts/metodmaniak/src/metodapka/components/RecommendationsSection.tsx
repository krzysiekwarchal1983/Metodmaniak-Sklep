import RecommendationCard from "./RecommendationCard";
import WeatherConditionsCard from "./WeatherConditionsCard";
import FeedingConditionsCard from "./FeedingConditionsCard";
import RodRecommendationCard from "./RodRecommendationCard";
import GuidanceCatalogLinks from "./GuidanceCatalogLinks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileText, Target, Package, MapPin, Settings, Trophy, 
  Sun, Thermometer, Fish, Ruler, Wrench, Palette, Beaker, Lightbulb, CircleDot, Clock, AlertCircle,
  Sunrise, Eye, Sliders, TrendingUp, Zap, Flag, Crown, Lock, type LucideIcon
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLanguage } from "../language";
import { useTranslations } from "../lib/i18n";
import { 
  generateDynamicWeatherConditions, 
  generateDynamicFeedingConditions,
  generateDynamicFishActivity 
} from "../lib/weatherRecommendations";

const PRO_TIP_KEYWORDS = [
  'PRO TIP', 'PEŁNIA SEZONU', 'PEAK SEASON', 'HOCHSAISON', 'PLEINE SAISON', 
  'VRCHOL SEZÓNY', 'SZEZON CSÚCSA', 'SEZON DE VÂRF', 'WYSOKA TEMPERATURA',
  'HIGH TEMPERATURE', 'HOHE TEMPERATUR', 'HAUTE TEMPÉRATURE', 'VYSOKÁ TEPLOTA',
  'MAGAS HŐMÉRSÉKLET', 'TEMPERATURĂ RIDICATĂ', 'ZIMA:', 'WINTER:', 'LATO:',
  'SUMMER:', 'SOMMER:', 'ÉTÉ:', 'LÉTO:', 'NYÁR:', 'VARĂ:', 'TÉL:',
  'PAMIĘTAJ', 'REMEMBER', 'VERGESSEN SIE NICHT', 'N\'OUBLIEZ PAS', 
  'NEZAPOMEŇTE', 'NE FELEJTSE', 'NU UITAȚI'
];

const isProTip = (text: string): boolean => {
  const upperText = text.toUpperCase();
  return PRO_TIP_KEYWORDS.some(keyword => upperText.includes(keyword.toUpperCase()));
};

const getHourlyIcon = (index: number): LucideIcon => {
  const hourlyIcons: LucideIcon[] = [
    Sunrise,
    Eye,
    Sliders,
    TrendingUp,
    Zap,
    Flag
  ];
  return hourlyIcons[index] || Clock;
};

import type { 
  FishingRecommendations,
  Summary,
  Sprzęt,
  Towar,
  Miejsce,
  Zestaw,
  Strategie
} from "../types";

import hookLongShankImg from "../assets/hook-long.png";
import hookWideGapeImg from "../assets/hook-wide.png";
import feederIconImg from "../assets/feeder.png";
import feedIconImg from "../assets/feed.png";
import pelletIconImg from "../assets/pellet.png";

import hourlyBg0 from "../assets/hourly-0.webp";
import hourlyBg1 from "../assets/hourly-1.webp";
import hourlyBg2 from "../assets/hourly-2.webp";
import hourlyBg3 from "../assets/hourly-3.webp";
import hourlyBg4 from "../assets/hourly-4.webp";
import hourlyBg5 from "../assets/hourly-5.webp";

const hookTypeImages: Record<string, string> = {
  longShank: hookLongShankImg,
  wideGape: hookWideGapeImg
};

const hourlyBackgrounds: string[] = [
  hourlyBg0,
  hourlyBg1,
  hourlyBg2,
  hourlyBg3,
  hourlyBg4,
  hourlyBg5
];

interface DayWeather {
  date: string;
  offset: number;
  temperatureMin: number;
  temperatureMax: number;
  windSpeed: number;
  windDirection: string;
  pressure: number;
  condition: "sunny" | "cloudy" | "rainy" | "snowy" | "drizzle";
}

interface RecommendationsSectionProps {
  recommendations?: FishingRecommendations;
  isLoading?: boolean;
  isPro?: boolean;
  currentWeatherData?: DayWeather[];
  fisheryType?: string;
}

export default function RecommendationsSection({ 
  recommendations, 
  isLoading = false,
  isPro = false,
  currentWeatherData,
  fisheryType,
}: RecommendationsSectionProps) {
  const { language } = useLanguage();
  const t = useTranslations(language);

  // Offsets come from the selected location's timezone, not the browser clock.
  const todayWeather = currentWeatherData?.find((day) => day.offset === 0);
  const yesterdayWeather = currentWeatherData?.find((day) => day.offset === -1);
  const dayBeforeYesterday = currentWeatherData?.find((day) => day.offset === -2);

  // Generate dynamic weather conditions based on CURRENT weather
  const dynamicWeatherConditions = todayWeather && yesterdayWeather
    ? generateDynamicWeatherConditions(
        language as 'pl' | 'en' | 'de' | 'fr' | 'cs' | 'hu' | 'ro',
        todayWeather,
        yesterdayWeather
      )
    : undefined;

  // Generate dynamic feeding conditions based on CURRENT weather
  const dynamicFeedingConditions = todayWeather && yesterdayWeather && dayBeforeYesterday
    ? generateDynamicFeedingConditions(
        language as 'pl' | 'en' | 'de' | 'fr' | 'cs' | 'hu' | 'ro',
        todayWeather,
        yesterdayWeather,
        dayBeforeYesterday
      )
    : undefined;

  // Generate dynamic fish activity based on CURRENT weather
  const dynamicFishActivity = todayWeather && yesterdayWeather && dayBeforeYesterday
    ? generateDynamicFishActivity(
        language as 'pl' | 'en' | 'de' | 'fr' | 'cs' | 'hu' | 'ro',
        todayWeather,
        yesterdayWeather,
        dayBeforeYesterday
      )
    : undefined;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold mb-1">{t.recommendations.summaryTitle}</h2>
          <p className="text-sm text-muted-foreground">
            {t.recommendations.loading}
          </p>
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 bg-card rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!recommendations || Object.keys(recommendations).length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {t.recommendations.noData}
        </AlertDescription>
      </Alert>
    );
  }

  const { summary, sprzęt, towar, miejsce, zestaw, strategie } = recommendations;

  return (
    <div className="space-y-8">
      {/* SUMMARY Section - Weather and Feeding FREE, rest PRO */}
      {summary && (
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold mb-1">{t.recommendations.summaryTitle}</h2>
            <p className="text-sm text-muted-foreground">
              {t.recommendations.summarySubtitle}
            </p>
          </div>
          
          <div className="space-y-4">
            {/* Weather - FREE - Uses DYNAMIC weather data based on CURRENT conditions */}
            {(dynamicWeatherConditions || summary.weatherConditions) && (
              <WeatherConditionsCard
                details={dynamicWeatherConditions || summary.weatherConditions || []}
                weatherData={todayWeather ? {
                  condition: todayWeather.condition,
                  temperatureMin: todayWeather.temperatureMin,
                  temperatureMax: todayWeather.temperatureMax,
                  windSpeed: todayWeather.windSpeed,
                  windDirection: todayWeather.windDirection,
                  pressure: todayWeather.pressure,
                  pressureTrend: yesterdayWeather && dayBeforeYesterday
                    ? ((): 'rising' | 'stable' | 'falling' => {
                        const change = todayWeather.pressure - dayBeforeYesterday.pressure;
                        if (change > 3) return 'rising';
                        if (change < -3) return 'falling';
                        return 'stable';
                      })()
                    : 'stable'
                } : summary.weatherData}
              />
            )}

            {/* Fish Activity - FREE - Uses DYNAMIC data based on CURRENT weather */}
            {(dynamicFeedingConditions || summary.feedingConditions) && (
              <FeedingConditionsCard
                details={dynamicFeedingConditions || summary.feedingConditions || []}
                activityData={dynamicFishActivity}
              />
            )}

          </div>
        </div>
      )}

      {/* SPRZĘT - Equipment Section - PRO ONLY */}
      {isPro && sprzęt && (
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold mb-1">{t.recommendations.sprzętTitle}</h2>
            <p className="text-sm text-muted-foreground">
              {t.recommendations.sprzętSubtitle}
            </p>
          </div>
          
          <div className="space-y-4">
            {sprzęt.rodRecommendation && sprzęt.rodRecommendation.length > 0 && (
              <RodRecommendationCard
                details={sprzęt.rodRecommendation}
              />
            )}

            {sprzęt.feederSelection && sprzęt.feederSelection.length > 0 && (
              <Card data-testid="card-feeder-selection">
                <CardHeader className="pb-6 bg-gradient-to-r from-lime-400/10 to-lime-400/5 rounded-t-xl">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Target className="h-5 w-5 text-lime-400" />
                    {t.recommendations.feederSelection}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  {sprzęt.feederWeights && sprzęt.feederWeights.length > 0 && (
                    <div className="flex flex-wrap gap-4 justify-center py-4">
                      {sprzęt.feederWeights.map((weight, index) => (
                        <div 
                          key={index}
                          className="flex flex-col items-center gap-1"
                          data-testid={`feeder-weight-${weight}`}
                        >
                          <img 
                            src={feederIconImg} 
                            alt={`${weight}g`} 
                            className="w-32 h-32 object-contain drop-shadow-lg"
                          />
                          <span className="text-lg font-black text-foreground">{weight}g</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {sprzęt.feederSelection.filter(d => !isProTip(d)).length > 0 && (
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {sprzęt.feederSelection.filter(d => !isProTip(d)).map((detail, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-lime-400 mt-1">•</span>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {sprzęt.feederSelection.filter(d => isProTip(d)).length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border space-y-3">
                      {sprzęt.feederSelection.filter(d => isProTip(d)).map((tip, index) => (
                        <div key={index} className="flex items-start gap-3 min-w-0" data-testid={`pro-tip-feeder-${index}`}>
                          <div className="flex-shrink-0 bg-lime-400 text-black p-2 rounded-md flex items-center justify-center shadow-md">
                            <Lightbulb className="h-4 w-4" />
                          </div>
                          <span className="text-sm text-muted-foreground pt-1.5 break-words">{tip}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

          </div>
        </div>
      )}

      {/* TOWAR - Groundbait Section - PRO ONLY */}
      {isPro && towar && (
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold mb-1">{t.recommendations.towarTitle}</h2>
            <p className="text-sm text-muted-foreground">
              {t.recommendations.towarSubtitle}
            </p>
          </div>
          
          <div className="space-y-4">
            {towar.groundbaitColor && towar.groundbaitColor.length > 0 && (
              <RecommendationCard
                icon={Palette}
                title={t.recommendations.groundbaitColor}
                details={towar.groundbaitColor}
                data-testid="card-groundbait-color"
                useGradient={true}
              >
                <GuidanceCatalogLinks category="zanety" fisheryType={fisheryType} groundbaitDetails={towar.groundbaitColor} />
              </RecommendationCard>
            )}

            {towar.groundbaitMix && towar.groundbaitMix.length > 0 && (
              <Card data-testid="card-groundbait-mix">
                <CardHeader className="pb-6 bg-gradient-to-r from-lime-400/10 to-lime-400/5 rounded-t-xl">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Package className="h-5 w-5 text-lime-400" />
                    {t.recommendations.groundbaitMix}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {towar.mixRatio && (
                    <div className="flex flex-wrap gap-6 justify-center py-3">
                      <div className="flex flex-col items-center gap-1" data-testid="mix-groundbait">
                        <img 
                          src={feedIconImg} 
                          alt="Zanęta" 
                          className="w-32 h-32 object-contain drop-shadow-lg"
                        />
                        <span className="text-lg font-black text-foreground">{towar.mixRatio.groundbaitPercent}%</span>
                        <span className="text-sm font-medium text-muted-foreground">
                          {language === 'pl' ? 'Zanęta' : language === 'de' ? 'Grundfutter' : language === 'fr' ? 'Amorce' : language === 'cs' ? 'Krmivo' : language === 'hu' ? 'Etetőanyag' : language === 'ro' ? 'Nadă' : 'Groundbait'}
                        </span>
                      </div>
                      <div className="flex flex-col items-center gap-1" data-testid="mix-pellet">
                        <img 
                          src={pelletIconImg} 
                          alt="Pellet" 
                          className="w-32 h-32 object-contain drop-shadow-lg"
                        />
                        <span className="text-lg font-black text-foreground">{towar.mixRatio.pelletPercent}%</span>
                        <span className="text-sm font-medium text-muted-foreground">Pellet</span>
                      </div>
                    </div>
                  )}
                  {towar.groundbaitMix.filter(d => !isProTip(d)).length > 0 && (
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {towar.groundbaitMix.filter(d => !isProTip(d)).map((detail, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-lime-400 mt-1">•</span>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {towar.groundbaitMix.filter(d => isProTip(d)).length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border space-y-3">
                      {towar.groundbaitMix.filter(d => isProTip(d)).map((tip, index) => (
                        <div key={index} className="flex items-start gap-3 min-w-0" data-testid={`pro-tip-mix-${index}`}>
                          <div className="flex-shrink-0 bg-lime-400 text-black p-2 rounded-md flex items-center justify-center shadow-md">
                            <Lightbulb className="h-4 w-4" />
                          </div>
                          <span className="text-sm text-muted-foreground pt-1.5 break-words">{tip}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <GuidanceCatalogLinks category="pellety" pelletPercent={towar.mixRatio?.pelletPercent} />
                </CardContent>
              </Card>
            )}

            {towar.preparation && towar.preparation.length > 0 && (
              <RecommendationCard
                icon={Beaker}
                title={t.recommendations.preparation}
                details={towar.preparation}
                data-testid="card-preparation"
              />
            )}

            {towar.sunnyWeatherTip && todayWeather?.condition === 'sunny' && (
              <RecommendationCard
                icon={Sun}
                title={t.recommendations.sunnyWeatherTip}
                details={[towar.sunnyWeatherTip]}
                data-testid="card-sunny-weather-tip"
                useGradient={true}
              />
            )}
          </div>
        </div>
      )}

      {/* MIEJSCE - Location Section - PRO ONLY */}
      {isPro && miejsce && (
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold mb-1">{t.recommendations.miejsceTitle}</h2>
            <p className="text-sm text-muted-foreground">
              {t.recommendations.miejsceSubtitle}
            </p>
          </div>
          
          <div className="space-y-4">
            {miejsce.bottomType && miejsce.bottomType.length > 0 && (
              <RecommendationCard
                icon={MapPin}
                title={t.recommendations.bottomType}
                details={miejsce.bottomType}
                data-testid="card-bottom-type"
                useGradient={true}
              />
            )}

            {miejsce.fishLocation && miejsce.fishLocation.length > 0 && (
              <RecommendationCard
                icon={Fish}
                title={t.recommendations.fishLocation}
                details={miejsce.fishLocation}
                data-testid="card-fish-location"
                useGradient={true}
              />
            )}

            {miejsce.spotSelection && miejsce.spotSelection.length > 0 && (
              <RecommendationCard
                icon={Target}
                title={t.recommendations.spotSelection}
                details={miejsce.spotSelection}
                data-testid="card-spot-selection"
                useGradient={true}
              />
            )}
          </div>
        </div>
      )}

      {/* ZESTAW - Rig Setup Section - PRO ONLY */}
      {isPro && zestaw && (
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold mb-1">{t.recommendations.zestawTitle}</h2>
            <p className="text-sm text-muted-foreground">
              {t.recommendations.zestawSubtitle}
            </p>
          </div>
          
          <div className="space-y-4">
            {zestaw.hookSize && zestaw.hookSize.length > 0 && (
              <RecommendationCard
                icon={CircleDot}
                title={t.recommendations.hookSize}
                details={zestaw.hookSize}
                data-testid="card-hook-size"
                useGradient={true}
              />
            )}

            {zestaw.hookType && (
              <Card data-testid="card-hook-type">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-6 bg-gradient-to-r from-lime-400/10 to-lime-400/5 rounded-t-xl">
                  <CardTitle className="text-lg font-medium">{t.recommendations.hookType}</CardTitle>
                  <CircleDot className="h-5 w-5 text-lime-400" />
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="w-32 h-32 sm:w-40 sm:h-40 flex-shrink-0 bg-muted rounded-lg p-2 flex items-center justify-center">
                      <img 
                        src={hookTypeImages[zestaw.hookType.image] || hookLongShankImg} 
                        alt={zestaw.hookType.name}
                        className="max-w-full max-h-full object-contain"
                        data-testid="img-hook-type"
                      />
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                      <h3 className="text-lg font-semibold text-foreground mb-2" data-testid="text-hook-type-name">
                        {zestaw.hookType.name}
                      </h3>
                      <p className="text-sm text-muted-foreground" data-testid="text-hook-type-description">
                        {zestaw.hookType.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {zestaw.lineSetup && zestaw.lineSetup.length > 0 && (
              <RecommendationCard
                icon={Settings}
                title={t.recommendations.lineSetup}
                details={zestaw.lineSetup}
                data-testid="card-line-setup"
                useGradient={true}
              />
            )}

            {zestaw.rigSetup && zestaw.rigSetup.length > 0 && (
              <RecommendationCard
                icon={Wrench}
                title={t.recommendations.rigSetup}
                details={zestaw.rigSetup}
                data-testid="card-rig-setup"
                useGradient={true}
              />
            )}

            {zestaw.wafterColors && zestaw.wafterColors.length > 0 && (
              <RecommendationCard
                icon={Palette}
                title={t.recommendations.wafterColors}
                colorOptions={zestaw.wafterColors}
                renderColorProducts={(color) => <GuidanceCatalogLinks category="waftersy" color={color} tips={zestaw.wafterTips} />}
                details={zestaw.wafterTips}
                data-testid="card-wafter-colors"
                useGradient={true}
              />
            )}
          </div>
        </div>
      )}

      {/* STRATEGIE - Competition Strategy Section - PRO ONLY */}
      {isPro && strategie && (
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold mb-1">{t.recommendations.strategieTitle}</h2>
            <p className="text-sm text-muted-foreground">
              {t.recommendations.strategieSubtitle}
            </p>
          </div>
          
          <div className="space-y-4">
            {strategie.hourlyPlan && strategie.hourlyPlan.length > 0 && (
              <div className="space-y-3" data-testid="competition-hourly-plan">
                {strategie.hourlyPlan.map((hourPlan, index) => {
                  const HourIcon = getHourlyIcon(index);
                  return (
                    <RecommendationCard
                      key={index}
                      icon={HourIcon}
                      title={`${t.recommendations.hourlyPlan}: ${hourPlan.hour}`}
                      recommendation={hourPlan.strategy}
                      details={hourPlan.tips}
                      backgroundImage={hourlyBackgrounds[index]}
                      data-testid={`card-hour-${index}`}
                      useGradient={true}
                    />
                  );
                })}
              </div>
            )}

            {strategie.keyTakeaways && strategie.keyTakeaways.length > 0 && (
              <RecommendationCard
                icon={Trophy}
                title={t.recommendations.keyTakeaways}
                details={strategie.keyTakeaways}
                data-testid="card-key-takeaways"
                useGradient={true}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
