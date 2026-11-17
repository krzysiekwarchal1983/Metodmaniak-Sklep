import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ReactNode } from "react";

interface ColorOption {
  name: string;
  hex: string;
}

interface RecommendationCardProps {
  icon: LucideIcon;
  title: string;
  recommendation?: string;
  details?: string[];
  colorSwatch?: string;
  colorOptions?: ColorOption[];
  backgroundImage?: string;
  useGradient?: boolean;
  renderColorProducts?: (color: ColorOption) => ReactNode;
  children?: ReactNode;
}

const PRO_TIP_KEYWORDS = [
  'PRO TIP',
  'PEŁNIA SEZONU',
  'PEAK SEASON',
  'HOCHSAISON',
  'PLEINE SAISON',
  'VRCHOL SEZÓNY',
  'SZEZON CSÚCSA',
  'SEZON DE VÂRF',
  'WYSOKA TEMPERATURA',
  'HIGH TEMPERATURE',
  'HOHE TEMPERATUR',
  'HAUTE TEMPÉRATURE',
  'VYSOKÁ TEPLOTA',
  'MAGAS HŐMÉRSÉKLET',
  'TEMPERATURĂ RIDICATĂ',
  'ZIMA:',
  'WINTER:',
  'LATO:',
  'SUMMER:',
  'SOMMER:',
  'ÉTÉ:',
  'LÉTO:',
  'NYÁR:',
  'VARĂ:',
  'TÉL:',
  'PAMIĘTAJ',
  'REMEMBER',
  'VERGESSEN SIE NICHT',
  'N\'OUBLIEZ PAS',
  'NEZAPOMEŇTE',
  'NE FELEJTSE',
  'NU UITAȚI'
];

const isProTip = (text: string): boolean => {
  const upperText = text.toUpperCase();
  return PRO_TIP_KEYWORDS.some(keyword => upperText.includes(keyword.toUpperCase()));
};

export default function RecommendationCard({
  icon: Icon,
  title,
  recommendation,
  details,
  colorSwatch,
  colorOptions,
  backgroundImage,
  useGradient = false,
  renderColorProducts,
  children,
}: RecommendationCardProps) {
  const regularDetails = details?.filter(detail => !isProTip(detail)) || [];
  const proTips = details?.filter(detail => isProTip(detail)) || [];

  return (
    <Card 
      data-testid={`card-recommendation-${title.toLowerCase().replace(/\s+/g, '-')}`}
      className="relative overflow-hidden"
    >
      {backgroundImage && (
        <div 
          className="absolute right-0 bottom-0 w-[120px] h-[120px] pointer-events-none opacity-40"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'contain',
            backgroundPosition: 'right bottom',
            backgroundRepeat: 'no-repeat',
            mixBlendMode: 'multiply'
          }}
        />
      )}
      <CardHeader className={`flex flex-row items-center justify-between gap-2 space-y-0 pb-4 ${useGradient ? 'bg-gradient-to-r from-lime-400/10 to-lime-400/5 rounded-t-xl' : ''}`}>
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
        <Icon className={`h-5 w-5 ${useGradient ? 'text-lime-400' : 'text-primary'}`} />
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        {colorOptions && colorOptions.length > 0 ? (
          <div className="space-y-3">
            {colorOptions.map((option, index) => (
              <div key={index} className="flex items-start gap-3">
                <div 
                  className="h-12 w-12 rounded-md border border-card-border flex-shrink-0"
                  style={{ backgroundColor: option.hex }}
                  data-testid={`swatch-${option.name.toLowerCase().replace(/\s+/g, '-')}`}
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <Badge variant="secondary" className="text-base" data-testid={`text-wafter-color-${index}`}>
                    {option.name}
                  </Badge>
                  {renderColorProducts?.(option)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {colorSwatch && (
              <div 
                className="h-12 w-12 rounded-md border border-card-border flex-shrink-0"
                style={{ backgroundColor: colorSwatch }}
                data-testid={`swatch-${title.toLowerCase().replace(/\s+/g, '-')}`}
              />
            )}
            {recommendation && (
              <div className="flex-1">
                <Badge variant="secondary" className="text-base" data-testid={`text-${title.toLowerCase().replace(/\s+/g, '-')}-recommendation`}>
                  {recommendation}
                </Badge>
              </div>
            )}
          </div>
        )}
        
        {children}
        {regularDetails.length > 0 && (
          <ul className="space-y-2 text-sm text-muted-foreground">
            {regularDetails.map((detail, index) => (
              <li key={index} className="flex items-start gap-2 min-w-0">
                <span className={`mt-1 flex-shrink-0 ${useGradient ? 'text-lime-400' : 'text-primary'}`}>•</span>
                <span className="break-words overflow-wrap-break-word">{detail}</span>
              </li>
            ))}
          </ul>
        )}

        {proTips.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border space-y-3">
            {proTips.map((tip, index) => (
              <div key={index} className="flex items-start gap-3 min-w-0" data-testid={`pro-tip-${index}`}>
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
  );
}
