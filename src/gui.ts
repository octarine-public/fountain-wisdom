import { canvas, surface } from "../render"
import { MenuManager } from "./menu"

/** What the shrine is doing, which decides the colour the chip wears and what it reads. */
export const enum FountainState {
	/** The rune is on its way: the chip counts down to it. */
	Waiting,
	/** The rune stands over the shrine, waiting to be taken: nothing to count. */
	Ready,
	/** Someone is channelling the rune: the chip counts down the channel. */
	Gathering
}

/**
 * The chip a shrine wears in the world, in dp at the slider's middle: the card the menu's own
 * panels wear - its glass, its hairline rim, its frost and its halo, whatever the theme set - washed
 * in the colour of the shrine's state, the rune's icon and the time left. The slider scales the
 * whole thing about {@link SIZE_BASE}.
 */
const HEIGHT = 24
/**
 * The corner, in dp: the menu's own card radius, which carries the theme's radius scale with it,
 * held to a pill so a wide radius on a low chip never turns its corners inside out.
 */
const RADIUS = Math.min(MenuSDK.HudCardRadius, HEIGHT / 2)
const PAD = 7
const GAP = 6
const GLYPH = 18
const FONT = 12
const WEIGHT = MenuSDK.HudBold
/** How deep the glass is washed in the tint over the theme's own colour, out of 255. */
const TINT = 36
/** How dark the outline under the time is cut, 0 to 1: enough to hold on a lit wall, not a black rim. */
const OUTLINE = 0.5
/** The slider value the chip is drawn at 1:1 on; every notch is a twelfth either way. */
const SIZE_BASE = 4
const SIZE_STEP = 12
/** How high over the bowl the rune floats once it is up, in world units: the chip follows it. */
const RUNE_LIFT = 300
/** How long the chip takes to glide most of the way up to the rune, or back down, in ms. */
const GLIDE_MS = 120
/** How long the plate takes to turn most of the way to the colour of a new state, in ms. */
const RECOLOR_MS = 160
/**
 * How long the reading takes to come most of the way in, or to go back out, in ms: the plate opens
 * under it as it fades in, and closes over it as it fades out, rather than the chip jumping a
 * word wider or narrower on the frame the reading started or stopped.
 */
const REVEAL_MS = 80
/** The minimap's name for the rune. */
const MINIMAP_ICON = "rune_xp"
/**
 * The rune's icon, the SDK's own small one: the minimap's glyph lives on a sheet that is a
 * material rather than a texture, which the overlay cannot decode, so the chip wears a plain image
 * the way a bar wears a hero's portrait.
 */
const GLYPH_PATH = ImageData.GetRuneTexture("xp", true)

/** The colour the chip is known by in each state. */
const WaitingTint = new Color(186, 150, 255)
const ReadyTint = new Color(96, 220, 120)
const GatheringTint = new Color(80, 215, 240)

export function StateTint(state: FountainState) {
	switch (state) {
		case FountainState.Ready:
			return ReadyTint
		case FountainState.Gathering:
			return GatheringTint
		default:
			return WaitingTint
	}
}

export class GUI {
	/**
	 * How many cards this frame has carved so far, over every shrine. Cards carved by one and the
	 * same shader string share a decorator instance in RmlUi, so each one on the surface has to be
	 * handed a step of its own; the step is invisible.
	 */
	private static carved = 0
	/** Where the chip stands in the world, gliding towards {@link GUI.target}. */
	private readonly position = new Vector3()
	private readonly target = new Vector3()
	private placed = false
	private lastFrame = -1
	/** The colour the chip wears this frame, on its way to the colour of the current state. */
	private readonly tint = new Color()
	private tinted = false
	/**
	 * How much of the reading is there, 0 to 1: the room the plate keeps for it and how strongly it
	 * is drawn. It eases up as a reading starts and back down once it has stopped.
	 */
	private reveal = 0
	/** The last reading the chip had, kept while it fades out so the glyphs and the room stay. */
	private shown = ""
	private readonly box = new Rectangle()
	private readonly pos = new Vector2()
	private readonly size = new Vector2()
	/** A frame is starting: no card has been carved on the surface yet. */
	public static BeginFrame() {
		GUI.carved = 0
	}

	public DrawWorld(
		origin: Vector3,
		state: FountainState,
		remaining: number,
		menu: MenuManager
	) {
		const now = hrtime(),
			dt = this.lastFrame < 0 ? 0 : now - this.lastFrame
		this.lastFrame = now

		// the rune floats over the bowl once it is up, and the chip goes up after it
		this.target.CopyFrom(origin)
		if (state !== FountainState.Waiting) {
			this.target.AddScalarZ(RUNE_LIFT)
		}
		if (!this.placed) {
			this.position.CopyFrom(this.target)
			this.placed = true
		} else if (!this.position.Equals(this.target)) {
			this.position.LerpForThis(this.target, Math.min(dt / GLIDE_MS, 1))
		}
		this.recolor(MenuSDK.HudColors.readable(StateTint(state)), dt)

		const w2s = RendererSDK.WorldToScreen(this.position)
		if (w2s === undefined || GUIInfo.Contains(w2s)) {
			return
		}
		const k = (menu.Size.value + SIZE_STEP) / (SIZE_BASE + SIZE_STEP),
			text = this.reading(state, remaining, menu)
		if (text.length !== 0) {
			this.shown = text
		}
		this.approach(text.length === 0 ? 0 : 1, dt)

		// the card is laid out at the world scale, so the menu's own scale does not resize it
		MenuSDK.setHudWorldScale(k)
		const height = MenuSDK.hudH(HEIGHT),
			pad = MenuSDK.hudW(PAD),
			gap = MenuSDK.hudW(GAP),
			glyph = MenuSDK.hudH(GLYPH),
			// digits are measured as zeroes so a ticking reading does not make the chip breathe
			textW =
				this.shown.length === 0
					? 0
					: MenuSDK.HudText.Width(this.shown, FONT, WEIGHT),
			slot = this.reveal * (gap + textW),
			width = Math.round(pad + glyph + slot + pad),
			x = Math.round(w2s.x - width / 2),
			y = Math.round(w2s.y - height / 2),
			centerY = y + height / 2

		MenuSDK.SetActiveSurface(surface)
		try {
			this.plate(x, y, width, height)
			this.pos.SetVector(x + pad, Math.round(centerY - glyph / 2))
			this.size.SetVector(glyph, glyph)
			MenuSDK.HudCard.Image(
				GLYPH_PATH,
				this.pos,
				this.size,
				Color.WhiteReadonly,
				255
			)
			if (this.reveal > 0 && textW > 0) {
				// the reading slides out from under the glyph as the plate opens, fading in as it
				// goes, and back under it as the plate closes
				MenuSDK.SetHudAlphaScale(this.reveal * this.reveal)
				MenuSDK.HudText.Center(
					x + width - pad - textW,
					centerY,
					textW,
					this.shown,
					FONT,
					// a channel is read in plain white; the state's colour stays on the glass
					state === FountainState.Gathering ? Color.WhiteReadonly : this.tint,
					WEIGHT,
					MenuSDK.EHudTextEffect.Outline,
					undefined,
					OUTLINE
				)
			}
		} finally {
			MenuSDK.SetActiveSurface(undefined)
		}
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
			MINIMAP_ICON,
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
	/**
	 * The plate under the chip: the menu's own card, so the glass, the rim, the blur and the halo are
	 * whatever the theme dresses its panels in, with the state's colour washed over the glass.
	 */
	private plate(x: number, y: number, w: number, h: number) {
		const radius = MenuSDK.hudRadius(RADIUS)
		this.box.pos1.SetVector(x, y)
		this.box.pos2.SetVector(x + w, y + h)
		MenuSDK.HudCard.Frame(this.box, 255, RADIUS, GUI.carved++)
		MenuSDK.HudCard.Plate(x, y, w, h, radius, this.tint, MenuSDK.hudAlpha(TINT))
	}
	/** Eases {@link GUI.reveal} part of the way to `target`, and snaps the last hair of it. */
	private approach(target: number, dt: number) {
		if (this.reveal === target) {
			return
		}
		this.reveal += (target - this.reveal) * Math.min(dt / REVEAL_MS, 1)
		if (Math.abs(target - this.reveal) < 0.01) {
			this.reveal = target
		}
	}
	/**
	 * What the chip reads: the time left, or nothing while the rune only waits to be taken. A
	 * channel is a few seconds long and is read in tenths the whole way down; the wait for the rune
	 * is minutes long and is read the way the menu asks.
	 */
	private reading(state: FountainState, remaining: number, menu: MenuManager) {
		if (state === FountainState.Ready || remaining <= 0) {
			return ""
		}
		if (state === FountainState.Gathering) {
			return remaining.toFixed(1)
		}
		return menu.FormatTime.value
			? Math.formatTime(remaining)
			: remaining.toFixed(remaining > 1 ? 0 : 1)
	}
	/** Turns the chip's colour part of the way to `target`, or all of it on the first frame. */
	private recolor(target: Color, dt: number) {
		if (!this.tinted) {
			this.tint.CopyFrom(target)
			this.tinted = true
			return
		}
		if (this.tint.Equals(target)) {
			return
		}
		const at = Math.min(dt / RECOLOR_MS, 1)
		this.tint.SetColor(
			Math.round(this.tint.r + (target.r - this.tint.r) * at),
			Math.round(this.tint.g + (target.g - this.tint.g) * at),
			Math.round(this.tint.b + (target.b - this.tint.b) * at),
			255
		)
	}
	private getWidthProgress(progress: number) {
		return 5 * (1 - progress)
	}
	private getMinimapKey(index: number) {
		return `rune_xp_active_${index}`
	}
}
