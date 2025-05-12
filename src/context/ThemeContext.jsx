import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

const ThemeContext = createContext();
const SubscriptionContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Improved initial dark mode detection - Firefox compatibility
  const [darkMode, setDarkMode] = useState(() => {
    try {
      // First check localStorage
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme !== null) {
        return savedTheme === 'dark';
      }
      // Then check system preference
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch (e) {
      // Fallback to light mode
      return false;
    }
  });
  
  // Theme toggle function
  const toggleTheme = () => {
    setDarkMode(prev => !prev);
  };
  
  // Effect for updating theme when darkMode changes
  useEffect(() => {
    try {
      localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    } catch (e) {
      console.error('Failed to save theme preference:', e);
    }
    
    setTimeout(() => {
      if (darkMode) {
        document.documentElement.classList.add('dark');
        document.documentElement.style.setProperty('--bg-color', '#0d1117');
        document.documentElement.style.setProperty('--text-color', '#f0f6fc');
        document.body.style.backgroundColor = '#0d1117';
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.style.setProperty('--bg-color', '#ffffff'); // Change to pure white
        document.documentElement.style.setProperty('--text-color', '#24292f');
        document.body.style.backgroundColor = '#ffffff'; // Explicitly set body background
      }
    }, 10); // Slightly longer timeout for Firefox
  }, [darkMode]);
  
  // Additional theme classes
  const themeClasses = {
    body: darkMode 
      ? "bg-[#0d1117] text-[#f0f6fc]" 
      : "bg-[#ffffff] text-[#24292f]",
    card: darkMode 
      ? "bg-[#21262d] border-[#30363d]" 
      : "bg-white border-[#d0d7de] shadow-md",
    button: darkMode 
      ? "bg-[#1f6feb] hover:bg-[#388bfd] text-white" 
      : "bg-[#0969da] hover:bg-[#1a7ffc] text-white",
    secondaryButton: darkMode 
      ? "bg-[#21262d] hover:bg-[#30363d] text-[#f0f6fc]" 
      : "bg-[#f6f8fa] hover:bg-[#e1e4e8] text-[#24292f]",
    dangerButton: darkMode 
      ? "bg-[#da3633] hover:bg-[#f85149] text-white" 
      : "bg-[#d73a49] hover:bg-[#cb2431] text-white",
    input: darkMode 
      ? "bg-[#0d1117] border-[#30363d] text-[#f0f6fc] placeholder-[#6e7681]" 
      : "bg-white border-[#d0d7de] text-[#24292f] placeholder-[#6e7681]",
    tag: darkMode 
      ? "bg-[#30363d] text-[#8b949e] hover:bg-[#3c444d]" 
      : "bg-[#f6f8fa] text-[#57606a] hover:bg-[#e1e4e8]",
    tagSelected: darkMode 
      ? "bg-[#1f6feb] text-white" 
      : "bg-[#0969da] text-white",
    warningBanner: darkMode 
      ? "bg-[#261d15] text-[#d29922]" 
      : "bg-[#ffefc6] text-[#9e6a03]",
    dangerBanner: darkMode 
      ? "bg-[#36191a] text-[#f85149]" 
      : "bg-[#ffebe9] text-[#d73a49]",
    infoBanner: darkMode 
      ? "bg-[#0d419d] text-[#58a6ff]" 
      : "bg-[#ddf4ff] text-[#0969da]",
    sectionDark: darkMode 
      ? "bg-[#161b22]" 
      : "bg-[#f6f8fa]",
    header: darkMode 
      ? "bg-[#161b22] text-[#f0f6fc] border-b border-[#30363d]" 
      : "bg-white text-[#24292f] border-b border-[#d0d7de]",
    navLink: darkMode 
      ? "text-[#8b949e] hover:text-[#f0f6fc]" 
      : "text-[#57606a] hover:text-[#24292f]",
    footer: darkMode 
      ? "bg-[#0d1117] text-[#f0f6fc] border-t border-[#30363d]" 
      : "bg-white text-[#24292f] border-t border-[#d0d7de]",
    text: darkMode 
      ? "text-[#f0f6fc]" 
      : "text-[#24292f]",
    textSecondary: darkMode 
      ? "text-[#8b949e]" 
      : "text-[#57606a]",
    divider: darkMode 
      ? "border-[#30363d]" 
      : "border-[#d0d7de]",
    link: darkMode 
      ? "text-[#58a6ff] hover:underline" 
      : "text-[#0969da] hover:underline",
    emptyState: darkMode 
      ? "bg-[#21262d]" 
      : "bg-[#f6f8fa]",
    cardHighlight: darkMode 
      ? "border-[#1f6feb]" 
      : "border-[#0969da]",
    mobileMenu: darkMode 
      ? "bg-[#21262d]" 
      : "bg-[#f6f8fa]",
    readmeHeader: darkMode 
      ? "bg-[#30363d] border-[#444c56]" 
      : "bg-[#f6f8fa] border-[#d0d7de]",
    readmeContent: darkMode 
      ? "text-[#c9d1d9]" 
      : "text-[#24292f]",
    modal: darkMode 
      ? "bg-[#21262d]" 
      : "bg-white",
    premiumHeader: darkMode 
      ? "bg-[#1f6feb] text-white" 
      : "bg-[#0969da] text-white",
    planHeader: darkMode 
      ? "bg-[#30363d] border-[#444c56]" 
      : "bg-[#f6f8fa] border-[#d0d7de]",
    starredItem: darkMode 
      ? "hover:bg-[#30363d] border-[#30363d]" 
      : "hover:bg-[#f6f8fa] border-[#d0d7de]",
    tagSuggestion: darkMode 
      ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' 
      : 'bg-gray-200 hover:bg-gray-300 text-gray-700',
  };
  
  return (
    <ThemeContext.Provider value={{
      darkMode,
      toggleDarkMode,
      themeClasses,
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  return useContext(ThemeContext);
}

export const SubscriptionProvider = ({ children }) => {
  const [loading, setLoading] = useState(true);

  return (
    <SubscriptionContext.Provider
      value={{
        loading
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => useContext(SubscriptionContext);