import { BaseComponent, Component } from "@flamework/components";
import { OnStart } from "@flamework/core";
import { CollectionService, StarterPlayer } from "@rbxts/services";
import { PlayerCharacter } from "server/services/player/player-character";
import { PLAYER_LOADED_TAG } from "server/services/player/player-tags";
import { feetOf, placeBody } from "server/util/place-body";
import { SCALED_RIG_TAG } from "shared/features/scaled-rigs/scaled-rigs";
import { BodyDefaults, bodyTuning, isValidScale } from "./body-tuning";

/**
 * Seconds to wait for a body's accessories before sizing it anyway.
 * CharacterAppearanceLoaded normally ends the wait sooner; sizing before the
 * accessories arrive would leave them at 1×.
 */
const APPEARANCE_TIMEOUT = 5;

/**
 * A player's size: one scale, applied to every body they spawn with. Not
 * saved; for now only the `size` dev command sets it, and later Strength
 * will. Each body is sized with Model:ScaleTo, keeping its feet where they
 * were, and tagged ScaledRig so every client corrects its animation
 * (docs/giant-scaling.md). Walk speed, jump height and the camera's zoom
 * range grow with it.
 */
@Component({ tag: PLAYER_LOADED_TAG })
export class PlayerSize extends BaseComponent<{}, Player> implements OnStart {
	private scale = 1;
	/** The latest body whose appearance has loaded: the one to size. */
	private readyBody?: Model;
	private bodyConnection?: RBXScriptConnection;
	private appearanceConnection?: RBXScriptConnection;
	private destroyed = false;
	private readonly defaults: BodyDefaults = {
		walkSpeed: StarterPlayer.CharacterWalkSpeed,
		jumpHeight: StarterPlayer.CharacterJumpHeight,
		cameraMaxZoom: StarterPlayer.CameraMaxZoomDistance,
	};

	constructor(private readonly character: PlayerCharacter) {
		super();
	}

	onStart(): void {
		this.bodyConnection = this.character.characterAdded.Connect((body) => this.onBodyAdded(body));
		this.appearanceConnection = this.instance.CharacterAppearanceLoaded.Connect((body) => this.onBodyReady(body));
		const body = this.character.getCharacter();
		if (body) this.onBodyAdded(body);
		this.applyToPlayer();
	}

	public getScale(): number {
		return this.scale;
	}

	/**
	 * Resizes the current body and every later one. Returns false, changing
	 * nothing, for a scale outside MIN_SCALE..MAX_SCALE.
	 */
	public setScale(scale: number): boolean {
		if (!isValidScale(scale)) return false;

		this.scale = scale;
		this.applyToPlayer();
		const body = this.readyBody;
		if (body !== undefined && body === this.character.getCharacter()) this.applyToBody(body);
		return true;
	}

	private onBodyAdded(body: Model): void {
		task.delay(APPEARANCE_TIMEOUT, () => this.onBodyReady(body));
	}

	private onBodyReady(body: Model): void {
		if (this.destroyed || body === this.readyBody || body !== this.character.getCharacter()) return;
		this.readyBody = body;
		this.applyToBody(body);
	}

	private applyToBody(body: Model): void {
		const humanoid = body.FindFirstChildOfClass("Humanoid");
		if (humanoid === undefined) return;

		if (body.GetScale() !== this.scale) {
			const feet = feetOf(body);
			body.ScaleTo(this.scale);
			if (feet) placeBody(body, feet);
		}
		humanoid.UseJumpPower = false;
		humanoid.JumpHeight = bodyTuning(this.scale, this.defaults).jumpHeight;
		if (this.scale === 1) CollectionService.RemoveTag(body, SCALED_RIG_TAG);
		else CollectionService.AddTag(body, SCALED_RIG_TAG);
	}

	private applyToPlayer(): void {
		const tuning = bodyTuning(this.scale, this.defaults);
		this.character.setWalkSpeed(this.scale === 1 ? undefined : tuning.walkSpeed);
		// Lower the minimum first, so the new maximum is never below the old minimum.
		const player = this.instance;
		player.CameraMinZoomDistance = math.min(player.CameraMinZoomDistance, tuning.cameraMinZoom);
		player.CameraMaxZoomDistance = tuning.cameraMaxZoom;
		player.CameraMinZoomDistance = tuning.cameraMinZoom;
	}

	override destroy(): void {
		this.destroyed = true;
		this.bodyConnection?.Disconnect();
		this.appearanceConnection?.Disconnect();
		super.destroy();
	}
}
