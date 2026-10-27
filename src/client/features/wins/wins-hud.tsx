import React, { useEffect, useRef, useState } from "@rbxts/react";
import { TweenService } from "@rbxts/services";
import { formatNumber } from "shared/format-number";
import { usePlayerField } from "client/ui/hooks/use-player-field";
import { usePunch } from "client/ui/hooks/use-punch";

const WINS_COLOR = Color3.fromRGB(110, 200, 255);

/** A "+N" that rises off the panel and fades. */
function GainPopup({ amount, onDone }: { amount: number; onDone: () => void }) {
	const ref = useRef<TextLabel>();

	useEffect(() => {
		const label = ref.current;
		if (label === undefined) return;
		const tween = TweenService.Create(label, new TweenInfo(1.1, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
			Position: label.Position.sub(UDim2.fromOffset(0, 50)),
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
			AnchorPoint={new Vector2(0, 0.5)}
			Position={new UDim2(1, 12, 0.5, 0)}
			Size={UDim2.fromOffset(140, 36)}
			Text={`+${formatNumber(amount)}`}
			Font={Enum.Font.GothamBlack}
			TextSize={30}
			TextColor3={WINS_COLOR}
			TextStrokeTransparency={0.2}
			TextXAlignment={Enum.TextXAlignment.Left}
			BackgroundTransparency={1}
		/>
	);
}

/** Banked Wins, under the Strength panel. The total punches and a "+N" rises on every gain. */
export function WinsHud() {
	const wins = usePlayerField("Wins");
	const punch = usePunch(wins, 1.3);
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
			AnchorPoint={new Vector2(0, 0.5)}
			Position={new UDim2(0, 16, 0.45, 80)}
			Size={UDim2.fromOffset(220, 60)}
			BackgroundColor3={Color3.fromRGB(30, 30, 30)}
			BackgroundTransparency={0.2}
		>
			<uicorner CornerRadius={new UDim(0, 8)} />
			<uipadding PaddingLeft={new UDim(0, 12)} PaddingRight={new UDim(0, 12)} />
			<textlabel
				key="Label"
				Position={new UDim2(0, 0, 0, 8)}
				Text="WINS"
				Font={Enum.Font.GothamBold}
				TextSize={14}
				TextColor3={WINS_COLOR}
				TextXAlignment={Enum.TextXAlignment.Left}
				BackgroundTransparency={1}
				Size={new UDim2(1, 0, 0, 16)}
			/>
			<textlabel
				key="Total"
				Position={new UDim2(0, 0, 0, 26)}
				Text={formatNumber(wins)}
				Font={Enum.Font.GothamBlack}
				TextSize={26}
				TextColor3={new Color3(1, 1, 1)}
				TextXAlignment={Enum.TextXAlignment.Left}
				BackgroundTransparency={1}
				Size={new UDim2(1, 0, 0, 28)}
			>
				<uiscale ref={punch} />
			</textlabel>
			{gain !== undefined && (
				<GainPopup key={`gain-${gain.id}`} amount={gain.amount} onDone={() => setGain(undefined)} />
			)}
		</frame>
	);
}
