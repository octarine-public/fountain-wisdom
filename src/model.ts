import { FountainState, GUI, StateTint } from "./gui"
import { MenuManager } from "./menu"

/** How long a ping stays on the minimap, and how long until the next one, in seconds. */
const PING_SECONDS = 7
/** How long the card of an alert stays on screen, in seconds. */
const NOTICE_SECONDS = 6
/** How far from the shrine a hero stands while taking its rune, in world units. */
const GATHER_RANGE = 500
/** The sound of the coming rune, and the sharper one of a rune being taken. */
const SPAWN_SOUND = "General.Ping"
const GATHER_SOUND = "General.PingWarning"
/** How long one sound covers the shrines whose runes are taken on the same tick, in ms. */
const GATHER_SOUND_MS = 1000
/**
 * The rune's icon on the chip of the card and in the chat line: the game's own emoticon of the
 * rune, the same glyph the minimap and the chip over the shrine wear, since the chat loads no
 * texture from outside the game's files.
 */
const NOTICE_ICON = `${PathData.ImagePath}/emoticons/xp_rune_png.vtex_c`

/**
 * The side of the map a shrine stands on. The game gives both shrines the neutral team, so it
 * is the half of the map the shrine stands in that tells: the Radiant half is the western one.
 */
function sideOf(shrine: XPFountain): "Radiant" | "Dire" {
	return shrine.Position.x < 0 ? "Radiant" : "Dire"
}
/** The lines of a gather alert, naming the side of the shrine: by someone, and by a hero. */
const SOMEONE_TAKING = {
	Radiant: "Someone is taking the rune on the Radiant side",
	Dire: "Someone is taking the rune on the Dire side"
} as const
const HERO_TAKING = {
	Radiant: "Taking the wisdom rune on the Radiant side",
	Dire: "Taking the wisdom rune on the Dire side"
} as const

export class FountainModel {
	public static readonly Sleeper = new TickSleeper()
	/** Folds the sounds of runes taken on the same tick into one. */
	private static readonly gatherSleeper = new TickSleeper()
	/**
	 * Whether the coming rune has been announced this cycle. Every shrine runs on the one clock,
	 * so one notice covers them all; the minimap pings stay one per shrine.
	 */
	private static announced = false

	public static GameEnded() {
		this.Sleeper.ResetTimer()
		this.gatherSleeper.ResetTimer()
		this.announced = false
	}
	/** Plays `sound` unless `sleeper` still holds the last one, and holds the next for `ms`. */
	private static soundEmit(sleeper: TickSleeper, sound: string, ms: number) {
		if (!sleeper.Sleeping) {
			SoundSDK.EmitStartSoundEvent(sound)
			sleeper.Sleep(ms)
		}
	}
	/** Tells of the coming rune on the channel the menu picked, once a cycle. */
	private static announce(remaining: number) {
		if (this.announced) {
			return
		}
		const channel = MenuManager.Menu.Channel
		if (channel === undefined) {
			return
		}
		this.announced = true
		// the time left, not the slider: a script started inside the window reads what is true
		const seconds = Math.max(Math.ceil(remaining), 1).toString()
		NotificationsSDK.Show({
			title: Menu.Localization.Localize("Fountain of wisdom"),
			message: Menu.Localization.Localize("Spawns in {n} seconds").replace(
				"{n}",
				seconds
			),
			titleIcon: NOTICE_ICON,
			color: StateTint(FountainState.Waiting),
			duration: NOTICE_SECONDS,
			channel
		})
	}

	private isActive = false
	/** Whether someone is channelling the rune over the shrine right now. */
	private gathering = false
	/**
	 * The raw game time the channel ends at, struck again on every update of its particle: the
	 * chip counts down to it every frame, in tenths, instead of showing the last value the particle
	 * carried.
	 */
	private gatherEnd = 0
	private lastGatherTime = 0
	private readonly gui = new GUI()
	private readonly sleeper = new TickSleeper()
	/** Holds the gather alerts of this shrine back for the menu's anti-spam window after one. */
	private readonly quiet = new TickSleeper()

	constructor(public readonly Entity: XPFountain) {}

	private get menu() {
		return MenuManager.Menu
	}
	private get maxDuration() {
		return GameData.Runes.XPSpawnEverySeconds
	}
	private get isGather() {
		return this.gathering
	}
	private get state() {
		if (this.isGather) {
			return FountainState.Gathering
		}
		return this.isActive ? FountainState.Ready : FountainState.Waiting
	}
	public get Remaining() {
		if (this.isGather) {
			return Math.max(this.gatherEnd - GameState.RawGameTime, 0)
		}
		if (this.isActive) {
			return 0
		}
		return this.floorTime(
			Math.max(
				this.maxDuration -
					((Dota2SDK.GameRules?.GameTime ?? GameState.RawGameTime) %
						this.maxDuration),
				0
			)
		)
	}
	public Draw() {
		this.gui.DrawWorld(this.Entity.Position, this.state, this.Remaining, this.menu)
		this.gui.DrawOnMinimap(
			this.Entity.Position,
			this.Entity.Index,
			this.isGather,
			this.isActive,
			this.lastGatherTime,
			Color.Aqua
		)
	}
	public PostDataUpdate() {
		if (!this.isActive) {
			this.isActive = this.Remaining <= 0
			this.alert()
		}
	}
	public ParticleUpdated(particle: NetworkedParticle) {
		const rawTime = GameState.RawGameTime
		if (this.isEndcap(particle.PathNoEcon)) {
			this.isActive = false
			this.lastGatherTime = 0
			this.gathering = false
			return
		}
		const radius = particle.ControlPoints.get(1)
		if (radius === undefined) {
			this.lastGatherTime = 0
			this.gathering = false
			return
		}
		// the ring grows from nothing to the whole channel, in hundredths of a second: what is
		// left of the channel is the part of the ring that has not grown yet
		const total = radius.x / 100,
			elapsed = Math.min(radius.y, radius.x) / 100,
			started = !this.gathering
		this.gatherEnd = rawTime + (total - elapsed)
		this.gathering = true
		if (this.lastGatherTime < rawTime) {
			this.lastGatherTime = rawTime + 1.5
		}
		if (started) {
			this.gatherAlert()
		}
	}
	public ParticleDestroyed(particle: NetworkedParticle) {
		if (!this.isEndcap(particle.PathNoEcon)) {
			this.gathering = false
		}
	}
	public ModifierCreated(modifier: Modifier) {
		this.setFlagsByModifier(modifier)
	}
	public ModifierChanged(modifier: Modifier) {
		this.setFlagsByModifier(modifier)
	}
	public Destroy() {
		this.isActive = false
		this.gathering = false
		this.gui.Destroy(this.Entity.Index)
		return true
	}
	private isEndcap(name: string) {
		return name === "particles/base_static/experience_shrine_ambient_endcap.vpcf"
	}
	private setFlagsByModifier(modifier: Modifier) {
		this.isActive = modifier.StackCount === 1
		if (modifier.NetworkDamage === 0) {
			this.lastGatherTime = 0
			this.gathering = false
		}
	}
	/**
	 * The alerts of the coming rune: the notice on its channel, and on top of it the pings on
	 * the minimap. Outside the window the menu set before the spawn there is nothing to do but
	 * arm the notice for the next cycle.
	 */
	private alert() {
		const remaining = this.Remaining
		if (remaining > this.menu.SpawnBefore.value) {
			FountainModel.announced = false
			return
		}
		if (!this.menu.State.value || !this.menu.SpawnAlert.value) {
			return
		}
		FountainModel.announce(remaining)
		if (this.pingMinimap(Color.White)) {
			FountainModel.soundEmit(
				FountainModel.Sleeper,
				SPAWN_SOUND,
				PING_SECONDS * 1000
			)
		}
	}
	/**
	 * The alerts of a rune being taken: the notice on its channel, naming the hero when one is
	 * in sight over the shrine, and the ping on the minimap. Held back for the anti-spam window
	 * after the last one, so a channel broken off and started again does not tell of itself
	 * twice.
	 */
	private gatherAlert() {
		const menu = this.menu
		if (!menu.State.value || !menu.GatherAlert.value || this.quiet.Sleeping) {
			return
		}
		this.quiet.Sleep(menu.AntiSpam.value * 1000)
		this.notifyGather(this.gatherer())
		// a ping of the coming rune does not hold this one back: the rune is going right now
		this.sleeper.ResetTimer()
		if (this.pingMinimap(StateTint(FountainState.Gathering))) {
			FountainModel.soundEmit(
				FountainModel.gatherSleeper,
				GATHER_SOUND,
				GATHER_SOUND_MS
			)
		}
	}
	/** Pings the shrine on the minimap, unless the row is off or the last ping is still up. */
	private pingMinimap(color: Color) {
		if (!this.menu.NotifyMinimap.value || this.sleeper.Sleeping) {
			return false
		}
		MinimapSDK.DrawPing(
			this.Entity.Position,
			color,
			GameState.RawGameTime + PING_SECONDS
		)
		this.sleeper.Sleep(PING_SECONDS * 1000)
		return true
	}
	/**
	 * Tells of the rune being taken on the channel the menu picked: by the hero, or by someone,
	 * naming the side of the map the shrine stands on.
	 */
	private notifyGather(hero: Nullable<Hero>) {
		const channel = this.menu.Channel
		if (channel === undefined) {
			return
		}
		const tint = StateTint(FountainState.Gathering),
			side = sideOf(this.Entity)
		if (hero === undefined) {
			NotificationsSDK.Show({
				title: Menu.Localization.Localize("Fountain of wisdom"),
				message: Menu.Localization.Localize(SOMEONE_TAKING[side]),
				titleIcon: NOTICE_ICON,
				color: tint,
				duration: NOTICE_SECONDS,
				channel
			})
			return
		}
		// the hero's art covers the card, and stands in the chat line as the title's icon
		const art = ImageData.GetUnitTexture(hero.Name),
			portrait = art === "" ? undefined : art
		NotificationsSDK.Show({
			title: Menu.Localization.Localize(hero.Name),
			message: Menu.Localization.Localize(HERO_TAKING[side]),
			titleIcon: portrait,
			portrait,
			messageIcon: NOTICE_ICON,
			color: PlayerCustomData.get(hero.PlayerID)?.Color ?? tint,
			duration: NOTICE_SECONDS,
			channel
		})
	}
	/** The hero in sight channelling over the shrine, which is who is taking the rune, if any. */
	private gatherer(): Nullable<Hero> {
		const heroes = EntityManager.GetEntitiesByClass(Hero)
		for (let i = heroes.length - 1; i > -1; i--) {
			const hero = heroes[i]
			if (
				hero.IsVisible &&
				hero.IsAlive &&
				!hero.IsIllusion &&
				hero.IsChanneling &&
				hero.Distance2D(this.Entity) <= GATHER_RANGE
			) {
				return hero
			}
		}
		return undefined
	}
	private floorTime(value: number) {
		return Math.floor(value * 10) / 10
	}
}
