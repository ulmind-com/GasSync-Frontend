import React from 'react';
import { Link } from 'react-router-dom';
import { Fuel, Mail } from 'lucide-react';

const TwitterIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 22.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.008 5.961h-1.833z" />
  </svg>
);

const GithubIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
  </svg>
);

const LinkedinIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" />
  </svg>
);

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
              <TwitterIcon className="w-4 h-4" />
            </a>
            <a href="#" className="text-textSecondary hover:text-primary transition-colors p-2 bg-white/5 rounded-full hover:bg-primary/10">
              <GithubIcon className="w-4 h-4" />
            </a>
            <a href="#" className="text-textSecondary hover:text-primary transition-colors p-2 bg-white/5 rounded-full hover:bg-primary/10">
              <LinkedinIcon className="w-4 h-4" />
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
        <div className="flex items-center gap-1.5">
          <span>Developed by</span>
          <a href="https://www.ulmind.com" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
            <img src="/ulmind.png" alt="ULMiND" className="h-5 w-auto" />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
