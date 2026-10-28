import { Controller, OnStart } from "@flamework/core";
import React, { createBinding } from "@rbxts/react";
import { createPortal, createRoot, Root } from "@rbxts/react-roblox";
import { Players } from "@rbxts/services";
import { App } from "client/ui/app";
import { PlayerDataProvider } from "client/ui/player-data-context";
import { PlayerDataController } from "./player-data-controller";

export interface MountOptions {
	ignoreGuiInset?: boolean;
	displayOrder?: number;
	/** Stays on screen while another UI has the focus (see setFocus). */
	keepDuringFocus?: boolean;
}

interface Mounted {
	keepDuringFocus: boolean;
	setEnabled: (enabled: boolean) => void;
}

/**
 * The one place UI roots are created. Every feature mounts through `mount`,
 * so the container, root, portal, ScreenGui and data provider live here once;
 * a feature still owns its UI, because the feature makes the call.
 *
 * One UI at a time can take the focus (a fight's screen, say): every other
 * mounted UI hides until the focus is released, except those mounted with
 * keepDuringFocus. Features never reach into each other's UI to do this.
 */
@Controller({})
export class UiController implements OnStart {
	/** Every live root, so an unparented container is never left to the garbage collector. */
	private readonly roots = new Set<Root>();
	private readonly mounted = new Map<string, Mounted>();
	private focus?: string;

	constructor(private readonly data: PlayerDataController) {}

	/** Mounts the App shell. */
	onStart(): void {
		this.mount("PushAGiantApp", <App />, { ignoreGuiInset: true });
	}

	/**
	 * Mounts a feature's UI: a root on an unparented Folder, and a portal to a
	 * ScreenGui named `name` in PlayerGui (ResetOnSpawn off, ZIndexBehavior
	 * Sibling) wrapped in PlayerDataProvider. Returns unmount.
	 */
	public mount(name: string, element: React.Element, options?: MountOptions): () => void {
		const keepDuringFocus = options?.keepDuringFocus ?? false;
		const [enabled, setEnabled] = createBinding(this.isShown(name, keepDuringFocus));
		this.mounted.set(name, { keepDuringFocus, setEnabled });
		const playerGui = Players.LocalPlayer.WaitForChild("PlayerGui") as PlayerGui;

		// React roots take ownership of their container, so give the root a
		// Folder of its own and portal into PlayerGui rather than mounting on
		// it. The Folder stays unparented (the react-roblox idiom): nothing
		// renders into it, and PlayerGui would destroy it on respawn.
		const container = new Instance("Folder");
		container.Name = name;

		const root = createRoot(container);
		this.roots.add(root);
		root.render(
			<PlayerDataProvider store={this.data}>
				{createPortal(
					<screengui
						key={name}
						ResetOnSpawn={false}
						ZIndexBehavior={Enum.ZIndexBehavior.Sibling}
						IgnoreGuiInset={options?.ignoreGuiInset ?? false}
						DisplayOrder={options?.displayOrder ?? 0}
						Enabled={enabled}
					>
						{element}
					</screengui>,
					playerGui,
				)}
			</PlayerDataProvider>,
		);

		return () => {
			this.mounted.delete(name);
			this.roots.delete(root);
			root.unmount();
			container.Destroy();
		};
	}

	/**
	 * Gives the screen to the UI mounted as `name`, hiding every other one not
	 * mounted with keepDuringFocus; undefined releases it and shows them all.
	 */
	public setFocus(name: string | undefined): void {
		this.focus = name;
		for (const [mountedName, mounted] of this.mounted) {
			mounted.setEnabled(this.isShown(mountedName, mounted.keepDuringFocus));
		}
	}

	private isShown(name: string, keepDuringFocus: boolean): boolean {
		return this.focus === undefined || this.focus === name || keepDuringFocus;
	}
}
