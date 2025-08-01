import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '../App.tsx'
import '../styles/globals.css'

console.log('main.tsx loaded');

const root = document.getElementById('root');
if (!root) {
  console.error('Root element not found!');
} else {
  try {
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
    console.log('React app rendered successfully');
  } catch (error) {
    console.error('Error rendering app:', error);
  }
}