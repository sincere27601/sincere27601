import React from 'react';
import { protectionBrief, valuePropositions } from '../data/mockData';
import { Shield, MapPin, AlertTriangle, Settings, TrendingUp, Clock, DollarSign, CheckCircle } from 'lucide-react';

const briefIcons = {
  whatIProtect: Shield,
  whereIOperate: MapPin,
  whatBreaksWithoutMe: AlertTriangle,
  howImStructured: Settings
};

const briefTitles = {
  whatIProtect: 'What I Protect',
  whereIOperate: 'Where I Operate',
  whatBreaksWithoutMe: 'What Breaks Without Me',
  howImStructured: 'How I\'m Structured'
};

const valueIcons = [
  DollarSign,
  Shield,
  Clock,
  CheckCircle
];

const CapitalBriefSection = () => {
  return (
    <section id="brief" className="py-24 bg-slate-900">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <p className="text-cyan-400 font-semibold uppercase tracking-widest mb-3">
            Capital Protection Brief
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            This Replaces Resumes in Wealthy Rooms
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Every conversation translates to assets protected, loss avoided, time to approval reduced, and risk removed before capital events.
          </p>
        </div>

        {/* Protection Brief Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {Object.entries(protectionBrief).map(([key, items]) => {
            const Icon = briefIcons[key];
            return (
              <div
                key={key}
                className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl border border-slate-700 hover:border-cyan-500/50 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-4">
                  {briefTitles[key]}
                </h3>
                <ul className="space-y-3">
                  {items.map((item, index) => (
                    <li key={index} className="text-gray-400 text-sm flex items-start gap-2">
                      <span className="text-cyan-400 mt-1">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Value Propositions */}
        <div className="border-t border-slate-700 pt-16">
          <h3 className="text-2xl font-bold text-white text-center mb-12">
            Every Conversation Translates to Dollar Terms
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {valuePropositions.map((prop, index) => {
              const Icon = valueIcons[index];
              return (
                <div key={prop.id} className="text-center group">
                  <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-cyan-500/20 transition-colors duration-300">
                    <Icon className="w-8 h-8 text-cyan-400" />
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2">{prop.title}</h4>
                  <p className="text-gray-400 text-sm">{prop.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CapitalBriefSection;
