import React from "@rbxts/react";
import { formatNumber } from "client/ui/format-number";
import { usePlayerAttribute } from "client/ui/hooks/use-player-attribute";
import { EncounterAttribute } from "shared/features/encounter/encounter-attributes";

interface EncounterHudProps {
	onShove: () => void;
}

const PLAYER_COLOR = Color3.fromRGB(30, 150, 220);
const GIANT_COLOR = Color3.fromRGB(205, 30, 40);
const WIN_COLOR = Color3.fromRGB(255, 210, 70);
const LOSE_COLOR = Color3.fromRGB(255, 110, 100);

function Banner({ title, subtitle, color }: { title: string; subtitle?: string; color: Color3 }) {
	return (
		<frame
			key="Banner"
			AnchorPoint={new Vector2(0.5, 0.5)}
			Position={UDim2.fromScale(0.5, 0.35)}
			Size={UDim2.fromOffset(600, 120)}
			BackgroundTransparency={1}
		>
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

/**
 * The fight screen: the opponent and reward, the shove meter, a click/tap
 * target covering the screen, and the result. Renders nothing outside a fight.
 */
export function EncounterHud({ onShove }: EncounterHudProps) {
	const phase = usePlayerAttribute(EncounterAttribute.Phase);
	const meterValue = usePlayerAttribute(EncounterAttribute.Meter);
	const giantName = usePlayerAttribute(EncounterAttribute.GiantName);
	const rewardValue = usePlayerAttribute(EncounterAttribute.Reward);

	if (!typeIs(phase, "string")) return <></>;

	const meter = typeIs(meterValue, "number") ? meterValue : 0.5;
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

			{phase === "Ready" && <Banner title="GET READY!" color={new Color3(1, 1, 1)} />}
			{phase === "Won" && <Banner title="VICTORY!" subtitle={`+${formatNumber(reward)} Wins`} color={WIN_COLOR} />}
			{phase === "Lost" && <Banner title="THROWN OFF!" subtitle="Train up and try again" color={LOSE_COLOR} />}

			<frame
				key="Meter"
				AnchorPoint={new Vector2(0.5, 1)}
				Position={new UDim2(0.5, 0, 1, -40)}
				Size={UDim2.fromOffset(640, 64)}
				BackgroundColor3={GIANT_COLOR}
				ClipsDescendants={true}
			>
				<uicorner CornerRadius={new UDim(0, 12)} />
				<uistroke Thickness={4} Color={Color3.fromRGB(20, 20, 30)} />
				<frame key="PlayerSide" Size={new UDim2(meter, 0, 1, 0)} BackgroundColor3={PLAYER_COLOR} BorderSizePixel={0}>
					<uicorner CornerRadius={new UDim(0, 12)} />
				</frame>
				<frame
					key="Marker"
					AnchorPoint={new Vector2(0.5, 0)}
					Position={new UDim2(meter, 0, 0, 0)}
					Size={new UDim2(0, 6, 1, 0)}
					BackgroundColor3={new Color3(1, 1, 1)}
					BorderSizePixel={0}
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
					ZIndex={2}
				/>
			</frame>
		</>
	);
}
