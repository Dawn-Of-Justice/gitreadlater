import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FaEnvelope } from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';
import emailjs from '@emailjs/browser';

const Contact = () => {
  const form = useRef();
  const { themeClasses } = useTheme();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Send email using EmailJS with Vite environment variables
      const result = await emailjs.sendForm(
        import.meta.env.VITE_EMAILJS_SERVICE_ID, 
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        form.current,
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY
      );
      
      console.log('Email sent successfully:', result.text);
      
      // Clear form and show success message
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: ''
      });
      setSubmitted(true);
      setError(null);
    } catch (err) {
      console.error('Error sending email:', err);
      setError('There was an error sending your message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className={`${themeClasses.body} min-h-screen py-8 px-4 sm:px-6 sm:py-12`}>
      <div className="container mx-auto max-w-2xl">
        <h1 className={`text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 ${themeClasses.text} text-center`}>Contact Us</h1>
        
        <div className={`${themeClasses.card} rounded-lg p-4 sm:p-6 shadow-md`}>
          {submitted ? (
            <div className="text-center py-8">
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${themeClasses.button} mb-4`}>
                <FaEnvelope className="text-2xl" />
              </div>
              <h2 className={`text-xl sm:text-2xl font-bold mb-4 ${themeClasses.text}`}>Message Sent!</h2>
              <p className={`mb-6 ${themeClasses.textSecondary}`}>
                Thank you for reaching out. We'll get back to you as soon as possible.
              </p>
              <button 
                onClick={() => setSubmitted(false)}
                className={`${themeClasses.secondaryButton} px-6 py-3 rounded-md text-base`}
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form ref={form} onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
                  <p>{error}</p>
                </div>
              )}
              
              <div className="mb-5">
                <label htmlFor="name" className={`block mb-2 font-medium ${themeClasses.text} text-sm sm:text-base`}>
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${themeClasses.input} text-base`}
                  placeholder="Your name"
                />
              </div>
              
              <div className="mb-5">
                <label htmlFor="email" className={`block mb-2 font-medium ${themeClasses.text} text-sm sm:text-base`}>
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${themeClasses.input} text-base`}
                  placeholder="your.email@example.com"
                />
              </div>
              
              <div className="mb-5">
                <label htmlFor="subject" className={`block mb-2 font-medium ${themeClasses.text} text-sm sm:text-base`}>
                  Subject
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${themeClasses.input} text-base`}
                  placeholder="Subject"
                />
              </div>
              
              <div className="mb-6">
                <label htmlFor="message" className={`block mb-2 font-medium ${themeClasses.text} text-sm sm:text-base`}>
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows="6"
                  className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${themeClasses.input} text-base`}
                  placeholder="Your message"
                />
              </div>
              
              <button 
                type="submit" 
                className={`${themeClasses.button} w-full sm:w-auto px-6 py-3 rounded-md font-medium text-base flex items-center justify-center`}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </>
                ) : (
                  'Send Message'
                )}
              </button>
            </form>
          )}
        </div>
        
        <div className="text-center mt-8">
          <Link to="/" className={`${themeClasses.secondaryButton} px-6 py-2 rounded-md inline-block`}>
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Contact;