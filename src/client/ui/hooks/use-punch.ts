import { useEffect, useRef } from "@rbxts/react";
import { TweenService } from "@rbxts/services";

/**
 * A ref for a UIScale that punches up to `size` and springs back whenever
 * `value` changes, but not on the first render. Gives a counter or button a
 * physical reaction to a change.
 */
export function usePunch(value: unknown, size = 1.25) {
	const ref = useRef<UIScale>();
	const first = useRef(true);

	useEffect(() => {
		if (first.current) {
			first.current = false;
			return;
		}
		const scale = ref.current;
		if (scale === undefined) return;
		scale.Scale = size;
		const tween = TweenService.Create(scale, new TweenInfo(0.35, Enum.EasingStyle.Back, Enum.EasingDirection.Out), {
			Scale: 1,
		});
		tween.Play();
		return () => tween.Cancel();
	}, [value]);

	return ref;
}

/** A ref for a UIScale that grows in from `from` with a little overshoot when it mounts. */
export function usePopIn(from = 0.3, seconds = 0.35) {
	const ref = useRef<UIScale>();

	useEffect(() => {
		const scale = ref.current;
		if (scale === undefined) return;
		scale.Scale = from;
		const tween = TweenService.Create(scale, new TweenInfo(seconds, Enum.EasingStyle.Back, Enum.EasingDirection.Out), {
			Scale: 1,
		});
		tween.Play();
		return () => tween.Cancel();
	}, []);

	return ref;
}
