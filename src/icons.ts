import { Paths } from "./paths"

/** Icons of the menu: the SDK set where it has one, our own outline glyphs next to it. */
export const FountainIcons = {
	/** The page itself: the rune standing over the bowl of the shrine. */
	Fountain: `${Paths.Icons}/wisdom.svg`,
	State: Menu.Icons.Power,
	/** Waves going out from a point: the ping the alert puts on the minimap. */
	Alert: `${Paths.Icons}/ping.svg`,
	Size: Menu.Icons.Expand,
	/** A circle beside a square: the two shapes the icon is drawn in. */
	Shape: `${Paths.Icons}/shape.svg`
} as const
