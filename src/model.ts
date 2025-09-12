import {
	Color,
	GameData,
	GameRules,
	GameState,
	MinimapSDK,
	Modifier,
	NetworkedParticle,
	SoundSDK,
	TickSleeper,
	XPFountain
} from "github.com/octarine-public/wrapper/index"

import { GUI } from "./gui"
import { MenuManager } from "./menu"

export class FountainModel {
	private isActive = false
	private pickupRemaining = 0
	private lastGatherTime = 0
	private gatherMaxDuration = 0
	private readonly gui = new GUI()
	private readonly sleeper = new TickSleeper()

	constructor(public readonly Entity: XPFountain) {}

	private get menu() {
		return MenuManager.Menu
	}
	private get maxDuration() {
		return this.isGather ? this.gatherMaxDuration : GameData.Runes.XPSpawnEverySeconds
	}
	private get isGather() {
		return this.pickupRemaining !== 0
	}
	public get Remaining() {
		if (this.isGather) {
			return this.pickupRemaining
		}
		if (this.isActive) {
			return 0
		}
		return this.floorTime(
			Math.max(
				this.maxDuration -
					((GameRules?.GameTime ?? GameState.RawGameTime) % this.maxDuration),
				0
			)
		)
	}
	public Draw() {
		this.gui.DrawWorld(
			this.Entity.Position,
			this.isGather,
			this.isActive,
			this.Remaining,
			this.maxDuration,
			this.menu
		)
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
			this.pingMinimap()
		}
	}
	public ParticleUpdated(particle: NetworkedParticle) {
		const rawTime = GameState.RawGameTime
		if (this.isEndcap(particle.PathNoEcon)) {
			this.isActive = false
			this.lastGatherTime = 0
			this.pickupRemaining = 0
			return
		}
		const radius = particle.ControlPoints.get(1)
		if (radius === undefined) {
			this.lastGatherTime = 0
			this.pickupRemaining = 0
			return
		}
		const tick = GameState.TickInterval
		const remainingTime = Math.min(radius.y, radius.x) / 100

		this.gatherMaxDuration = radius.x / 100
		this.pickupRemaining = Math.ceil(remainingTime / tick) * tick
		if (this.lastGatherTime < rawTime) {
			this.lastGatherTime = rawTime + 1.5
		}
	}
	public ParticleDestroyed(particle: NetworkedParticle) {
		if (!this.isEndcap(particle.PathNoEcon)) {
			this.pickupRemaining = 0
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
		this.pickupRemaining = 0
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
			this.pickupRemaining = 0
		}
	}
	private pingMinimap() {
		if (!this.menu.State.value || this.Remaining > 20) {
			return
		}
		if (!this.menu.NotifyMinimap.value || this.sleeper.Sleeping) {
			return
		}
		const delay = 7,
			rawTime = GameState.RawGameTime
		MinimapSDK.DrawPing(this.Entity.Position, Color.White, rawTime + delay)
		SoundSDK.EmitStartSoundEvent("General.Ping")
		this.sleeper.Sleep(delay * 1000)
	}
	private floorTime(value: number) {
		return Math.floor(value * 10) / 10
	}
}
