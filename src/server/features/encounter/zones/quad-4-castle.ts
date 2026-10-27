import type { Piece } from "./quad-4/castle-geometry";
import { planCastleTerrace, terraceStyle, zoneScale } from "./quad-4/castle-plan";
import type { ZoneBuilder } from "./types";

const FIRE_COLOR = Color3.fromRGB(255, 140, 40);
const FIRE_SECONDARY = Color3.fromRGB(255, 70, 20);
const FIRELIGHT = Color3.fromRGB(255, 170, 90);

function buildPiece(parent: Instance, piece: Piece, u: number): void {
	const part = new Instance("Part");
	part.Name = piece.name;
	part.Anchored = true;
	part.CanCollide = piece.collidable;
	part.CanTouch = piece.collidable;
	part.CastShadow = piece.collidable;
	part.Shape = Enum.PartType[piece.shape ?? "Block"];
	part.Size = piece.size;
	part.CFrame = piece.cframe;
	part.Color = piece.color;
	part.Material = piece.material;
	part.Transparency = piece.transparency ?? 0;
	part.TopSurface = Enum.SurfaceType.Smooth;
	part.BottomSurface = Enum.SurfaceType.Smooth;
	if (piece.fire) {
		const fire = new Instance("Fire");
		fire.Size = 5 * u;
		fire.Heat = 9;
		fire.Color = FIRE_COLOR;
		fire.SecondaryColor = FIRE_SECONDARY;
		fire.Parent = part;
		const light = new Instance("PointLight");
		light.Color = FIRELIGHT;
		light.Range = 18 * u;
		light.Brightness = 2;
		light.Shadows = false;
		light.Parent = part;
	}
	part.Parent = parent;
}

/**
 * Quad 4's environment: the Castle zone, a walled keep of stone and banners.
 * Each terrace is restyled in cobblestone or slate and dressed from
 * planCastleTerrace, which keeps every collidable piece out of the
 * keep-clear boxes; this shell only turns pieces into Parts.
 */
export const buildCastleZone: ZoneBuilder = (context) => {
	context.terraceParts.forEach((terrace, index) => {
		const style = terraceStyle(index);
		terrace.Color = style.color;
		terrace.Material = style.material;
	});
	context.terraces.forEach((layout, index) => {
		const folder = new Instance("Folder");
		folder.Name = `Terrace${index + 1}`;
		const u = zoneScale(layout);
		for (const piece of planCastleTerrace(layout, context.clearZones, context.quadIndex * 1000 + index)) {
			buildPiece(folder, piece, u);
		}
		folder.Parent = context.folder;
	});
};
