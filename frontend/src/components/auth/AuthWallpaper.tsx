import { useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { AUTH_VIDEO_WALLPAPER } from "../../config/authWallpaper";

export interface WallpaperSlide {
  title: string;
  tagline: string;
}

interface AuthWallpaperProps {
  slides?: WallpaperSlide[];
  title?: string;
  tagline?: string;
}

export function AuthWallpaper({ slides, title, tagline }: AuthWallpaperProps) {
  const [activeSlide, setActiveSlide] = useState(0);

  // Active slide details
  const currentTitle = slides ? slides[activeSlide]?.title : title;
  const currentTagline = slides ? slides[activeSlide]?.tagline : tagline;

  return (
    <div className="relative hidden w-full flex-col justify-end p-4 lg:flex lg:min-h-screen lg:w-1/2">
      {/* Background Media Container */}
      <div className="relative h-full w-full overflow-hidden rounded-[32px] border border-white/10 shadow-2xl bg-neutral-950">
        
        {/* Background Video Wallpaper in Continuous Loop */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
          src={AUTH_VIDEO_WALLPAPER}
        />

        {/* Ambient Dark Gradient Overlays for contrast & typography readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-radial from-transparent via-black/20 to-black/60 pointer-events-none" />

        {/* Top Header: Logo Badge */}
        <div className="absolute top-8 left-8 z-10 flex items-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-4 py-2 backdrop-blur-md group hover:border-white/20 transition-all shadow-lg"
          >
            <div className="w-6 h-6 rounded-md bg-sx-blue/20 border border-sx-blue/40 flex items-center justify-center text-sx-blue">
              <ShieldCheck size={16} />
            </div>
            <span className="text-sm font-bold tracking-tight text-white">
              Sentinel<span className="text-sx-blue">X</span>
            </span>
          </Link>
        </div>

        {/* Bottom Content / Carousel Titles */}
        <div className="absolute right-0 bottom-0 left-0 z-10 flex w-full flex-col items-center justify-center p-8 pb-12 text-center pointer-events-auto">
          {currentTitle && (
            <h1 className="text-3xl font-medium tracking-tight text-balance text-white md:text-4xl lg:text-5xl max-w-lg leading-tight drop-shadow-md">
              {currentTitle}
            </h1>
          )}
          {currentTagline && (
            <p className="mt-3 text-sm text-neutral-300 max-w-md drop-shadow">
              {currentTagline}
            </p>
          )}

          {/* Pagination Indicators if multiple slides exist */}
          {slides && slides.length > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveSlide(idx)}
                  className={`h-1.5 transition-all cursor-pointer rounded-full ${
                    activeSlide === idx
                      ? "w-6 bg-white"
                      : "w-1.5 bg-white/40 hover:bg-white/60"
                  }`}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
