import React from 'react';
import { Link } from 'react-router-dom';
import { Fuel, Twitter, Github, Linkedin, Mail } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="w-full relative mt-auto bg-surface/30 backdrop-blur-xl border-t border-white/5 pt-12 pb-6 px-4 sm:px-8">
      {/* Decorative gradient blur */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12 mb-12">
        {/* Brand Section */}
        <div className="space-y-4 md:col-span-1">
          <Link to="/" className="flex items-center space-x-2 text-primary hover:opacity-80 transition-opacity">
            <Fuel className="w-6 h-6" />
            <span className="text-xl font-bold tracking-tight">GasSync</span>
          </Link>
          <p className="text-sm text-textSecondary leading-relaxed">
            Your reliable companion for finding CNG stations and planning routes efficiently. Drive further, smarter, and greener.
          </p>
          <div className="flex items-center space-x-4 pt-2">
            <a href="#" className="text-textSecondary hover:text-primary transition-colors p-2 bg-white/5 rounded-full hover:bg-primary/10">
              <Twitter className="w-4 h-4" />
            </a>
            <a href="#" className="text-textSecondary hover:text-primary transition-colors p-2 bg-white/5 rounded-full hover:bg-primary/10">
              <Github className="w-4 h-4" />
            </a>
            <a href="#" className="text-textSecondary hover:text-primary transition-colors p-2 bg-white/5 rounded-full hover:bg-primary/10">
              <Linkedin className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-textPrimary uppercase tracking-wider">Product</h3>
          <ul className="space-y-2 text-sm text-textSecondary">
            <li><Link to="/map" className="hover:text-primary transition-colors">Map View</Link></li>
            <li><Link to="/station/all" className="hover:text-primary transition-colors">All Stations</Link></li>
            <li><Link to="/favorites" className="hover:text-primary transition-colors">Favorites</Link></li>
            <li><Link to="/scanner" className="hover:text-primary transition-colors">QR Scanner</Link></li>
          </ul>
        </div>

        {/* Support */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-textPrimary uppercase tracking-wider">Support</h3>
          <ul className="space-y-2 text-sm text-textSecondary">
            <li><Link to="/profile/help" className="hover:text-primary transition-colors">Help Center</Link></li>
            <li><Link to="/profile/how-to-use" className="hover:text-primary transition-colors">How to Use</Link></li>
            <li><Link to="/profile/feedback" className="hover:text-primary transition-colors">Feedback</Link></li>
            <li><a href="mailto:support@gassync.com" className="hover:text-primary transition-colors flex items-center gap-2"><Mail className="w-3 h-3" /> Contact Us</a></li>
          </ul>
        </div>

        {/* Legal */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-textPrimary uppercase tracking-wider">Legal</h3>
          <ul className="space-y-2 text-sm text-textSecondary">
            <li><Link to="/privacy-policy" className="hover:text-primary transition-colors font-medium">Privacy Policy</Link></li>
            <li><Link to="#" className="hover:text-primary transition-colors">Terms of Service</Link></li>
            <li><Link to="#" className="hover:text-primary transition-colors">Cookie Policy</Link></li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-textSecondary/60">
        <p>&copy; {new Date().getFullYear()} GasSync. All rights reserved.</p>
        <p>Made with ❤️ for a greener tomorrow.</p>
      </div>
    </footer>
  );
};

export default Footer;
