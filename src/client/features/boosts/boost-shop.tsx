import React, { useState } from "@rbxts/react";
import { Events } from "client/network";
import { usePlayerAttribute } from "client/ui/hooks/use-player-attribute";
import { usePlayerField } from "client/ui/hooks/use-player-field";
import {
	BoostKind,
	fitsSizeCap,
	ladder,
	nextTier,
	SIZE_CAP_ATTRIBUTE,
	type BoostTier,
	type Owned,
} from "shared/features/boosts/boost-catalog";
import { formatNumber } from "shared/format-number";

const PANEL_COLOR = Color3.fromRGB(30, 30, 30);
const ROW_COLOR = Color3.fromRGB(48, 48, 52);
const BOOST_PURPLE = Color3.fromRGB(150, 80, 255);
const TROPHY_GOLD = Color3.fromRGB(255, 204, 64);
const WEAR_BLUE = Color3.fromRGB(50, 130, 230);
const WORN_GREEN = Color3.fromRGB(46, 160, 67);
const DIM = Color3.fromRGB(80, 80, 86);

const TABS: { kind: BoostKind; title: string; blurb: string }[] = [
	{ kind: "outline", title: "Outlines", blurb: "Add Strength to every push-up" },
	{ kind: "power", title: "Powers", blurb: "Multiply all your Strength" },
	{ kind: "size", title: "Sizes", blurb: "Grow and multiply all your Strength, up to 3/4 the next giant's size" },
];

function statText(tier: BoostTier): string {
	if ("bonusPerRep" in tier) return `+${formatNumber(tier.bonusPerRep)} Strength / rep`;
	if ("scale" in tier) return `×${formatNumber(tier.multiplier)} Strength  ·  ${tier.scale}x size`;
	return `×${formatNumber(tier.multiplier)} Strength`;
}

interface RowProps {
	kind: BoostKind;
	tier: BoostTier;
	order: number;
	owned: boolean;
	worn: boolean;
	forSale: boolean;
	affordable: boolean;
	/** False for a size bigger than the next giant allows yet. */
	fits: boolean;
}

/** One tier: its colour, name and stat, and the one thing the player can do with it. */
function TierRow({ kind, tier, order, owned, worn, forSale, affordable, fits }: RowProps) {
	let text: string;
	let color: Color3;
	let onClick: (() => void) | undefined;
	if (worn) {
		text = "Worn";
		color = WORN_GREEN;
		onClick = () => Events.requestEquipBoost.fire(kind, "");
	} else if (owned) {
		text = "Wear";
		color = WEAR_BLUE;
		onClick = () => Events.requestEquipBoost.fire(kind, tier.id);
	} else if (forSale && !fits) {
		text = "🔒 Beat giants";
		color = DIM;
	} else if (forSale) {
		text = `🏆 ${formatNumber(tier.price)}`;
		color = affordable ? TROPHY_GOLD : DIM;
		onClick = affordable ? () => Events.requestBuyBoost.fire(kind, tier.id) : undefined;
	} else {
		text = `🔒 ${formatNumber(tier.price)}`;
		color = DIM;
	}

	return (
		<frame LayoutOrder={order} Size={new UDim2(1, 0, 0, 60)} BackgroundColor3={ROW_COLOR}>
			<uicorner CornerRadius={new UDim(0, 10)} />
			<frame
				key="Swatch"
				AnchorPoint={new Vector2(0, 0.5)}
				Position={new UDim2(0, 12, 0.5, 0)}
				Size={UDim2.fromOffset(36, 36)}
				BackgroundColor3={tier.color}
			>
				<uicorner CornerRadius={new UDim(1, 0)} />
				<uistroke Thickness={2} Color={new Color3(1, 1, 1)} Transparency={0.5} />
			</frame>
			<textlabel
				key="Name"
				Position={UDim2.fromOffset(60, 9)}
				Size={new UDim2(1, -230, 0, 22)}
				Text={tier.name}
				Font={Enum.Font.GothamBlack}
				TextSize={20}
				TextColor3={new Color3(1, 1, 1)}
				TextXAlignment={Enum.TextXAlignment.Left}
				BackgroundTransparency={1}
			/>
			<textlabel
				key="Stat"
				Position={UDim2.fromOffset(60, 32)}
				Size={new UDim2(1, -230, 0, 18)}
				Text={statText(tier)}
				Font={Enum.Font.GothamBold}
				TextSize={15}
				TextColor3={Color3.fromRGB(200, 200, 200)}
				TextXAlignment={Enum.TextXAlignment.Left}
				BackgroundTransparency={1}
			/>
			<textbutton
				key="Action"
				AnchorPoint={new Vector2(1, 0.5)}
				Position={new UDim2(1, -12, 0.5, 0)}
				Size={UDim2.fromOffset(150, 40)}
				Text={text}
				Font={Enum.Font.GothamBlack}
				TextSize={18}
				TextColor3={new Color3(1, 1, 1)}
				TextStrokeTransparency={0.6}
				BackgroundColor3={color}
				AutoButtonColor={onClick !== undefined}
				Active={onClick !== undefined}
				Event={{ Activated: () => onClick?.() }}
			>
				<uicorner CornerRadius={new UDim(0, 8)} />
			</textbutton>
		</frame>
	);
}

/**
 * The boosts shop: a button that opens a panel with the outline and power
 * ladders. Every tier shows what it does; the next one in each ladder is for
 * sale for Wins, tiers bought can be worn or taken off. The server decides
 * every purchase and swap; this only asks.
 */
export function BoostShop() {
	const [open, setOpen] = useState(false);
	const [kind, setKind] = useState<BoostKind>("outline");
	const wins = usePlayerField("Wins") ?? 0;
	const outlines = usePlayerField("Outlines");
	const powers = usePlayerField("Powers");
	const wornOutline = usePlayerField("EquippedOutline");
	const wornPower = usePlayerField("EquippedPower");
	const sizes = usePlayerField("Sizes");
	const wornSize = usePlayerField("EquippedSize");
	const reportedCap = usePlayerAttribute(SIZE_CAP_ATTRIBUTE);
	const sizeCap = typeIs(reportedCap, "number") ? reportedCap : 1;

	const owned: Owned = (kind === "outline" ? outlines : kind === "power" ? powers : sizes) ?? {};
	const worn = kind === "outline" ? wornOutline : kind === "power" ? wornPower : wornSize;
	const forSale = nextTier(kind, owned);

	return (
		<>
			<textbutton
				key="BoostsButton"
				AnchorPoint={new Vector2(0, 0.5)}
				Position={new UDim2(0, 16, 0.45, 0)}
				Size={UDim2.fromOffset(150, 56)}
				Text="⚡ Boosts"
				Font={Enum.Font.GothamBlack}
				TextSize={22}
				TextColor3={new Color3(1, 1, 1)}
				BackgroundColor3={BOOST_PURPLE}
				Event={{ Activated: () => setOpen(!open) }}
			>
				<uicorner CornerRadius={new UDim(0, 12)} />
				<uistroke Thickness={2} Color={new Color3(0, 0, 0)} Transparency={0.4} />
			</textbutton>

			{open && (
				<frame
					key="Shop"
					AnchorPoint={new Vector2(0.5, 0.5)}
					Position={UDim2.fromScale(0.5, 0.5)}
					Size={UDim2.fromScale(0.92, 0.8)}
					BackgroundColor3={PANEL_COLOR}
					BackgroundTransparency={0.05}
				>
					<uicorner CornerRadius={new UDim(0, 14)} />
					<uistroke Thickness={2} Color={BOOST_PURPLE} Transparency={0.2} />
					<uisizeconstraint MaxSize={new Vector2(560, 440)} />
					<textlabel
						key="Title"
						Position={UDim2.fromOffset(20, 12)}
						Size={new UDim2(1, -80, 0, 32)}
						Text="BOOSTS"
						Font={Enum.Font.GothamBlack}
						TextSize={28}
						TextColor3={new Color3(1, 1, 1)}
						TextXAlignment={Enum.TextXAlignment.Left}
						BackgroundTransparency={1}
					/>
					<textbutton
						key="Close"
						AnchorPoint={new Vector2(1, 0)}
						Position={new UDim2(1, -12, 0, 12)}
						Size={UDim2.fromOffset(36, 36)}
						Text="X"
						Font={Enum.Font.GothamBlack}
						TextSize={20}
						TextColor3={new Color3(1, 1, 1)}
						BackgroundColor3={Color3.fromRGB(200, 60, 50)}
						Event={{ Activated: () => setOpen(false) }}
					>
						<uicorner CornerRadius={new UDim(0, 8)} />
					</textbutton>

					<frame
						key="Tabs"
						Position={UDim2.fromOffset(20, 56)}
						Size={new UDim2(1, -40, 0, 40)}
						BackgroundTransparency={1}
					>
						<uilistlayout FillDirection={Enum.FillDirection.Horizontal} Padding={new UDim(0, 10)} />
						{TABS.map((tab) => (
							<textbutton
								key={tab.kind}
								Size={new UDim2(1 / 3, -7, 1, 0)}
								Text={tab.title}
								Font={Enum.Font.GothamBlack}
								TextSize={18}
								TextColor3={new Color3(1, 1, 1)}
								BackgroundColor3={tab.kind === kind ? BOOST_PURPLE : ROW_COLOR}
								Event={{ Activated: () => setKind(tab.kind) }}
							>
								<uicorner CornerRadius={new UDim(0, 8)} />
							</textbutton>
						))}
					</frame>
					<textlabel
						key="Blurb"
						Position={UDim2.fromOffset(20, 102)}
						Size={new UDim2(1, -40, 0, 20)}
						Text={TABS.find((tab) => tab.kind === kind)!.blurb}
						Font={Enum.Font.GothamBold}
						TextSize={15}
						TextColor3={Color3.fromRGB(190, 190, 190)}
						TextXAlignment={Enum.TextXAlignment.Left}
						BackgroundTransparency={1}
					/>

					<scrollingframe
						key="List"
						Position={UDim2.fromOffset(20, 130)}
						Size={new UDim2(1, -40, 1, -146)}
						BackgroundTransparency={1}
						BorderSizePixel={0}
						ScrollBarThickness={6}
						CanvasSize={new UDim2()}
						AutomaticCanvasSize={Enum.AutomaticSize.Y}
					>
						<uilistlayout SortOrder={Enum.SortOrder.LayoutOrder} Padding={new UDim(0, 8)} />
						<uipadding PaddingRight={new UDim(0, 10)} />
						{ladder(kind).map((tier, index) => (
							<TierRow
								key={`${kind}-${tier.id}`}
								kind={kind}
								tier={tier}
								order={index}
								owned={owned[tier.id] === true}
								worn={worn === tier.id}
								forSale={forSale?.id === tier.id}
								affordable={wins >= tier.price}
								fits={fitsSizeCap(tier, sizeCap)}
							/>
						))}
					</scrollingframe>
				</frame>
			)}
		</>
	);
}
