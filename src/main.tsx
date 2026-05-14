import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// Chrome extension content scripts can inject async message listeners that
// close their channel before responding, producing this noisy unhandled
// rejection. It is not our code — suppress it so it doesn't clutter the console.
window.addEventListener('unhandledrejection', (event) => {
    if (
        event.reason?.message?.includes(
            'A listener indicated an asynchronous response by returning true'
        )
    ) {
        event.preventDefault();
    }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)