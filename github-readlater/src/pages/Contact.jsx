import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaEnvelope, FaTwitter, FaGithub } from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';

const Contact = () => {
  const { themeClasses } = useTheme();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Here you would typically send the form data to your backend
      // For now, we'll just simulate a successful submission
      
      console.log('Form submitted:', formData);
      
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
      console.error('Error submitting form:', err);
      setError('There was an error sending your message. Please try again.');
    }
  };
  
  return (
    <div className={`${themeClasses.body} min-h-screen py-8 px-4 sm:px-6 sm:py-12`}>
      <div className="container mx-auto max-w-4xl">
        <h1 className={`text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 ${themeClasses.text} text-center sm:text-left`}>Contact Us</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Form Section - Takes 2/3 width on large screens */}
          <div className="lg:col-span-2 order-2 lg:order-1">
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
                <form onSubmit={handleSubmit}>
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
                    ></textarea>
                  </div>
                  
                  <button type="submit" className={`${themeClasses.button} px-6 py-3 rounded-md font-medium text-base`}>
                    Send Message
                  </button>
                </form>
              )}
            </div>
          </div>
          
          <div className="order-1 lg:order-2">
            <div className={`${themeClasses.card} rounded-lg p-4 sm:p-6 shadow-md`}>
              <h2 className={`text-xl font-bold mb-4 ${themeClasses.text}`}>Connect With Us</h2>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className={`mt-1 ${themeClasses.text}`}>
                    <FaEnvelope />
                  </div>
                  <div>
                    <h3 className={`font-medium ${themeClasses.text}`}>Email</h3>
                    <p className={themeClasses.textSecondary}>support@githubreadlater.com</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className={`mt-1 ${themeClasses.text}`}>
                    <FaTwitter />
                  </div>
                  <div>
                    <h3 className={`font-medium ${themeClasses.text}`}>Twitter</h3>
                    <a href="https://twitter.com/gitreadlater" className={themeClasses.link} target="_blank" rel="noopener noreferrer">
                      @gitreadlater
                    </a>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className={`mt-1 ${themeClasses.text}`}>
                    <FaGithub />
                  </div>
                  <div>
                    <h3 className={`font-medium ${themeClasses.text}`}>GitHub</h3>
                    <a href="https://github.com/gitreadlater" className={themeClasses.link} target="_blank" rel="noopener noreferrer">
                      github.com/gitreadlater
                    </a>
                  </div>
                </div>
              </div>
              
              <div className={`mt-6 pt-6 border-t ${themeClasses.divider}`}>
                <h3 className={`font-medium mb-2 ${themeClasses.text}`}>Office Hours</h3>
                <p className={themeClasses.textSecondary}>Monday - Friday</p>
                <p className={themeClasses.textSecondary}>9:00 AM - 6:00 PM EST</p>
              </div>
            </div>
          </div>
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