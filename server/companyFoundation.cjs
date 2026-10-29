if (!globalThis.crypto) globalThis.crypto = require("node:crypto").webcrypto;
Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

//#region frontend/src/games/nine-ice-forts/rules.js
const NINE_ICE_FORTS_RULESET = Object.freeze({
	gameId: "nine-ice-forts",
	rulesetVersion: "navakankari-standard-1.0.0",
	piecesPerPlayer: 9,
	flyingEnabled: true,
	repetitionLimit: 3,
	noCapturePlyLimit: 100
});
const NODES = Object.freeze([
	{
		id: "a7",
		x: 8,
		y: 8
	},
	{
		id: "d7",
		x: 50,
		y: 8
	},
	{
		id: "g7",
		x: 92,
		y: 8
	},
	{
		id: "b6",
		x: 22,
		y: 22
	},
	{
		id: "d6",
		x: 50,
		y: 22
	},
	{
		id: "f6",
		x: 78,
		y: 22
	},
	{
		id: "c5",
		x: 36,
		y: 36
	},
	{
		id: "d5",
		x: 50,
		y: 36
	},
	{
		id: "e5",
		x: 64,
		y: 36
	},
	{
		id: "a4",
		x: 8,
		y: 50
	},
	{
		id: "b4",
		x: 22,
		y: 50
	},
	{
		id: "c4",
		x: 36,
		y: 50
	},
	{
		id: "e4",
		x: 64,
		y: 50
	},
	{
		id: "f4",
		x: 78,
		y: 50
	},
	{
		id: "g4",
		x: 92,
		y: 50
	},
	{
		id: "c3",
		x: 36,
		y: 64
	},
	{
		id: "d3",
		x: 50,
		y: 64
	},
	{
		id: "e3",
		x: 64,
		y: 64
	},
	{
		id: "b2",
		x: 22,
		y: 78
	},
	{
		id: "d2",
		x: 50,
		y: 78
	},
	{
		id: "f2",
		x: 78,
		y: 78
	},
	{
		id: "a1",
		x: 8,
		y: 92
	},
	{
		id: "d1",
		x: 50,
		y: 92
	},
	{
		id: "g1",
		x: 92,
		y: 92
	}
]);
const EDGES = Object.freeze([
	["a7", "d7"],
	["d7", "g7"],
	["a7", "a4"],
	["a4", "a1"],
	["g7", "g4"],
	["g4", "g1"],
	["a1", "d1"],
	["d1", "g1"],
	["b6", "d6"],
	["d6", "f6"],
	["b6", "b4"],
	["b4", "b2"],
	["f6", "f4"],
	["f4", "f2"],
	["b2", "d2"],
	["d2", "f2"],
	["c5", "d5"],
	["d5", "e5"],
	["c5", "c4"],
	["c4", "c3"],
	["e5", "e4"],
	["e4", "e3"],
	["c3", "d3"],
	["d3", "e3"],
	["d7", "d6"],
	["d6", "d5"],
	["a4", "b4"],
	["b4", "c4"],
	["e4", "f4"],
	["f4", "g4"],
	["d3", "d2"],
	["d2", "d1"]
]);
const MILLS = Object.freeze([
	[
		"a7",
		"d7",
		"g7"
	],
	[
		"b6",
		"d6",
		"f6"
	],
	[
		"c5",
		"d5",
		"e5"
	],
	[
		"a4",
		"b4",
		"c4"
	],
	[
		"e4",
		"f4",
		"g4"
	],
	[
		"c3",
		"d3",
		"e3"
	],
	[
		"b2",
		"d2",
		"f2"
	],
	[
		"a1",
		"d1",
		"g1"
	],
	[
		"a7",
		"a4",
		"a1"
	],
	[
		"b6",
		"b4",
		"b2"
	],
	[
		"c5",
		"c4",
		"c3"
	],
	[
		"d7",
		"d6",
		"d5"
	],
	[
		"d3",
		"d2",
		"d1"
	],
	[
		"e5",
		"e4",
		"e3"
	],
	[
		"f6",
		"f4",
		"f2"
	],
	[
		"g7",
		"g4",
		"g1"
	]
]);
const NODE_IDS = new Set(NODES.map((node) => node.id));
const ADJACENCY = EDGES.reduce((map, [a, b]) => {
	map[a] = [...map[a] || [], b];
	map[b] = [...map[b] || [], a];
	return map;
}, {});
function createNineIceFortsState({ startingPlayer = "blue", mode = "hotseat" } = {}) {
	return recordPosition({
		gameId: NINE_ICE_FORTS_RULESET.gameId,
		rulesetVersion: NINE_ICE_FORTS_RULESET.rulesetVersion,
		mode,
		board: Object.fromEntries(NODES.map((node) => [node.id, null])),
		currentPlayer: startingPlayer,
		phase: "placement",
		placed: {
			blue: 0,
			coral: 0
		},
		piecesOnBoard: {
			blue: 0,
			coral: 0
		},
		pendingRemoval: false,
		winner: null,
		winReason: null,
		turn: 1,
		noCapturePly: 0,
		history: [],
		positionCounts: {},
		lastAction: null
	});
}
function getOpponent(player) {
	return player === "blue" ? "coral" : "blue";
}
function getPlayerPhase(state, player = state.currentPlayer) {
	if (state.placed[player] < NINE_ICE_FORTS_RULESET.piecesPerPlayer) return "placement";
	if (NINE_ICE_FORTS_RULESET.flyingEnabled && state.piecesOnBoard[player] === 3) return "flying";
	return "movement";
}
function getLegalActions(state, player = state.currentPlayer) {
	if (!state || state.winner || player !== state.currentPlayer) return [];
	if (state.pendingRemoval) return getRemovableNodes(state, getOpponent(player)).map((nodeId) => ({
		type: "remove",
		nodeId
	}));
	const phase = getPlayerPhase(state, player);
	if (phase === "placement") return emptyNodes(state).map((nodeId) => ({
		type: "place",
		nodeId
	}));
	const actions = [];
	const destinations = emptyNodes(state);
	occupiedNodes(state, player).forEach((from) => {
		(phase === "flying" ? destinations : (ADJACENCY[from] || []).filter((to) => !state.board[to])).forEach((to) => actions.push({
			type: "move",
			from,
			to
		}));
	});
	return actions;
}
function validateAction(state, action, player = state.currentPlayer) {
	if (!state) return {
		valid: false,
		reason: "Missing game state."
	};
	if (state.winner) return {
		valid: false,
		reason: "The match has already ended."
	};
	if (player !== state.currentPlayer) return {
		valid: false,
		reason: "It is not this player’s turn."
	};
	if (!action || typeof action.type !== "string") return {
		valid: false,
		reason: "Malformed action."
	};
	return getLegalActions(state, player).some((candidate) => actionsEqual(candidate, action)) ? { valid: true } : {
		valid: false,
		reason: explainIllegalAction(state, action)
	};
}
function applyAction(state, action, player = state.currentPlayer) {
	const validation = validateAction(state, action, player);
	if (!validation.valid) return {
		state,
		error: validation.reason
	};
	const next = cloneState(state);
	next.lastAction = {
		...action,
		player
	};
	if (action.type === "place") {
		next.board[action.nodeId] = player;
		next.placed[player] += 1;
		next.piecesOnBoard[player] += 1;
		next.noCapturePly += 1;
		next.history.push({
			turn: next.turn,
			player,
			...action
		});
		if (formsMill(next, action.nodeId, player)) {
			next.pendingRemoval = true;
			return {
				state: next,
				error: null
			};
		}
		return {
			state: finishTurn(next),
			error: null
		};
	}
	if (action.type === "move") {
		next.board[action.from] = null;
		next.board[action.to] = player;
		next.noCapturePly += 1;
		next.history.push({
			turn: next.turn,
			player,
			...action
		});
		if (formsMill(next, action.to, player)) {
			next.pendingRemoval = true;
			return {
				state: next,
				error: null
			};
		}
		return {
			state: finishTurn(next),
			error: null
		};
	}
	if (action.type === "remove") {
		const opponent = getOpponent(player);
		next.board[action.nodeId] = null;
		next.piecesOnBoard[opponent] -= 1;
		next.pendingRemoval = false;
		next.noCapturePly = 0;
		next.history.push({
			turn: next.turn,
			player,
			...action
		});
		if (next.placed[opponent] >= NINE_ICE_FORTS_RULESET.piecesPerPlayer && next.piecesOnBoard[opponent] < 3) {
			next.winner = player;
			next.winReason = "reduced-opponent-to-two";
			return {
				state: next,
				error: null
			};
		}
		return {
			state: finishTurn(next),
			error: null
		};
	}
	return {
		state,
		error: "Unsupported action."
	};
}
function formsMill(state, nodeId, player) {
	return MILLS.some((mill) => mill.includes(nodeId) && mill.every((id) => state.board[id] === player));
}
function getRemovableNodes(state, opponent) {
	const pieces = occupiedNodes(state, opponent);
	const outsideMills = pieces.filter((nodeId) => !formsMill(state, nodeId, opponent));
	return outsideMills.length ? outsideMills : pieces;
}
function getGameResult(state) {
	if (!state?.winner) return null;
	return {
		winner: state.winner,
		reason: state.winReason
	};
}
function describeTurn(state) {
	if (state.winner) return `${capitalize(state.winner)} wins`;
	if (state.pendingRemoval) return `${capitalize(state.currentPlayer)} formed a fort line — remove one rival scout.`;
	const phase = getPlayerPhase(state);
	if (phase === "placement") return `${capitalize(state.currentPlayer)} places a scout.`;
	if (phase === "flying") return `${capitalize(state.currentPlayer)} may fly to any open fort.`;
	return `${capitalize(state.currentPlayer)} moves along an ice path.`;
}
function actionKey(action) {
	if (!action) return "";
	if (action.type === "move") return `move:${action.from}:${action.to}`;
	return `${action.type}:${action.nodeId}`;
}
function finishTurn(state) {
	state.currentPlayer = getOpponent(state.currentPlayer);
	state.turn += 1;
	state.phase = getPlayerPhase(state, state.currentPlayer);
	if (state.placed[state.currentPlayer] >= NINE_ICE_FORTS_RULESET.piecesPerPlayer) {
		if (!getLegalActions(state, state.currentPlayer).length) {
			state.winner = getOpponent(state.currentPlayer);
			state.winReason = "immobilised-opponent";
			return state;
		}
	}
	const recorded = recordPosition(state);
	const signature = positionSignature(recorded);
	if (recorded.positionCounts[signature] >= NINE_ICE_FORTS_RULESET.repetitionLimit) {
		recorded.winner = "draw";
		recorded.winReason = "threefold-repetition";
	} else if (recorded.noCapturePly >= NINE_ICE_FORTS_RULESET.noCapturePlyLimit) {
		recorded.winner = "draw";
		recorded.winReason = "no-capture-limit";
	}
	return recorded;
}
function recordPosition(state) {
	const signature = positionSignature(state);
	state.positionCounts = {
		...state.positionCounts,
		[signature]: (state.positionCounts[signature] || 0) + 1
	};
	return state;
}
function positionSignature(state) {
	return `${NODES.map((node) => state.board[node.id] || "-").join("")}|${state.currentPlayer}|${state.pendingRemoval ? "r" : "n"}|${state.placed.blue},${state.placed.coral}`;
}
function occupiedNodes(state, player) {
	return NODES.filter((node) => state.board[node.id] === player).map((node) => node.id);
}
function emptyNodes(state) {
	return NODES.filter((node) => !state.board[node.id]).map((node) => node.id);
}
function cloneState(state) {
	return {
		...state,
		board: { ...state.board },
		placed: { ...state.placed },
		piecesOnBoard: { ...state.piecesOnBoard },
		history: [...state.history],
		positionCounts: { ...state.positionCounts }
	};
}
function actionsEqual(a, b) {
	if (a.type !== b.type) return false;
	if (a.type === "move") return a.from === b.from && a.to === b.to;
	return a.nodeId === b.nodeId;
}
function explainIllegalAction(state, action) {
	if (state.pendingRemoval && action.type !== "remove") return "Remove a rival scout before continuing.";
	if (!state.pendingRemoval && action.type === "remove") return "A rival scout may be removed only after forming a fort line.";
	if (action.nodeId && !NODE_IDS.has(action.nodeId)) return "Unknown fort position.";
	if (action.from && !NODE_IDS.has(action.from)) return "Unknown starting position.";
	if (action.to && !NODE_IDS.has(action.to)) return "Unknown destination.";
	if (action.type === "place" && state.board[action.nodeId]) return "That fort is occupied.";
	if (action.type === "move" && state.board[action.from] !== state.currentPlayer) return "Select one of your own scouts.";
	if (action.type === "move" && state.board[action.to]) return "That destination is occupied.";
	return "That action is not legal in the current phase.";
}
function capitalize(value) {
	return value ? `${value[0].toUpperCase()}${value.slice(1)}` : "";
}

//#endregion
//#region frontend/src/games/nine-ice-forts/bot.js
function chooseBotAction(state, player = state.currentPlayer) {
	const actions = getLegalActions(state, player);
	if (!actions.length) return null;
	const scored = actions.map((action) => ({
		action,
		score: scoreAction(state, action, player)
	}));
	scored.sort((a, b) => b.score - a.score || actionKey(a.action).localeCompare(actionKey(b.action)));
	return scored[0].action;
}
function scoreAction(state, action, player) {
	const opponent = getOpponent(player);
	let score = 0;
	if (action.type === "remove") {
		const degree = nodeDegree(action.nodeId);
		const millPotential = MILLS.filter((mill) => mill.includes(action.nodeId)).length;
		return 1e3 + degree * 10 + millPotential * 14;
	}
	const result = applyAction(state, action, player).state;
	const landingNode = action.type === "place" ? action.nodeId : action.to;
	if (result.pendingRemoval) score += 500;
	score += nodeDegree(landingNode) * 8;
	score += openMillPotential(result, landingNode, player) * 18;
	score += forkPotential(result, player) * 16;
	if (action.type === "move") score += createsMobility(result, player) * .8;
	score += blocksImmediateMill(state, action, opponent) ? 180 : 0;
	score -= exposesImmediateMill(result, opponent) ? 140 : 0;
	return score;
}
function blocksImmediateMill(state, action, opponent) {
	const destination = action.type === "place" ? action.nodeId : action.to;
	return MILLS.some((mill) => {
		if (!mill.includes(destination)) return false;
		const occupied = mill.filter((id) => state.board[id] === opponent).length;
		const empty = mill.filter((id) => !state.board[id]).length;
		return occupied === 2 && empty === 1;
	});
}
function exposesImmediateMill(state, opponent) {
	return getLegalActions(state, opponent).some((action) => {
		if (action.type === "remove") return true;
		return applyAction({
			...state,
			currentPlayer: opponent
		}, action, opponent).state.pendingRemoval;
	});
}
function openMillPotential(state, nodeId, player) {
	return MILLS.filter((mill) => mill.includes(nodeId)).reduce((total, mill) => {
		const mine = mill.filter((id) => state.board[id] === player).length;
		const empty = mill.filter((id) => !state.board[id]).length;
		return total + (mine === 2 && empty === 1 ? 2 : mine === 1 && empty === 2 ? 1 : 0);
	}, 0);
}
function forkPotential(state, player) {
	return NODES.reduce((total, node) => {
		if (state.board[node.id] !== player) return total;
		const threats = MILLS.filter((mill) => mill.includes(node.id)).filter((mill) => {
			const mine = mill.filter((id) => state.board[id] === player).length;
			const empty = mill.filter((id) => !state.board[id]).length;
			return mine === 2 && empty === 1;
		}).length;
		return total + Math.max(0, threats - 1);
	}, 0);
}
function createsMobility(state, player) {
	return getLegalActions({
		...state,
		currentPlayer: player
	}, player).length;
}
function nodeDegree(nodeId) {
	return [
		["a7", "d7"],
		["d7", "g7"],
		["a7", "a4"],
		["a4", "a1"],
		["g7", "g4"],
		["g4", "g1"],
		["a1", "d1"],
		["d1", "g1"],
		["b6", "d6"],
		["d6", "f6"],
		["b6", "b4"],
		["b4", "b2"],
		["f6", "f4"],
		["f4", "f2"],
		["b2", "d2"],
		["d2", "f2"],
		["c5", "d5"],
		["d5", "e5"],
		["c5", "c4"],
		["c4", "c3"],
		["e5", "e4"],
		["e4", "e3"],
		["c3", "d3"],
		["d3", "e3"],
		["d7", "d6"],
		["d6", "d5"],
		["a4", "b4"],
		["b4", "c4"],
		["e4", "f4"],
		["f4", "g4"],
		["d3", "d2"],
		["d2", "d1"]
	].filter(([a, b]) => a === nodeId || b === nodeId).length;
}

//#endregion
//#region mobile/arctic-play/src/foundation.js
function beginnerAction(state) {
	const legal = getLegalActions(state);
	if (!legal.length) return null;
	return state.pendingRemoval ? chooseBotAction(state) : legal[(state.turn * 7 + state.noCapturePly * 3) % legal.length];
}
async function verifyFoundation(proof) {
	if (proof?.id !== "nine-ice-forts" || typeof proof.matchId !== "string" || !proof.matchId || proof.matchId.length > 120 || !Array.isArray(proof.actions) || !proof.actions.length || proof.actions.length > 2e3) throw Error("A complete foundation-game move record is required.");
	let state = createNineIceFortsState({ mode: "bots" });
	for (const key of proof.actions) {
		if (typeof key !== "string" || key.length > 30 || state.winner) throw Error("Invalid foundation move record.");
		const [type, a, b, ...extra] = key.split(":"), action = type === "move" ? {
			type,
			from: a,
			to: b
		} : {
			type,
			nodeId: a
		};
		if (extra.length || actionKey(action) !== key) throw Error("Invalid foundation action.");
		if (state.currentPlayer === "coral" && actionKey(beginnerAction(state)) !== key) throw Error("The foundation bot’s move record could not be verified.");
		const next = applyAction(state, action);
		if (next.error) throw Error(next.error);
		state = next.state;
	}
	if (state.winner !== "blue") throw Error("Win against the foundation bot to earn a Lantern Key.");
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(proof.actions.join("|"))), signature = Array.from(new Uint8Array(digest), (n) => n.toString(16).padStart(2, "0")).join("");
	return {
		id: "nine-ice-forts",
		matchId: proof.matchId,
		signature
	};
}

//#endregion
exports.EDGES = EDGES;
exports.MILLS = MILLS;
exports.NINE_ICE_FORTS_RULESET = NINE_ICE_FORTS_RULESET;
exports.NODES = NODES;
exports.actionKey = actionKey;
exports.applyAction = applyAction;
exports.beginnerAction = beginnerAction;
exports.chooseBotAction = chooseBotAction;
exports.createNineIceFortsState = createNineIceFortsState;
exports.describeTurn = describeTurn;
exports.formsMill = formsMill;
exports.getGameResult = getGameResult;
exports.getLegalActions = getLegalActions;
exports.getOpponent = getOpponent;
exports.getPlayerPhase = getPlayerPhase;
exports.getRemovableNodes = getRemovableNodes;
exports.validateAction = validateAction;
exports.verifyFoundation = verifyFoundation;