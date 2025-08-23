"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

type UserStats = {
  tokenBalance: number;
  totalTokensEarned: number;
  currentStreak: number;
  longestStreak: number;
  totalSessions: number;
  isBlockchainEnabled: boolean;
};

function SectionCard(props: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-[var(--app-card-border)] bg-[var(--app-card-bg)] p-4 ${props.className || ''}`}>
      <div className="text-xs uppercase tracking-wide text-[var(--ock-text-foreground-muted)] mb-2">
        {props.title}
      </div>
      {props.children}
    </div>
  );
}

function formatNumber(value: number, decimals = 1): string {
  if (value === 0) return "0";
  if (value < 0.001) return "<0.001";
  return value.toFixed(decimals);
}

export default function RewardsCard() {
  const { address } = useAccount();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setStats(null);
      return;
    }

    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        if (!backendUrl) return;
        const response = await fetch(`${backendUrl}/api/whoop/stats/${address}`);
        if (!response.ok) {
          throw new Error('Failed to fetch stats');
        }
        
        const data = await response.json();
        setStats(data);
      } catch (err) {
        console.error('Error fetching user stats:', err);
        setError('Failed to load rewards data');
        setStats({
          tokenBalance: 0,
          totalTokensEarned: 0,
          currentStreak: 0,
          longestStreak: 0,
          totalSessions: 0,
          isBlockchainEnabled: false,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [address]);

  if (!address) {
    return (
      <SectionCard title="Rewards">
        <div className="text-center text-[var(--ock-text-foreground-muted)] py-4">
          Connect your wallet to view rewards
        </div>
      </SectionCard>
    );
  }

  if (loading) {
    return (
      <SectionCard title="Rewards">
        <div className="text-center text-[var(--ock-text-foreground-muted)] py-4">
          Loading rewards...
        </div>
      </SectionCard>
    );
  }

  if (error) {
    return (
      <SectionCard title="Rewards">
        <div className="text-center text-red-500 py-4">
          {error}
        </div>
      </SectionCard>
    );
  }

  if (!stats?.isBlockchainEnabled) {
    return (
      <SectionCard title="Rewards">
        <div className="text-center text-[var(--ock-text-foreground-muted)] py-4">
          Rewards system not available
        </div>
      </SectionCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* Token Balance */}
      <SectionCard title="Your SLEEP Tokens" className="bg-gradient-to-br from-[var(--ock-bg-primary-washed)] to-transparent">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-bold text-[var(--ock-text-primary)]">
              {formatNumber(stats.tokenBalance, 2)} SLEEP
            </div>
            <div className="text-sm text-[var(--ock-text-foreground-muted)]">
              Current Balance
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-[var(--ock-text-foreground-muted)]">Total Earned</div>
            <div className="text-lg font-semibold">
              {formatNumber(stats.totalTokensEarned, 1)}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Streaks */}
      <div className="grid grid-cols-2 gap-3">
        <SectionCard title="Current Streak">
          <div className="flex items-center space-x-2">
            <div className="text-2xl font-bold text-[var(--ock-text-primary)]">
              {stats.currentStreak}
            </div>
            <div className="text-xl">🔥</div>
          </div>
          <div className="text-xs text-[var(--ock-text-foreground-muted)]">
            {stats.currentStreak === 1 ? 'day' : 'days'}
          </div>
        </SectionCard>

        <SectionCard title="Best Streak">
          <div className="flex items-center space-x-2">
            <div className="text-2xl font-bold text-[var(--ock-text-primary)]">
              {stats.longestStreak}
            </div>
            <div className="text-xl">🏆</div>
          </div>
          <div className="text-xs text-[var(--ock-text-foreground-muted)]">
            {stats.longestStreak === 1 ? 'day' : 'days'}
          </div>
        </SectionCard>
      </div>

      {/* Sessions */}
      <SectionCard title="Sleep Sessions">
        <div className="flex items-center justify-between">
          <div className="text-xl font-semibold text-[var(--ock-text-primary)]">
            {stats.totalSessions}
          </div>
          <div className="text-sm text-[var(--ock-text-foreground-muted)]">
            Total recorded
          </div>
        </div>
      </SectionCard>

      {/* Rewards Guide */}
      <SectionCard title="How to Earn More">
        <div className="space-y-2 text-sm text-[var(--ock-text-foreground-muted)]">
          <div className="flex justify-between">
            <span>Good sleep (6+ hrs, 70%+ efficiency)</span>
            <span className="text-[var(--ock-text-primary)]">1-4 tokens</span>
          </div>
          <div className="flex justify-between">
            <span>Weekly improvement bonus</span>
            <span className="text-[var(--ock-text-primary)]">+1-4 tokens</span>
          </div>
          <div className="flex justify-between">
            <span>7+ day streak</span>
            <span className="text-[var(--ock-text-primary)]">+2 tokens</span>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
