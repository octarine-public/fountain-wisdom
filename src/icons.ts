import { Paths } from "./paths"

/** Icons of the menu: the SDK set where it has one, our own outline glyphs next to it. */
export const FountainIcons = {
	/** The page itself: the rune standing over the bowl of the shrine. */
	Fountain: `${Paths.Icons}/wisdom.svg`,
	State: Menu.Icons.Power,
	/** The row that picks where the alerts go. */
	Notification: Menu.Icons.Type,
	/** The wait for the rune: the row that announces it before it spawns. */
	SpawnAlert: Menu.Icons.Hourglass,
	/** How long before the spawn the alert goes out. */
	SpawnBefore: Menu.Icons.Timer,
	/** The row that announces a rune being taken. */
	GatherAlert: Menu.Icons.CircleAlert,
	/** The window a shrine stays quiet for after a gather alert. */
	AntiSpam: Menu.Icons.ShieldCheck,
	/** Waves going out from a point: the ping the alert puts on the minimap. */
	Alert: `${Paths.Icons}/ping.svg`,
	FormatTime: Menu.Icons.ClockSeconds,
	Size: Menu.Icons.Expand
} as const
