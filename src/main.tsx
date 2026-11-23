import React, { lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { AppStartup } from './AppStartup';
import './styles/index.css';

const App = lazy(() => import('./App'));

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppStartup>
      <App />
    </AppStartup>
  </React.StrictMode>
);
