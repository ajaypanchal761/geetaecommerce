import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTheme } from '../../../../utils/themes';
import { useThemeContext } from '../../../../context/ThemeContext';
import { bannerService } from '../../../../services/bannerService';
import { getProductById, getProducts } from '../../../../services/api/customerProductService';
import { calculateProductPrice } from '../../../../utils/priceUtils';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export default function FlashDealSection() {
  const navigate = useNavigate();
  const { activeCategory } = useThemeContext();
  const theme = getTheme(activeCategory || 'all');
  const [config, setConfig] = useState<{flashDealTargetDate: string; flashDealImage?: string; isActive?: boolean; flashDealProductIds?: string[]}>({ flashDealTargetDate: '', isActive: true });
  const [products, setProducts] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchConfig = async () => {
        try {
            const data = await bannerService.getDealsConfig();
            setConfig(data);

            let fetchedProducts: any[] = [];

            // 1. Try to fetch from specific IDs if configured
            if (data.flashDealProductIds && data.flashDealProductIds.length > 0) {
                const promises = data.flashDealProductIds.slice(0, 10).map(id => getProductById(id));
                const results = await Promise.all(promises);
                fetchedProducts = results
                    .filter(res => res.success && res.data)
                    .map(res => ({
                        ...res.data,
                        id: (res.data as any)._id || (res.data as any).id
                    }));
            }

            setProducts(fetchedProducts);
            setIsLoaded(true);
        } catch (error) {
            console.error("Error fetching deals config:", error);
            setIsLoaded(true);
        }
    };
    fetchConfig();
  }, [activeCategory]);

  const [targetDate, setTargetDate] = useState(() => {
      const date = new Date();
      date.setHours(date.getHours() + 24);
      return date;
  });

  useEffect(() => {
     if (config.flashDealTargetDate) {
         const serverDate = new Date(config.flashDealTargetDate);
         // If server date is in the past, add 24 hours to the current time to make it "run"
         if (serverDate.getTime() <= Date.now()) {
            const newTarget = new Date();
            newTarget.setHours(newTarget.getHours() + 24);
            setTargetDate(newTarget);
         } else {
            setTargetDate(serverDate);
         }
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

  // Only hide if EXPLICITLY set to inactive by admin.
  if (isLoaded && config.isActive === false) {
    return null;
  }

  const TimerBox = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center min-w-[45px]">
      <div className="text-white font-bold text-lg md:text-xl leading-none mb-1">
        {value.toString().padStart(2, '0')}
      </div>
      <span className="text-[10px] text-white/70 uppercase tracking-tighter font-medium">{label}</span>
    </div>
  );

  return (
    <div className="px-4 md:px-6 lg:px-8 mb-8 mt-4">
      <div
        className="rounded-2xl p-5 shadow-sm border border-neutral-100 flex flex-col gap-6"
        style={{ background: `linear-gradient(135deg, ${theme.primary[3]}33 0%, #fff 100%)` }}
      >
        {/* Header Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <h2 className="text-xl font-black tracking-tight" style={{ color: theme.primary[0] }}>FLASH DEAL</h2>
            <p className="text-neutral-500 text-xs md:text-sm mt-1 max-w-xs font-medium">
              Hurry Up! The offer is limited. Grab while it lasts
            </p>
          </div>

          <div
             className="flex items-center gap-2 p-3 md:px-6 md:py-3 rounded-xl shadow-lg z-10"
             style={{ backgroundColor: theme.primary[0] }}
          >
            <TimerBox value={timeLeft.days} label="Days" />
            <span className="text-white/50 font-bold text-lg mb-4">:</span>
            <TimerBox value={timeLeft.hours} label="Hrs" />
            <span className="text-white/50 font-bold text-lg mb-4">:</span>
            <TimerBox value={timeLeft.minutes} label="Min" />
            <span className="text-white/50 font-bold text-lg mb-4">:</span>
            <TimerBox value={timeLeft.seconds} label="Sec" />
          </div>
        </div>

        {/* Product List Section */}
        {products.length > 0 ? (
            <div
                ref={scrollContainerRef}
                className="flex overflow-x-auto gap-4 scrollbar-hide pb-2"
            >
                {products.map(product => {
                    const { displayPrice, mrp, discount } = calculateProductPrice(product);
                    return (
                        <div
                            key={product.id}
                            className="flex-none w-[260px] md:w-[280px] bg-white rounded-xl p-3 shadow-md border border-neutral-100 flex items-center gap-3 cursor-pointer hover:scale-[1.02] transition-transform"
                            onClick={() => navigate(`/product/${product.id}`)}
                        >
                            <div className="relative w-20 h-20 flex-shrink-0 bg-neutral-50 rounded-lg overflow-hidden flex items-center justify-center">
                                {discount > 0 && (
                                    <div
                                        className="absolute top-0 left-0 text-white text-[10px] font-bold px-2 py-0.5 rounded-br-lg z-10"
                                        style={{ backgroundColor: theme.primary[0] }}
                                    >
                                        -{discount}%
                                    </div>
                                )}
                                <img
                                    src={product.mainImage || product.imageUrl}
                                    alt={product.name}
                                    className="w-full h-full object-contain p-1"
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-neutral-800 text-sm line-clamp-2 leading-snug">
                                    {product.productName || product.name || 'Product'}
                                </h4>
                                <div className="flex flex-col mt-1">
                                    {mrp > displayPrice && (
                                        <span className="text-[10px] text-neutral-400 line-through">₹{mrp}</span>
                                    )}
                                    <span className="text-sm font-black text-neutral-900">₹{displayPrice}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        ) : (
            <div className="flex items-center justify-center p-8 bg-neutral-50/50 rounded-xl border border-dashed border-neutral-200">
                <p className="text-neutral-400 text-sm font-medium italic">Setting up products for your flash deal...</p>
            </div>
        )}

        {/* Footer Action */}
        <div className="flex justify-center border-t border-neutral-100 pt-4">
            <button
                onClick={() => navigate('/flash-deals')}
                className="text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all px-6 py-2 rounded-full border border-neutral-200 bg-white"
                style={{ color: theme.primary[0] }}
            >
                View All <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
        </div>
      </div>
    </div>
  );
}
