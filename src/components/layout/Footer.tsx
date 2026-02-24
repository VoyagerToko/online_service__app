import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pt-20 pb-10 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
        <div className="space-y-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 gradient-bg rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <span className="text-2xl font-display font-bold tracking-tight dark:text-white">
              Servify
            </span>
          </Link>
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
            Premium home services at your doorstep. Verified professionals, transparent pricing, and guaranteed quality.
          </p>
          <div className="flex gap-4">
            {[Facebook, Twitter, Instagram, Linkedin].map((Icon, i) => (
              <a key={i} href="#" className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-brand-500 hover:text-white transition-all">
                <Icon size={20} />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-bold dark:text-white mb-6">Company</h4>
          <ul className="space-y-4 text-slate-500 dark:text-slate-400">
            <li><Link to="/about" className="hover:text-brand-600 transition-colors">About Us</Link></li>
            <li><Link to="/careers" className="hover:text-brand-600 transition-colors">Careers</Link></li>
            <li><Link to="/blog" className="hover:text-brand-600 transition-colors">Blog</Link></li>
            <li><Link to="/contact" className="hover:text-brand-600 transition-colors">Contact</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold dark:text-white mb-6">Services</h4>
          <ul className="space-y-4 text-slate-500 dark:text-slate-400">
            <li><Link to="/category/1" className="hover:text-brand-600 transition-colors">Electrical</Link></li>
            <li><Link to="/category/2" className="hover:text-brand-600 transition-colors">Plumbing</Link></li>
            <li><Link to="/category/3" className="hover:text-brand-600 transition-colors">Cleaning</Link></li>
            <li><Link to="/category/4" className="hover:text-brand-600 transition-colors">Appliance Repair</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold dark:text-white mb-6">Contact Us</h4>
          <ul className="space-y-4 text-slate-500 dark:text-slate-400">
            <li className="flex items-center gap-3">
              <Mail size={18} className="text-brand-500" />
              <span>support@servify.com</span>
            </li>
            <li className="flex items-center gap-3">
              <Phone size={18} className="text-brand-500" />
              <span>+91 98765 43210</span>
            </li>
            <li className="flex items-center gap-3">
              <MapPin size={18} className="text-brand-500" />
              <span>Sector 44, Gurgaon, India</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col md:row justify-between items-center gap-4 text-sm text-slate-500">
        <p>© 2024 Servify Technologies Pvt Ltd. All rights reserved.</p>
        <div className="flex gap-8">
          <Link to="/privacy" className="hover:text-brand-600 transition-colors">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-brand-600 transition-colors">Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
};
