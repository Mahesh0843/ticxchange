import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import './styles/App.css'; // Global styles

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root') // Matches the id in `index.html`
);
