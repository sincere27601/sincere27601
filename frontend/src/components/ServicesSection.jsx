import React from 'react';
import { services, targetClients, images } from '../data/mockData';
import { ArrowRight, Building2, TrendingUp, Shield, FileCheck } from 'lucide-react';

const serviceIcons = [
  FileCheck,
  Shield,
  TrendingUp,
  Building2
];

const ServicesSection = () => {
  return (
    <section id="services" className="py-24 bg-slate-50">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <p className="text-cyan-600 font-semibold uppercase tracking-widest mb-3">
            Business Elevation
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
            I work with investment firms and enterprises to protect capital,
            <br className="hidden md:block" />
            secure operations, and de-risk growth events.
          </h2>
        </div>

        {/* Target Clients */}
        <div className="flex flex-wrap justify-center gap-3 mb-16">
          {targetClients.map((client, index) => (
            <span
              key={index}
              className="bg-white px-4 py-2 rounded-full text-sm font-medium text-slate-700 border border-slate-200 shadow-sm"
            >
              {client}
            </span>
          ))}
        </div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {services.map((service, index) => {
            const Icon = serviceIcons[index];
            return (
              <div
                key={service.id}
                className="group bg-white p-8 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-slate-100 hover:border-cyan-200"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-cyan-50 flex items-center justify-center flex-shrink-0 group-hover:bg-cyan-100 transition-colors duration-300">
                    <Icon className="w-6 h-6 text-cyan-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900 mb-2">
                      {service.title}
                    </h3>
                    <p className="text-gray-600 mb-4">{service.description}</p>
                    <p className="text-cyan-600 font-semibold">{service.price}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA Button */}
        <div className="text-center">
          <a
            href="#contact"
            className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold px-8 py-4 rounded text-sm uppercase tracking-widest transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/25"
          >
            Schedule a Consultation
            <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </div>

      {/* Background Image Section */}
      <div className="mt-24 relative h-80 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${images.meeting})` }}
        >
          <div className="absolute inset-0 bg-slate-900/60" />
        </div>
        <div className="relative z-10 h-full flex items-center justify-center">
          <p className="text-white text-xl md:text-2xl font-medium text-center px-6 max-w-3xl">
            "If I reduce risk exposure across multiple entities, how do you typically structure upside participation?"
          </p>
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
