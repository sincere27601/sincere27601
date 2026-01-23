import React from 'react';
import { aboutContent, images } from '../data/mockData';

const AboutSection = () => {
  return (
    <section id="about" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        {/* Intro Text */}
        <div className="max-w-4xl mx-auto text-center mb-20">
          <p className="text-lg md:text-xl text-gray-600 leading-relaxed mb-6">
            Whether you're navigating a complex{' '}
            <span className="text-cyan-600 font-semibold">acquisition</span>,{' '}
            launching a new fund, or scaling your{' '}
            <span className="text-cyan-600 font-semibold">security operations</span>—
            whatever brought you here, thank you for stopping by.
          </p>
          <p className="text-lg text-gray-600 leading-relaxed">
            {aboutContent.background}
          </p>
          <div className="w-32 h-1 bg-amber-400 mx-auto mt-10" />
        </div>

        {/* Two Column Layout */}
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Image Side */}
          <div className="relative">
            <img
              src={images.professional}
              alt="Professional"
              className="w-full max-w-md mx-auto rounded-lg shadow-2xl"
            />
            <div className="absolute -bottom-4 -right-4 w-full h-full border-2 border-cyan-400 rounded-lg -z-10" />
          </div>

          {/* Content Side */}
          <div>
            <p className="text-xl md:text-2xl text-gray-800 font-medium leading-relaxed mb-8">
              "{aboutContent.intro}"
            </p>
            <p className="text-gray-600 leading-relaxed mb-8">
              {aboutContent.philosophy}
            </p>
            <div className="flex gap-4">
              <a
                href="#linkedin"
                className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded font-semibold transition-all duration-300"
              >
                Connect on LinkedIn
              </a>
              <a
                href="#github"
                className="inline-flex items-center gap-2 border-2 border-slate-900 hover:bg-slate-900 hover:text-white text-slate-900 px-6 py-3 rounded font-semibold transition-all duration-300"
              >
                View GitHub
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
