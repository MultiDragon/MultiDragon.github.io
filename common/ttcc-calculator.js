const damages = {
	"Trap": [ 20, 30, 45, 60, 85, 140, 200, 240 ],
	"PrestigeTrap": [ x => 20 + 3*x, x => 30 + 3*x, x => 45 + 3*x, x => 60 + 3*x, x => 85 + 3*x, x => 140 + 3*x, x => 200 + 3*x, x => 240 + 3*x ],
	"Sound": [ 4, 6, 11, 16, 21, 32, 50, 65 ],
	"PrestigeSound": [ x => 4 + Math.ceil(x/2), x => 6 + Math.ceil(x/2), x => 11 + Math.ceil(x/2), x => 16 + Math.ceil(x/2),
			x => 21 + Math.ceil(x/2), x => 32 + Math.ceil(x/2), x => 50 + Math.ceil(x/2), x => 65 + Math.ceil(x/2) ],
	"Squirt": [ 4, 8, 12, 21, 30, 56, 80, 115 ],
	"Zap": [ 4, 6, 10, 16, 21, 40, 66, 80 ],
	"Throw": [ 7, 11, 18, 30, 45, 75, 110, 145 ],
	"PrestigeThrow": [ 8, 13, 20, 33, 50, 83, 121, 160 ],
	"Drop": [ 12, 20, 35, 50, 70, 120, 180, 220 ]
}
const trackLength = 7

function get(source, gagLevel, cogLevel) {
	const ans = damages[source][gagLevel]
	return typeof ans === "number" ? ans : ans(cogLevel)
}

function generateState(cogLevels) {
	const state = []
	for (const i of cogLevels) {
		const exe  = typeof i === "number" ? false : i.indexOf("exe") > -1
		const iNum = typeof i === "number" ? i : parseInt(i)
		if (isNaN(iNum) || iNum < 1) continue
		state.push({ level: iNum, life: (iNum + 1) * (iNum + 2) * (exe ? 1.5 : 1), lured: 0, soaked: false, trapped: 0 })
	}
	return state
}

function getState(gagChoices, state) {
	// gagChoices is an array of 4 elements each of following type:
	// { type: Sound, prestige: "Prestige", level: 0, target: 1 }

	updateTrapState(state, gagChoices)
	updateLureState(state, gagChoices)
	updateSoundState(state, gagChoices)
	updateSquirtState(state, gagChoices)
	updateZapState(state, gagChoices)
	updateThrowState(state, gagChoices)
	updateDropState(state, gagChoices)

	return state
}

function updateTrapState(state, gagChoices) {
	for (const i of gagChoices) {
		const { type, level, target, prestige } = i
		if (type !== "Trap") continue
		if (state[target].trapped !== 0) state[target].trapped = -1
		else state[target].trapped = get(prestige + "Trap", level, state[target].level)
	}
	for (const i of state)
		if (i.trapped === -1)
			i.trapped = 0
}

function updateLureState(state, gagChoices) {
	const lured = {}
	for (const i in state) if (state.hasOwnProperty(i)) lured[i] = 0
	for (const i of gagChoices) {
		const { type, level, target, prestige } = i
		const num = prestige ? 0.65 : 0.5
		if (type !== "Lure") continue
		if (level % 2 === 1)
			for (const j in state) if (state.hasOwnProperty(j))
				lured[j] = Math.max(lured[j], num)
		else
			lured[target] = Math.max(lured[target], num)
	}
	for (const i in state) if (state.hasOwnProperty(i)) {
		if (!lured[i]) continue
		if (state[i].trapped) {
			state[i].life = Math.max(state[i].life - state[i].trapped, 0)
			state[i].trapped = 0
		} else {
			state[i].lured = lured[i]
		}
	}
}

function updateSoundState(state, gagChoices) {
	let maxLevel = 0
	for (const i of state)
		maxLevel = Math.max(i.level, maxLevel)

	let totalDamage = 0
	let numberOfGags = 0
	for (const i of gagChoices) {
		const { type, level, prestige } = i
		if (type !== "Sound") continue
		numberOfGags++
		totalDamage += get(prestige + "Sound", level, maxLevel)
	}
	if (numberOfGags > 0) {
		if (numberOfGags > 1)
			totalDamage += Math.ceil(totalDamage / 5)
		for (const i of state) {
			i.life = Math.max(i.life - totalDamage, 0)
			i.lured = 0
		}
	}
}

function updateLuredGagState(state, damageCounter) {
	for (const i in state) if (state.hasOwnProperty(i)) {
		if (damageCounter[i]) {
			if (damageCounter[i].numberOfGags > 0) {
				if (damageCounter[i].numberOfGags > 1)
					damageCounter[i].damage += Math.ceil(damageCounter[i].damage / 5)
				if (state[i].lured) {
					damageCounter[i].damage += Math.ceil(damageCounter[i].damage * state[i].lured)
					state[i].lured = 0
				}
				state[i].life = Math.max(state[i].life - damageCounter[i].damage, 0)
			}
		}
	}
}

function updateSquirtState(state, gagChoices) {
	let damageCounter = {}
	for (const i in state) if (state.hasOwnProperty(i))
		damageCounter[i] = { damage: 0, numberOfGags: 0, soaksNeighbors: false }
	for (const i of gagChoices) {
		const { type, level, target, prestige } = i
		if (type !== "Squirt") continue
		damageCounter[target].damage += get("Squirt", level, state[target].level)
		damageCounter[target].numberOfGags++
		if (prestige)
			damageCounter[target].soaksNeighbors = true
	}
	updateLuredGagState(state, damageCounter)
	for (const i in state) if (state.hasOwnProperty(i)) {
		if (damageCounter[i]) {
			state[i].soaked = true
			if (damageCounter[i].soaksNeighbors) {
				state[i].soaked = true
				if (state[i - 1])
					state[i - 1].soaked = true
				if (state[i + 1])
					state[i + 1].soaked = true
			}
		}
	}
}

function updateZapState(state, gagChoices) {
	const zaps = gagChoices.map((v, k) => {
		const r = JSON.parse(JSON.stringify(v))
		r.key = k
		return r
	}).filter(x => x.type === "Zap")
	zaps.sort((x, y) => {
		return (x.level < y.level || (x.level === y.level && x.key > y.key)) ? -1 : 1
	})

	const jumpedOnto = state.map(() => false)
	for (const i of zaps) {
		const { type, target, level, prestige } = i
		if (type !== "Zap") continue
		const cog = state[target]
		const damage = get("Zap", level, cog.level)
		const targetOrder = [ 0, -1, +1, -2, +2 ]
		const multiplier = prestige ? 1/2 : 3/4

		if (!cog.soaked) // dry zap
			cog.life = Math.max(cog.life - damage, 0)
		else if (cog.life > 0) { // conductivity
			let current = target
			for (let j = 0; j < 3; j++) {
				let good = false
				for (const k of targetOrder) {
					if ((j === 0 || (current + k !== target && !jumpedOnto[current + k])) && // can't double jump or go back to target
							state[current + k] && // can't jump to nonexistent cogs
							state[current + k].life > 0 && // can't jump to dead cog
							state[current + k].soaked) { // can't jump to dry cog
						current += k
						if (j !== 0) jumpedOnto[current] = true
						state[current].life = Math.max(state[current].life - Math.ceil(damage * (3 - j * multiplier)), 0)
						good = true
						break
					}
				}
				if (!good)
					break
			}
		}
	}
}

function updateThrowState(state, gagChoices) {
	let damageCounter = {}
	for (const i in state) if (state.hasOwnProperty(i))
		damageCounter[i] = { damage: 0, numberOfGags: 0 }
	for (const i of gagChoices) {
		const { type, level, target, prestige } = i
		if (type !== "Throw") continue
		damageCounter[target].damage += get(prestige + "Throw", level, state[target].level)
		damageCounter[target].numberOfGags++
	}
	updateLuredGagState(state, damageCounter)
}

function updateDropState(state, gagChoices) {
	let damageCounter = {}
	for (const i in state) if (state.hasOwnProperty(i))
		damageCounter[i] = { damage: 0, numberOfGags: 0 }
	for (const i of gagChoices) {
		const { type, level, target } = i
		if (type !== "Drop") continue
		damageCounter[target].damage += get("Drop", level, state[target].level)
		damageCounter[target].numberOfGags++
	}
	for (const i in state) if (state.hasOwnProperty(i)) {
		if (damageCounter[i]) {
			if (damageCounter[i].numberOfGags > 0) {
				if (damageCounter[i].numberOfGags > 1)
					damageCounter[i].damage += Math.ceil(damageCounter[i].damage * (damageCounter[i].numberOfGags + 1) / 10)
				if (!state[i].lured)
					state[i].life = Math.max(state[i].life - damageCounter[i].damage, 0)
			}
		}
	}
}

// Finding best combo for killing this set
// Trying: 3 sound 1 lure, 4 sound, 3 sound 1 drop, 2 sound 2 drop, 2 zap 2 squirt,
// 2 zap 1 squirt 1 drop, 1 zap 1 squirt 2 drop, 2 sound 1 zap 1 squirt, 1 sound 1 squirt 1 zap 1 drop
// assuming sound, zap and squirt are all prestige
const relativeCosts = [1, 2, 3, 5, 8, 30, 80, 150]
const gagMultipliers = { "Sound": 8, "Zap": 10, "Squirt": 4, "Drop": 2 }
const gagNames = {
	"Sound": ["Bike Horn", "Whistle", "Kazoo", "Bugle", "Aoogah", "Trunk", "Fog", "Opera"],
	"Zap": ["Buzzer", "Carpet", "Balloon", "Battery", "Taser", "Broken TV", "Tesla", "Lightning"],
	"Squirt": ["Flower", "Glass", "Squirtgun", "Water Balloon", "Seltzer", "Hose", "Storm", "Geyser"],
	"Drop": ["Flower Pot", "Sandbag", "Bowling", "Anvil", "Big Weight", "Safe", "Boulder", "Piano"]
}
const gagTargets = ["Left", "Mid-Left", "Mid-Right", "Right"]

function getAliveCogs(state) {
	const ans = []
	for (let i in state) if (state.hasOwnProperty(i))
		if (state[i].life > 0)
			ans.push({ key: i, life: state[i].life })
	return ans
}

function getCost(gags) {
	if (!gags) return 100000
	let sum = 0
	for (let i of gags) sum += relativeCosts[i.level] * gagMultipliers[i.type]
	return sum
}

function getLevel(life, arr) {
	for (const i in arr)
		if (arr.hasOwnProperty(i) && arr[i] >= life)
			return i
	return -1
}

function trySound(levels, gags, prestiges) {
	let i = 0
	const choices = gags.map(x => ({ type: "Sound", level: x, prestige: i++ < prestiges ? "Prestige" : "", target: 4 }))
	const state = getState(choices, generateState(levels))
	const alive = getAliveCogs(state)
	if (alive.length > 0) return false
	return choices
}
function trySoundDrop(levels, gags, min, max, prestiges) {
	let i = 0
	const choices = gags.map(x => ({ type: "Sound", level: x, prestige: i++ < prestiges ? "Prestige" : "", target: 4 }))
	const state = getState(choices, generateState(levels))
	const alive = getAliveCogs(state)
	if (alive.length !== 1) return false
	if (alive[0].life > damages.Drop[max - 1]) return false
	const gags2 = JSON.parse(JSON.stringify(choices))
	gags2.push({ type: "Drop", level: Math.max(min, getLevel(alive[0].life, damages.Drop)), target: alive[0].key, prestige: "" })
	return gags2
}
function trySoundDoubleDrop(levels, gags, min, max, prestiges) {
	let i = 0
	const choices = gags.map(x => ({ type: "Sound", level: x, prestige: i++ < prestiges ? "Prestige" : "", target: 4 }))
	const state = getState(choices, generateState(levels))
	const alive = getAliveCogs(state)
	if (alive.length !== 2) return false
	if (alive[0].life > damages.Drop[max - 1] || alive[1].life > damages.Drop[max - 1]) return false
	const gags2 = JSON.parse(JSON.stringify(choices))
	gags2.push({ type: "Drop", level: Math.max(min, getLevel(alive[0].life, damages.Drop)), target: alive[0].key, prestige: "" })
	gags2.push({ type: "Drop", level: Math.max(min, getLevel(alive[1].life, damages.Drop)), target: alive[1].key, prestige: "" })
	return gags2
}
function tryDoubleZap(levels, firstZap, firstZapPlacement, secondZap, secondZapPlacement, hasDoublePrestige, min, max) {
	if (firstZap > secondZap) return false
	const baseState = generateState(levels)
	for (let i of baseState) i.soaked = true
	const choices = [{ type: "Zap", level: secondZap, prestige: "Prestige", target: secondZapPlacement },
		{ type: "Zap", level: firstZap, prestige: "Prestige", target: firstZapPlacement }]
	const state = getState(choices, baseState)
	const alive = getAliveCogs(state)
	if (alive.length > 2) return false
	if (alive.length === 0) {
		choices.push({ type: "Squirt", level: min, target: 0, prestige: "" })
		choices.push({ type: "Squirt", level: min, target: 2, prestige: "" })
	} else if (alive.length === 1) {
		if (alive[0].life > damages.Squirt[max - 1]) return false
		const target = alive[0].key == 0 ? 2 : (alive[0].key == 1 ? 3 : (alive[0].key == 2 ? 0 : 1))
		choices.push({ type: "Squirt", level: Math.max(min, getLevel(alive[0].life, damages.Squirt)), target: alive[0].key, prestige: "Prestige" })
		choices.push({ type: "Squirt", level: min, target: target, prestige: "Prestige" })
	} else {
		if (alive[0].life > damages.Squirt[max - 1] || alive[1].life > damages.Squirt[max - 1]) return false
		if ((alive[0].key == 0 && alive[1].key == 1) || (alive[0].key == 2 && alive[1].key == 3)) return false
		if (!hasDoublePrestige && ((alive[0].key == 0 && alive[1].key == 3) || (alive[0].key == 1 && alive[1].key == 2))) return false
		choices.push({ type: "Squirt", level: Math.max(min, getLevel(alive[0].life, damages.Squirt)), target: alive[0].key, prestige: "Prestige" })
		choices.push({ type: "Squirt", level: Math.max(min, getLevel(alive[1].life, damages.Squirt)), target: alive[1].key, prestige: "Prestige" })
	}
	if (getAliveCogs(getState(choices, generateState(levels))).length) return false
	console.log(alive)
	return choices
}

function generateOptimalStrategy(levels, minGagLevel = 4, maxGagLevel = 8, prestigeSounds = 4, hasDoublePrestige = true) {
	const strategies = []
	// trying 3 sound
	strategies[0] = false
	for (const i of traverse(3, minGagLevel, maxGagLevel)) {
		const x = trySound(levels, i, prestigeSounds)
		if (getCost(strategies[0]) > getCost(x))
			strategies[0] = x
	}

	// trying 4 sound
	strategies[1] = false
	for (const i of traverse(4, minGagLevel, maxGagLevel)) {
		const x = trySound(levels, i, prestigeSounds)
		if (getCost(strategies[1]) > getCost(x))
			strategies[1] = x
	}

	// trying 3 sound 1 drop
	strategies[2] = false
	for (const i of traverse(3, minGagLevel, maxGagLevel)) {
		const x = trySoundDrop(levels, i, minGagLevel, maxGagLevel, prestigeSounds)
		if (getCost(strategies[2]) > getCost(x))
			strategies[2] = x
	}

	// trying 2 sound 2 drop
	strategies[3] = false
	for (const i of traverse(2, minGagLevel, maxGagLevel)) {
		const x = trySoundDoubleDrop(levels, i, minGagLevel, maxGagLevel, prestigeSounds)
		if (getCost(strategies[3]) > getCost(x))
			strategies[3] = x
	}

	// trying 2 zap 2 squirt
	strategies[4] = false
	for (let i = minGagLevel; i < maxGagLevel; i++)
		for (let j = minGagLevel; j < maxGagLevel; j++)
			for (let k = 0; k < levels.length; k++)
				for (let l = 0; l < levels.length; l++) {
					const x = tryDoubleZap(levels, i, k, j, l, hasDoublePrestige, minGagLevel, maxGagLevel)
					if (x) console.log("gotcha", x)
					if (getCost(strategies[4]) > getCost(x))
						strategies[4] = x
				}

	strategies.sort((x, y) => - getCost(y) + getCost(x))
	return strategies
}

function edit() {
	const levels = []
	for (let i = 0; i < 4; i++)
		levels.push($(`#level-${i}`).val())
	const doublePrestigeSquirt = $("#doublepre").is(":checked")
	const prestigeSounds = parseInt($("#presound").val())
	const str = $("#gaglevels").val().split("-")
	const ans = generateOptimalStrategy(levels, parseInt(str[0]) - 1, parseInt(str[1]), prestigeSounds, doublePrestigeSquirt)
	for (const i in ans) if (ans.hasOwnProperty(i)) {
		$(`#cost${i}`).html(getCost(ans[i]))
		if (!ans[i]) {
			$(`.strat${i}`).addClass("displaynone")
			$(`#answer${i}`).html("Oops!")
			$(`#combo${i} .combo-gag`).attr("src", "resources/new/unknown.png")
			$(`#combo${i} .combo-gag-target`).attr("src", "resources/new/Target-4.png")
		} else {
			$(`.strat${i}`).removeClass("displaynone")
			const text = ans[i].map(x => {
				if (x.type === "Sound")
					return gagNames[x.type][x.level]
				else
					return gagNames[x.type][x.level] + " " + gagTargets[x.target]
			})
			$(`#answer${i}`).html(text.join(", "))
			ans[i].forEach((v, k) => {
				$(`#combo${i} .cg${k + 1}`).attr("src", `resources/new/${v.type}-${v.level}.png`)
				$(`#combo${i} .ct${k + 1}`).attr("src", `resources/new/Target-${v.target}.png`)
			})
			if (ans[i].length === 3) {
				$(`#combo${i} .cg4`).attr("src", `resources/new/Lure-3.png`)
				$(`#combo${i} .ct4`).attr("src", "resources/new/Target-4.png")
			}
		}
	}
}

if ($) { // operating with JQuery in browser
	$(() => {
		edit()
		$("input[type=checkbox]").on("click", edit)
		$("input[type=text]").on("keyup", edit)
	})
}

function* traverse(maxDepth, minNumber, maxNumber) {
	const arr = []
	for (let i = minNumber; i < maxNumber; i++) {
		arr[0] = i
		yield* singleTraverse(maxDepth, minNumber, arr, 0)
	}
}

function* singleTraverse(maxDepth, minNumber, arr, depth) {
	if (depth === maxDepth - 1)
		yield arr.slice(0)
	else
		for (let i = minNumber; i <= arr[depth]; i++) {
			arr[depth + 1] = i
			yield* singleTraverse(maxDepth, minNumber, arr, depth + 1)
		}
}