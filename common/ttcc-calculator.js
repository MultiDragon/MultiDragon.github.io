const damages = {
	"Trap": [ 20, 30, 45, 65, 90, 140, 200, 240 ],
	"PrestigeTrap": [ x => 20 + 3*x, x => 30 + 3*x, x => 45 + 3*x, x => 60 + 3*x, x => 85 + 3*x, x => 140 + 3*x, x => 200 + 3*x, x => 240 + 3*x ],
	"Sound": [ 4, 6, 11, 16, 21, 32, 50, 65 ],
	"PrestigeSound": [ x => 4 + Math.ceil(x/2), x => 6 + Math.ceil(x/2), x => 11 + Math.ceil(x/2), x => 16 + Math.ceil(x/2),
			x => 21 + Math.ceil(x/2), x => 32 + Math.ceil(x/2), x => 50 + Math.ceil(x/2), x => 65 + Math.ceil(x/2) ],
	"Squirt": [ 4, 8, 12, 21, 30, 56, 80, 115 ],
	"Zap": [ 4, 6, 10, 16, 21, 40, 66, 80 ],
	"Throw": [ 7, 11, 18, 30, 45, 75, 110, 145 ],
	"PrestigeThrow": [ 8, 13, 20, 33, 50, 83, 121, 160 ],
	"Drop": [ 12, 20, 35, 55, 75, 125, 180, 220 ]
}

function get(source, gagLevel, cogLevel) {
	const ans = damages[source][gagLevel]
	return typeof ans === "number" ? ans : ans(cogLevel)
}

function generateState(cogLevels) {
	const state = []
	for (const i of cogLevels) {
		const exe  = typeof i === "number" ? false : i.indexOf("exe") > -1
		const FS   = typeof i === "number" ? false : i.indexOf("A") > -1
		const OA   = typeof i === "number" ? false : i.indexOf("D") > -1
		const V20  = typeof i === "number" ? 0 : (i.indexOf("vs") > -1 ? -1 : (i.indexOf("v2") > -1 ? 1 : 0))
		const iNum = typeof i === "number" ? i : parseInt(i)
		const sq = iNum * iNum
		if (isNaN(iNum) || iNum < 1) continue
		const baseHealth = FS ? sq + iNum + 1 : (OA ? sq + iNum * 5 + 4 : sq + iNum * 3 + 2)
		const startHealth = Math.floor(baseHealth * (exe ? 1.5 : 1) * (V20 === -1 ? 0.5 : 1))
		state.push({ level: iNum, life: startHealth, startLife: startHealth, v2state: V20, lured: 0, soaked: false, trapped: 0 })
	}
	return state
}

function sum(arr) {
	let s = 0
	for (let i of arr) s += i
	return s
}

function getState(initGagChoices, state) {
	// gagChoices is an array of 4 elements each of following type:
	// { type: Sound, prestige: "Prestige", level: 0, target: 1 }

	const gagChoices = copyState(initGagChoices)
	for (let i = 0; i < 4; i++) gagChoices[i].key = i
	gagChoices.sort((x, y) => {
		return (x.level < y.level || (x.level === y.level && x.key > y.key)) ? -1 : 1
	})
	let passes = []
	passes = passes.concat(updateFireState(state, gagChoices))
	passes = passes.concat(updateTrapState(state, gagChoices))
	passes = passes.concat(updateLureState(state, gagChoices))
	passes = passes.concat(updateSoundState(state, gagChoices))
	passes = passes.concat(updateSquirtState(state, gagChoices))
	passes = passes.concat(updateZapState(state, gagChoices))
	passes = passes.concat(updateThrowState(state, gagChoices))
	passes = passes.concat(updateDropState(state, gagChoices))

	return passes
}

function updateFireState(state, gagChoices) {
	const passes = []
	for (const i of gagChoices) {
		const { type, target } = i
		if (type !== "Fire") continue
		if (state[target].life === 0) {
			passes.append(i.key)
			continue
		}
		state[target].life = 0
	}
	return passes
}

function updateTrapState(state, gagChoices) {
	const passes = []
	for (const i of gagChoices) {
		const { type, level, target, prestige, key } = i
		if (type !== "Trap") continue
		if (state[target].life === 0) {
			passes.push(key)
			continue
		}
		if (state[target].trapped !== 0) state[target].trapped = -1
		else state[target].trapped = get(prestige + "Trap", level, state[target].level)
	}
	for (const i of state)
		if (i.trapped === -1)
			i.trapped = 0
	return passes
}

function dealDamage(cog, damage) {
	if (cog.life === 0)
		return
	else {
		cog.life = Math.max(0, cog.life - damage)
		if (cog.life === 0 && cog.v2state === 1) {
			cog.v2state = -1
			cog.life = Math.floor(cog.startLife / 2)
		}
	}
}

function updateLureState(state, gagChoices) {
	const lured = []
	for (let i = 0; i < state.length; i++) lured[i] = 0

	const passes = []
	for (const i of gagChoices) {
		const { type, level, target, prestige, key } = i
		const num = prestige ? 0.65 : 0.5
		if (type !== "Lure") continue
		if (level % 2 === 1) {
			if (getAliveCogs(state).length === 0) {
				passes.push(key)
				continue
			}
			for (let j = 0; j < state.length; j++)
				lured[j] = Math.max(lured[j], num)
		} else {
			if (state[target].life === 0) {
				passes.push(key)
				continue
			}
			lured[target] = Math.max(lured[target], num)
		}
	}
	for (let i = 0; i < state.length; i++) {
		if (!lured[i]) continue
		if (state[i].trapped) {
			state[i].trapped = 0
			dealDamage(state[i], state[i].trapped)
		} else {
			state[i].lured = lured[i]
		}
	}
	return passes
}

function updateSoundState(state, gagChoices) {
	let maxLevel = 0
	for (const i of state)
		maxLevel = Math.max(i.level, maxLevel)

	const passes = []
	const damageSequence = []
	let numberOfGags = 0
	for (const i of gagChoices) {
		const { type, level, prestige, key } = i
		if (type !== "Sound") continue
		if (getAliveCogs(state).length === 0) {
			passes.push(key)
			continue
		}
		numberOfGags++
		damageSequence.push(get(prestige + "Sound", level, maxLevel))
	}
	if (numberOfGags > 0) {
		if (numberOfGags > 1)
			damageSequence.push(Math.ceil(sum(damageSequence) / 5))
		for (const i of state) {
			i.lured = 0
			for (const j of damageSequence)
				dealDamage(i, j)
		}
	}
	return passes
}

function updateLuredGagState(state, damageCounter) {
	for (let i = 0; i < state.length; i++) {
		if (damageCounter[i]) {
			if (damageCounter[i].numberOfGags > 0) {
				const dsum = sum(damageCounter[i].damageSequence)
				if (damageCounter[i].numberOfGags > 1)
					damageCounter[i].damageSequence.push(Math.ceil(dsum / 5))
				if (state[i].lured) {
					damageCounter[i].damageSequence.push(Math.ceil(dsum * state[i].lured))
					state[i].lured = 0
				}
				for (const j of damageCounter[i].damageSequence)
					dealDamage(state[i], j)
			}
		}
	}
}

function updateSquirtState(state, gagChoices) {
	const damageCounter = []
	for (let i = 0; i < state.length; i++)
		damageCounter[i] = { damageSequence: [], numberOfGags: 0, soaksNeighbors: false }
	const passes = []

	for (const i of gagChoices) {
		const { type, level, target, prestige, key } = i
		if (type !== "Squirt") continue
		if (state[target].life === 0) {
			passes.push(key)
			continue
		}
		damageCounter[target].damageSequence.push(get("Squirt", level, state[target].level))
		damageCounter[target].numberOfGags++
		if (prestige)
			damageCounter[target].soaksNeighbors = true
	}
	updateLuredGagState(state, damageCounter)
	for (let i = 0; i < state.length; i++) {
		if (damageCounter[i].numberOfGags > 0) {
			state[i].soaked = true
			if (damageCounter[i].soaksNeighbors) {
				if (state[i - 1])
					state[i - 1].soaked = true
				if (state[i + 1])
					state[i + 1].soaked = true
			}
		}
	}
	return passes
}

function updateZapState(state, gagChoices) {
	const passes = []
	const jumpedOnto = state.map(() => false)
	for (const i of gagChoices) {
		const { type, target, level, prestige, key } = i
		if (type !== "Zap") continue
		const cog = state[target]
		if (cog.life === 0) {
			passes.push(key)
			continue
		}
		const damage = get("Zap", level, cog.level)
		const targetOrder = [ 0, -1, -2, +1, +2 ]
		const multiplier = prestige ? 1/2 : 3/4

		if (!cog.soaked) // dry zap
			dealDamage(cog, damage)
		else { // conductivity
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
						const dmg = Math.ceil(damage * (3 - j * multiplier))
						dealDamage(state[current], dmg)
						good = true
						break
					}
				}
				if (!good)
					break
			}
		}
	}
	return passes
}

function updateThrowState(state, gagChoices) {
	const damageCounter = []
	for (let i = 0; i < state.length; i++)
		damageCounter[i] = { damageSequence: [], numberOfGags: 0 }
	
	const passes = []
	for (const i of gagChoices) {
		const { type, level, target, prestige, key } = i
		if (type !== "Throw") continue
		if (state[target].life === 0) {
			passes.push(key)
			continue
		}
		damageCounter[target].damageSequence.push(get(prestige + "Throw", level, state[target].level))
		damageCounter[target].numberOfGags++
	}
	updateLuredGagState(state, damageCounter)
	return passes
}

function updateDropState(state, gagChoices) {
	const damageCounter = []
	for (let i = 0; i < state.length; i++)
		damageCounter[i] = { damageSequence: [], numberOfGags: 0 }

	const passes = []
	for (const i of gagChoices) {
		const { type, level, target, key } = i
		if (type !== "Drop") continue
		if (state[target].life === 0) {
			passes.push(key)
			continue
		}
		damageCounter[target].damageSequence.push(get("Drop", level, state[target].level))
		damageCounter[target].numberOfGags++
	}
	for (let i = 0; i < state.length; i++) {
		if (damageCounter[i]) {
			if (damageCounter[i].numberOfGags > 0) {
				if (damageCounter[i].numberOfGags > 1)
					damageCounter[i].damageSequence.push(Math.ceil(damageCounter[i].damage * (damageCounter[i].numberOfGags + 1) / 10))
				if (!state[i].lured)
					for (let j of damageCounter[i].damageSequence)
						dealDamage(state[i], j)
			}
		}
	}
	return passes
}

// Finding best combo for killing this set
// Trying: 3 sound 1 lure, 4 sound, 3 sound 1 drop, 2 sound 2 drop, 2 zap 2 squirt,
// 2 sound 1 zap 1 squirt, 1 sound 1 squirt 1 zap 1 drop
const relativeCosts = [1, 2, 3, 5, 8, 30, 80, 150]
const gagMultipliers = { "Sound": 8, "Zap": 10, "Squirt": 4, "Drop": 2 }
const gagNames = {
	"Sound": ["Kazoo", "Bike Horn", "Whistle", "Bugle", "Aoogah", "Trunk", "Fog", "Opera"],
	"Zap": ["Buzzer", "Carpet", "Balloon", "Battery", "Taser", "Broken TV", "Tesla", "Lightning"],
	"Squirt": ["Flower", "Glass", "Squirtgun", "Water Balloon", "Seltzer", "Hose", "Storm", "Geyser"],
	"Drop": ["Flower Pot", "Sandbag", "Bowling", "Anvil", "Big Weight", "Safe", "Boulder", "Piano"]
}
const gagTargets = ["Left", "Mid Left", "Mid Right", "Right"]

function getAliveCogs(state) {
	const ans = []
	for (let i = 0; i < state.length; i++)
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

function trySound(targets, gags, params) {
	let i = 0
	return gags.map(x => ({ type: "Sound", level: x, prestige: i++ < params.prestigeSounds ? "Prestige" : "", target: 4 }))
}

function trySoundDrop(targets, gags, params) {
	let i = 0
	const ans = []
	const len = gags.length - 1
	for (let j = 0; j < len; j++) ans.push({ type: "Sound", level: gags[j], prestige: i++ < params.prestigeSounds ? "Prestige" : "", target: 4 })
	ans.push({ type: "Drop", level: gags[len], prestige: "", target: targets[len] })
	return ans
}

function trySoundDoubleDrop(targets, gags, params) {
	let i = 0
	const ans = []
	const len = gags.length - 2
	for (let j = 0; j < len; j++) ans.push({ type: "Sound", level: gags[j], prestige: i++ < params.prestigeSounds ? "Prestige" : "", target: 4 })
	ans.push({ type: "Drop", level: gags[len + 1], prestige: "", target: targets[len - 1] })
	ans.push({ type: "Drop", level: gags[len], prestige: "", target: targets[len] })
	return ans
}

function tryDoubleZap(targets, gags, params) {
	const ans = []
	ans.push({ type: "Zap", level: gags[0], prestige: params.firstZapPrestige ? "Prestige" : "", target: targets[0] })
	ans.push({ type: "Zap", level: gags[1], prestige: params.secondZapPrestige ? "Prestige" : "", target: targets[1] })
	ans.push({ type: "Squirt", level: gags[2], prestige: "Prestige", target: targets[2] })
	ans.push({ type: "Squirt", level: gags[3], prestige: params.doublePrestigeSquirt ? "Prestige" : "", target: targets[3] })
	return ans
}

function tryTyphoon(targets, gags, params) {
	const ans = []
	ans.push({ type: "Zap", level: gags[0], prestige: (params.firstZapPrestige || params.secondZapPrestige) ? "Prestige" : "", target: targets[0] })
	ans.push({ type: "Squirt", level: gags[1], prestige: "Prestige", target: targets[1] })
	ans.push({ type: "Drop", level: gags[2], prestige: "", target: targets[2] })
	ans.push({ type: "Sound", level: gags[3], prestige: params.prestigeSounds > 0 ? "Prestige" : "", target: 4 })
	return ans
}

function copyState(arr) {
	return [Object.assign({}, arr[0]), Object.assign({}, arr[1]), Object.assign({}, arr[2]), Object.assign({}, arr[3])]
}

function test(func, tgt, lvl, lvls, i, params, strategies) {
	const gags = func(tgt, lvl, params)
	const state = copyState(lvls)
	const errors = getState(gags, state)
	if (getAliveCogs(state).length === 0 && errors.length === 0 && getCost(strategies[i]) > getCost(gags)) {
		strategies[i] = gags
	}
}

function generateOptimalStrategy(levels, params) {
	const { minGagLevel, maxGagLevel } = params
	const strategies = []
	const strategyFunctions = [ trySoundDrop, trySoundDoubleDrop, tryDoubleZap, tryTyphoon ]
	const signatures = [ [3,1], [2,2], [1,1,1,1], [1,1,1,1] ]
	for (let i = 0; i < strategyFunctions.length; i++) {
		strategies[i] = false
		for (const levelSequence of multitraverse(minGagLevel - 1, maxGagLevel - 1, signatures[i]))
			for (const targetSequence of getSequence(4, 0, 3))
				test(strategyFunctions[i], targetSequence, levelSequence, levels, i, params, strategies)
	}

	for (let i = 3; i < 5; i++) {
		const num = strategies.length
		strategies[num] = false
		for (const levelSequence of traverse(i, minGagLevel - 1, maxGagLevel - 1))
			test(trySound, false, levelSequence, levels, num, params, strategies)
	}
	strategies.sort((x, y) => getCost(x) - getCost(y))
	return strategies
}

function install(state, params) {
	const start = Math.round(performance.now()) / 1000
	const ans = generateOptimalStrategy(state, params)
	const end = Math.round(performance.now()) / 1000
	$("#calculation").html(`Calculation complete. ${Math.round(1000 * (end - start)) / 1000} seconds used.`)
		.removeClass("red").addClass("green")
	$(".strat").removeClass("displaynone")

	for (let i = 0; i < ans.length; i++) {
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
		// edit()
		// $("input[type=checkbox]").on("click", edit)
		// $("input[type=text]").on("keyup", edit)
		$("#edit").on("click", edit)
	})

}

function edit() {
	const levels = []
	for (let i = 0; i < 4; i++)
		levels.push($(`#level-${i}`).val())
	const doublePrestigeSquirt = $("#doublepre").is(":checked")
	const prestigeSounds = parseInt($("#presound").val())
	const str = $("#gaglevels").val().split("-")
	const minGagLevel = parseInt(str[0]), maxGagLevel = parseInt(str[1])
	const firstZapPrestige = $("#leftpre").is(":checked"), secondZapPrestige = $("#rightpre").is(":checked")
	const params = { minGagLevel, maxGagLevel, prestigeSounds, doublePrestigeSquirt, firstZapPrestige, secondZapPrestige }
	const state = generateState(levels)
	for (let i = 0; i < 4; i++)
		state[i].lured = $(`#prelured-${i}`).is(":checked") ? 0.65 : ($(`#lured-${i}`).is(":checked") ? 0.5 : 0)

	$(".strat").addClass("displaynone")
	$("#calculation").html("Calculation in progress...").removeClass("green").addClass("red")
	setTimeout(() => install(state, params), 100) // so the previous function doesn't enqueue itself
}

function* traverse(maxDepth, minNumber, maxNumber) {
	const arr = []
	for (let i = minNumber; i <= maxNumber; i++) {
		arr[0] = i
		yield* traverseSingle(arr, minNumber, 0, maxDepth)
	}
}

function* traverseSingle(arr, minNumber, depth, maxDepth) {
	if (depth === maxDepth - 1)
		yield arr.slice(0)
	else
		for (let i = minNumber; i <= arr[depth]; i++) {
			arr[depth + 1] = i
			yield* traverseSingle(arr, minNumber, depth + 1, maxDepth)
		}
}

function* multitraverse(minNumber, maxNumber, signature) {
	const arr = []
	yield* multitraverseSingle(arr, minNumber, maxNumber, 0, signature)
}

function* multitraverseSingle(arr, minNumber, maxNumber, depth, signature) {
	if (depth === signature.length)
		yield arr.slice(0)
	else
		for (const i of traverse(signature[depth], minNumber, maxNumber))
			yield* multitraverseSingle(arr.concat(i), minNumber, maxNumber, depth + 1, signature)
}

function* getSequence(maxDepth, minNumber, maxNumber) {
	const arr = []
	yield* getSequenceSingle(arr, minNumber, maxNumber, 0, maxDepth)
}

function* getSequenceSingle(arr, minNumber, maxNumber, depth, maxDepth) {
	if (depth === maxDepth)
		yield arr.slice(0)
	else
		for (let i = minNumber; i <= maxNumber; i++) {
			arr[depth] = i
			yield* getSequenceSingle(arr, minNumber, maxNumber, depth + 1, maxDepth)
		}
}
