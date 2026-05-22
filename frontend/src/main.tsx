import '@rainbow-me/rainbowkit/styles.css'
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import App from './App.tsx'
import './index.css'
import { xLayerTestnet } from './protocol'

const queryClient = new QueryClient()

const wagmiConfig = getDefaultConfig({
  appName: 'Pundit Protocol',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'pundit-protocol-dev',
  chains: [xLayerTestnet],
  ssr: false,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider initialChain={xLayerTestnet}>
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
)
