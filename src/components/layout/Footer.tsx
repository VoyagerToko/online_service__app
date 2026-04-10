import React from 'react';
import { Link } from 'react-router-dom';
import { Globe, Share2 } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#dadadc] py-16 px-8 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
        <div className="space-y-6">
          <Link to="/" className="text-xl font-display font-bold tracking-tight text-brand-500">
            Servify
          </Link>
          <p className="text-slate-600 leading-relaxed text-sm max-w-sm">
            An architectural approach to professional connection. Elevating the standard of curated services globally.
          </p>
          <div className="flex gap-4">
            <a href="#" className="w-10 h-10 rounded-full bg-white/50 flex items-center justify-center hover:bg-white transition-colors">
              <Share2 size={16} className="text-slate-700" />
            </a>
            <a href="#" className="w-10 h-10 rounded-full bg-white/50 flex items-center justify-center hover:bg-white transition-colors">
              <Globe size={16} className="text-slate-700" />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-12">
          <div className="space-y-4">
            <p className="font-bold text-brand-500 text-sm uppercase tracking-widest">Platform</p>
            <nav className="flex flex-col gap-2">
              <Link to="/services" className="text-slate-600 hover:text-[#006769] transition-colors text-sm">Browse Services</Link>
              <Link to="/about" className="text-slate-600 hover:text-[#006769] transition-colors text-sm">How It Works</Link>
              <Link to="/signup" className="text-slate-600 hover:text-[#006769] transition-colors text-sm">Professional Signup</Link>
            </nav>
          </div>

          <div className="space-y-4">
            <p className="font-bold text-brand-500 text-sm uppercase tracking-widest">Company</p>
            <nav className="flex flex-col gap-2">
              <Link to="/about" className="text-slate-600 hover:text-[#006769] transition-colors text-sm">About Us</Link>
              <Link to="/blog" className="text-slate-600 hover:text-[#006769] transition-colors text-sm">Press & Media</Link>
              <Link to="/careers" className="text-slate-600 hover:text-[#006769] transition-colors text-sm">Careers</Link>
            </nav>
          </div>

          <div className="space-y-4">
            <p className="font-bold text-brand-500 text-sm uppercase tracking-widest">Support</p>
            <nav className="flex flex-col gap-2">
              <Link to="/contact" className="text-slate-600 hover:text-[#006769] transition-colors text-sm">Support Center</Link>
              <Link to="/contact" className="text-slate-600 hover:text-[#006769] transition-colors text-sm">Contact Us</Link>
              <Link to="/contact" className="text-slate-600 hover:text-[#006769] transition-colors text-sm">Help Desk</Link>
            </nav>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-16 border-t border-black/5 mt-16 flex flex-col md:flex-row justify-between items-center gap-6">
        <p className="text-slate-600 text-sm">© 2024 Servify. All rights reserved.</p>
        <div className="flex gap-8">
          <Link to="/privacy" className="text-slate-600 text-xs hover:underline">Privacy Policy</Link>
          <Link to="/terms" className="text-slate-600 text-xs hover:underline">Terms of Service</Link>
          <Link to="/privacy" className="text-slate-600 text-xs hover:underline">Cookie Policy</Link>
        </div>
      </div>
    </footer>
  );
};
