import React, { useEffect, useState, useRef } from 'react';
import { stats, platformLinks, images } from '../data/mockData';
import { Shield, Briefcase, Video, Users, Linkedin, Github, Mail } from 'lucide-react';

const iconMap = {
  shield: Shield,
  briefcase: Briefcase,
  video: Video,
  users: Users,
  linkedin: Linkedin,
  github: Github,
  mail: Mail
};

const AnimatedNumber = ({ value, suffix = '' }) => {
  const [displayValue, setDisplayValue] = useState('0');
  const ref = useRef(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          // Extract numeric part
          const numericValue = parseFloat(value.replace(/[^0-9.]/g, ''));
          const prefix = value.match(/^[^0-9]*/)?.[0] || '';
          
          let start = 0;
          const duration = 2000;
          const startTime = performance.now();

          const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = numericValue * easeOut;

            if (numericValue >= 1000000) {
              setDisplayValue(`${prefix}${(current / 1000000).toFixed(1)}B${suffix}`);
            } else if (numericValue >= 1000) {
              setDisplayValue(`${prefix}${Math.floor(current).toLocaleString()}${suffix}`);
            } else {
              setDisplayValue(`${prefix}${current.toFixed(1)}${suffix}`);
            }

            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              setDisplayValue(value);
            }
          };

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [value, suffix, hasAnimated]);

  return <span ref={ref}>{displayValue}</span>;
};

const StatsSection = () => {
  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-fixed"
        style={{ backgroundImage: `url(${images.cityscape})` }}
      >
        <div className="absolute inset-0 bg-slate-900/85" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        {/* Logo Mark */}
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 rounded-full border-2 border-cyan-400 flex items-center justify-center">
            <Shield className="w-10 h-10 text-cyan-400" />
          </div>
        </div>

        {/* Section Title */}
        <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-16">
          Capital Protection Track Record
        </h2>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20">
          {stats.map((stat) => {
            const Icon = iconMap[stat.icon];
            return (
              <div key={stat.id} className="text-center">
                <Icon className="w-8 h-8 text-cyan-400 mx-auto mb-4" />
                <div className="text-5xl md:text-6xl font-bold text-white mb-3">
                  <AnimatedNumber value={stat.value} />
                </div>
                <p className="text-gray-400 text-lg">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* Platform Links */}
        <div className="text-center">
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-8">
            <span className="font-serif italic text-cyan-400">Official</span>{' '}
            <span className="uppercase tracking-wider">Platform Links</span>
          </h3>
          <div className="flex flex-wrap justify-center gap-6 md:gap-10">
            {platformLinks.map((link) => {
              const Icon = iconMap[link.icon];
              return (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-all duration-300"
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-lg font-medium group-hover:underline underline-offset-4">
                    {link.name}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
