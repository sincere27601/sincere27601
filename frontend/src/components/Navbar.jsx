import React, { useState, useEffect } from 'react';
import { Menu, X, Shield } from 'lucide-react';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'About', href: '#about' },
    { name: 'Services', href: '#services' },
    { name: 'Capital Brief', href: '#brief' },
    { name: 'Connect', href: '#connect' }
  ];

  const scrollToSection = (href) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-slate-900/95 backdrop-blur-md shadow-lg' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <a href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-full border-2 border-cyan-400 flex items-center justify-center group-hover:bg-cyan-400/10 transition-colors duration-300">
              <Shield className="w-5 h-5 text-cyan-400" />
            </div>
            <span className="text-white font-bold text-xl tracking-wide">IRONGRID</span>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.name}
                onClick={() => scrollToSection(link.href)}
                className="text-gray-300 hover:text-white font-medium tracking-wide text-sm uppercase transition-colors duration-300"
              >
                {link.name}
              </button>
            ))}
            <button
              onClick={() => scrollToSection('#contact')}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold px-6 py-2.5 rounded text-sm uppercase tracking-wide transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/25"
            >
              Contact & Booking
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden text-white p-2"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-slate-900/98 backdrop-blur-md absolute top-20 left-0 right-0 border-t border-slate-700">
            <div className="flex flex-col py-4">
              {navLinks.map((link) => (
                <button
                  key={link.name}
                  onClick={() => scrollToSection(link.href)}
                  className="text-gray-300 hover:text-white hover:bg-slate-800 px-6 py-3 text-left font-medium tracking-wide text-sm uppercase transition-colors duration-300"
                >
                  {link.name}
                </button>
              ))}
              <div className="px-6 py-3">
                <button
                  onClick={() => scrollToSection('#contact')}
                  className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold px-6 py-2.5 rounded text-sm uppercase tracking-wide transition-all duration-300"
                >
                  Contact & Booking
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
