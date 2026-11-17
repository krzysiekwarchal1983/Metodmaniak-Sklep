import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ruler, Target, ArrowRight, Lightbulb } from "lucide-react";
import { useLanguage } from "../language";
import rodIcon from "../assets/rod.png";

interface RodRecommendationCardProps {
  details: string[];
}

const PRO_TIP_KEYWORDS = [
  'PRO TIP', 'PEŁNIA SEZONU', 'PEAK SEASON', 'HOCHSAISON', 'PLEINE SAISON',
  'ZIMA:', 'WINTER:', 'LATO:', 'SUMMER:', 'PAMIĘTAJ', 'REMEMBER',
  'WYSOKA TEMPERATURA', 'HIGH TEMPERATURE', 'TÉL:', 'NYÁR:'
];

const isProTip = (text: string): boolean => {
  const upperText = text.toUpperCase();
  return PRO_TIP_KEYWORDS.some(keyword => upperText.includes(keyword.toUpperCase()));
};

export default function RodRecommendationCard({ details }: RodRecommendationCardProps) {
  const { language } = useLanguage();
  
  const regularDetails = details.filter(d => !isProTip(d));
  const proTips = details.filter(d => isProTip(d));

  const labels = {
    pl: { title: 'Wędka i dystans', rod: 'Wędka', distance: 'Dystans', power: 'Moc' },
    en: { title: 'Rod and distance', rod: 'Rod', distance: 'Distance', power: 'Power' },
    de: { title: 'Rute und Distanz', rod: 'Rute', distance: 'Distanz', power: 'Kraft' },
    fr: { title: 'Canne et distance', rod: 'Canne', distance: 'Distance', power: 'Puissance' },
    cs: { title: 'Prut a vzdálenost', rod: 'Prut', distance: 'Vzdálenost', power: 'Síla' },
    hu: { title: 'Bot és távolság', rod: 'Bot', distance: 'Távolság', power: 'Erő' },
    ro: { title: 'Lansetă și distanță', rod: 'Lansetă', distance: 'Distanță', power: 'Putere' }
  };

  const l = labels[language as keyof typeof labels] || labels.pl;

  return (
    <Card data-testid="card-rod-recommendation" className="overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-lime-400/10 to-lime-400/5 rounded-t-xl">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Ruler className="h-5 w-5 text-lime-400" />
          {l.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-3 divide-x divide-border/50">
          <div className="p-4 flex flex-col items-center gap-2 bg-gradient-to-b from-lime-400/10 to-transparent">
            <img src={rodIcon} alt="Rod" className="h-12 w-12 object-contain" />
            <span className="text-xs text-muted-foreground uppercase tracking-wide">{l.rod}</span>
          </div>
          
          <div className="p-4 flex flex-col items-center gap-2 bg-gradient-to-b from-lime-400/5 to-transparent">
            <div className="flex items-center gap-1">
              <Target className="h-6 w-6 text-lime-400" />
              <ArrowRight className="h-4 w-4 text-lime-300" />
              <div className="w-8 h-8 rounded-full border-2 border-dashed border-lime-400 flex items-center justify-center">
                <span className="text-xs text-lime-400">m</span>
              </div>
            </div>
            <span className="text-xs text-muted-foreground uppercase tracking-wide">{l.distance}</span>
          </div>
          
          <div className="p-4 flex flex-col items-center gap-2 bg-gradient-to-b from-lime-400/10 to-transparent">
            <div className="flex gap-0.5">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-2 h-8 bg-lime-400 rounded-sm" style={{ height: `${16 + i * 8}px` }} />
              ))}
            </div>
            <span className="text-xs text-muted-foreground uppercase tracking-wide">{l.power}</span>
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
              <div key={index} className="flex items-start gap-3" data-testid={`pro-tip-rod-${index}`}>
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
