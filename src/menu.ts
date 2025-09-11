import { Menu, PathData } from "github.com/octarine-public/wrapper/index"

export class MenuManager {
	public static Menu: MenuManager

	public readonly State: Menu.Toggle
	public readonly IconSize: Menu.Slider
	public readonly ModeImage: Menu.Dropdown
	public readonly NotifyMinimap: Menu.Toggle

	private readonly tree = Menu.AddEntry("Visual")
	private readonly node = this.tree.AddNode(
		"Fountain of wisdom",
		PathData.ImagePath + "/hud/timer/widsom_rune_png.vtex_c"
	)

	constructor() {
		this.node.SortNodes = false
		this.State = this.node.AddToggle("State", true)
		this.NotifyMinimap = this.node.AddToggle(
			"Notify on minimap",
			true,
			"Notify in advance\n20 seconds on minimap"
		)
		this.IconSize = this.node.AddSlider("Icon size", 0, 0, 50)
		this.ModeImage = this.node.AddDropdown("Mode images", ["Circle", "Square"])
		MenuManager.Menu = this
	}
}
