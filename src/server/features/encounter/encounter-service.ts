import { Components } from "@flamework/components";
import { OnStart, Service } from "@flamework/core";
import { Workspace } from "@rbxts/services";
import { Events } from "server/network";
import { EncounterSession } from "./encounter-session";
import { cloneGiant, placeOnFloor } from "./giant-models";
import { GiantDefinition, GIANTS } from "./giants";

/** Studs in front of a lobby giant where a finished fight puts the player back. */
const RETURN_DISTANCE = 12;
/** Where the lobby giants face, and where players come back from a fight facing them. */
const LOBBY_CENTER = new Vector3(0, 0, 0);

/**
 * Puts every giant on its lobby pedestal with a Challenge prompt and routes
 * the prompt and the requestShove intent to the player's EncounterSession.
 * No session means the profile is not loaded yet, so the request is dropped.
 */
@Service({})
export class EncounterService implements OnStart {
	constructor(private readonly components: Components) {}

	onStart(): void {
		const folder = new Instance("Folder");
		folder.Name = "LobbyGiants";
		folder.Parent = Workspace;
		for (const giant of GIANTS) this.placeLobbyGiant(giant, folder);

		Events.requestShove.connect((player) => this.components.getComponent<EncounterSession>(player)?.requestShove());
	}

	private placeLobbyGiant(giant: GiantDefinition, parent: Instance): void {
		const model = cloneGiant(giant);
		if (model === undefined) return;

		const position = giant.lobbyPosition;
		const facing = new Vector3(LOBBY_CENTER.X, position.Y, LOBBY_CENTER.Z);
		const toCenter = facing.sub(position).Unit;

		const pedestal = new Instance("Part");
		pedestal.Name = `${giant.modelId}Pedestal`;
		pedestal.Anchored = true;
		pedestal.Size = new Vector3(10, position.Y, 10);
		pedestal.CFrame = new CFrame(position.sub(new Vector3(0, position.Y / 2, 0)));
		pedestal.Color = Color3.fromRGB(90, 90, 100);
		pedestal.Material = Enum.Material.Slate;
		pedestal.Parent = parent;

		placeOnFloor(model, CFrame.lookAt(position, position.add(toCenter)));
		model.Name = giant.modelId;
		model.Parent = parent;

		const root = model.PrimaryPart ?? model.FindFirstChild("HumanoidRootPart");
		if (!root?.IsA("BasePart")) return;
		const [, size] = model.GetBoundingBox();

		const billboard = new Instance("BillboardGui");
		billboard.Size = UDim2.fromOffset(260, 90);
		billboard.StudsOffsetWorldSpace = new Vector3(0, size.Y / 2 + 2.5, 0);
		billboard.MaxDistance = 150;
		billboard.Parent = root;
		const label = new Instance("TextLabel");
		label.Size = UDim2.fromScale(1, 1);
		label.BackgroundTransparency = 1;
		label.Font = Enum.Font.GothamBlack;
		label.TextScaled = true;
		label.TextColor3 = new Color3(1, 1, 1);
		label.TextStrokeTransparency = 0.2;
		label.RichText = true;
		label.Text = `${giant.displayName}\n<font color="#FFC850">${giant.recommendedStrength} Strength</font>  <font color="#6EC8FF">+${giant.winsPayout} Wins</font>`;
		label.Parent = billboard;

		const prompt = new Instance("ProximityPrompt");
		prompt.ActionText = "Challenge";
		prompt.ObjectText = giant.displayName;
		prompt.KeyboardKeyCode = Enum.KeyCode.E;
		prompt.HoldDuration = 0;
		prompt.MaxActivationDistance = 14;
		prompt.RequiresLineOfSight = false;
		prompt.Parent = root;

		const returnSpot = position.add(toCenter.mul(RETURN_DISTANCE)).add(new Vector3(0, 3, 0));
		const returnTo = CFrame.lookAt(returnSpot, new Vector3(position.X, returnSpot.Y, position.Z));
		prompt.Triggered.Connect((player) =>
			this.components.getComponent<EncounterSession>(player)?.requestChallenge(giant, returnTo),
		);
	}
}
