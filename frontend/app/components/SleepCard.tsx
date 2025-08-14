"use client";

import { useMemo } from "react";

export type StageSummary = {
	total_in_bed_time_milli?: number;
	total_awake_time_milli?: number;
	total_no_data_time_milli?: number;
	total_light_sleep_time_milli?: number;
	total_slow_wave_sleep_time_milli?: number;
	total_rem_sleep_time_milli?: number;
	sleep_cycle_count?: number;
	disturbance_count?: number;
};

export type Score = {
	sleep_efficiency_percentage?: number;
	efficiency_percentage?: number;
	sleep_performance_percentage?: number;
	performance_percentage?: number;
	respiratory_rate?: number;
	hrv_rmssd_milli?: number;
	hrv_rmssd_ms?: number;
	disturbances?: number;
	stage_summary?: StageSummary;
	stages?: StageSummary;
};

export type SleepData = {
	start?: string;
	end?: string;
	score?: Score;
	sleep_score?: Score;
	stage_summary?: StageSummary;
	respiratory_rate?: number;
	hrv_rmssd_milli?: number;
	disturbances?: number;
};

type SleepCardProps = {
	data: SleepData | null;
};

function formatDuration(ms?: number | null): string {
	if (!ms || ms <= 0) return "-";
	const totalSeconds = Math.floor(ms / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	return `${hours}h ${minutes}m`;
}

function formatNumber(value?: number | null, digits = 1): string {
	if (value === undefined || value === null || Number.isNaN(value)) return "-";
	return Number(value).toFixed(digits);
}

function SectionCard(props: { title: string; children: React.ReactNode }) {
	return (
		<div className="rounded-xl border border-[var(--app-card-border)] bg-[var(--app-card-bg)] p-4">
			<div className="text-xs uppercase tracking-wide text-[var(--ock-text-foreground-muted)] mb-2">{props.title}</div>
			{props.children}
		</div>
	);
}

function ProgressBar({ value, color }: { value: number; color: string }) {
	const clamped = Math.max(0, Math.min(100, value));
	return (
		<div className="w-full h-2 rounded-full bg-[var(--ock-bg-alternate)]">
			<div
				className="h-2 rounded-full"
				style={{ width: `${clamped}%`, backgroundColor: color }}
			/>
		</div>
	);
}

export default function SleepCard({ data }: SleepCardProps) {
	const { sleepDurationMs,  stages, efficiencyPct, performancePct, respiratoryRate, disturbances, sleepCycles } = useMemo(() => {
		if (!data) return {
      sleepDurationMs: undefined as number | undefined,
			stages: undefined as StageSummary | undefined,
			efficiencyPct: undefined as number | undefined,
			performancePct: undefined as number | undefined,
			respiratoryRate: undefined as number | undefined,
      sleepCycles: undefined as number | undefined,
			disturbances: undefined as number | undefined,
		};

  	const scoreObj = data.score ?? undefined;
		const stageSummary = scoreObj?.stage_summary;
		return {
      sleepDurationMs: (stageSummary?.total_in_bed_time_milli ?? 0) - (stageSummary?.total_awake_time_milli ?? 0),
			stages: stageSummary,
			efficiencyPct: scoreObj?.sleep_efficiency_percentage ?? scoreObj?.efficiency_percentage,
			performancePct: scoreObj?.sleep_performance_percentage ?? scoreObj?.performance_percentage,
			respiratoryRate: scoreObj?.respiratory_rate,
			disturbances: stageSummary?.disturbance_count ?? 0,
      sleepCycles: stageSummary?.sleep_cycle_count ?? 0,
		};
	}, [data]);

	const stageDurations = useMemo(() => {
		if (!stages) return null;
		// Try several likely field names; fallback to total if present
		const deep = stages.total_slow_wave_sleep_time_milli ?? 0;
		const rem = stages.total_rem_sleep_time_milli ?? 0;
		const light = stages.total_light_sleep_time_milli ?? 0;
		const awake = stages.total_awake_time_milli ?? 0;
		const total = stages.total_in_bed_time_milli ?? 0;
		return { deep, rem, light, awake, total };
	}, [stages]);


	return (
		<div className="space-y-4">
			<div className="rounded-2xl p-4 bg-gradient-to-br from-[var(--ock-bg-primary-washed)] to-transparent border border-[var(--app-card-border)]">
				<div className="flex items-end justify-between">
					<div>
						<div className="text-sm text-[var(--ock-text-foreground-muted)]">Last sleep</div>
						<div className="text-2xl font-semibold">{formatDuration(sleepDurationMs)}</div>
					</div>
					<div className="text-right">
						<div className="text-sm text-[var(--ock-text-foreground-muted)]">Efficiency</div>
						<div className="text-xl font-semibold">{efficiencyPct ? `${formatNumber(efficiencyPct, 0)}%` : "-"}</div>
					</div>
				</div>
				{typeof performancePct === "number" && (
					<div className="mt-3">
						<div className="flex items-center justify-between text-xs mb-1">
							<span className="text-[var(--ock-text-foreground-muted)]">Sleep Performance</span>
							<span>{formatNumber(performancePct, 0)}%</span>
						</div>
						<ProgressBar value={performancePct} color="var(--app-accent)" />
					</div>
				)}
			</div>

			{stageDurations && stageDurations.total > 0 && (
				<SectionCard title="Stages">
					<div className="space-y-3">
						<div className="w-full h-3 rounded-full overflow-hidden flex">
							
								<div
									className="h-3"
									style={{
										width: `${(stageDurations.deep / stageDurations.total) * 100}%`,
										backgroundColor: "#0ea5e9",
									}}
								/>
							
								<div
									className="h-3"
									style={{
										width: `${(stageDurations.rem / stageDurations.total) * 100}%`,
										backgroundColor: "#22c55e",
									}}
								/>
							
							
								<div
									className="h-3"
									style={{
										width: `${(stageDurations.light / stageDurations.total) * 100}%`,
										backgroundColor: "#a78bfa",
									}}
								/>
						
							
								<div
									className="h-3"
									style={{
										width: `${(stageDurations.awake / stageDurations.total) * 100}%`,
										backgroundColor: "#f59e0b",
									}}
								/>
							
						</div>
						<div className="grid grid-cols-4 gap-2 text-xs">
							<div className="text-center">
								<div className="text-[#0ea5e9]">Deep</div>
								<div className="font-medium">{formatDuration(stageDurations.deep)}</div>
							</div>
							<div className="text-center">
								<div className="text-[#22c55e]">REM</div>
								<div className="font-medium">{formatDuration(stageDurations.rem)}</div>
							</div>
							<div className="text-center">
								<div className="text-[#a78bfa]">Light</div>
								<div className="font-medium">{formatDuration(stageDurations.light)}</div>
							</div>
							<div className="text-center">
								<div className="text-[#f59e0b]">Awake</div>
								<div className="font-medium">{formatDuration(stageDurations.awake)}</div>
							</div>
						</div>
					</div>
				</SectionCard>
			)}

			<div className="grid grid-cols-3 gap-3">
				<SectionCard title="Respiratory Rate">
					<div className="text-xl font-semibold">{respiratoryRate ? `${formatNumber(respiratoryRate, 1)} rpm` : "-"}</div>
				</SectionCard>
				<SectionCard title="Sleep Cycles">
					<div className="text-xl font-semibold">{sleepCycles ? `${formatNumber(sleepCycles, 0)}` : "-"}</div>
				</SectionCard>
				<SectionCard title="Disturbances">
					<div className="text-xl font-semibold">{typeof disturbances === "number" ? disturbances : "-"}</div>
				</SectionCard>
			</div>
		</div>
	);
}


