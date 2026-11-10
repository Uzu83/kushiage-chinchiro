import React from 'react';
import ReactDOM from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import './index.css';
import App from './App';
import { webAnalyticsEnabled } from './lib/webAnalytics';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    {webAnalyticsEnabled(import.meta.env.PROD) ? <Analytics /> : null}
  </React.StrictMode>,
);
