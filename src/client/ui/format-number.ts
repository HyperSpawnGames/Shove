const SUFFIXES = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];

/**
 * A compact display number: 950, 1.2K, 34.5M. One decimal at most, truncated
 * rather than rounded, so 999.99K reads 999.9K and never "1000.0K".
 */
export function formatNumber(value: number): string {
	if (value !== value) return "0";

	const sign = value < 0 ? "-" : "";
	let magnitude = math.abs(value);
	let tier = 0;
	while (magnitude >= 1000 && tier < SUFFIXES.size() - 1) {
		magnitude /= 1000;
		tier += 1;
	}

	const truncated = math.floor(magnitude * 10) / 10;
	const text = truncated % 1 === 0 ? "%d".format(truncated) : "%.1f".format(truncated);
	return `${sign}${text}${SUFFIXES[tier]}`;
}
