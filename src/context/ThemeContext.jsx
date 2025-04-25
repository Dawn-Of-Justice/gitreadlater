import React, { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme ? savedTheme === 'dark' : true; // Default to dark mode
  });

  useEffect(() => {
    // Listen for theme changes from other windows
    const handleStorageChange = (e) => {
      if (e.key === 'theme') {
        setDarkMode(e.newValue === 'dark');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Listen for custom events within same window
    const handleCustomThemeChange = (e) => {
      setDarkMode(e.detail.darkMode);
    };
    
    document.addEventListener('themeChange', handleCustomThemeChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('themeChange', handleCustomThemeChange);
    };
  }, []);

  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
    
    // Dispatch custom event for same-window components
    document.dispatchEvent(new CustomEvent('themeChange', { 
      detail: { darkMode: newMode } 
    }));
    
    // Force a storage event for other windows
    try {
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'theme',
        newValue: newMode ? 'dark' : 'light',
        url: window.location.href
      }));
    } catch (err) {
      console.error('Error dispatching storage event:', err);
    }
  };

  // GitHub-like theme classes
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
    <ThemeContext.Provider value={{ darkMode, toggleTheme, themeClasses }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}