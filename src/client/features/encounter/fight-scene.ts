import { RunService, Workspace } from "@rbxts/services";
import {
	ARENA_GIANT_NAME,
	ARENAS_FOLDER,
	ArenaAttribute,
	EncounterAttribute,
} from "shared/features/encounter/encounter-attributes";
import {
	CAMERA_BASE_DISTANCE,
	CAMERA_HEIGHT,
	CAMERA_SIDE_SHIFT,
	METER_SMOOTHING,
	THROW_SECONDS,
} from "./encounter-config";
import { applyShovePose } from "./shove-pose";

const ARENA_WAIT_SECONDS = 10;

type Loser = "giant" | "player";

/**
 * Draws one fight on this client: the camera, both fighters' poses, their
 * slide along the platform as the meter moves, and the loser's fall. Every
 * change here is local; the arena reaches no other player, and the server
 * decides the fight from its own meter.
 */
export class FightScene {
	private stopped = false;
	private connection?: RBXScriptConnection;
	private restorers: (() => void)[] = [];
	private pendingLoser?: Loser;
	private throwState?: { loser: Loser; startedAt: number; from: CFrame };
	private shownMeter = 0.5;

	private playerStart = new CFrame();
	private giantStart = new CFrame();
	private travel = 0;
	private giant?: Model;
	private root?: BasePart;

	constructor(private readonly player: Player) {}

	/** Waits for the arena to stream in, then takes the camera. Yields. */
	public start(): void {
		const arena = Workspace.WaitForChild(ARENAS_FOLDER, ARENA_WAIT_SECONDS)?.WaitForChild(
			tostring(this.player.UserId),
			ARENA_WAIT_SECONDS,
		);
		const giant = arena?.WaitForChild(ARENA_GIANT_NAME, ARENA_WAIT_SECONDS);
		const character = this.player.Character;
		const root = character?.FindFirstChild("HumanoidRootPart");
		if (this.stopped || !arena?.IsA("Model") || !giant?.IsA("Model") || !root?.IsA("BasePart")) return;

		const playerStart = arena.GetAttribute(ArenaAttribute.PlayerStart);
		const giantStart = arena.GetAttribute(ArenaAttribute.GiantStart);
		const travel = arena.GetAttribute(ArenaAttribute.TravelLength);
		if (!typeIs(playerStart, "CFrame") || !typeIs(giantStart, "CFrame") || !typeIs(travel, "number")) return;

		this.playerStart = playerStart;
		this.giantStart = giantStart;
		this.travel = travel;
		this.giant = giant;
		this.root = root;
		this.shownMeter = this.serverMeter();

		this.restorers.push(applyShovePose(character!), applyShovePose(giant));
		this.takeCamera(character!);
		this.connection = RunService.RenderStepped.Connect((dt) => this.step(dt));
		if (this.pendingLoser !== undefined) this.throwLoser(this.pendingLoser);
	}

	/** Throws the loser off its cliff. Safe to call before start() has finished. */
	public throwLoser(loser: Loser): void {
		if (this.throwState !== undefined) return;
		if (this.connection === undefined) {
			this.pendingLoser = loser;
			return;
		}
		const from = loser === "giant" ? this.giant!.GetPivot() : this.root!.CFrame;
		this.throwState = { loser, startedAt: os.clock(), from };
	}

	/** Gives back the camera and the player's pose. The server removes the arena. */
	public stop(): void {
		this.stopped = true;
		this.connection?.Disconnect();
		for (const restore of this.restorers) restore();
		this.restorers = [];

		const camera = Workspace.CurrentCamera;
		const humanoid = this.player.Character?.FindFirstChildOfClass("Humanoid");
		if (camera) {
			camera.CameraType = Enum.CameraType.Custom;
			if (humanoid) camera.CameraSubject = humanoid;
		}
	}

	private serverMeter(): number {
		const meter = this.player.GetAttribute(EncounterAttribute.Meter);
		return typeIs(meter, "number") ? meter : 0.5;
	}

	private step(dt: number): void {
		this.shownMeter += (this.serverMeter() - this.shownMeter) * math.min(1, dt * METER_SMOOTHING);
		const axis = this.playerStart.LookVector;
		const offset = axis.mul((this.shownMeter - 0.5) * 2 * this.travel);

		const thrown = this.throwState;
		if (thrown?.loser !== "player") this.root!.CFrame = this.playerStart.add(offset);
		if (thrown?.loser !== "giant") this.giant!.PivotTo(this.giantStart.add(offset));
		if (thrown === undefined) return;

		// The loser flies off its own side: the giant to the right, the player to the left.
		const elapsed = math.min(os.clock() - thrown.startedAt, THROW_SECONDS);
		const direction = thrown.loser === "giant" ? axis : axis.mul(-1);
		const size = thrown.loser === "giant" ? this.giant!.GetExtentsSize().Y / 5 : 1;
		const flight = direction
			.mul(20 * size * elapsed)
			.add(new Vector3(0, 12 * size * elapsed - 40 * elapsed * elapsed, 0));
		const spin = CFrame.Angles(elapsed * 5, 0, 0);
		const moved = thrown.from.add(flight).mul(spin);
		if (thrown.loser === "giant") this.giant!.PivotTo(moved);
		else this.root!.CFrame = moved;
	}

	private takeCamera(character: Model): void {
		const camera = Workspace.CurrentCamera;
		if (camera === undefined) return;

		const giantHeight = this.giant!.GetExtentsSize().Y;
		const characterHeight = character.GetExtentsSize().Y;
		const axis = this.playerStart.LookVector;
		const side = axis.Cross(new Vector3(0, 1, 0));
		const middle = this.playerStart.Position.Lerp(this.giantStart.Position, 0.5);
		const floorY = this.playerStart.Position.Y - characterHeight / 2;
		const focus = new Vector3(middle.X, floorY + giantHeight * 0.45, middle.Z);
		const distance = CAMERA_BASE_DISTANCE + giantHeight * 1.2;
		const eye = focus
			.add(side.mul(distance))
			.sub(axis.mul(distance * CAMERA_SIDE_SHIFT))
			.add(new Vector3(0, CAMERA_HEIGHT, 0));

		camera.CameraType = Enum.CameraType.Scriptable;
		camera.CFrame = CFrame.lookAt(eye, focus);
	}
}
