import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  // React.StrictMode intentionally double-invokes functions to find bugs
  // <React.StrictMode>
    <App />
  // </React.StrictMode>
);