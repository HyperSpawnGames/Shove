import React, { useBinding, useEffect, useState } from "@rbxts/react";
import Signal from "@rbxts/signal";
import { Players, RunService } from "@rbxts/services";
import { formatNumber } from "client/ui/format-number";
import { usePlayerAttribute } from "client/ui/hooks/use-player-attribute";
import { usePopIn } from "client/ui/hooks/use-punch";
import { EncounterAttribute } from "shared/features/encounter/encounter-attributes";
import { METER_SMOOTHING } from "./encounter-config";

interface EncounterHudProps {
	onShove: () => void;
	/** Fires for every shove the controller sends. */
	shoved: Signal<() => void>;
}

const PLAYER_COLOR = Color3.fromRGB(30, 150, 220);
const GIANT_COLOR = Color3.fromRGB(205, 30, 40);
const WIN_COLOR = Color3.fromRGB(255, 210, 70);
const LOSE_COLOR = Color3.fromRGB(255, 110, 100);
const BRACE_COLOR = Color3.fromRGB(255, 80, 60);
const METER_POSITION = new UDim2(0.5, 0, 1, -40);
/** Seconds the "SHOVE!" call stays up when the struggle starts. */
const GO_SECONDS = 0.8;

function Banner({ title, subtitle, color }: { title: string; subtitle?: string; color: Color3 }) {
	const scale = usePopIn();
	return (
		<frame
			key="Banner"
			AnchorPoint={new Vector2(0.5, 0.5)}
			Position={UDim2.fromScale(0.5, 0.35)}
			Size={UDim2.fromOffset(600, 120)}
			BackgroundTransparency={1}
		>
			<uiscale ref={scale} />
			<uilistlayout
				SortOrder={Enum.SortOrder.LayoutOrder}
				HorizontalAlignment={Enum.HorizontalAlignment.Center}
				VerticalAlignment={Enum.VerticalAlignment.Center}
			/>
			<textlabel
				key="Title"
				LayoutOrder={1}
				Text={title}
				Font={Enum.Font.GothamBlack}
				TextSize={64}
				TextColor3={color}
				TextStrokeTransparency={0}
				BackgroundTransparency={1}
				Size={new UDim2(1, 0, 0, 70)}
			/>
			{subtitle !== undefined && (
				<textlabel
					key="Subtitle"
					LayoutOrder={2}
					Text={subtitle}
					Font={Enum.Font.GothamBold}
					TextSize={28}
					TextColor3={new Color3(1, 1, 1)}
					TextStrokeTransparency={0.2}
					BackgroundTransparency={1}
					Size={new UDim2(1, 0, 0, 36)}
				/>
			)}
		</frame>
	);
}

function readMeter(): number {
	const meter = Players.LocalPlayer.GetAttribute(EncounterAttribute.Meter);
	return typeIs(meter, "number") ? meter : 0.5;
}

/**
 * The fight screen: the opponent and reward, the shove meter, a click/tap
 * target covering the screen, the surge warning and the result. The meter
 * glides between server updates, bumps on every shove, and shakes and flashes
 * when a surge lands. Renders nothing outside a fight.
 */
export function EncounterHud({ onShove, shoved }: EncounterHudProps) {
	const phase = usePlayerAttribute(EncounterAttribute.Phase);
	const surge = usePlayerAttribute(EncounterAttribute.Surge);
	const giantName = usePlayerAttribute(EncounterAttribute.GiantName);
	const rewardValue = usePlayerAttribute(EncounterAttribute.Reward);

	const [meter, setMeter] = useBinding(0.5);
	const [meterPosition, setMeterPosition] = useBinding(METER_POSITION);
	const [flash, setFlash] = useBinding(1);
	const [bump, setBump] = useBinding(1);
	const [pulse, setPulse] = useBinding(1);
	const [showGo, setShowGo] = useState(false);

	const active = typeIs(phase, "string");

	useEffect(() => {
		if (!active) return;
		let shown = readMeter();
		let shake = 0;
		let flashLeft = 1;
		let kick = 0;
		let lastSurge: unknown = undefined;

		const shoveConnection = shoved.Connect(() => {
			kick = 1;
		});
		const frameConnection = RunService.RenderStepped.Connect((dt) => {
			shown += (readMeter() - shown) * math.min(1, dt * METER_SMOOTHING);
			const current = Players.LocalPlayer.GetAttribute(EncounterAttribute.Surge);
			if (current === "Push" && lastSurge !== "Push") {
				shake = 1;
				flashLeft = 0.2;
			}
			lastSurge = current;
			shake *= math.exp(-6 * dt);
			kick *= math.exp(-12 * dt);
			flashLeft = math.min(1, flashLeft + dt * 1.8);

			setMeter(shown);
			setMeterPosition(
				METER_POSITION.add(UDim2.fromOffset((math.random() - 0.5) * 28 * shake, (math.random() - 0.5) * 12 * shake)),
			);
			setFlash(flashLeft);
			setBump(1 + 0.07 * kick);
			setPulse(1 + 0.15 * math.abs(math.sin(os.clock() * 11)));
		});
		return () => {
			shoveConnection.Disconnect();
			frameConnection.Disconnect();
		};
	}, [active]);

	useEffect(() => {
		if (phase !== "Struggle") {
			setShowGo(false);
			return;
		}
		setShowGo(true);
		let live = true;
		task.delay(GO_SECONDS, () => {
			if (live) setShowGo(false);
		});
		return () => {
			live = false;
		};
	}, [phase]);

	if (!active) return <></>;

	const reward = typeIs(rewardValue, "number") ? rewardValue : 0;
	const name = typeIs(giantName, "string") ? giantName : "Giant";

	return (
		<>
			<textbutton
				key="ShoveTarget"
				Size={UDim2.fromScale(1, 1)}
				BackgroundTransparency={1}
				Text=""
				AutoButtonColor={false}
				Active={phase === "Struggle"}
				Event={{ Activated: onShove }}
			/>

			<frame
				key="Header"
				AnchorPoint={new Vector2(0.5, 0)}
				Position={new UDim2(0.5, 0, 0, 56)}
				Size={UDim2.fromOffset(520, 76)}
				BackgroundColor3={Color3.fromRGB(20, 120, 190)}
				BackgroundTransparency={0.1}
			>
				<uicorner CornerRadius={new UDim(0, 14)} />
				<uistroke Thickness={3} Color={Color3.fromRGB(10, 50, 90)} />
				<uilistlayout
					SortOrder={Enum.SortOrder.LayoutOrder}
					HorizontalAlignment={Enum.HorizontalAlignment.Center}
					VerticalAlignment={Enum.VerticalAlignment.Center}
				/>
				<textlabel
					key="Opponent"
					LayoutOrder={1}
					Text={`Shove the ${name} off the cliff!`}
					Font={Enum.Font.GothamBlack}
					TextSize={28}
					TextColor3={new Color3(1, 1, 1)}
					TextStrokeTransparency={0.4}
					BackgroundTransparency={1}
					Size={new UDim2(1, 0, 0, 34)}
				/>
				<textlabel
					key="Reward"
					LayoutOrder={2}
					Text={`Reward: +${formatNumber(reward)} Wins`}
					Font={Enum.Font.GothamBold}
					TextSize={18}
					TextColor3={WIN_COLOR}
					TextStrokeTransparency={0.4}
					BackgroundTransparency={1}
					Size={new UDim2(1, 0, 0, 22)}
				/>
			</frame>

			{phase === "Ready" && <Banner key="Ready" title="GET READY!" color={new Color3(1, 1, 1)} />}
			{showGo && <Banner key="Go" title="SHOVE!" color={PLAYER_COLOR} />}
			{phase === "Won" && (
				<Banner key="Won" title="VICTORY!" subtitle={`+${formatNumber(reward)} Wins`} color={WIN_COLOR} />
			)}
			{phase === "Lost" && (
				<Banner key="Lost" title="THROWN OFF!" subtitle="Train up and try again" color={LOSE_COLOR} />
			)}

			{phase === "Struggle" && surge === "Warn" && (
				<textlabel
					key="Brace"
					AnchorPoint={new Vector2(0.5, 1)}
					Position={new UDim2(0.5, 0, 1, -118)}
					Size={UDim2.fromOffset(640, 60)}
					Text={`${name.upper()} IS SURGING! TAP!`}
					Font={Enum.Font.GothamBlack}
					TextSize={34}
					TextColor3={BRACE_COLOR}
					TextStrokeTransparency={0}
					BackgroundTransparency={1}
				>
					<uiscale Scale={pulse} />
				</textlabel>
			)}

			<frame
				key="Meter"
				AnchorPoint={new Vector2(0.5, 1)}
				Position={meterPosition}
				Size={UDim2.fromOffset(640, 64)}
				BackgroundColor3={GIANT_COLOR}
				ClipsDescendants={true}
			>
				<uiscale Scale={bump} />
				<uicorner CornerRadius={new UDim(0, 12)} />
				<uistroke Thickness={4} Color={Color3.fromRGB(20, 20, 30)} />
				<frame
					key="PlayerSide"
					Size={meter.map((value) => new UDim2(value, 0, 1, 0))}
					BackgroundColor3={PLAYER_COLOR}
					BorderSizePixel={0}
				>
					<uicorner CornerRadius={new UDim(0, 12)} />
				</frame>
				<frame
					key="Marker"
					AnchorPoint={new Vector2(0.5, 0)}
					Position={meter.map((value) => new UDim2(value, 0, 0, 0))}
					Size={new UDim2(0, 6, 1, 0)}
					BackgroundColor3={new Color3(1, 1, 1)}
					BorderSizePixel={0}
				/>
				<frame
					key="SurgeFlash"
					Size={UDim2.fromScale(1, 1)}
					BackgroundColor3={new Color3(1, 1, 1)}
					BackgroundTransparency={flash}
					BorderSizePixel={0}
					ZIndex={2}
				/>
				<textlabel
					key="Prompt"
					Size={UDim2.fromScale(1, 1)}
					Text={phase === "Struggle" ? "Tap to shove!" : ""}
					Font={Enum.Font.GothamBlack}
					TextSize={34}
					TextColor3={new Color3(1, 1, 1)}
					TextStrokeTransparency={0}
					BackgroundTransparency={1}
					ZIndex={3}
				/>
			</frame>
		</>
	);
}
