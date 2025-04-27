import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const Privacy = () => {
  const { themeClasses } = useTheme();
  
  return (
    <div className={`${themeClasses.body} min-h-screen py-12`}>
      <div className="container mx-auto px-6 max-w-4xl">
        <h1 className={`text-3xl font-bold mb-8 ${themeClasses.text}`}>Privacy Policy</h1>
        
        <div className={`${themeClasses.card} rounded-lg p-6 mb-8`}>
          <h2 className={`text-xl font-bold mb-4 ${themeClasses.text}`}>1. Information We Collect</h2>
          <p className={`mb-4 ${themeClasses.textSecondary}`}>
            We collect information when you register on our site, save repositories, create tags, and add notes. The information we collect includes:
          </p>
          <ul className={`list-disc pl-6 mb-4 ${themeClasses.textSecondary}`}>
            <li>GitHub account information (username, profile information, email)</li>
            <li>Repositories you save and star</li>
            <li>Tags and notes you create</li>
            <li>Usage data such as features accessed and time spent on the site</li>
          </ul>
          
          <h2 className={`text-xl font-bold mb-4 ${themeClasses.text}`}>2. GitHub API Access</h2>
          <p className={`mb-4 ${themeClasses.textSecondary}`}>
            Git ReadLater uses GitHub's API to access your GitHub account data. We only request the minimum permissions required to provide our services. We do not access private repositories.
          </p>
          
          <h2 className={`text-xl font-bold mb-4 ${themeClasses.text}`}>3. How We Use Your Information</h2>
          <p className={`mb-4 ${themeClasses.textSecondary}`}>
            We use the collected information for various purposes:
          </p>
          <ul className={`list-disc pl-6 mb-4 ${themeClasses.textSecondary}`}>
            <li>To provide, operate, and maintain our service</li>
            <li>To improve, personalize, and expand our service</li>
            <li>To understand and analyze how you use our service</li>
            <li>To develop new products, services, features, and functionality</li>
            <li>To communicate with you for customer service, updates, and marketing</li>
          </ul>
          
          <h2 className={`text-xl font-bold mb-4 ${themeClasses.text}`}>4. Data Storage and Security</h2>
          <p className={`mb-4 ${themeClasses.textSecondary}`}>
            We use industry-standard measures to protect your personal information. Your data is stored in secure databases and is only accessible to authorized personnel. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
          </p>
          
          <h2 className={`text-xl font-bold mb-4 ${themeClasses.text}`}>5. Third-Party Services</h2>
          <p className={`mb-4 ${themeClasses.textSecondary}`}>
            We may employ third-party companies and individuals to facilitate our service, provide the service on our behalf, perform service-related tasks, or assist us in analyzing how our service is used. These third parties have access to your personal information only to perform these tasks and are obligated not to disclose or use it for any other purpose.
          </p>
          
          <h2 className={`text-xl font-bold mb-4 ${themeClasses.text}`}>6. Data Deletion and Exports</h2>
          <p className={`mb-4 ${themeClasses.textSecondary}`}>
            You can request a complete export of your data at any time. You also have the right to request that we delete all of your personal data. You can make these requests through your account settings or by contacting us directly.
          </p>
          
          <h2 className={`text-xl font-bold mb-4 ${themeClasses.text}`}>7. Changes to Privacy Policy</h2>
          <p className={`mb-4 ${themeClasses.textSecondary}`}>
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
          </p>
          
          <h2 className={`text-xl font-bold mb-4 ${themeClasses.text}`}>8. Contact</h2>
          <p className={`${themeClasses.textSecondary}`}>
            If you have any questions about this Privacy Policy, please <Link to="/contact" className={themeClasses.link}>contact us</Link>.
          </p>
        </div>
        
        <div className="text-center">
          <Link to="/" className={`${themeClasses.button} px-6 py-2 rounded-md inline-block`}>
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Privacy;