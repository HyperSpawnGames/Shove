/** An axis-aligned box in world space. */
export interface Box {
	readonly center: Vector3;
	readonly size: Vector3;
}

/** The engine's limit on a BasePart's size along any axis. */
export const MAX_PART_SIZE = 2048;

/**
 * Splits a box into equal pieces no larger than `maxSize` along any axis, so
 * a box of any size can be built from Parts. A box within the limit comes back
 * as the only piece.
 */
export function splitBox(box: Box, maxSize = MAX_PART_SIZE): Box[] {
	const { center, size } = box;
	const countX = math.max(1, math.ceil(size.X / maxSize));
	const countY = math.max(1, math.ceil(size.Y / maxSize));
	const countZ = math.max(1, math.ceil(size.Z / maxSize));
	const piece = new Vector3(size.X / countX, size.Y / countY, size.Z / countZ);
	const corner = center.sub(size.div(2)).add(piece.div(2));

	const pieces: Box[] = [];
	for (let x = 0; x < countX; x++) {
		for (let y = 0; y < countY; y++) {
			for (let z = 0; z < countZ; z++) {
				pieces.push({ center: corner.add(new Vector3(x * piece.X, y * piece.Y, z * piece.Z)), size: piece });
			}
		}
	}
	return pieces;
}
