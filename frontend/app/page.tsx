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
import SleepCard from "./components/SleepCard";
import RewardsCard from "./components/RewardsCard";
import Leaderboard from "./components/Leaderboard";
import { useAccount } from "wagmi";

export default function SleepToEarnApp() {
  const { setFrameReady, isFrameReady, context } = useMiniKit();
  const addFrame = useAddFrame();
  const openUrl = useOpenUrl();
  const { address } = useAccount();

  const [frameAdded, setFrameAdded] = useState(false);
  const [isWhoopConnected, setIsWhoopConnected] = useState<boolean | null>(null);
  const [isCheckingWhoop, setIsCheckingWhoop] = useState(false);
  const [activeTab, setActiveTab] = useState<'sleep' | 'rewards' | 'leaderboard'>('sleep');
  const [sleepData, setSleepData] = useState<unknown | null>(null);
  const [sleepLoading, setSleepLoading] = useState(false);
  const [sleepError, setSleepError] = useState<string | null>(null);

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


  const fetchSleep = useCallback(async () => {
    try {
      if (!address) return;
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      if (!backendUrl) return;
      setSleepLoading(true);
      setSleepError(null);
      setSleepData(null);
      const res = await fetch(`${backendUrl}/api/whoop/sleep/${address}`, {
        cache: "no-store",  
      });
      if (!res.ok) {
        const text = await res.text();
        setSleepError(text || "Failed to fetch sleep");
        setSleepLoading(false);
        return;
      }
      const json = await res.json();
      setSleepData(json ?? null);
    } catch {
      setSleepError("Network error");
    } finally {
      setSleepLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (address && isWhoopConnected) {
      void fetchSleep();
    }
  }, [address, isWhoopConnected, fetchSleep]);

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
          <div className="rounded-2xl p-4 bg-gradient-to-br from-[var(--ock-bg-primary-washed)] to-transparent border border-[var(--app-card-border)]">
            <h1 className="text-xl font-semibold">SleepToEarn</h1>
            <p className="text-sm text-[var(--ock-text-foreground-muted)]">Connect your WHOOP and sleep to earn</p>
          </div>

          {address ? (
            isWhoopConnected ? (
              <div className="w-full inline-block text-center rounded-xl p-3 border border-[var(--app-card-border)] bg-[var(--app-card-bg)] text-green-600">WHOOP Connected</div>
            ) : (
              <a
                className="w-full inline-block text-center rounded-xl p-3 disabled:bg-gray-400 bg-[var(--ock-bg-inverse)] text-[var(--ock-text-inverse)]"
                href={`/api/whoop/connect?wallet=${address}`}
                aria-disabled={isCheckingWhoop}
                onClick={(ev) => {
                  if (isCheckingWhoop) ev.preventDefault();
                }}
              >
                {isCheckingWhoop ? 'Preparing…' : 'Connect WHOOP'}
              </a>
            )
          ) : (
            <a
              className="w-full inline-block text-center rounded-xl p-3 disabled:bg-gray-400 bg-[var(--ock-bg-inverse)] text-[var(--ock-text-inverse)]"
              aria-disabled
              onClick={(ev) => ev.preventDefault()}
            >
              Connect wallet first
            </a>
          )}

          {address && isWhoopConnected && (
            <div className="space-y-4">
              {/* Tab Navigation */}
              <div className="flex space-x-2 bg-[var(--ock-bg-alternate)] p-1 rounded-lg">
                <button
                  onClick={() => setActiveTab('sleep')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'sleep'
                      ? 'bg-[var(--ock-bg-primary)] text-[var(--ock-text-primary-inverse)]'
                      : 'text-[var(--ock-text-foreground-muted)] hover:text-[var(--ock-text-foreground)]'
                  }`}
                >
                  💤 Sleep
                </button>
                <button
                  onClick={() => setActiveTab('rewards')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'rewards'
                      ? 'bg-[var(--ock-bg-primary)] text-[var(--ock-text-primary-inverse)]'
                      : 'text-[var(--ock-text-foreground-muted)] hover:text-[var(--ock-text-foreground)]'
                  }`}
                >
                  🪙 Rewards
                </button>
                <button
                  onClick={() => setActiveTab('leaderboard')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'leaderboard'
                      ? 'bg-[var(--ock-bg-primary)] text-[var(--ock-text-primary-inverse)]'
                      : 'text-[var(--ock-text-foreground-muted)] hover:text-[var(--ock-text-foreground)]'
                  }`}
                >
                  🏆 Leaderboard
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === 'sleep' && (
                <div className="space-y-3">
                  <div>
                    {sleepLoading ? (
                      <div className="rounded-xl border border-[var(--app-card-border)] bg-[var(--app-card-bg)] p-4 animate-pulse text-sm">Loading sleep…</div>
                    ) : sleepError ? (
                      <div className="rounded-xl border border-[var(--app-card-border)] bg-[var(--app-card-bg)] p-4 text-sm text-[var(--ock-text-error)]">{sleepError}</div>
                    ) : sleepData ? (
                      <SleepCard data={sleepData} />
                    ) : (
                      <div className="rounded-xl border border-[var(--app-card-border)] bg-[var(--app-card-bg)] p-4 text-sm text-[var(--ock-text-foreground-muted)]">No sleep found for selected date yet.</div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'rewards' && <RewardsCard />}
              
              {activeTab === 'leaderboard' && <Leaderboard />}
            </div>
          )}



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
