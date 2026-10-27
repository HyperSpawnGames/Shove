import { describe, expect, it } from "@rbxts/jest-globals";
import { formatNumber } from "./format-number";

describe("formatNumber", () => {
	it("prints small whole numbers as they are", () => {
		expect(formatNumber(0)).toBe("0");
		expect(formatNumber(950)).toBe("950");
	});

	it("keeps one decimal below a thousand", () => {
		expect(formatNumber(1.5)).toBe("1.5");
	});

	it("abbreviates thousands and millions", () => {
		expect(formatNumber(1200)).toBe("1.2K");
		expect(formatNumber(34_500_000)).toBe("34.5M");
	});

	it("drops a zero decimal", () => {
		expect(formatNumber(2000)).toBe("2K");
	});

	it("truncates instead of rounding up into the next tier", () => {
		expect(formatNumber(999_999)).toBe("999.9K");
	});

	it("keeps the sign of negative numbers", () => {
		expect(formatNumber(-1500)).toBe("-1.5K");
	});

	it("shows NaN as zero", () => {
		expect(formatNumber(0 / 0)).toBe("0");
	});
});
