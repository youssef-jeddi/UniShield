import { arbitrum, arbitrumSepolia, sepolia } from 'viem/chains';

export const bellecour = {
  id: 134,
  name: 'iExec Sidechain',
  nativeCurrency: {
    decimals: 18,
    name: 'xRLC',
    symbol: 'xRLC',
  },
  rpcUrls: {
    public: { http: ['https://bellecour.iex.ec'] },
    default: { http: ['https://bellecour.iex.ec'] },
  },
  blockExplorers: {
    default: { name: 'Blockscout', url: 'https://blockscout-bellecour.iex.ec' },
  },
} as const;

// Sepolia chain ID: 11155111 (where UniShield hook is deployed)
// Arbitrum Sepolia chain ID: 421614 (where iExec DataProtector runs)
export const SEPOLIA_CHAIN_ID = 11155111;
export const ARBITRUM_SEPOLIA_CHAIN_ID = 421614;

export const supportedChains = [
  bellecour,
  sepolia,         // Added for UniShield hook interaction
  arbitrumSepolia,
  arbitrum,
];

// Get App ID from Privy dashboard
export const projectId = import.meta.env.VITE_PRIVY_APP_ID;

if (!projectId) {
  console.warn('You need to provide VITE_PRIVY_APP_ID env variable in .env file');
}

export const privyConfig = {
  appId: projectId || 'your-privy-app-id',
  config: {
    // Supported chains
    supportedChains: supportedChains,
    // Default chain
    defaultChain: bellecour,
    // Login methods
    loginMethods: ['wallet'],
    // Create embedded wallets for users who don't have a wallet
    embeddedWallets: {
      ethereum: {
        createOnLogin: 'users-without-wallets',
      },
    },
    // Appearance
    appearance: {
      theme: 'light',
      accentColor: 'red' as `#${string}`,
    },
  },
};

// Explorer slugs mapping for iExec explorer
export const explorerSlugs: Record<number, string> = {
  134: 'bellecour', // iExec Sidechain (Bellecour)
  42161: 'arbitrum-mainnet', // Arbitrum One
  421614: 'arbitrum-sepolia-testnet', // Arbitrum Sepolia
};