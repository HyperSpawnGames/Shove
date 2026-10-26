import { OnStart, Service } from "@flamework/core";
import { Workspace } from "@rbxts/services";
import { ARENA_GIANT_NAME, ARENAS_FOLDER, ArenaAttribute } from "shared/features/encounter/encounter-attributes";
import {
	ARENA_BASE_HALF_LENGTH,
	ARENA_HALF_LENGTH_PER_SCALE,
	ARENA_ORIGIN,
	ARENA_SPACING,
	ARENA_WIDTH,
	FIGHTER_REACH,
} from "./encounter-config";
import { cloneGiant, placeOnFloor, startIdle } from "./giant-models";
import type { GiantDefinition } from "./giants";

export interface Arena {
	model: Model;
	/** Where the player's root goes at meter 0.5. */
	playerStart: CFrame;
	slot: number;
}

const PLATFORM_THICKNESS = 6;
const PLATFORM_COLOR = Color3.fromRGB(205, 205, 210);
const EDGE_COLOR = Color3.fromRGB(255, 70, 70);

/**
 * Builds one arena per fight, each in its own slot high above the world, and
 * streams it to its player alone. Nobody else is sent it, so every fight is
 * private. The shove axis runs along +X: the player on the left, the giant on
 * the right, a cliff past each end.
 */
@Service({})
export class ArenaService implements OnStart {
	private readonly usedSlots = new Set<number>();
	private folder!: Folder;

	onStart(): void {
		this.folder = new Instance("Folder");
		this.folder.Name = ARENAS_FOLDER;
		this.folder.Parent = Workspace;
	}

	/**
	 * Builds an arena for `player` against `giant`, or undefined when the
	 * giant's prefab is missing. `rootHeight` is how far the player's root
	 * sits above their feet. Release it with destroy().
	 */
	public build(player: Player, giant: GiantDefinition, rootHeight: number): Arena | undefined {
		const slot = this.acquireSlot();
		const center = ARENA_ORIGIN.add(new Vector3(slot * ARENA_SPACING, 0, 0));
		const right = new Vector3(1, 0, 0);
		const halfLength = ARENA_BASE_HALF_LENGTH + giant.scale * ARENA_HALF_LENGTH_PER_SCALE;

		const model = new Instance("Model");
		model.Name = tostring(player.UserId);
		model.ModelStreamingMode = Enum.ModelStreamingMode.PersistentPerPlayer;
		// In the world before the giant is cloned into it: the engine scales a rig in place.
		model.Parent = this.folder;
		model.AddPersistentPlayer(player);

		const giantModel = cloneGiant(giant, model);
		if (giantModel === undefined) {
			model.Destroy();
			this.usedSlots.delete(slot);
			return undefined;
		}

		this.addPart(model, "Platform", new Vector3(halfLength * 2, PLATFORM_THICKNESS, ARENA_WIDTH), {
			cframe: new CFrame(center.sub(new Vector3(0, PLATFORM_THICKNESS / 2, 0))),
			color: PLATFORM_COLOR,
			material: Enum.Material.Slate,
		});
		for (const side of [-1, 1]) {
			this.addPart(model, side < 0 ? "LeftEdge" : "RightEdge", new Vector3(1.5, 0.3, ARENA_WIDTH), {
				cframe: new CFrame(center.add(right.mul(side * (halfLength - 0.75))).add(new Vector3(0, 0.15, 0))),
				color: EDGE_COLOR,
				material: Enum.Material.Neon,
			});
		}
		this.addPart(model, "CenterLine", new Vector3(0.6, 0.1, ARENA_WIDTH * 0.6), {
			cframe: new CFrame(center.add(new Vector3(0, 0.05, 0))),
			color: new Color3(1, 1, 1),
			material: Enum.Material.SmoothPlastic,
		});

		const giantFloor = center.add(right.mul(FIGHTER_REACH * giant.scale));
		placeOnFloor(giantModel, CFrame.lookAt(giantFloor, giantFloor.sub(right)));
		giantModel.Name = ARENA_GIANT_NAME;
		startIdle(giantModel);

		const playerRoot = center.sub(right.mul(FIGHTER_REACH)).add(new Vector3(0, rootHeight, 0));
		const playerStart = CFrame.lookAt(playerRoot, playerRoot.add(right));

		// Both fighters stop a reach short of the far edge, so the loser goes over it.
		const travel = halfLength - FIGHTER_REACH * giant.scale - 1;
		model.SetAttribute(ArenaAttribute.PlayerStart, playerStart);
		model.SetAttribute(ArenaAttribute.GiantStart, giantModel.GetPivot());
		model.SetAttribute(ArenaAttribute.TravelLength, math.max(travel, 4));
		return { model, playerStart, slot };
	}

	public destroy(arena: Arena): void {
		arena.model.Destroy();
		this.usedSlots.delete(arena.slot);
	}

	private acquireSlot(): number {
		let slot = 0;
		while (this.usedSlots.has(slot)) slot += 1;
		this.usedSlots.add(slot);
		return slot;
	}

	private addPart(
		parent: Instance,
		name: string,
		size: Vector3,
		look: { cframe: CFrame; color: Color3; material: Enum.Material },
	): Part {
		const part = new Instance("Part");
		part.Name = name;
		part.Anchored = true;
		part.Size = size;
		part.CFrame = look.cframe;
		part.Color = look.color;
		part.Material = look.material;
		part.TopSurface = Enum.SurfaceType.Smooth;
		part.BottomSurface = Enum.SurfaceType.Smooth;
		part.Parent = parent;
		return part;
	}
}
