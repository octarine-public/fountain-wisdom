import { canvas } from "../render"
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
		this.DrawTimer(remaining, rect)
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
			waveDelay = 0.5,
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
			canvas.Circle(wavePos, waveSize, {
				color: Color.fromUint32(0),
				borderColor: newCol,
				borderWidth: width
			})
		}
	}
	protected DrawIconWorld(position: Rectangle) {
		canvas.Image(
			PathData.ImagePath + "/hud/timer/widsom_rune_png.vtex_c",
			position.pos1,
			position.Size
		)
	}
	protected DrawBackground(position: Rectangle, isCircle: boolean) {
		canvas.Image(GUI.background, position.pos1, position.Size, {
			circle: isCircle
		})
	}
	protected DrawTimer(remainingTime: number, rect: Rectangle) {
		if (remainingTime === 0) {
			return
		}
		const text =
			remainingTime > 60
				? Math.formatTime(remainingTime)
				: remainingTime.toFixed(remainingTime < 2 ? 1 : 0)
		canvas.TextIn(text, rect, {
			color: Color.White,
			size: rect.Height / 3 + 4
		})
	}
	protected DrawArc(
		position: Rectangle,
		width: number,
		ratio: number,
		isCircle: boolean
	) {
		if (isCircle) {
			canvas.Circle(position.pos1, position.Size, {
				color: Color.fromUint32(0),
				borderColor: Color.Green,
				borderWidth: width,
				start: 270,
				sweep: -ratio * 3.6
			})
		} else {
			const sweep = Math.clamp(-ratio, -100, 100) * 3.6
			canvas.Rect(position.pos1.AddScalar(-1), position.Size.AddScalar(2), {
				color: Color.fromUint32(0),
				borderColor: Color.Green,
				borderWidth: 3,
				start: 270,
				sweep: sweep < 0 ? sweep + 360 : sweep
			})
		}
	}
	protected DrawOutlineMode(
		position: Rectangle,
		width: number,
		isCircle: boolean,
		color: Color = Color.Black
	) {
		if (isCircle) {
			canvas.Circle(position.pos1, position.Size, {
				color: Color.fromUint32(0),
				borderColor: color,
				borderWidth: width
			})
			return
		}
		canvas.Rect(position.pos1.AddScalar(-1), position.Size.AddScalar(2), {
			color: Color.fromUint32(0),
			borderColor: color,
			borderWidth: width
		})
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
