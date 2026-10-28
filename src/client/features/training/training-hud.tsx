import React from "@rbxts/react";
import { formatNumber } from "shared/format-number";
import { usePlayerAttribute } from "client/ui/hooks/use-player-attribute";
import { usePlayerField } from "client/ui/hooks/use-player-field";
import { usePunch } from "client/ui/hooks/use-punch";
import { TrainingAttribute } from "shared/features/training/training-attributes";
import { StrengthPopups } from "./strength-popups";

interface TrainingHudProps {
	onToggle: () => void;
}

const PANEL_COLOR = Color3.fromRGB(30, 30, 30);
const STRENGTH_GOLD = Color3.fromRGB(255, 200, 80);
const TRAIN_COLOR = Color3.fromRGB(46, 160, 67);
const STOP_COLOR = Color3.fromRGB(200, 60, 50);

/**
 * Strength at the top right, under Wins, with the training rate; the Train
 * button; and the +Strength popups. Every figure is effective Strength: what
 * training saved, times any multiplier the server reports.
 */
export function TrainingHud({ onToggle }: TrainingHudProps) {
	const strength = usePlayerField("Strength");
	const training = usePlayerAttribute(TrainingAttribute.Training) === true;
	const perRep = usePlayerAttribute(TrainingAttribute.StrengthPerRep);
	const secondsPerRep = usePlayerAttribute(TrainingAttribute.SecondsPerRep);
	const reported = usePlayerAttribute(TrainingAttribute.StrengthMultiplier);
	const multiplier = typeIs(reported, "number") ? reported : 1;
	const effective = strength === undefined ? undefined : strength * multiplier;
	const totalPunch = usePunch(effective, 1.15);
	const buttonPunch = usePunch(training, 1.12);

	if (strength === undefined) return <></>;

	const rate =
		typeIs(perRep, "number") && typeIs(secondsPerRep, "number") && secondsPerRep > 0
			? `+${formatNumber(perRep * multiplier)} / rep  ·  ${formatNumber((perRep * multiplier) / secondsPerRep)} / s`
			: "";

	return (
		<>
			<frame
				key="StrengthPanel"
				AnchorPoint={new Vector2(1, 0)}
				Position={new UDim2(1, -16, 0, 84)}
				Size={UDim2.fromOffset(220, 84)}
				BackgroundColor3={PANEL_COLOR}
				BackgroundTransparency={0.2}
			>
				<uicorner CornerRadius={new UDim(0, 12)} />
				<uistroke Thickness={2} Color={STRENGTH_GOLD} Transparency={0.3} />
				<uipadding PaddingLeft={new UDim(0, 12)} PaddingRight={new UDim(0, 12)} />
				<uilistlayout
					SortOrder={Enum.SortOrder.LayoutOrder}
					VerticalAlignment={Enum.VerticalAlignment.Center}
					Padding={new UDim(0, 2)}
				/>
				<textlabel
					key="Label"
					LayoutOrder={1}
					Text={multiplier > 1 ? `STRENGTH  ×${formatNumber(multiplier)}` : "STRENGTH"}
					Font={Enum.Font.GothamBold}
					TextSize={14}
					TextColor3={STRENGTH_GOLD}
					TextXAlignment={Enum.TextXAlignment.Left}
					BackgroundTransparency={1}
					Size={new UDim2(1, 0, 0, 16)}
				/>
				<textlabel
					key="Total"
					LayoutOrder={2}
					Text={formatNumber(strength * multiplier)}
					Font={Enum.Font.GothamBlack}
					TextSize={30}
					TextColor3={new Color3(1, 1, 1)}
					TextXAlignment={Enum.TextXAlignment.Left}
					BackgroundTransparency={1}
					Size={new UDim2(1, 0, 0, 32)}
				>
					<uiscale ref={totalPunch} />
				</textlabel>
				<textlabel
					key="Rate"
					LayoutOrder={3}
					Text={rate}
					Font={Enum.Font.Gotham}
					TextSize={14}
					TextColor3={Color3.fromRGB(200, 200, 200)}
					TextXAlignment={Enum.TextXAlignment.Left}
					BackgroundTransparency={1}
					Size={new UDim2(1, 0, 0, 16)}
				/>
			</frame>

			<textbutton
				key="TrainButton"
				AnchorPoint={new Vector2(0.5, 1)}
				Position={new UDim2(0.5, 0, 1, -24)}
				Size={UDim2.fromOffset(180, 56)}
				Text={training ? "Stop  [1]" : "Train  [1]"}
				Font={Enum.Font.GothamBlack}
				TextSize={24}
				TextColor3={new Color3(1, 1, 1)}
				BackgroundColor3={training ? STOP_COLOR : TRAIN_COLOR}
				AutoButtonColor={true}
				Event={{ Activated: onToggle }}
			>
				<uiscale ref={buttonPunch} />
				<uicorner CornerRadius={new UDim(0, 12)} />
				<uistroke Thickness={2} Color={new Color3(0, 0, 0)} Transparency={0.4} />
			</textbutton>

			<StrengthPopups />
		</>
	);
}
