"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

type LeaderboardUser = {
  walletAddress: string;
  tokenBalance: number;
  currentStreak: number;
  longestStreak: number;
  totalSessions: number;
  rank: number;
};

type LeaderboardData = {
  users: LeaderboardUser[];
  isBlockchainEnabled: boolean;
};

type UserRank = {
  rank: number | null;
  totalUsers: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  userStats: any;
};

function SectionCard(props: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-[var(--app-card-border)] bg-[var(--app-card-bg)] p-4 ${props.className || ''}`}>
      <div className="text-xs uppercase tracking-wide text-[var(--ock-text-foreground-muted)] mb-3">
        {props.title}
      </div>
      {props.children}
    </div>
  );
}

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatNumber(value: number, decimals = 1): string {
  if (value === 0) return "0";
  if (value < 0.001) return "<0.001";
  return value.toFixed(decimals);
}

function getRankEmoji(rank: number): string {
  switch (rank) {
    case 1: return "🥇";
    case 2: return "🥈";
    case 3: return "🥉";
    default: return `#${rank}`;
  }
}

export default function Leaderboard() {
  const { address } = useAccount();
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [userRank, setUserRank] = useState<UserRank | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overall' | 'weekly'>('overall');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch leaderboard data
        const leaderboardResponse = await fetch(`/api/leaderboard?limit=10`);
        if (!leaderboardResponse.ok) {
          throw new Error('Failed to fetch leaderboard');
        }
        const leaderboardData = await leaderboardResponse.json();
        setLeaderboard(leaderboardData);

        // Fetch user rank if wallet is connected
        if (address) {
          const rankResponse = await fetch(`/api/leaderboard/user/${address}`);
          if (rankResponse.ok) {
            const rankData = await rankResponse.json();
            setUserRank(rankData);
          }
        }
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
        setError('Failed to load leaderboard');
        setLeaderboard({
          users: [],
          isBlockchainEnabled: false,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [address]);

  if (loading) {
    return (
      <SectionCard title="Leaderboard">
        <div className="text-center text-[var(--ock-text-foreground-muted)] py-8">
          Loading leaderboard...
        </div>
      </SectionCard>
    );
  }

  if (error) {
    return (
      <SectionCard title="Leaderboard">
        <div className="text-center text-red-500 py-8">
          {error}
        </div>
      </SectionCard>
    );
  }

  if (!leaderboard?.isBlockchainEnabled) {
    return (
      <SectionCard title="Leaderboard">
        <div className="text-center text-[var(--ock-text-foreground-muted)] py-8">
          Leaderboard not available
        </div>
      </SectionCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* User's Rank */}
      {address && userRank?.rank && (
        <SectionCard title="Your Rank" className="bg-gradient-to-br from-[var(--ock-bg-primary-washed)] to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-2xl font-bold text-[var(--ock-text-primary)]">
                {getRankEmoji(userRank.rank)}
              </div>
              <div>
                <div className="font-semibold">Rank {userRank.rank}</div>
                <div className="text-sm text-[var(--ock-text-foreground-muted)]">
                  out of {userRank.totalUsers} users
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold">
                {formatNumber(userRank.userStats?.tokenBalance || 0, 2)} SLEEP
              </div>
              <div className="text-sm text-[var(--ock-text-foreground-muted)]">
                {userRank.userStats?.currentStreak || 0} day streak
              </div>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-2">
        <button
          onClick={() => setActiveTab('overall')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'overall'
              ? 'bg-[var(--ock-bg-primary)] text-[var(--ock-text-primary-inverse)]'
              : 'bg-[var(--ock-bg-alternate)] text-[var(--ock-text-foreground-muted)] hover:bg-[var(--ock-bg-primary-washed)]'
          }`}
        >
          Overall
        </button>
        <button
          onClick={() => setActiveTab('weekly')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'weekly'
              ? 'bg-[var(--ock-bg-primary)] text-[var(--ock-text-primary-inverse)]'
              : 'bg-[var(--ock-bg-alternate)] text-[var(--ock-text-foreground-muted)] hover:bg-[var(--ock-bg-primary-washed)]'
          }`}
        >
          Weekly
        </button>
      </div>

      {/* Leaderboard List */}
      <SectionCard title={activeTab === 'overall' ? 'Top Sleep Earners' : 'Weekly Improvement Leaders'}>
        {leaderboard.users.length === 0 ? (
          <div className="text-center text-[var(--ock-text-foreground-muted)] py-8">
            No users found. Be the first to start earning!
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboard.users.map((user) => (
              <div
                key={user.walletAddress}
                className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                  user.walletAddress.toLowerCase() === address?.toLowerCase()
                    ? 'bg-[var(--ock-bg-primary-washed)] border border-[var(--ock-bg-primary)]'
                    : 'bg-[var(--ock-bg-alternate)] hover:bg-[var(--ock-bg-primary-washed)]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="text-lg font-bold min-w-[3rem] text-center">
                    {getRankEmoji(user.rank)}
                  </div>
                  <div>
                    <div className="font-medium">
                      {formatAddress(user.walletAddress)}
                      {user.walletAddress.toLowerCase() === address?.toLowerCase() && (
                        <span className="ml-2 text-xs bg-[var(--ock-bg-primary)] text-[var(--ock-text-primary-inverse)] px-2 py-1 rounded">
                          You
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-[var(--ock-text-foreground-muted)]">
                      {user.currentStreak} day streak • {user.totalSessions} sessions
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-[var(--ock-text-primary)]">
                    {formatNumber(user.tokenBalance, 2)}
                  </div>
                  <div className="text-xs text-[var(--ock-text-foreground-muted)]">
                    SLEEP
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Challenge Info */}
      <SectionCard title="Current Challenges">
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-[var(--ock-bg-alternate)] rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">🎯</div>
              <div>
                <div className="font-medium">Sleep Consistency Challenge</div>
                <div className="text-sm text-[var(--ock-text-foreground-muted)]">
                  7 consecutive nights of good sleep
                </div>
              </div>
            </div>
            <div className="text-sm font-medium text-[var(--ock-text-primary)]">
              +2 SLEEP/day
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-[var(--ock-bg-alternate)] rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">📈</div>
              <div>
                <div className="font-medium">Weekly Improvement Bonus</div>
                <div className="text-sm text-[var(--ock-text-foreground-muted)]">
                  Improve efficiency by 10%+
                </div>
              </div>
            </div>
            <div className="text-sm font-medium text-[var(--ock-text-primary)]">
              +2 SLEEP
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-[var(--ock-bg-alternate)] rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">🏆</div>
              <div>
                <div className="font-medium">Perfect Night Bonus</div>
                <div className="text-sm text-[var(--ock-text-foreground-muted)]">
                  8+ hours, 85%+ efficiency, 3+ cycles
                </div>
              </div>
            </div>
            <div className="text-sm font-medium text-[var(--ock-text-primary)]">
              +4 SLEEP
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
