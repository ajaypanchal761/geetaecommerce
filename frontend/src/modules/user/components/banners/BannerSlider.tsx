import { useState, useEffect } from 'react';
import { bannerService } from '../../../../services/bannerService';
import { Banner, BannerPosition } from '../../../../types/banner';

interface Props {
  position: BannerPosition;
  className?: string;
  heightClass?: string;
}

export default function BannerSlider({ position, className = '', heightClass = "h-48 md:h-64 lg:h-80" }: Props) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const activeBanners = bannerService.getActiveBannersForPosition(position);
    setBanners(activeBanners);
  }, [position]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000); // 5 seconds slide
    return () => clearInterval(interval);
  }, [banners.length]);

  if (banners.length === 0) return null;

  return (
    <div className={`w-full relative group ${className}`}>
      <div className={`w-full relative overflow-hidden rounded-2xl ${heightClass}`}>
        {banners.map((banner, index) => (
          <div
            key={banner.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            <img
              src={banner.image || banner.imageUrl}
              alt={banner.title || 'Banner'}
              className="w-full h-full object-cover"
            />
            {/* Optional Overlay Text */}
            <div className="absolute inset-0 bg-black/20 flex flex-col justify-center px-8 md:px-16 text-white">
               {banner.title && (
                   <h2 className="text-2xl md:text-5xl font-bold mb-2 translate-y-4 opacity-0 animate-slide-up" style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>{banner.title}</h2>
               )}
               {banner.subtitle && (
                 <p className="text-lg md:text-xl translate-y-4 opacity-0 animate-slide-up" style={{ animationDelay: '500ms', animationFillMode: 'forwards' }}>{banner.subtitle}</p>
               )}
            </div>
          </div>
        ))}

        {/* Navigation Dots */}
        {banners.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {banners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  idx === currentIndex ? 'bg-white w-6' : 'bg-white/50 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        )}

        {/* Navigation Arrows */}
        {banners.length > 1 && (
           <>
             <button
                onClick={() => setCurrentIndex(prev => (prev - 1 + banners.length) % banners.length)}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20"
             >
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
             </button>
             <button
                onClick={() => setCurrentIndex(prev => (prev + 1) % banners.length)}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20"
             >
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
             </button>
           </>
        )}
      </div>
    </div>
  );
}
