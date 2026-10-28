import { Components } from "@flamework/components";
import { OnStart, Service } from "@flamework/core";
import { Workspace } from "@rbxts/services";
import { Events } from "server/network";
import { STAIRCASE_FOLDER } from "shared/features/encounter/encounter-attributes";
import { EncounterSession } from "./encounter-session";
import { registerGateGroups } from "./gate-collision";
import { GIANTS, QUADS } from "./giants";
import { buildGiant, buildRamp, buildTerrace, giantClearZone, laneClearZone } from "./staircase";
import {
	Footprint,
	gateOpensAt,
	giantFootprint,
	layoutTerraces,
	planSlots,
	SPACER_FOOTPRINT,
	TerraceLayout,
} from "./world-layout";
import { ZONE_BUILDERS } from "./zones";
import type { ZoneContext } from "./zones/types";

/**
 * Builds the staircase from the roster, quad by quad: a terrace, ramp, gate
 * and giant per giant, an empty spacer terrace between quads, then each
 * quad's zone dressing. Routes each giant's prompt and the requestShove
 * intent to the player's EncounterSession; no session means the profile is
 * not loaded yet, so the request is dropped.
 */
@Service({})
export class EncounterService implements OnStart {
	/** The spacer terraces between quads, bottom first: where a fallen player respawns. */
	private readonly checkpoints: TerraceLayout[] = [];

	constructor(private readonly components: Components) {}

	public getCheckpoints(): readonly TerraceLayout[] {
		return this.checkpoints;
	}

	onStart(): void {
		registerGateGroups();
		const folder = new Instance("Folder");
		folder.Name = STAIRCASE_FOLDER;
		folder.Parent = Workspace;

		const slots = planSlots(QUADS.map((quad) => quad.giants.size()));
		const footprints = slots.map((slot): Footprint =>
			slot.kind === "giant" ? giantFootprint(GIANTS[slot.giantIndex].scale) : SPACER_FOOTPRINT,
		);
		const layouts = layoutTerraces(footprints);

		const zones = new Map<number, ZoneContext>();
		const zoneFor = (quadIndex: number): ZoneContext => {
			let zone = zones.get(quadIndex);
			if (zone === undefined) {
				const zoneFolder = new Instance("Folder");
				zoneFolder.Name = QUADS[quadIndex].theme;
				zoneFolder.Parent = folder;
				zone = {
					folder: zoneFolder,
					quadIndex,
					quad: QUADS[quadIndex],
					terraces: [],
					terraceParts: [],
					ramps: [],
					clearZones: [],
				};
				zones.set(quadIndex, zone);
			}
			return zone;
		};

		slots.forEach((slot, index) => {
			const layout = layouts[index];
			const terrace = buildTerrace(folder, index, layout);
			const opensAt = gateOpensAt(slots, index);
			const ramp =
				index > 0
					? buildRamp(
							folder,
							index,
							layouts[index - 1],
							layout,
							opensAt !== undefined ? { opensAt, beat: GIANTS[opensAt - 1] } : undefined,
						)
					: undefined;
			if (slot.kind === "spacer") {
				this.checkpoints.push(layout);
				return;
			}

			const giant = GIANTS[slot.giantIndex];
			const zone = zoneFor(slot.quadIndex);
			zone.terraces.push(layout);
			if (terrace) zone.terraceParts.push(terrace);
			if (ramp) zone.ramps.push(ramp);
			zone.clearZones.push(giantClearZone(giant, layout), laneClearZone(layout));

			const built = buildGiant(folder, slot.giantIndex, giant, layout);
			built?.prompt.Triggered.Connect((player) =>
				this.components.getComponent<EncounterSession>(player)?.requestChallenge(slot.giantIndex, built.returnTo),
			);
		});

		for (const [quadIndex, zone] of zones) {
			const [ok, err] = pcall(() => ZONE_BUILDERS[quadIndex]?.(zone));
			if (!ok) warn(`[push-a-giant] zone ${zone.quad.theme} failed to build: ${tostring(err)}`);
		}

		Events.requestShove.connect((player) => this.components.getComponent<EncounterSession>(player)?.requestShove());
	}
}
