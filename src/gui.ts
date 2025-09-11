import {
	Color,
	GameState,
	GUIInfo,
	MathSDK,
	MinimapSDK,
	PathData,
	Rectangle,
	RendererSDK,
	Vector2,
	Vector3
} from "github.com/octarine-public/wrapper/index"

import { MenuManager } from "./menu"

export class GUI {
	private static readonly basePath = "github.com/octarine-public/fountain-wisdom"
	private static readonly background =
		this.basePath + "/scripts_files/images/background.png"

	private get menu() {
		return MenuManager.Menu
	}
	private get iconSize() {
		return this.menu.IconSize.value + 44
	}
	public DrawWorld(
		origin: Vector3,
		isGather: boolean,
		isActive: boolean,
		remaining: number,
		maxRespawnTime: number
	) {
		const offset = isActive ? 300 : 0
		const w2s = RendererSDK.WorldToScreen(origin.Clone().AddScalarZ(offset))
		if (w2s === undefined || this.isHUDContains(w2s)) {
			return
		}
		const rect = this.GetPosition(w2s)

		const isCircle = this.menu.ModeImage.SelectedID === 0
		const ratio = Math.max(100 * (remaining / maxRespawnTime), 0)
		const width = Math.round(GUIInfo.ScaleHeight(2) + Math.round(rect.Height / 15))
		const outlinedColor = remaining === 0 && isActive ? Color.Green : Color.Black

		RendererSDK.Image(GUI.background, rect.pos1, isCircle ? 0 : -1, rect.Size)

		this.DrawIconWorld(rect)
		this.DrawOutlineMode(rect, width, isCircle, outlinedColor)
		this.DrawArc(rect, width, isGather ? -ratio : ratio, isCircle)
		this.DrawTimer(remaining, rect, isActive)
	}
	public DrawOnMinimap(
		position: Vector3,
		index: number,
		isGather: boolean,
		isActive: boolean,
		gatherStartTime: number,
		gatherColor: Color
	) {
		const color = isActive ? Color.White : Color.Red
		MinimapSDK.DrawIcon("rune_xp", position, 350, color, 0, `rune_xp_active_${index}`)

		if (isGather) {
			this.DrawWavesOnMinimap(gatherStartTime, position, gatherColor)
		}
	}
	public Destroy(index: number) {
		MinimapSDK.DeleteIcon(`rune_xp_active_${index}`)
	}
	protected DrawWavesOnMinimap(
		startTime: number,
		position: Vector3,
		color: Color
	): void {
		const baseWaveSize = 20
		const elapsed = GameState.RawGameTime - startTime + 1.5
		const center = MinimapSDK.WorldToMinimap(position)

		const waveCount = 2
		const waveDelay = 0.5 // delay between waves (in sec)

		for (let i = 0; i < waveCount; i++) {
			const waveElapsed = elapsed - i * waveDelay
			if (waveElapsed < 0) {
				continue
			}
			const progress = Math.min(waveElapsed / 2, 1)
			if (progress === 1) {
				continue
			}
			const waveSize = new Vector2(baseWaveSize, baseWaveSize).MultiplyScalar(
				1 + progress * 2
			)
			const width = this.getWidth(progress) * 1.25
			const waveColor = color.Clone()
			waveColor.a *= (1 - progress) * 0.8
			const wavePos = center.Subtract(waveSize.DivideScalar(2))
			RendererSDK.OutlinedCircle(wavePos, waveSize, waveColor, width)
		}
	}
	protected DrawOnWorld(origin: Vector3, remaining: number) {
		if (remaining === 0) {
			return
		}
		const offset = 300
		const w2s = RendererSDK.WorldToScreen(origin.Clone().AddScalarZ(offset))
		if (w2s === undefined) {
			return
		}
		const size = GUIInfo.ScaleVector(40, 40)
		this.DrawIconWorld(
			new Rectangle(w2s.Subtract(size.DivideScalar(2)), w2s.Add(size))
		)
	}
	protected DrawIconWorld(position: Rectangle) {
		RendererSDK.Image(
			PathData.ImagePath + "/hud/timer/widsom_rune_png.vtex_c",
			position.pos1,
			-1,
			position.Size
		)
	}
	protected DrawTimer(
		remainingTime: number,
		rect: Rectangle,
		isActive: boolean = false
	) {
		if (isActive && remainingTime === 0) {
			RendererSDK.TextByFlags("Ready", rect, Color.White, 4)
		}
		if (remainingTime === 0) {
			return
		}
		const text =
			remainingTime > 60
				? MathSDK.FormatTime(remainingTime)
				: remainingTime.toFixed(remainingTime < 2 ? 1 : 0)
		RendererSDK.TextByFlags(text, rect, Color.White, 3)
	}
	protected DrawArc(
		position: Rectangle,
		width: number,
		ratio: number,
		isCircle: boolean
	) {
		if (isCircle) {
			RendererSDK.Arc(
				270,
				-ratio,
				position.pos1,
				position.Size,
				false,
				width,
				Color.Green
			)
		} else {
			RendererSDK.Radial(
				270,
				-ratio,
				position.pos1,
				position.Size,
				Color.Black,
				undefined,
				undefined,
				Color.Green,
				false,
				3,
				true
			)
		}
	}
	protected DrawOutlineMode(
		position: Rectangle,
		width: number,
		isCircle: boolean,
		color: Color = Color.Black
	) {
		if (isCircle) {
			RendererSDK.OutlinedCircle(position.pos1, position.Size, color, width)
			return
		}
		RendererSDK.OutlinedRect(
			position.pos1.AddScalar(-1),
			position.Size.AddScalar(3 - 1),
			width,
			color
		)
	}
	protected GetPosition(w2s: Vector2): Rectangle {
		const menuSize = this.iconSize
		const size = GUIInfo.ScaleVector(menuSize, menuSize)
		const pos = w2s.Subtract(size.DivideScalar(2))
		return new Rectangle(pos, pos.Add(size))
	}
	private getWidth(progress: number) {
		return 5 * (1 - progress)
	}
	private isHUDContains(position: Vector2) {
		return (
			GUIInfo.ContainsShop(position) ||
			GUIInfo.ContainsMiniMap(position) ||
			GUIInfo.ContainsScoreboard(position)
		)
	}
}
