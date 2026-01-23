import React from 'react';
import { siteConfig, images } from '../data/mockData';
import { ChevronDown } from 'lucide-react';

const HeroSection = () => {
  const scrollToAbout = () => {
    const element = document.querySelector('#about');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${images.hero})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-900/70 to-slate-900/90" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center pt-20">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
          Hi. I'm a{' '}
          <span className="block mt-2">
            <span className="text-cyan-400">Capital Risk</span> &
          </span>
          <span className="text-cyan-400">Operational Resilience</span>
          <span className="block mt-2">Partner.</span>
        </h1>

        <p className="text-gray-300 text-lg md:text-xl max-w-3xl mx-auto mb-8 leading-relaxed uppercase tracking-wider font-medium">
          {siteConfig.heroSubtitle}
        </p>

        <p className="text-gray-400 text-base md:text-lg max-w-2xl mx-auto mb-12 leading-relaxed">
          {siteConfig.valueStatement}
        </p>

        <button
          onClick={() => {
            const element = document.querySelector('#contact');
            if (element) element.scrollIntoView({ behavior: 'smooth' });
          }}
          className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold px-10 py-4 rounded text-sm uppercase tracking-widest transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/30 hover:-translate-y-1"
        >
          Contact & Booking
        </button>
      </div>

      {/* Scroll Indicator */}
      <button
        onClick={scrollToAbout}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/60 hover:text-white transition-colors duration-300 animate-bounce"
      >
        <ChevronDown className="w-8 h-8" />
      </button>
    </section>
  );
};

export default HeroSection;
