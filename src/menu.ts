import { FountainIcons } from "./icons"

/** The options the notification row lists, in the order it lists them. */
const channelNames = ["Game chat", "Side card", "Disable"]

/** The channel each option stands for, under the same index; "Disable" stands for none. */
const channelsOfOption: readonly Nullable<NotificationChannel>[] = [
	NotificationChannel.Chat,
	NotificationChannel.Side,
	undefined
]

export class MenuManager {
	public static Menu: MenuManager

	public readonly State: Menu.Toggle
	/** Where the alerts go: the game chat, a side card, or nowhere. */
	public readonly Notification: Menu.Dropdown
	/** Whether the coming rune is announced before it spawns. */
	public readonly SpawnAlert: Menu.Toggle
	/** How long before the rune spawns it is announced, in seconds. */
	public readonly SpawnBefore: Menu.Slider
	/** Whether a shrine is announced the moment someone starts taking its rune. */
	public readonly GatherAlert: Menu.Toggle
	/** How long after a gather alert the same shrine stays quiet, in seconds; 0 holds nothing back. */
	public readonly AntiSpam: Menu.Slider
	public readonly NotifyMinimap: Menu.Toggle
	public readonly FormatTime: Menu.Toggle
	public readonly Size: Menu.Slider

	private readonly tree = Menu.AddEntry("Visual")
	private readonly node = this.tree.AddNode(
		"Fountain of wisdom",
		FountainIcons.Fountain,
		"Timers of the wisdom fountains,\nover the shrine and on the minimap"
	)

	constructor() {
		this.node.SortNodes = false
		// the rows renamed since the first release keep their saved values
		this.migrate(this.node.entry.stored)
		MenuSDK.AddConfigMigration(raw =>
			this.migrate(MenuSDK.ConfigSubtreeOf(raw, this.node.entry))
		)

		// the script's own switch rides the top bar beside the breadcrumb and gates the page
		this.State = this.node.AddToggle("State", true)
		this.State.IconPath = FountainIcons.State
		this.node.HeaderControl = this.State
		this.node.Gate = this.State

		this.Notification = this.node.AddDropdown(
			"Notification",
			[...channelNames],
			channelsOfOption.indexOf(NotificationChannel.Side),
			"Where the alerts go:\nthe game chat or a side card"
		)
		this.Notification.IconPath = FountainIcons.Notification

		this.SpawnAlert = this.node.AddToggle(
			"Spawn alert",
			true,
			"Announces the rune\nbefore it spawns"
		)
		this.SpawnAlert.IconPath = FountainIcons.SpawnAlert

		this.SpawnBefore = this.node.AddSlider(
			"Before spawn",
			20,
			3,
			120,
			0,
			"How long before the rune spawns\nthe alert goes out, in seconds"
		)
		this.SpawnBefore.IconPath = FountainIcons.SpawnBefore

		this.GatherAlert = this.node.AddToggle(
			"Gather alert",
			true,
			"Announces the shrine the moment\nsomeone starts taking its rune"
		)
		this.GatherAlert.IconPath = FountainIcons.GatherAlert

		this.AntiSpam = this.node.AddSlider(
			"Anti-spam",
			10,
			0,
			60,
			0,
			"How long after a gather alert the same\nshrine stays quiet, in seconds"
		)
		this.AntiSpam.IconPath = FountainIcons.AntiSpam

		this.NotifyMinimap = this.node.AddToggle(
			"Minimap alert",
			true,
			"Also pings the minimap and plays\na sound with every alert"
		)
		this.NotifyMinimap.IconPath = FountainIcons.Alert

		this.FormatTime = this.node.AddToggle(
			"Format time",
			true,
			"Show remaining\ntime as min:sec"
		)
		this.FormatTime.IconPath = FountainIcons.FormatTime

		// the chip is drawn 1:1 at the middle of the range; the old 0-50 icon size does not carry over
		this.Size = this.node.AddSlider(
			"Size in world",
			4,
			0,
			8,
			0,
			"Size of the icon drawn over the shrine"
		)
		this.Size.IconPath = FountainIcons.Size

		// the slider of an alert that is off is nothing to set
		this.SpawnBefore.IsHidden = !this.SpawnAlert.value
		this.SpawnAlert.OnValue(call => {
			this.SpawnBefore.IsHidden = !call.value
		})
		this.AntiSpam.IsHidden = !this.GatherAlert.value
		this.GatherAlert.OnValue(call => {
			this.AntiSpam.IsHidden = !call.value
		})

		MenuManager.Menu = this
	}

	/** The channel the alerts are announced on, or nothing while the row is on "Disable". */
	public get Channel(): Nullable<NotificationChannel> {
		return channelsOfOption[this.Notification.SelectedID]
	}

	private migrate(stored: Nullable<MenuSDK.ConfigObject>) {
		MenuSDK.RenameStoredRow(stored, "Notify on minimap", "Minimap alert")
	}
}
