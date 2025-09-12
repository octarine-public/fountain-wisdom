import "./translations"

import {
	DOTAGameState,
	DOTAGameUIState,
	Entity,
	EventsSDK,
	GameRules,
	GameState,
	Modifier,
	NetworkedParticle,
	XPFountain
} from "github.com/octarine-public/wrapper/index"

import { MenuManager } from "./menu"
import { FountainModel } from "./model"

new (class CFountainWisdom {
	private readonly menu!: MenuManager
	private readonly entities: FountainModel[] = []

	constructor(canBeInitialized: boolean) {
		if (!canBeInitialized) {
			return
		}
		this.menu = new MenuManager()
		EventsSDK.on("Draw", this.Draw.bind(this))
		EventsSDK.on("PostDataUpdate", this.PostDataUpdate.bind(this))

		EventsSDK.on("EntityCreated", this.EntityCreated.bind(this))
		EventsSDK.on("EntityDestroyed", this.EntityDestroyed.bind(this))

		EventsSDK.on("ParticleCreated", this.ParticleUpdated.bind(this))
		EventsSDK.on("ParticleUpdated", this.ParticleUpdated.bind(this))
		EventsSDK.on("ParticleDestroyed", this.ParticleDestroyed.bind(this))

		EventsSDK.on("ModifierCreated", this.ModifierCreated.bind(this))
		EventsSDK.on("ModifierChanged", this.ModifierChanged.bind(this))
	}
	private get isUIGame() {
		return GameState.UIState === DOTAGameUIState.DOTA_GAME_UI_DOTA_INGAME
	}
	private get isPostGame() {
		return (
			GameRules === undefined ||
			GameRules.GameState === DOTAGameState.DOTA_GAMERULES_STATE_POST_GAME
		)
	}
	private get shouldDraw() {
		return this.menu.State.value && this.isUIGame && !this.isPostGame
	}
	protected Draw() {
		if (!this.shouldDraw) {
			return
		}
		for (let i = this.entities.length - 1; i > -1; i--) {
			this.entities[i].Draw()
		}
	}
	protected PostDataUpdate(dt: number) {
		if (dt === 0 || this.isPostGame) {
			return
		}
		for (let i = this.entities.length - 1; i > -1; i--) {
			this.entities[i].PostDataUpdate()
		}
	}
	protected EntityCreated(entity: Entity) {
		if (entity instanceof XPFountain) {
			this.entities.push(new FountainModel(entity))
		}
	}
	protected EntityDestroyed(entity: Entity) {
		if (entity instanceof XPFountain) {
			this.entities.removeCallback(x => x.Entity === entity && x.Destroy())
		}
	}
	protected ParticleUpdated(particle: NetworkedParticle) {
		if (!this.isValidPath(particle.PathNoEcon)) {
			return
		}
		this.entities
			.find(x => x.Entity === particle.AttachedTo)
			?.ParticleUpdated(particle)
	}
	protected ParticleDestroyed(particle: NetworkedParticle) {
		if (!this.isValidPath(particle.PathNoEcon)) {
			return
		}
		this.entities
			.find(x => x.Entity === particle.AttachedTo)
			?.ParticleDestroyed(particle)
	}
	protected ModifierCreated(modifier: Modifier) {
		if (this.isValidModifierName(modifier.Name)) {
			this.entities
				.find(x => x.Entity === modifier.Caster)
				?.ModifierCreated(modifier)
		}
	}
	protected ModifierChanged(modifier: Modifier) {
		if (this.isValidModifierName(modifier.Name)) {
			this.entities
				.find(x => x.Entity === modifier.Caster)
				?.ModifierChanged(modifier)
		}
	}
	private isValidModifierName(name: string) {
		return name === "modifier_xp_fountain_aura"
	}
	private isValidPath(path: string) {
		return (
			path === "particles/base_static/experience_shrine_ambient_endcap.vpcf" ||
			path === "particles/base_static/experience_shrine_active.vpcf"
		)
	}
})(true)
