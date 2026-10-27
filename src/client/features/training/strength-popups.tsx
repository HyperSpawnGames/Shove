import React, { useEffect, useRef, useState } from "@rbxts/react";
import { TweenService } from "@rbxts/services";
import { Events } from "client/network";
import { formatNumber } from "shared/format-number";

interface Popup {
	id: number;
	amount: number;
	/** Horizontal scatter, so consecutive popups don't stack on one line. */
	offsetX: number;
}

/** At most this many popups on screen; a faster aura drops the oldest. */
const MAX_POPUPS = 6;
const RISE_TIME = 0.9;

function PopupLabel({ popup, onDone }: { popup: Popup; onDone: (id: number) => void }) {
	const ref = useRef<TextLabel>();

	useEffect(() => {
		const label = ref.current;
		if (label === undefined) return;

		const tween = TweenService.Create(
			label,
			new TweenInfo(RISE_TIME, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
			{
				Position: label.Position.sub(UDim2.fromOffset(0, 70)),
				TextTransparency: 1,
				TextStrokeTransparency: 1,
			},
		);
		const connection = tween.Completed.Connect(() => onDone(popup.id));
		tween.Play();
		return () => {
			connection.Disconnect();
			tween.Cancel();
		};
	}, []);

	return (
		<textlabel
			ref={ref}
			AnchorPoint={new Vector2(0.5, 0.5)}
			Position={new UDim2(0.5, popup.offsetX, 0.4, 0)}
			Size={UDim2.fromOffset(200, 40)}
			Text={`+${formatNumber(popup.amount)} Strength`}
			Font={Enum.Font.GothamBlack}
			TextSize={28}
			TextColor3={Color3.fromRGB(255, 200, 80)}
			TextStrokeTransparency={0.3}
			BackgroundTransparency={1}
		/>
	);
}

/** A rising +Strength label for every rep the server completes. */
export function StrengthPopups() {
	const [popups, setPopups] = useState<Popup[]>([]);

	useEffect(() => {
		let nextId = 0;
		const connection = Events.trainingRepCompleted.connect((amount) => {
			nextId += 1;
			const popup: Popup = { id: nextId, amount, offsetX: math.random(-40, 40) };
			setPopups((current) => {
				const added = [...current, popup];
				return added.size() > MAX_POPUPS ? added.filter((_, index) => index >= added.size() - MAX_POPUPS) : added;
			});
		});
		return () => connection.Disconnect();
	}, []);

	const remove = (id: number) => setPopups((current) => current.filter((popup) => popup.id !== id));

	return (
		<>
			{popups.map((popup) => (
				<PopupLabel key={`popup-${popup.id}`} popup={popup} onDone={remove} />
			))}
		</>
	);
}
