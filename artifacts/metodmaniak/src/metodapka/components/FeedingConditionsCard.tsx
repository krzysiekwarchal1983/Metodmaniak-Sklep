import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Fish, Activity, Clock, Zap, Lightbulb } from "lucide-react";
import { useLanguage } from "../language";

interface FeedingConditionsCardProps {
  details: string[];
  activityData?: {
    activity: string;
    rhythm: string;
    portions: string;
  };
}

const PRO_TIP_KEYWORDS = [
  'PRO TIP', 'PEŁNIA SEZONU', 'PEAK SEASON', 'HOCHSAISON', 'PLEINE SAISON',
  'ZIMA:', 'WINTER:', 'LATO:', 'SUMMER:', 'PAMIĘTAJ', 'REMEMBER',
  'WYSOKA TEMPERATURA', 'HIGH TEMPERATURE'
];

const isProTip = (text: string): boolean => {
  const upperText = text.toUpperCase();
  return PRO_TIP_KEYWORDS.some(keyword => upperText.includes(keyword.toUpperCase()));
};

export default function FeedingConditionsCard({ details, activityData }: FeedingConditionsCardProps) {
  const { language } = useLanguage();
  
  const regularDetails = details.filter(d => !isProTip(d));
  const proTips = details.filter(d => isProTip(d));

  const labels = {
    pl: { title: 'Aktywność ryb', activity: 'Aktywność', rhythm: 'Rytm', portions: 'Porcje' },
    en: { title: 'Fish activity', activity: 'Activity', rhythm: 'Rhythm', portions: 'Portions' },
    de: { title: 'Fischaktivität', activity: 'Aktivität', rhythm: 'Rhythmus', portions: 'Portionen' },
    fr: { title: 'Activité des poissons', activity: 'Activité', rhythm: 'Rythme', portions: 'Portions' },
    cs: { title: 'Aktivita ryb', activity: 'Aktivita', rhythm: 'Rytmus', portions: 'Porce' },
    hu: { title: 'Halaktivitás', activity: 'Aktivitás', rhythm: 'Ritmus', portions: 'Adagok' },
    ro: { title: 'Activitatea peștilor', activity: 'Activitate', rhythm: 'Ritm', portions: 'Porții' }
  };

  const l = labels[language as keyof typeof labels] || labels.pl;

  return (
    <Card data-testid="card-feeding-conditions" className="overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-lime-400/10 to-lime-400/5 rounded-t-xl">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Fish className="h-5 w-5 text-lime-400" />
          {l.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-3 divide-x divide-border/50">
          <div className="p-4 flex flex-col items-center gap-2 bg-gradient-to-b from-lime-400/10 to-transparent">
            <Activity className="h-8 w-8 text-lime-400" />
            {activityData && (
              <span className="font-mono font-bold text-lg">{activityData.activity}</span>
            )}
            <span className="text-xs text-muted-foreground uppercase tracking-wide text-center">{l.activity}</span>
          </div>
          
          <div className="p-4 flex flex-col items-center gap-2 bg-gradient-to-b from-lime-400/5 to-transparent">
            <Clock className="h-8 w-8 text-lime-300" />
            {activityData && (
              <span className="font-mono font-bold text-lg">{activityData.rhythm}</span>
            )}
            <span className="text-xs text-muted-foreground uppercase tracking-wide text-center">{l.rhythm}</span>
          </div>
          
          <div className="p-4 flex flex-col items-center gap-2 bg-gradient-to-b from-lime-400/10 to-transparent">
            <Zap className="h-8 w-8 text-lime-400" />
            {activityData && (
              <span className="font-mono font-bold text-lg">{activityData.portions}</span>
            )}
            <span className="text-xs text-muted-foreground uppercase tracking-wide text-center">{l.portions}</span>
          </div>
        </div>
        
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
              <div key={index} className="flex items-start gap-3" data-testid={`pro-tip-feeding-${index}`}>
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
