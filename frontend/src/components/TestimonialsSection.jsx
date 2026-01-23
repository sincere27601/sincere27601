import React from 'react';
import { testimonials, images } from '../data/mockData';
import { Quote } from 'lucide-react';

const TestimonialsSection = () => {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Image Side */}
          <div className="relative order-2 md:order-1">
            <img
              src={images.office}
              alt="Corporate Office"
              className="w-full rounded-xl shadow-2xl"
            />
          </div>

          {/* Content Side */}
          <div className="order-1 md:order-2">
            <p className="text-cyan-600 font-semibold uppercase tracking-widest mb-3">
              Trusted Advisory
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-8">
              Above all, I operate with complete transparency and accountability.
            </h2>
            
            <p className="text-gray-600 leading-relaxed mb-8">
              If you work with me on security assessments, regulatory readiness, or capital event advisory, you'll understand exactly where your risks lie and how to eliminate them. My approach is direct: I speak in terms of capital protection, not security checkboxes.
            </p>

            {/* Testimonials */}
            <div className="space-y-6">
              {testimonials.map((testimonial) => (
                <div
                  key={testimonial.id}
                  className="bg-slate-50 p-6 rounded-xl border-l-4 border-cyan-500"
                >
                  <Quote className="w-6 h-6 text-cyan-400 mb-3" />
                  <p className="text-gray-700 italic mb-4">"{testimonial.quote}"</p>
                  <div>
                    <p className="font-semibold text-slate-900">{testimonial.author}</p>
                    <p className="text-sm text-gray-500">{testimonial.company}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
