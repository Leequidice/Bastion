import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PrivyProvider } from '@privy-io/react-auth'
import './index.css'
import { App } from './App.tsx'
import { creditcoinTestnetChain } from './lib/privyChain.ts'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PrivyProvider
      appId={import.meta.env.VITE_PRIVY_APP_ID}
      config={{
        loginMethods: ['google', 'twitter', 'discord', 'wallet'],
        embeddedWallets: { createOnLogin: 'users-without-wallets' },
        defaultChain: creditcoinTestnetChain,
        supportedChains: [creditcoinTestnetChain],
      }}
    >
      <App />
    </PrivyProvider>
  </StrictMode>,
)
