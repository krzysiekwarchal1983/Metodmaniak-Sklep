import { useState, useEffect, useRef, useCallback } from "react";
import { Timer, Play, Pause, RotateCcw, Bell, Volume2, VolumeX, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "../language";

type SoundType = 'bell' | 'beep' | 'speech';

const timerTranslations = {
  pl: {
    title: "Timer na branie",
    minutes: "Minuty",
    seconds: "Sekundy",
    start: "Start",
    pause: "Pauza",
    reset: "Reset",
    autoRepeat: "Automatyczne powtarzanie",
    repeatCount: "Liczba powtórzeń",
    infinite: "∞",
    remaining: "Pozostało powtórzeń",
    soundOn: "Dźwięk włączony",
    soundOff: "Dźwięk wyłączony",
    soundType: "Dźwięk",
    soundBell: "Dzwonek",
    soundBeep: "Bip",
    soundSpeech: "Speech"
  },
  en: {
    title: "Bite Timer",
    minutes: "Minutes",
    seconds: "Seconds",
    start: "Start",
    pause: "Pause",
    reset: "Reset",
    autoRepeat: "Auto repeat",
    repeatCount: "Repeat count",
    infinite: "∞",
    remaining: "Repeats remaining",
    soundOn: "Sound on",
    soundOff: "Sound off",
    soundType: "Sound",
    soundBell: "Bell",
    soundBeep: "Beep",
    soundSpeech: "Speech"
  },
  de: {
    title: "Biss-Timer",
    minutes: "Minuten",
    seconds: "Sekunden",
    start: "Start",
    pause: "Pause",
    reset: "Reset",
    autoRepeat: "Automatische Wiederholung",
    repeatCount: "Wiederholungen",
    infinite: "∞",
    remaining: "Verbleibende Wiederholungen",
    soundOn: "Ton an",
    soundOff: "Ton aus",
    soundType: "Ton",
    soundBell: "Glocke",
    soundBeep: "Piep",
    soundSpeech: "Speech"
  },
  fr: {
    title: "Minuteur de touche",
    minutes: "Minutes",
    seconds: "Secondes",
    start: "Démarrer",
    pause: "Pause",
    reset: "Réinitialiser",
    autoRepeat: "Répétition auto",
    repeatCount: "Nombre de répétitions",
    infinite: "∞",
    remaining: "Répétitions restantes",
    soundOn: "Son activé",
    soundOff: "Son désactivé",
    soundType: "Son",
    soundBell: "Cloche",
    soundBeep: "Bip",
    soundSpeech: "Speech"
  },
  cs: {
    title: "Časovač záběru",
    minutes: "Minuty",
    seconds: "Sekundy",
    start: "Start",
    pause: "Pauza",
    reset: "Reset",
    autoRepeat: "Automatické opakování",
    repeatCount: "Počet opakování",
    infinite: "∞",
    remaining: "Zbývající opakování",
    soundOn: "Zvuk zapnutý",
    soundOff: "Zvuk vypnutý",
    soundType: "Zvuk",
    soundBell: "Zvonek",
    soundBeep: "Pípnutí",
    soundSpeech: "Speech"
  },
  hu: {
    title: "Kapás időzítő",
    minutes: "Percek",
    seconds: "Másodpercek",
    start: "Indítás",
    pause: "Szünet",
    reset: "Visszaállítás",
    autoRepeat: "Automatikus ismétlés",
    repeatCount: "Ismétlések száma",
    infinite: "∞",
    remaining: "Hátralévő ismétlések",
    soundOn: "Hang be",
    soundOff: "Hang ki",
    soundType: "Hang",
    soundBell: "Csengő",
    soundBeep: "Sípolás",
    soundSpeech: "Speech"
  },
  ro: {
    title: "Cronometru mușcătură",
    minutes: "Minute",
    seconds: "Secunde",
    start: "Start",
    pause: "Pauză",
    reset: "Resetare",
    autoRepeat: "Repetare automată",
    repeatCount: "Număr de repetări",
    infinite: "∞",
    remaining: "Repetări rămase",
    soundOn: "Sunet pornit",
    soundOff: "Sunet oprit",
    soundType: "Sunet",
    soundBell: "Clopoțel",
    soundBeep: "Bip",
    soundSpeech: "Speech"
  }
};

export default function FishingTimer() {
  const { language } = useLanguage();
  const t = timerTranslations[language] || timerTranslations.pl;
  
  const [inputMinutes, setInputMinutes] = useState(0);
  const [inputSeconds, setInputSeconds] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [autoRepeat, setAutoRepeat] = useState(false);
  const [repeatCount, setRepeatCount] = useState(3);
  const [repeatsRemaining, setRepeatsRemaining] = useState(3);
  const [infiniteRepeat, setInfiniteRepeat] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundType, setSoundType] = useState<SoundType>('bell');
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playBellSound = useCallback(() => {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const frequencies = [523.25, 659.25, 783.99, 1046.50];
    
    frequencies.forEach((freq, index) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.value = freq;
      oscillator.type = 'sine';
      const startTime = now + index * 0.15;
      const duration = 0.4;
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    });
    
    setTimeout(() => {
      frequencies.forEach((freq, index) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.frequency.value = freq;
        oscillator.type = 'sine';
        const startTime = ctx.currentTime + index * 0.15;
        const duration = 0.5;
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.25, startTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      });
    }, 700);
  }, [getAudioContext]);

  const playBeepSound = useCallback(() => {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Subtelny, delikatny dźwięk "ping"
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.frequency.value = 440;
    oscillator.type = 'sine';
    const duration = 0.6;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.15, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);
    oscillator.start(now);
    oscillator.stop(now + duration);
    
    // Drugi delikatny ton po chwili
    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = 523.25;
      osc2.type = 'sine';
      const now2 = ctx.currentTime;
      gain2.gain.setValueAtTime(0, now2);
      gain2.gain.linearRampToValueAtTime(0.12, now2 + 0.05);
      gain2.gain.exponentialRampToValueAtTime(0.01, now2 + 0.5);
      osc2.start(now2);
      osc2.stop(now2 + 0.5);
    }, 300);
  }, [getAudioContext]);

  const playSpeechSound = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance("Recast, recast, recast");
      utterance.rate = 1.0;
      utterance.pitch = 1.2;
      utterance.volume = 1.0;
      utterance.lang = 'en-US';
      
      const voices = window.speechSynthesis.getVoices();
      const femaleVoice = voices.find(voice => 
        voice.name.toLowerCase().includes('female') ||
        voice.name.toLowerCase().includes('woman') ||
        voice.name.includes('Samantha') ||
        voice.name.includes('Victoria') ||
        voice.name.includes('Karen') ||
        voice.name.includes('Moira') ||
        voice.name.includes('Tessa') ||
        voice.name.includes('Fiona') ||
        voice.name.includes('Zira') ||
        voice.name.includes('Susan') ||
        voice.name.includes('Hazel') ||
        (voice.lang.startsWith('en') && voice.name.toLowerCase().includes('google') && !voice.name.toLowerCase().includes('male'))
      );
      
      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }
      
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const playSound = useCallback(() => {
    if (!soundEnabled) return;
    
    try {
      switch (soundType) {
        case 'bell':
          playBellSound();
          break;
        case 'beep':
          playBeepSound();
          break;
        case 'speech':
          playSpeechSound();
          break;
      }
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }, [soundEnabled, soundType, playBellSound, playBeepSound, playSpeechSound]);

  const getTotalSeconds = useCallback(() => {
    return inputMinutes * 60 + inputSeconds;
  }, [inputMinutes, inputSeconds]);

  const resetTimer = useCallback(() => {
    setTimeLeft(getTotalSeconds());
    setRepeatsRemaining(repeatCount);
  }, [getTotalSeconds, repeatCount]);

  const handleTimerComplete = useCallback(() => {
    playSound();
    
    if (autoRepeat) {
      if (infiniteRepeat || repeatsRemaining > 1) {
        if (!infiniteRepeat) {
          setRepeatsRemaining(prev => prev - 1);
        }
        setTimeLeft(getTotalSeconds());
      } else {
        setIsRunning(false);
        setRepeatsRemaining(repeatCount);
      }
    } else {
      setIsRunning(false);
    }
  }, [autoRepeat, infiniteRepeat, repeatsRemaining, repeatCount, getTotalSeconds, playSound]);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      handleTimerComplete();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft, handleTimerComplete]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    if (timeLeft === 0) {
      resetTimer();
    }
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    resetTimer();
  };

  const handleMinutesChange = (value: string) => {
    const num = parseInt(value) || 0;
    setInputMinutes(Math.max(0, Math.min(99, num)));
    if (!isRunning) {
      setTimeLeft((Math.max(0, Math.min(99, num)) * 60) + inputSeconds);
    }
  };

  const handleSecondsChange = (value: string) => {
    const num = parseInt(value) || 0;
    setInputSeconds(Math.max(0, Math.min(59, num)));
    if (!isRunning) {
      setTimeLeft(inputMinutes * 60 + Math.max(0, Math.min(59, num)));
    }
  };

  const incrementMinutes = () => {
    if (isRunning) return;
    const newVal = Math.min(99, inputMinutes + 1);
    setInputMinutes(newVal);
    setTimeLeft(newVal * 60 + inputSeconds);
  };

  const decrementMinutes = () => {
    if (isRunning) return;
    const newVal = Math.max(0, inputMinutes - 1);
    setInputMinutes(newVal);
    setTimeLeft(newVal * 60 + inputSeconds);
  };

  const incrementSeconds = () => {
    if (isRunning) return;
    const newVal = Math.min(59, inputSeconds + 1);
    setInputSeconds(newVal);
    setTimeLeft(inputMinutes * 60 + newVal);
  };

  const decrementSeconds = () => {
    if (isRunning) return;
    const newVal = Math.max(0, inputSeconds - 1);
    setInputSeconds(newVal);
    setTimeLeft(inputMinutes * 60 + newVal);
  };

  const handleRepeatCountChange = (value: string) => {
    const num = parseInt(value) || 1;
    const newCount = Math.max(1, Math.min(99, num));
    setRepeatCount(newCount);
    if (!isRunning) {
      setRepeatsRemaining(newCount);
    }
  };

  const progress = getTotalSeconds() > 0 ? (timeLeft / getTotalSeconds()) * 100 : 0;

  const displayMinutes = Math.floor(timeLeft / 60);
  const displaySeconds = timeLeft % 60;

  return (
    <Card className="mm-tool-section w-full rounded-none border-0 bg-transparent shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Timer className="h-5 w-5" />
          {t.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center gap-2 sm:gap-4">
          {!isRunning ? (
            <Button 
              onClick={handleStart} 
              size="icon"
              className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl"
              data-testid="button-timer-start"
            >
              <Play className="h-8 w-8" />
            </Button>
          ) : (
            <Button 
              onClick={handlePause} 
              variant="secondary"
              size="icon"
              className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl"
              data-testid="button-timer-pause"
            >
              <Pause className="h-8 w-8" />
            </Button>
          )}

          <div className="flex flex-col items-center">
            <Label className="text-xs text-muted-foreground mb-1">{t.minutes}</Label>
            <div className="flex flex-col items-center border-2 border-border rounded-lg overflow-hidden bg-background">
              <Button
                variant="ghost"
                size="sm"
                onClick={incrementMinutes}
                disabled={isRunning}
                className="w-full h-8 sm:h-10 rounded-none hover:bg-muted"
                data-testid="button-minutes-up"
              >
                <ChevronUp className="h-5 w-5 sm:h-6 sm:w-6" />
              </Button>
              <div 
                className={`w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center border-y border-border ${isRunning ? 'bg-primary/10' : 'bg-muted/30'}`}
              >
                <span className="text-3xl sm:text-4xl font-mono font-bold text-lime-400" data-testid="display-minutes">
                  {displayMinutes.toString().padStart(2, '0')}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={decrementMinutes}
                disabled={isRunning}
                className="w-full h-8 sm:h-10 rounded-none hover:bg-muted"
                data-testid="button-minutes-down"
              >
                <ChevronDown className="h-5 w-5 sm:h-6 sm:w-6" />
              </Button>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center h-full">
            <span className="text-3xl sm:text-4xl font-bold text-lime-400 mt-6">:</span>
          </div>

          <div className="flex flex-col items-center">
            <Label className="text-xs text-muted-foreground mb-1">{t.seconds}</Label>
            <div className="flex flex-col items-center border-2 border-border rounded-lg overflow-hidden bg-background">
              <Button
                variant="ghost"
                size="sm"
                onClick={incrementSeconds}
                disabled={isRunning}
                className="w-full h-8 sm:h-10 rounded-none hover:bg-muted"
                data-testid="button-seconds-up"
              >
                <ChevronUp className="h-5 w-5 sm:h-6 sm:w-6" />
              </Button>
              <div 
                className={`w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center border-y border-border ${isRunning ? 'bg-primary/10' : 'bg-muted/30'}`}
              >
                <span className="text-3xl sm:text-4xl font-mono font-bold text-lime-400" data-testid="display-seconds">
                  {displaySeconds.toString().padStart(2, '0')}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={decrementSeconds}
                disabled={isRunning}
                className="w-full h-8 sm:h-10 rounded-none hover:bg-muted"
                data-testid="button-seconds-down"
              >
                <ChevronDown className="h-5 w-5 sm:h-6 sm:w-6" />
              </Button>
            </div>
          </div>

          <Button 
            onClick={handleReset} 
            variant="outline"
            size="icon"
            className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl"
            data-testid="button-timer-reset"
          >
            <RotateCcw className="h-8 w-8" />
          </Button>
        </div>

        {autoRepeat && (
          <div className="text-center text-sm text-muted-foreground">
            {infiniteRepeat ? t.infinite : `${t.remaining}: ${repeatsRemaining}`}
          </div>
        )}

        <div className="space-y-3 pt-2 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="auto-repeat" className="text-sm cursor-pointer">
                {t.autoRepeat}
              </Label>
            </div>
            <Switch
              id="auto-repeat"
              checked={autoRepeat}
              onCheckedChange={setAutoRepeat}
              data-testid="switch-auto-repeat"
            />
          </div>

          {autoRepeat && (
            <div className="flex items-center gap-3 pl-6">
              <Label htmlFor="repeat-count" className="text-sm whitespace-nowrap">
                {t.repeatCount}:
              </Label>
              <Input
                id="repeat-count"
                type="number"
                min="1"
                max="99"
                value={repeatCount}
                onChange={(e) => handleRepeatCountChange(e.target.value)}
                disabled={infiniteRepeat || isRunning}
                className="w-16 text-center"
                data-testid="input-repeat-count"
              />
              <Button
                variant={infiniteRepeat ? "default" : "outline"}
                size="sm"
                onClick={() => setInfiniteRepeat(!infiniteRepeat)}
                disabled={isRunning}
                className="px-3"
                data-testid="button-infinite-repeat"
              >
                {t.infinite}
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {soundEnabled ? (
                <Volume2 className="h-4 w-4 text-muted-foreground" />
              ) : (
                <VolumeX className="h-4 w-4 text-muted-foreground" />
              )}
              <Label htmlFor="sound-toggle" className="text-sm cursor-pointer">
                {soundEnabled ? t.soundOn : t.soundOff}
              </Label>
            </div>
            <Switch
              id="sound-toggle"
              checked={soundEnabled}
              onCheckedChange={setSoundEnabled}
              data-testid="switch-sound"
            />
          </div>

          {soundEnabled && (
            <div className="flex items-center gap-2 pl-6">
              <Label className="text-sm whitespace-nowrap">{t.soundType}:</Label>
              <div className="flex gap-1 flex-1">
                <Button
                  variant={soundType === 'bell' ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setSoundType('bell'); setTimeout(() => playBellSound(), 50); }}
                  className="flex-1 text-xs"
                  data-testid="button-sound-bell"
                >
                  {t.soundBell}
                </Button>
                <Button
                  variant={soundType === 'beep' ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setSoundType('beep'); setTimeout(() => playBeepSound(), 50); }}
                  className="flex-1 text-xs"
                  data-testid="button-sound-beep"
                >
                  {t.soundBeep}
                </Button>
                <Button
                  variant={soundType === 'speech' ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setSoundType('speech'); setTimeout(() => playSpeechSound(), 50); }}
                  className="flex-1 text-xs"
                  data-testid="button-sound-speech"
                >
                  {t.soundSpeech}
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
