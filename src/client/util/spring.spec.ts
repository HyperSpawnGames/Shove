import { describe, expect, it } from "@rbxts/jest-globals";
import { stepSpring, SpringTuning } from "./spring";

function run(tuning: SpringTuning, seconds: number, dt = 1 / 60): number[] {
	let position = Vector3.zero;
	let velocity = Vector3.zero;
	const target = new Vector3(10, 0, 0);
	const trace: number[] = [];
	for (let t = 0; t < seconds; t += dt) {
		[position, velocity] = stepSpring(position, velocity, target, tuning, dt);
		trace.push(position.X);
	}
	return trace;
}

describe("stepSpring", () => {
	it("settles on the target", () => {
		const trace = run({ speed: 20, damping: 0.6 }, 2);
		expect(trace[trace.size() - 1]).toBeCloseTo(10, 2);
	});

	it("overshoots when underdamped", () => {
		const trace = run({ speed: 20, damping: 0.4 }, 1);
		expect(math.max(...trace)).toBeGreaterThan(10.5);
	});

	it("never overshoots when critically damped", () => {
		const trace = run({ speed: 20, damping: 1 }, 2);
		expect(math.max(...trace)).toBeLessThanOrEqual(10.001);
	});

	it("stays stable through a long frame", () => {
		const trace = run({ speed: 40, damping: 0.5 }, 2, 0.25);
		expect(math.abs(trace[trace.size() - 1] - 10)).toBeLessThan(0.5);
	});

	it("does nothing for no time", () => {
		const [position, velocity] = stepSpring(Vector3.one, Vector3.zero, Vector3.zero, { speed: 20, damping: 1 }, 0);
		expect(position).toEqual(Vector3.one);
		expect(velocity).toEqual(Vector3.zero);
	});
});
