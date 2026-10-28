import { describe, expect, it } from "@rbxts/jest-globals";
import { PathSubscriptions, pathsOverlap } from "./path-subscriptions";
import type { DataChange, DataPath } from "./player-data-store";

const change = (path: DataPath): DataChange => ({ action: "Set", path, value: 1, detail: 0 });

describe("pathsOverlap", () => {
	it("is true for equal paths", () => {
		expect(pathsOverlap(["Wins"], ["Wins"])).toBe(true);
		expect(pathsOverlap(["Settings", "music"], ["Settings", "music"])).toBe(true);
	});

	it("is true when either path is a prefix of the other", () => {
		expect(pathsOverlap(["Settings"], ["Settings", "music"])).toBe(true);
		expect(pathsOverlap(["Settings", "music"], ["Settings"])).toBe(true);
	});

	it("is false for siblings", () => {
		expect(pathsOverlap(["Wins"], ["Settings"])).toBe(false);
		expect(pathsOverlap(["Settings", "music"], ["Settings", "sfx"])).toBe(false);
	});

	it("treats the empty path as a prefix of everything", () => {
		expect(pathsOverlap([], ["Wins"])).toBe(true);
		expect(pathsOverlap(["Wins", "x"], [])).toBe(true);
		expect(pathsOverlap([], [])).toBe(true);
	});
});

describe("PathSubscriptions", () => {
	it("fires root subscribers first, then the change's bucket, each in subscription order", () => {
		const subscriptions = new PathSubscriptions();
		const order: string[] = [];
		subscriptions.subscribe(["Wins"], () => {
			order.push("wins-1");
		});
		subscriptions.subscribe([], () => {
			order.push("root-1");
		});
		subscriptions.subscribe(["Wins"], () => {
			order.push("wins-2");
		});
		subscriptions.subscribe([], () => {
			order.push("root-2");
		});

		subscriptions.dispatch(change(["Wins"]));

		expect(order).toEqual(["root-1", "root-2", "wins-1", "wins-2"]);
	});

	it("hands the listener the change itself", () => {
		const subscriptions = new PathSubscriptions();
		const received: DataChange[] = [];
		subscriptions.subscribe(["Inventory"], (c) => {
			received.push(c);
		});
		const sent: DataChange = { action: "TableInsert", path: ["Inventory"], value: "@1", detail: 1 };

		subscriptions.dispatch(sent);

		expect(received.size()).toBe(1);
		expect(received[0]).toBe(sent);
	});

	it("leaves an unrelated bucket untouched", () => {
		const subscriptions = new PathSubscriptions();
		let fired = 0;
		subscriptions.subscribe(["Settings"], () => {
			fired += 1;
		});

		subscriptions.dispatch(change(["Wins"]));

		expect(fired).toBe(0);
	});

	it("filters within a bucket: an entry write reaches the field and that entry only", () => {
		const subscriptions = new PathSubscriptions();
		const fired: string[] = [];
		subscriptions.subscribe(["Settings"], () => {
			fired.push("field");
		});
		subscriptions.subscribe(["Settings", "music"], () => {
			fired.push("music");
		});
		subscriptions.subscribe(["Settings", "sfx"], () => {
			fired.push("sfx");
		});

		subscriptions.dispatch(change(["Settings", "music"]));

		expect(fired).toEqual(["field", "music"]);
	});

	it("reaches every entry beneath a wholesale field write", () => {
		const subscriptions = new PathSubscriptions();
		const fired: string[] = [];
		subscriptions.subscribe(["Settings", "music"], () => {
			fired.push("music");
		});
		subscriptions.subscribe(["Settings", "sfx"], () => {
			fired.push("sfx");
		});

		subscriptions.dispatch(change(["Settings"]));

		expect(fired).toEqual(["music", "sfx"]);
	});

	it("reaches every bucket for an empty-path change", () => {
		const subscriptions = new PathSubscriptions();
		const fired: string[] = [];
		subscriptions.subscribe(["Wins"], () => {
			fired.push("Wins");
		});
		subscriptions.subscribe(["Settings"], () => {
			fired.push("Settings");
		});

		subscriptions.dispatch(change([]));

		// Bucket order is unspecified for a root change; only membership is.
		expect(fired.sort()).toEqual(["Settings", "Wins"]);
	});

	it("stops firing after unsubscribe and drops the count", () => {
		const subscriptions = new PathSubscriptions();
		let fired = 0;
		const unsubscribe = subscriptions.subscribe(["Wins"], () => {
			fired += 1;
		});
		expect(subscriptions.count()).toBe(1);

		unsubscribe();
		unsubscribe();
		subscriptions.dispatch(change(["Wins"]));

		expect(fired).toBe(0);
		expect(subscriptions.count()).toBe(0);
	});

	it("reports a throwing listener and still runs the next", () => {
		const subscriptions = new PathSubscriptions();
		let fired = false;
		subscriptions.subscribe(["Wins"], () => {
			throw "boom";
		});
		subscriptions.subscribe(["Wins"], () => {
			fired = true;
		});

		expect(() => subscriptions.dispatch(change(["Wins"]))).never.toThrow();
		expect(fired).toBe(true);
	});
});
