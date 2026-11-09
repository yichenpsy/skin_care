import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import App from './App'
import "./styles/globals.css"
import { AuthProvider } from './context/AuthContext'
import { ChatProvider } from './context/ChatContext'

// Pages cannot rewrite nested URLs to index.html. Hash routes work on static hosts.
const Router = import.meta.env.VITE_ROUTER_MODE === 'hash' ? HashRouter : BrowserRouter

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
       <ChatProvider>
         <Router>
           <App />
        </Router>
       </ChatProvider>
    </AuthProvider>
  </React.StrictMode>,
)
