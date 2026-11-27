import React from 'react';
import ReactDOM from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import './index.css';
import App from './App';

// development は va.vercel-scripts.com を読む。開発と e2e では載せず、本番だけ同じオリジンの /_vercel/insights/script.js を使う。
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    {import.meta.env.PROD ? <Analytics /> : null}
  </React.StrictMode>,
);
