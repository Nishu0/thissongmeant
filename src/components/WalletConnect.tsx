"use client";

import { useCallback } from "react";
import { 
  useAccount, 
  useConnect, 
  useDisconnect,
  useChainId
} from "wagmi";
import { Button } from "~/components/ui/Button";
import { truncateAddress } from "~/lib/truncateAddress";

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { disconnect } = useDisconnect();
  const { connect, connectors } = useConnect();

  const handleConnect = useCallback(() => {
    // Check if MetaMask connector is available (usually index 2 in the connectors array)
    const metamaskConnector = connectors.find(c => c.name === 'MetaMask') || connectors[0];
    connect({ connector: metamaskConnector });
  }, [connect, connectors]);

  return (
    <div className="flex flex-col gap-2">
      {address && (
        <div className="text-sm">
          Connected: <span className="font-mono">{truncateAddress(address)}</span>
        </div>
      )}
      
      {chainId && (
        <div className="text-sm">
          Chain ID: <span className="font-mono">{chainId}</span>
        </div>
      )}
      
      {isConnected ? (
        <Button onClick={() => disconnect()}>
          Disconnect Wallet
        </Button>
      ) : (
        <Button onClick={handleConnect}>
          Connect with MetaMask
        </Button>
      )}
    </div>
  );
} 