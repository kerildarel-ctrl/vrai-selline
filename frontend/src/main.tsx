import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { FavoritesProvider } from './context/FavoritesContext'
import { CountersProvider } from './context/CountersContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <FavoritesProvider><CountersProvider><CartProvider>
          <App />
        </CartProvider></CountersProvider></FavoritesProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
