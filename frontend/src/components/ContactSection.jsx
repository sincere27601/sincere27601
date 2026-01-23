import React, { useState } from 'react';
import { images } from '../data/mockData';
import { Send, Linkedin, Github, Mail, MapPin, Phone } from 'lucide-react';

const ContactSection = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    service: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
    setFormData({ name: '', email: '', company: '', service: '', message: '' });
  };

  return (
    <section id="contact" className="py-24 bg-slate-50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16">
          {/* Left Side - Info */}
          <div>
            <p className="text-cyan-600 font-semibold uppercase tracking-widest mb-3">
              Now that I have your attention!
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
              I'd love to continue this journey with you.
            </h2>
            <p className="text-gray-600 leading-relaxed mb-8">
              If you want to connect or are looking to protect your capital during growth events, reach out to me. I'm only an email or direct message away!
            </p>

            {/* Contact Info */}
            <div className="space-y-4 mb-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-cyan-50 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-cyan-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium text-slate-900">contact@irongrid.com</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-cyan-50 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-cyan-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="font-medium text-slate-900">New York, NY</p>
                </div>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex gap-4">
              <a
                href="#linkedin"
                className="w-12 h-12 rounded-full bg-slate-900 hover:bg-cyan-600 flex items-center justify-center transition-colors duration-300"
              >
                <Linkedin className="w-5 h-5 text-white" />
              </a>
              <a
                href="#github"
                className="w-12 h-12 rounded-full bg-slate-900 hover:bg-cyan-600 flex items-center justify-center transition-colors duration-300"
              >
                <Github className="w-5 h-5 text-white" />
              </a>
              <a
                href="mailto:contact@irongrid.com"
                className="w-12 h-12 rounded-full bg-slate-900 hover:bg-cyan-600 flex items-center justify-center transition-colors duration-300"
              >
                <Mail className="w-5 h-5 text-white" />
              </a>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="bg-white p-8 md:p-10 rounded-2xl shadow-xl border border-slate-100">
            <h3 className="text-2xl font-bold text-slate-900 mb-6">
              Schedule a Consultation
            </h3>
            
            {submitted ? (
              <div className="bg-green-50 text-green-800 p-6 rounded-lg text-center">
                <p className="font-semibold">Thank you for reaching out!</p>
                <p className="text-sm mt-2">I'll get back to you within 24 hours.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all duration-300"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all duration-300"
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Company / Fund
                  </label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all duration-300"
                    placeholder="Your organization"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Service Interest
                  </label>
                  <select
                    name="service"
                    value={formData.service}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all duration-300 bg-white"
                  >
                    <option value="">Select a service</option>
                    <option value="risk-assessment">Pre-Acquisition Risk Assessment</option>
                    <option value="gsoc-advisory">GSOC Maturity Advisory</option>
                    <option value="regulatory">Regulatory Readiness Scoring</option>
                    <option value="capital-event">Capital Event Advisory</option>
                    <option value="retainer">Monthly Retainer</option>
                    <option value="other">Other / General Inquiry</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Message
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all duration-300 resize-none"
                    placeholder="Tell me about your capital protection needs..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-300 text-slate-900 font-bold py-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-cyan-500/25"
                >
                  {isSubmitting ? (
                    <span>Sending...</span>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
