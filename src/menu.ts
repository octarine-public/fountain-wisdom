import { FountainIcons } from "./icons"

export class MenuManager {
	public static Menu: MenuManager

	public readonly State: Menu.Toggle
	public readonly IconSize: Menu.Slider
	public readonly ModeImage: Menu.Dropdown
	public readonly NotifyMinimap: Menu.Toggle

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

		this.NotifyMinimap = this.node.AddToggle(
			"Minimap alert",
			true,
			"Pings the minimap and plays a sound\n20 seconds before the fountain spawns"
		)
		this.NotifyMinimap.IconPath = FountainIcons.Alert

		this.IconSize = this.node.AddSlider(
			"Icon size",
			0,
			0,
			50,
			0,
			"Size of the icon drawn over the shrine"
		)
		this.IconSize.IconPath = FountainIcons.Size

		this.ModeImage = this.node.AddDropdown(
			"Icon shape",
			["Circle", "Square"],
			0,
			"Shape of the icon and of the timer ring around it"
		)
		this.ModeImage.IconPath = FountainIcons.Shape

		MenuManager.Menu = this
	}

	private migrate(stored: Nullable<MenuSDK.ConfigObject>) {
		MenuSDK.RenameStoredRow(stored, "Notify on minimap", "Minimap alert")
		MenuSDK.RenameStoredRow(stored, "Mode images", "Icon shape")
	}
}
