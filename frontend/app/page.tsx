"use client";

import { Address, Avatar, EthBalance, Identity, Name } from "@coinbase/onchainkit/identity";
import { useAddFrame, useMiniKit, useOpenUrl } from "@coinbase/onchainkit/minikit";
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";

export default function SleepToEarnApp() {
  const { setFrameReady, isFrameReady, context } = useMiniKit();
  const addFrame = useAddFrame();
  const openUrl = useOpenUrl();
  const { address } = useAccount();

  const [frameAdded, setFrameAdded] = useState(false);
  const [isLoading] = useState(false);
  const [isWhoopConnected, setIsWhoopConnected] = useState<boolean | null>(null);
  const [isCheckingWhoop, setIsCheckingWhoop] = useState(false);

  useEffect(() => {
    if (!isFrameReady) setFrameReady();
  }, [isFrameReady, setFrameReady]);

  // No-op: WHOOP events sync on backend via webhooks
  useEffect(() => {
    void context?.user?.fid;
  }, [context?.user?.fid]);

  const checkUserRegistration = useCallback(async () => {
    try {
      if (localStorage.getItem("whoop:" + address)) {
        setIsWhoopConnected(true);
        return;
      }

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      if (!backendUrl) return false;
      const res = await fetch(`${backendUrl}/api/whoop/user/${address}`);
      if (res.ok) {
        setIsWhoopConnected(true);  
        setIsCheckingWhoop(false);
        localStorage.setItem("whoop:" + address, "true");
      }
    } catch (e) {
      console.error(e);
    }
  }, [address]);

  useEffect(() => {
    if (address) {
      checkUserRegistration();
    }
  }, [address, checkUserRegistration]);

  const handleAddFrame = useCallback(async () => {
    const added = await addFrame();
    setFrameAdded(Boolean(added));
  }, [addFrame]);

  const saveFrameButton = useMemo(() => {
    if (context && !context.client.added) {
      return (
        <button
          className="text-[var(--app-accent)] p-2 text-sm"
          onClick={handleAddFrame}
        >
          + Save Frame
        </button>
      );
    }
    if (frameAdded) {
      return <span className="text-[#0052FF] text-sm">Saved</span>;
    }
    return null;
  }, [context, frameAdded, handleAddFrame]);

  const handleClaim = async () => {
    alert("Claim logic will be triggered after WHOOP sleep is verified.");
  };

  return (
    <div className="flex flex-col min-h-screen font-sans text-[var(--app-foreground)] mini-app-theme from-[var(--app-background)] to-[var(--app-gray)]">
      <div className="w-full max-w-md mx-auto px-4 py-3">
        <header className="flex justify-between items-center mb-3 h-11">
          <div>
            <div className="flex items-center space-x-2">
              <Wallet className="z-10">
                <ConnectWallet>
                  <Name className="text-inherit" />
                </ConnectWallet>
                <WalletDropdown>
                  <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                    <Avatar />
                    <Name />
                    <Address />
                    <EthBalance />
                  </Identity>
                  <WalletDropdownDisconnect />
                </WalletDropdown>
              </Wallet>
            </div>
          </div>
          <div>{saveFrameButton}</div>
        </header>

        <main className="flex-1 space-y-4">
          <h1 className="text-xl font-semibold">SleepToEarn</h1>
          <p className="text-sm text-[var(--ock-text-foreground-muted)]">Connect your WHOOP and sleep to earn</p>

          {address ? (
            isWhoopConnected ? (
              <div className="w-full inline-block text-center bg-green-600 text-white rounded p-3">
                WHOOP Connected
              </div>
            ) : (
              <a
                className="w-full inline-block text-center bg-black text-white rounded p-3 disabled:bg-gray-400"
                href={`/api/whoop/connect?wallet=${address}`}
                aria-disabled={isCheckingWhoop}
                onClick={(e) => {
                  if (isCheckingWhoop) e.preventDefault();
                }}
              >
                {isCheckingWhoop ? 'Preparing…' : 'Connect WHOOP'}
              </a>
            )
          ) : (
            <a
              className="w-full inline-block text-center bg-black text-white rounded p-3 disabled:bg-gray-400"
              aria-disabled
              onClick={(e) => e.preventDefault()}
            >
              Connect wallet first
            </a>
          )}

          <button
            className="w-full bg-blue-600 text-white rounded p-3 disabled:bg-gray-400"
            onClick={handleClaim}
            disabled={isLoading}
          >
            Claim Reward
          </button>

          <button
            className="w-full text-xs text-[var(--ock-text-foreground-muted)]"
            onClick={() => openUrl("https://docs.base.org/base-app/build-with-minikit/overview")}
          >
            Built on Base with MiniKit
          </button>
        </main>
      </div>
    </div>
  );
}
