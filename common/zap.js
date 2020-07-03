"use strict"
const zapValues = { Taser: 24, TV: 40, Tesla: 66, Lightning: 80 }
const zapCosts = { Taser: 10, TV: 30, Tesla: 75, Lightning: 140 }
const combos = {
	Straight: { first: [2, 2.5, 3, 0], second: [0, 3, 2.5, 2] },
	Cross: { first: [2.5, 3, 2, 0], second: [0, 2.5, 3, 2] },
	"xx--": { first: [2.5, 3, 2, 0], second: [3, 2.5, 0, 2] },
	"x-x-": { first: [2, 2.5, 3, 0], second: [3, 0, 2.5, 2] }
}
const squirtValues = [ 21, 30, 56, 80, 115, 120, 132, 172, 190 ]
const squirtNames = [ "Balloon", "Seltzer", "Hose", "Storm", "Geyser", "LuredStorm", "PreluredStorm", "LuredGeyser", "PreluredGeyser" ]
const squirtCosts = { 0: 0, Any: 1, Balloon: 2, Seltzer: 3, Hose: 15, Storm: 30, Geyser: 65, 
	LuredStorm: 100, PreluredStorm: 102, LuredGeyser: 115, PreluredGeyser: 117 }

function checkCombo(combo, g1, g2, lifes) {
	if (!combos[combo] || !zapValues[g1] || !zapValues[g2]) return [false] // combo or gags don't exist
	if (zapValues[g1] > zapValues[g2]) return [false] // bad combo crossing
	const damages = [0, 0, 0, 0]
	for (let i = 0; i < 4; i++) damages[i] += zapValues[g1] * combos[combo].first[i]
	for (let i = 0; i < 4; i++) damages[i] += zapValues[g2] * combos[combo].second[i]
	const needed = []
	for (let i = 0; i < 4; i++) needed[i] = Math.max(0, lifes[i] - damages[i])
	let count = 0
	for (let i = 0; i < 4; i++) if (needed[i]) count++
	if (count > 2) return [false] // too many living cogs
	if ((needed[0] && needed[1]) || (needed[2] && needed[3])) return [false] // probably xx-- is used and both right cogs alive
	const answer = [true, 0, 0, 0, 0]
	count = 0
	for (let i = 0; i < 4; i++) {
		if (!needed[i]) continue
		let good = false
		for (let j in squirtValues)
			if (needed[i] <= squirtValues[j]) {
				answer[i + 1] = squirtNames[j]
				count++
				good = true
				break
			}
		if (!good) return [false]
	}
	if (!count) {
		answer[1] = "Any"
		answer[3] = "Any"
	} else if (count == 1) {
		if (answer[1] || answer[2])
			answer[4] = "Any"
		else
			answer[1] = "Any"
	}

	return answer
}

function findBestCombo(lifes) {
	let answer = false
	let cost = 1000
	for (let i in combos)
		for (let j in zapCosts)
			for (let k in zapCosts) {
				const microans = checkCombo(i, j, k, lifes)
				if (!microans[0]) continue
				microans.splice(0, 1, i, j, k)
				let localcost = zapCosts[j] + zapCosts[k]
				for (let l = 3; l < 7; l++) localcost += squirtCosts[microans[l]]
				if (localcost < cost) {
					answer = microans
					cost = localcost
				}
			}
	return answer
}

function findBestComboBase(levels, exes) {
	const lifes = levels.map((v, k) => (v + 1) * (v + 2) * (exes[k] ? 1.5 : 1))
	return findBestCombo(lifes)
}

function edit() {
	const exes = []
	for (let i = 0; i < 4; i++)
		exes[i] = $(`#exe-${i}`).is(":checked")
	const levels = []
	for (let i = 0; i < 4; i++) {
		const str = $(`#level-${i}`).val()
		levels[i] = parseInt(str)
		if (str.indexOf("exe") > -1)
			exes[i] = true
	}
	const ans = findBestComboBase(levels, exes)
	if (!ans) {
		$("#answer").html("Combo not found")
		$("#combo").css("display", "none")
	} else {
		const zap = ans[1] == ans[2] ? `${ans[1]}s` : `${ans[1]} ${ans[2]}`
		const squirt1 = `${ans[3] || ans[4]} ${ans[4] ? "mid-" : ""}left`
		const squirt2 = `${ans[5] || ans[6]} ${ans[5] ? "mid-" : ""}right`
		const text = `${ans[0]} ${zap}, ${squirt1}, ${squirt2}`
		$("#answer").html(text)
		$("#combo").css("display", "block")
		$("#combo").attr("class", ans[0])
		$("#combo").css("background-image", `url(resources/${ans[0]}.png)`)
		$("#zap1").attr("src", `resources/${ans[1]}.png`)
		$("#zap2").attr("src", `resources/${ans[2]}.png`)
		$("#squirt1").attr("src", `resources/${ans[3] || ans[4]}.png`)
		$("#squirt2").attr("src", `resources/${ans[5] || ans[6]}.png`)
		$("#squirt1").attr("class", ans[3] ? "left": "right")
		$("#squirt2").attr("class", ans[5] ? "left": "right")
	}
}

$(() => {
	$("input[type=checkbox]").on("click", edit)
	$("input[type=text]").on("keyup", edit)
})
