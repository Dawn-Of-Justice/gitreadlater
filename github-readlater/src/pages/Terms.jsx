import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const Terms = () => {
  const { themeClasses } = useTheme();
  
  return (
    <div className={`${themeClasses.body} min-h-screen py-12`}>
      <div className="container mx-auto px-6 max-w-4xl">
        <h1 className={`text-3xl font-bold mb-8 ${themeClasses.text}`}>Terms of Service</h1>
        
        <div className={`${themeClasses.card} rounded-lg p-6 mb-8`}>
          <h2 className={`text-xl font-bold mb-4 ${themeClasses.text}`}>1. Introduction</h2>
          <p className={`mb-4 ${themeClasses.textSecondary}`}>
            Welcome to GitHub ReadLater. By accessing or using our service, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access our service.
          </p>
          
          <h2 className={`text-xl font-bold mb-4 ${themeClasses.text}`}>2. GitHub Account Integration</h2>
          <p className={`mb-4 ${themeClasses.textSecondary}`}>
            GitHub ReadLater integrates with your GitHub account. You are responsible for maintaining the security of your GitHub account and credentials. We are not responsible for any loss or damage arising from your failure to comply with this security obligation.
          </p>
          
          <h2 className={`text-xl font-bold mb-4 ${themeClasses.text}`}>3. User Content</h2>
          <p className={`mb-4 ${themeClasses.textSecondary}`}>
            Our service allows you to save, organize, and annotate GitHub repositories. You are solely responsible for the content you save and the notes you add. You must not save content that infringes on intellectual property rights, violates privacy rights, or is otherwise unlawful or inappropriate.
          </p>
          
          <h2 className={`text-xl font-bold mb-4 ${themeClasses.text}`}>4. Subscription and Payment</h2>
          <p className={`mb-4 ${themeClasses.textSecondary}`}>
            Some features of GitHub ReadLater are offered on a subscription basis. You agree to pay the fees at the rates in effect when the charges are incurred. You must provide current, complete, and accurate billing information. We may suspend or terminate your account if your payment is overdue.
          </p>
          
          <h2 className={`text-xl font-bold mb-4 ${themeClasses.text}`}>5. Intellectual Property</h2>
          <p className={`mb-4 ${themeClasses.textSecondary}`}>
            The service and its original content (excluding content saved by users) are and will remain the exclusive property of GitHub ReadLater and its licensors. The service is protected by copyright, trademark, and other laws. Our trademarks and visual identity may not be used without our prior written consent.
          </p>
          
          <h2 className={`text-xl font-bold mb-4 ${themeClasses.text}`}>6. Limitation of Liability</h2>
          <p className={`mb-4 ${themeClasses.textSecondary}`}>
            In no event shall GitHub ReadLater, its directors, employees, partners, agents, suppliers, or affiliates be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or other intangible losses, resulting from your access to or use of our service.
          </p>
          
          <h2 className={`text-xl font-bold mb-4 ${themeClasses.text}`}>7. Changes to Terms</h2>
          <p className={`mb-4 ${themeClasses.textSecondary}`}>
            We reserve the right to modify or replace these Terms at any time. We will provide notice of any changes by posting the new Terms on this page. You are advised to review these Terms periodically for changes.
          </p>
          
          <h2 className={`text-xl font-bold mb-4 ${themeClasses.text}`}>8. Contact</h2>
          <p className={`${themeClasses.textSecondary}`}>
            If you have any questions about these Terms, please <Link to="/contact" className={themeClasses.link}>contact us</Link>.
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

export default Terms;