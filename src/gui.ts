import {
	Color,
	GameState,
	GUIInfo,
	MathSDK,
	Menu,
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

	public DrawWorld(
		origin: Vector3,
		isGather: boolean,
		isActive: boolean,
		remaining: number,
		maxRespawnTime: number,
		menu: MenuManager
	) {
		if (isActive) {
			origin = origin.Clone().AddScalarZ(300)
		}
		const w2s = RendererSDK.WorldToScreen(origin)
		if (w2s === undefined || this.isHUDContains(w2s)) {
			return
		}
		const rect = this.GetPosition(w2s, menu),
			isCircle = menu.ModeImage.SelectedID === 0,
			ratio = Math.max(100 * (remaining / maxRespawnTime), 0),
			width = Math.round(GUIInfo.ScaleHeight(2) + Math.round(rect.Height / 15)),
			outlinedColor = isActive && remaining === 0 ? Color.Green : Color.Black
		this.DrawBackground(rect, isCircle)
		this.DrawIconWorld(rect)
		this.DrawOutlineMode(rect, width, isCircle, outlinedColor)
		this.DrawArc(rect, width, isGather ? -ratio : ratio, isCircle)
		this.DrawTimer(remaining, rect, isActive)
	}
	public DrawOnMinimap(
		origin: Vector3,
		index: number,
		isGather: boolean,
		isActive: boolean,
		gatherStartTime: number,
		gatherColor: Color
	) {
		MinimapSDK.DrawIcon(
			"rune_xp",
			origin,
			350,
			isActive ? Color.White : Color.Red,
			0,
			this.getMinimapKey(index)
		)
		if (isGather) {
			this.DrawWavesOnMinimap(gatherStartTime, origin, gatherColor)
		}
	}
	public Destroy(index: number) {
		MinimapSDK.DeleteIcon(this.getMinimapKey(index))
	}
	protected DrawWavesOnMinimap(
		startTime: number,
		position: Vector3,
		color: Color
	): void {
		const waveCount = 2,
			waveDelay = 0.5, // delay between waves (in sec)
			baseWaveSize = 20,
			elapsed = GameState.RawGameTime - startTime + 1.5,
			center = MinimapSDK.WorldToMinimap(position)
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
			const newCol = color.Clone()
			newCol.a *= (1 - progress) * 0.8
			const width = this.getWidthProgress(progress) * 1.25
			const wavePos = center.Subtract(waveSize.DivideScalar(2))
			RendererSDK.OutlinedCircle(wavePos, waveSize, newCol, width)
		}
	}
	protected DrawIconWorld(position: Rectangle) {
		RendererSDK.Image(
			PathData.ImagePath + "/hud/timer/widsom_rune_png.vtex_c",
			position.pos1,
			-1,
			position.Size
		)
	}
	protected DrawBackground(position: Rectangle, isCircle: boolean) {
		RendererSDK.Image(GUI.background, position.pos1, isCircle ? 0 : -1, position.Size)
	}
	protected DrawTimer(
		remainingTime: number,
		rect: Rectangle,
		isActive: boolean = false
	) {
		if (isActive && remainingTime === 0) {
			const ready = Menu.Localization.Localize("Ready")
			RendererSDK.TextByFlags(ready, rect, Color.White, 4)
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
	protected GetPosition(w2s: Vector2, menu: MenuManager): Rectangle {
		const menuSize = menu.IconSize.value + 44
		const size = GUIInfo.ScaleVector(menuSize, menuSize)
		const pos = w2s.Subtract(size.DivideScalar(2))
		return new Rectangle(pos, pos.Add(size))
	}
	private isHUDContains(position: Vector2) {
		return (
			GUIInfo.ContainsShop(position) ||
			GUIInfo.ContainsMiniMap(position) ||
			GUIInfo.ContainsScoreboard(position)
		)
	}
	private getWidthProgress(progress: number) {
		return 5 * (1 - progress)
	}
	private getMinimapKey(index: number) {
		return `rune_xp_active_${index}`
	}
}
