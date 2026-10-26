import React from "@rbxts/react";
import { formatNumber } from "client/ui/format-number";
import { usePlayerField } from "client/ui/hooks/use-player-field";

/** Banked Wins, under the Strength panel. */
export function WinsHud() {
	const wins = usePlayerField("Wins");

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
			<uilistlayout
				SortOrder={Enum.SortOrder.LayoutOrder}
				VerticalAlignment={Enum.VerticalAlignment.Center}
				Padding={new UDim(0, 2)}
			/>
			<textlabel
				key="Label"
				LayoutOrder={1}
				Text="WINS"
				Font={Enum.Font.GothamBold}
				TextSize={14}
				TextColor3={Color3.fromRGB(110, 200, 255)}
				TextXAlignment={Enum.TextXAlignment.Left}
				BackgroundTransparency={1}
				Size={new UDim2(1, 0, 0, 16)}
			/>
			<textlabel
				key="Total"
				LayoutOrder={2}
				Text={formatNumber(wins)}
				Font={Enum.Font.GothamBlack}
				TextSize={26}
				TextColor3={new Color3(1, 1, 1)}
				TextXAlignment={Enum.TextXAlignment.Left}
				BackgroundTransparency={1}
				Size={new UDim2(1, 0, 0, 28)}
			/>
		</frame>
	);
}
