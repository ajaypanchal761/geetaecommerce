import { useState, useEffect } from 'react';
import { getTheme } from '../../../../utils/themes';
import { useThemeContext } from '../../../../context/ThemeContext';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

import { bannerService } from '../../../../services/bannerService';

export default function FlashDealSection() {
  const { activeCategory } = useThemeContext();
  const theme = getTheme(activeCategory || 'all');
  const [config, setConfig] = useState(bannerService.getDealsConfig());

  useEffect(() => {
    setConfig(bannerService.getDealsConfig());
  }, []);

  const [targetDate, setTargetDate] = useState(() => {
      if (config.flashDealTargetDate) {
          return new Date(config.flashDealTargetDate);
      }
      const date = new Date();
      date.setHours(date.getHours() + 24);
      return date;
  });

  useEffect(() => {
     if (config.flashDealTargetDate) {
         setTargetDate(new Date(config.flashDealTargetDate));
     }
  }, [config.flashDealTargetDate]);

  const calculateTimeLeft = (): TimeLeft => {
    const difference = +targetDate - +new Date();
    let timeLeft: TimeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0 };

    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }
    return timeLeft;
  };

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const TimerBox = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div
        className="w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg md:text-xl shadow-sm mb-1"
        style={{ backgroundColor: theme.primary[0] }}
      >
        {value.toString().padStart(2, '0')}
      </div>
      <span className="text-[10px] md:text-xs font-medium text-neutral-600 uppercase tracking-wide">{label}</span>
    </div>
  );

  return (
    <div className="px-4 md:px-6 lg:px-8 mb-6 mt-2">
      <div
        className="rounded-2xl p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm border border-neutral-100 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${theme.secondary[0]} 0%, white 100%)`
        }}
      >
        {/* Decorative background circle */}
        <div
          className="absolute -right-10 -top-10 w-40 h-40 rounded-full opacity-10 pointer-events-none"
          style={{ backgroundColor: theme.primary[0] }}
        />

        <div className="flex-1 text-center md:text-left z-10 flex flex-col md:flex-row items-center gap-4 md:gap-6">
          <div className="relative w-24 h-24 md:w-28 md:h-28 flex-shrink-0">
             <img
                src={config.flashDealImage || "https://cdn-icons-png.flaticon.com/512/3081/3081986.png"}
                alt="Flash Deal"
                className="w-full h-full object-contain drop-shadow-md animate-bounce"
                style={{ animationDuration: '3s' }}
             />
          </div>
          <div>
            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
              <svg
                className="w-6 h-6 animate-pulse"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                style={{ color: theme.primary[0] }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h2 className="text-2xl font-black text-neutral-900 tracking-tight">FLASH DEAL</h2>
            </div>
            <p className="text-neutral-600 text-sm md:text-base max-w-md">
              Hurry Up! The offer is limited. Grab your favorites at unbeatable prices while it lasts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-4 z-10 bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-white/60 shadow-sm">
          <TimerBox value={timeLeft.days} label="Days" />
          <span className="text-neutral-400 font-bold -mt-4">:</span>
          <TimerBox value={timeLeft.hours} label="Hrs" />
          <span className="text-neutral-400 font-bold -mt-4">:</span>
          <TimerBox value={timeLeft.minutes} label="Min" />
          <span className="text-neutral-400 font-bold -mt-4">:</span>
          <TimerBox value={timeLeft.seconds} label="Sec" />
        </div>

        <div className="w-full md:w-auto z-10">
            <button
                className="w-full md:w-auto px-8 py-3 rounded-full text-white font-bold shadow-lg transform transition hover:scale-105 active:scale-95"
                style={{
                    backgroundColor: theme.primary[0],
                    boxShadow: `0 4px 14px 0 ${theme.primary[1]}`
                }}
            >
                View All Deals
            </button>
        </div>
      </div>
    </div>
  );
}
