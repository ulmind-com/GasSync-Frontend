import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full min-h-screen bg-background text-textPrimary p-4 sm:p-8 md:p-12 pb-24">
      <div className="max-w-4xl mx-auto space-y-8">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-textSecondary hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        <div className="bg-surface/50 backdrop-blur-md rounded-2xl p-6 sm:p-10 border border-white/5 shadow-xl space-y-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-primary mb-4">Privacy Policy</h1>
          
          <div className="space-y-6 text-textSecondary leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold text-textPrimary mb-2">1. Introduction</h2>
              <p>
                Welcome to GasSync. Your privacy is critically important to us. This Privacy Policy explains how we collect, use, and protect your personal information when you use our website and mobile application.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-textPrimary mb-2">2. Information We Collect</h2>
              <p>
                <strong>Location Data:</strong> GasSync requires access to your location data to provide you with the most accurate information regarding nearby CNG stations. We collect this data only when you authorize it.
              </p>
              <p className="mt-2">
                <strong>Account Information:</strong> When you register, we may collect your name, email address, and vehicle details to personalize your experience.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-textPrimary mb-2">3. How We Use Your Information</h2>
              <p>
                We use the information we collect primarily to:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li>Provide, operate, and maintain our services.</li>
                <li>Show you the nearest CNG stations and route navigation.</li>
                <li>Improve and personalize our app's user experience.</li>
                <li>Communicate with you regarding updates, support, and promotional offers.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-textPrimary mb-2">4. Data Security</h2>
              <p>
                We implement a variety of security measures to maintain the safety of your personal information. However, please remember that no method of transmission over the internet or method of electronic storage is 100% secure.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-textPrimary mb-2">5. Third-Party Services</h2>
              <p>
                GasSync may contain links to third-party websites or services (e.g., Google Maps for navigation). We are not responsible for the privacy practices or the content of these third-party sites.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-textPrimary mb-2">6. Changes to This Privacy Policy</h2>
              <p>
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the effective date.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-textPrimary mb-2">7. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, please contact us at support@gassync.com.
              </p>
            </section>

            <div className="pt-8 text-sm opacity-60">
              <p>Last updated: {new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
