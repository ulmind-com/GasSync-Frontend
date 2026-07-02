import React from 'react';

const Footer = () => {
  return (
    <footer className="w-full p-4 mt-auto border-t border-white/10 bg-background/50 backdrop-blur-md text-center text-textSecondary text-sm">
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center space-y-2">
        <p>&copy; {new Date().getFullYear()} GasSync. All rights reserved.</p>
        <p className="max-w-2xl text-xs opacity-80">
          <strong>Privacy Policy:</strong> Your privacy is important to us. GasSync collects location data solely to help you find nearby CNG stations. We do not sell or share your personal information with third parties. By using this service, you consent to our data practices as outlined here.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
