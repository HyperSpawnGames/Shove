import React, { useEffect, useRef, useState } from "@rbxts/react";
import { TweenService } from "@rbxts/services";
import { formatNumber } from "shared/format-number";
import { usePlayerField } from "client/ui/hooks/use-player-field";
import { usePunch } from "client/ui/hooks/use-punch";

const TROPHY_GOLD = Color3.fromRGB(255, 204, 64);
const PANEL_COLOR = Color3.fromRGB(30, 30, 30);

/** A "+N" that rises beside the panel and fades. */
function GainPopup({ amount, onDone }: { amount: number; onDone: () => void }) {
	const ref = useRef<TextLabel>();

	useEffect(() => {
		const label = ref.current;
		if (label === undefined) return;
		const tween = TweenService.Create(label, new TweenInfo(1.1, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
			Position: label.Position.sub(UDim2.fromOffset(0, 40)),
			TextTransparency: 1,
			TextStrokeTransparency: 1,
		});
		const connection = tween.Completed.Connect(onDone);
		tween.Play();
		return () => {
			connection.Disconnect();
			tween.Cancel();
		};
	}, []);

	return (
		<textlabel
			ref={ref}
			AnchorPoint={new Vector2(1, 0.5)}
			Position={new UDim2(0, -10, 0.5, 0)}
			Size={UDim2.fromOffset(160, 36)}
			Text={`+${formatNumber(amount)}`}
			Font={Enum.Font.GothamBlack}
			TextSize={30}
			TextColor3={TROPHY_GOLD}
			TextStrokeTransparency={0.2}
			TextXAlignment={Enum.TextXAlignment.Right}
			BackgroundTransparency={1}
		/>
	);
}

/**
 * Banked Wins at the top right of the screen, behind a trophy. The total
 * punches and a "+N" rises beside it on every gain.
 */
export function WinsHud() {
	const wins = usePlayerField("Wins");
	const punch = usePunch(wins, 1.3);
	const trophyPunch = usePunch(wins, 1.25);
	const previous = useRef<number>();
	const [gain, setGain] = useState<{ id: number; amount: number }>();

	useEffect(() => {
		if (wins === undefined) return;
		if (previous.current !== undefined && wins > previous.current) {
			setGain({ id: os.clock(), amount: wins - previous.current });
		}
		previous.current = wins;
	}, [wins]);

	if (wins === undefined) return <></>;

	return (
		<frame
			key="WinsPanel"
			AnchorPoint={new Vector2(1, 0)}
			Position={new UDim2(1, -16, 0, 12)}
			Size={UDim2.fromOffset(220, 64)}
			BackgroundColor3={PANEL_COLOR}
			BackgroundTransparency={0.2}
		>
			<uicorner CornerRadius={new UDim(0, 12)} />
			<uistroke Thickness={2} Color={TROPHY_GOLD} Transparency={0.3} />
			<textlabel
				key="Trophy"
				AnchorPoint={new Vector2(0, 0.5)}
				Position={new UDim2(0, 8, 0.5, 0)}
				Size={UDim2.fromOffset(52, 52)}
				Text="🏆"
				TextScaled={true}
				BackgroundTransparency={1}
			>
				<uiscale ref={trophyPunch} />
			</textlabel>
			<textlabel
				key="Label"
				Position={new UDim2(0, 68, 0, 9)}
				Size={new UDim2(1, -80, 0, 16)}
				Text="WINS"
				Font={Enum.Font.GothamBold}
				TextSize={14}
				TextColor3={TROPHY_GOLD}
				TextXAlignment={Enum.TextXAlignment.Left}
				BackgroundTransparency={1}
			/>
			<textlabel
				key="Total"
				Position={new UDim2(0, 68, 0, 26)}
				Size={new UDim2(1, -80, 0, 30)}
				Text={formatNumber(wins)}
				Font={Enum.Font.GothamBlack}
				TextSize={28}
				TextColor3={new Color3(1, 1, 1)}
				TextXAlignment={Enum.TextXAlignment.Left}
				BackgroundTransparency={1}
			>
				<uiscale ref={punch} />
			</textlabel>
			{gain !== undefined && (
				<GainPopup key={`gain-${gain.id}`} amount={gain.amount} onDone={() => setGain(undefined)} />
			)}
		</frame>
	);
}
