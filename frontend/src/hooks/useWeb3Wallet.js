/**
 * TeleSol PayPilot — Web3 EVM Wallet Hook for HSK Chain
 * ══════════════════════════════════════════════════════
 * Features:
 * - Injected EVM wallet integration (MetaMask, Rabby, HashKey Wallet)
 * - Automatic detection of HSK Chain (Chain ID 133: Testnet / 177: Mainnet)
 * - One-click network add/switch to official HSK Chain Testnet
 * - Personal/Typed sign for payment mandate authorization
 * - Explicit user confirmation and rejection error handling
 * - Dedicated Demo Wallet adapter when no extension is installed
 * - Zero seed-phrase or private key storage (strictly adheres to security spec)
 */

import { useState, useEffect, useCallback } from 'react';

export const HSK_TESTNET_CONFIG = {
  chainId: '0x85', // 133 in hex
  chainName: 'HSK Chain Testnet',
  nativeCurrency: {
    name: 'HashKey Token',
    symbol: 'HSK',
    decimals: 18,
  },
  rpcUrls: ['https://testnet.hsk.xyz'],
  blockExplorerUrls: ['https://testnet-explorer.hskchain.net'],
};

export const HSK_MAINNET_CONFIG = {
  chainId: '0xb1', // 177 in hex
  chainName: 'HSK Chain Mainnet',
  nativeCurrency: {
    name: 'HashKey Token',
    symbol: 'HSK',
    decimals: 18,
  },
  rpcUrls: ['https://mainnet.hsk.xyz'],
  blockExplorerUrls: ['https://hsk.blockscout.com'],
};

const DEMO_WALLET_ADDRESS = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

export function useWeb3Wallet() {
  const [address, setAddress] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isDemoWallet, setIsDemoWallet] = useState(true); // Default to safe demo wallet
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  const hasInjectedProvider = typeof window !== 'undefined' && Boolean(window.ethereum);

  // Initialize demo wallet on start
  useEffect(() => {
    if (!address) {
      setAddress(DEMO_WALLET_ADDRESS);
      setChainId(133);
      setIsConnected(true);
      setIsDemoWallet(true);
    }
  }, [address]);

  // Listen to provider accounts and chain changes if available
  useEffect(() => {
    if (!hasInjectedProvider || isDemoWallet) return;

    const handleAccounts = (accounts) => {
      if (accounts && accounts.length > 0) {
        setAddress(accounts[0]);
        setIsConnected(true);
      } else {
        setAddress(null);
        setIsConnected(false);
      }
    };

    const handleChain = (hexChainId) => {
      const numeric = parseInt(hexChainId, 16);
      setChainId(numeric);
    };

    window.ethereum.on?.('accountsChanged', handleAccounts);
    window.ethereum.on?.('chainChanged', handleChain);

    return () => {
      window.ethereum.removeListener?.('accountsChanged', handleAccounts);
      window.ethereum.removeListener?.('chainChanged', handleChain);
    };
  }, [hasInjectedProvider, isDemoWallet]);

  // Connect real EVM browser wallet
  const connectInjectedWallet = useCallback(async () => {
    if (!hasInjectedProvider) {
      setError('No EVM wallet extension detected. Using Demo Wallet.');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        throw new Error('User denied account access.');
      }

      const hexChainId = await window.ethereum.request({ method: 'eth_chainId' });
      const currentChain = parseInt(hexChainId, 16);

      setAddress(accounts[0]);
      setChainId(currentChain);
      setIsConnected(true);
      setIsDemoWallet(false);

      // Prompt switch if not on HSK Chain
      if (currentChain !== 133 && currentChain !== 177) {
        await switchToHskChain(133);
      }
    } catch (err) {
      console.warn('[Wallet] Connection failed:', err.message);
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  }, [hasInjectedProvider]);

  // Switch network to HSK Chain (Testnet or Mainnet)
  const switchToHskChain = useCallback(async (targetChainId = 133) => {
    if (isDemoWallet) {
      setChainId(targetChainId);
      return true;
    }

    if (!hasInjectedProvider) return false;

    const config = targetChainId === 177 ? HSK_MAINNET_CONFIG : HSK_TESTNET_CONFIG;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: config.chainId }],
      });
      setChainId(targetChainId);
      return true;
    } catch (switchError) {
      // Error code 4902 indicates chain has not been added to wallet yet
      if (switchError.code === 4902 || switchError.message?.includes('unrecognized')) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [config],
          });
          setChainId(targetChainId);
          return true;
        } catch (addError) {
          setError(`Failed to add ${config.chainName}: ${addError.message}`);
          return false;
        }
      }
      setError(`Failed to switch to ${config.chainName}: ${switchError.message}`);
      return false;
    }
  }, [hasInjectedProvider, isDemoWallet]);

  // Connect or switch back to safe Demo Wallet
  const connectDemoWallet = useCallback(() => {
    setAddress(DEMO_WALLET_ADDRESS);
    setChainId(133);
    setIsConnected(true);
    setIsDemoWallet(true);
    setError(null);
  }, []);

  const disconnectWallet = useCallback(() => {
    setAddress(null);
    setIsConnected(false);
    setIsDemoWallet(true);
  }, []);

  // Sign Payment Mandate authorization
  const signMandate = useCallback(async (mandate) => {
    if (!mandate) throw new Error('No mandate provided for signing.');

    if (isDemoWallet) {
      // Synthetic verifiable signature for demo mode
      const simulatedSig = `0x5f8173468b8b92b6a9e14a1e94883ef57a916dc25d9961ca3fb6ff9b8c0c1b0177726488d927c8e9b11029c78ea38a087192a5d2077e2dae66f91605f63901b21c`;
      return {
        signature: simulatedSig,
        signer: address || DEMO_WALLET_ADDRESS,
        isDemo: true,
      };
    }

    if (!hasInjectedProvider || !address) {
      throw new Error('Wallet not connected.');
    }

    // Construct human-readable mandate signing prompt
    const message = [
      `TeleSol PayPilot Mandate Authorization`,
      `═════════════════════════════════════════`,
      `Mandate ID: ${mandate.mandate_id}`,
      `Payer: ${address}`,
      `Payee: ${mandate.recipient_address}`,
      `Amount: ${mandate.amount} ${mandate.asset}`,
      `Network: HSK Chain (Chain ID ${mandate.network_id})`,
      `Purpose: ${mandate.purpose}`,
      `Expiry: ${mandate.expiry_timestamp}`,
      `═════════════════════════════════════════`,
      `I authorize HSP Gateway to execute this mandate from my wallet on HSK Chain.`,
    ].join('\n');

    try {
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, address],
      });

      return {
        signature,
        signer: address,
        isDemo: false,
      };
    } catch (err) {
      if (err.code === 4001 || err.message?.includes('User rejected')) {
        throw new Error('Wallet signature was cancelled by the user.');
      }
      throw err;
    }
  }, [address, isDemoWallet, hasInjectedProvider]);

  return {
    address,
    chainId,
    isConnected,
    isDemoWallet,
    isConnecting,
    error,
    hasInjectedProvider,
    connectInjectedWallet,
    connectDemoWallet,
    disconnectWallet,
    switchToHskChain,
    signMandate,
  };
}
