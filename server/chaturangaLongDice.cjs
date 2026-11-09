if (!globalThis.crypto) globalThis.crypto = require("node:crypto").webcrypto;
Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
// \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod, mod.exports), cb = null), mod.exports);
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") {
		for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
			key = keys[i];
			if (!__hasOwnProp.call(to, key) && key !== except) {
				__defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
		}
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));

// server/gameRules.js
var require_gameRules = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const ROWS = 8;
	const COLS = 8;
	const PLAYERS = [
		"green",
		"red",
		"blue",
		"yellow"
	];
	const TEAM_LABEL = {
		green: "Green",
		red: "Red",
		blue: "Blue",
		yellow: "Pink"
	};
	const PIECE_NAME = {
		king: "Frost King",
		elephant: "War Mammoth",
		horse: "Aurora Unicorn",
		ship: "Icebreaker",
		pawn: "Snow Guard"
	};
	const DICE_ROLLS = {
		1: ["pawn", "king"],
		2: ["elephant"],
		3: ["horse"],
		4: ["ship"],
		5: ["pawn", "king"],
		6: ["ship"]
	};
	const PROMOTION_PIECES = {
		yellow: {
			"7,0": "ship",
			"7,1": "horse",
			"7,2": "elephant",
			"7,3": "king",
			"7,4": "king",
			"7,5": "elephant",
			"7,6": "horse",
			"7,7": "ship"
		},
		red: {
			"7,7": "ship",
			"6,7": "elephant",
			"5,7": "horse",
			"4,7": "king",
			"3,7": "king",
			"2,7": "horse",
			"1,7": "elephant",
			"0,7": "ship"
		},
		green: {
			"0,0": "ship",
			"0,1": "horse",
			"0,2": "elephant",
			"0,3": "king",
			"0,4": "king",
			"0,5": "elephant",
			"0,6": "horse",
			"0,7": "ship"
		},
		blue: {
			"7,0": "ship",
			"6,0": "horse",
			"5,0": "elephant",
			"4,0": "king",
			"3,0": "king",
			"2,0": "elephant",
			"1,0": "horse",
			"0,0": "ship"
		}
	};
	function createInitialGameState() {
		return {
			board: createStartingBoard(),
			currentPlayerIndex: 0,
			selected: null,
			legalMoves: [],
			dice: {
				values: [null, null],
				used: [false, false],
				rolled: false
			},
			moveLog: [],
			eliminatedTeams: [],
			gameOver: false,
			winner: null,
			updatedAt: Date.now()
		};
	}
	function createEmptyBoard() {
		return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
	}
	function createStartingBoard() {
		const board = createEmptyBoard();
		board[0][0] = makePiece("yellow", "ship");
		board[0][1] = makePiece("yellow", "horse");
		board[0][2] = makePiece("yellow", "elephant");
		board[0][3] = makePiece("yellow", "king", true);
		board[1][0] = makePiece("yellow", "pawn");
		board[1][1] = makePiece("yellow", "pawn");
		board[1][2] = makePiece("yellow", "pawn");
		board[1][3] = makePiece("yellow", "pawn");
		board[7][0] = makePiece("red", "ship");
		board[6][0] = makePiece("red", "horse");
		board[5][0] = makePiece("red", "elephant");
		board[4][0] = makePiece("red", "king", true);
		board[7][1] = makePiece("red", "pawn");
		board[6][1] = makePiece("red", "pawn");
		board[5][1] = makePiece("red", "pawn");
		board[4][1] = makePiece("red", "pawn");
		board[7][4] = makePiece("green", "king", true);
		board[7][5] = makePiece("green", "elephant");
		board[7][6] = makePiece("green", "horse");
		board[7][7] = makePiece("green", "ship");
		board[6][4] = makePiece("green", "pawn");
		board[6][5] = makePiece("green", "pawn");
		board[6][6] = makePiece("green", "pawn");
		board[6][7] = makePiece("green", "pawn");
		board[3][7] = makePiece("blue", "king", true);
		board[2][7] = makePiece("blue", "elephant");
		board[1][7] = makePiece("blue", "horse");
		board[0][7] = makePiece("blue", "ship");
		board[3][6] = makePiece("blue", "pawn");
		board[2][6] = makePiece("blue", "pawn");
		board[1][6] = makePiece("blue", "pawn");
		board[0][6] = makePiece("blue", "pawn");
		return board;
	}
	function makePiece(team, type, isRoyal = false) {
		return {
			team,
			type,
			isRoyal
		};
	}
	function currentTeam(state) {
		return PLAYERS[state.currentPlayerIndex];
	}
	function rollDiceForState(state, forcedValues = null) {
		if (state.gameOver || state.dice.rolled) return state;
		const values = normalizeDiceValues(forcedValues) || [rollD6(), rollD6()];
		return touch({
			...state,
			selected: null,
			legalMoves: [],
			dice: {
				values,
				used: [false, false],
				rolled: true
			}
		});
	}
	function normalizeDiceValues(values) {
		if (!Array.isArray(values) || values.length !== 2) return null;
		const normalized = values.map((value) => Number(value));
		if (normalized.some((value) => !Number.isInteger(value) || value < 1 || value > 6)) return null;
		return normalized;
	}
	function selectSquare(state, row, col) {
		if (state.gameOver || !state.dice.rolled) return state;
		const chosenMove = state.legalMoves.find((move) => move.toRow === row && move.toCol === col);
		if (chosenMove) return applyMove(state, chosenMove);
		const team = currentTeam(state);
		const piece = state.board[row]?.[col];
		if (!piece || piece.team !== team) return touch({
			...state,
			selected: null,
			legalMoves: []
		});
		const legalMoves = getLegalMovesForPiece(state, row, col);
		if (!legalMoves.length) return touch({
			...state,
			selected: null,
			legalMoves: []
		});
		return touch({
			...state,
			selected: {
				row,
				col
			},
			legalMoves
		});
	}
	function getLegalMovesForPiece(state, row, col) {
		const piece = state.board[row]?.[col];
		if (!piece || state.gameOver || !state.dice.rolled) return [];
		const activeDieIndexes = [0, 1].filter((dieIndex) => {
			const value = state.dice.values[dieIndex];
			return value && !state.dice.used[dieIndex] && DICE_ROLLS[value].includes(piece.type);
		});
		if (!activeDieIndexes.length) return [];
		const moves = [];
		activeDieIndexes.forEach((dieIndex) => {
			getPossibleTargets(state, row, col, piece).forEach(([toRow, toCol]) => {
				const target = state.board[toRow][toCol];
				if (target && target.team === piece.team) return;
				moves.push({
					fromRow: row,
					fromCol: col,
					toRow,
					toCol,
					dieIndex,
					captured: target || null
				});
			});
		});
		return dedupeMoves(moves);
	}
	function getAllLegalMovesForTeam(state, team = currentTeam(state)) {
		const moves = [];
		for (let row = 0; row < ROWS; row += 1) for (let col = 0; col < COLS; col += 1) {
			const piece = state.board[row][col];
			if (piece && piece.team === team) moves.push(...getLegalMovesForPiece(state, row, col));
		}
		return moves;
	}
	function hasAnyLegalMoveForTeam(state, team = currentTeam(state)) {
		return getAllLegalMovesForTeam(state, team).length > 0;
	}
	function applyMove(state, move) {
		const board = cloneBoard(state.board);
		const piece = board[move.fromRow][move.fromCol];
		if (!piece) return state;
		const captured = board[move.toRow][move.toCol];
		board[move.toRow][move.toCol] = { ...piece };
		board[move.fromRow][move.fromCol] = null;
		const dice = {
			values: [...state.dice.values],
			used: [...state.dice.used],
			rolled: state.dice.rolled
		};
		dice.used[move.dieIndex] = true;
		const moveLog = [...state.moveLog];
		const eliminatedTeams = [...state.eliminatedTeams || []];
		if (captured) moveLog.unshift(`${TEAM_LABEL[piece.team]} captured ${TEAM_LABEL[captured.team]} ${PIECE_NAME[captured.type]}`);
		else moveLog.unshift(`${TEAM_LABEL[piece.team]} moved ${PIECE_NAME[piece.type]}`);
		maybePromotePawn(board[move.toRow][move.toCol], move.toRow, move.toCol, moveLog);
		if (isRoyalKing(captured)) {
			removeTeamPieces(board, captured.team);
			if (!eliminatedTeams.includes(captured.team)) eliminatedTeams.push(captured.team);
			moveLog.unshift(`${TEAM_LABEL[captured.team]} eliminated`);
		}
		let next = touch({
			...state,
			board,
			dice,
			selected: null,
			legalMoves: [],
			eliminatedTeams,
			moveLog: moveLog.slice(0, 8)
		});
		next = checkWinner(next);
		if (next.gameOver) return next;
		const team = currentTeam(next);
		if (next.dice.used.every(Boolean) || !hasAnyLegalMoveForTeam(next, team)) return endTurn(next);
		return next;
	}
	function endTurn(state) {
		let nextIndex = state.currentPlayerIndex;
		for (let i = 0; i < PLAYERS.length; i += 1) {
			nextIndex = (nextIndex + 1) % PLAYERS.length;
			if (teamHasKing(state.board, PLAYERS[nextIndex])) break;
		}
		return touch({
			...state,
			currentPlayerIndex: nextIndex,
			selected: null,
			legalMoves: [],
			dice: {
				values: [null, null],
				used: [false, false],
				rolled: false
			}
		});
	}
	function pickBotMove(state) {
		const moves = getAllLegalMovesForTeam(state, currentTeam(state));
		if (!moves.length) return null;
		const captures = moves.filter((move) => move.captured);
		const options = captures.length ? captures : moves;
		return options[Math.floor(Math.random() * options.length)];
	}
	function getPossibleTargets(state, row, col, piece) {
		if (piece.type === "king") return kingMoves(row, col);
		if (piece.type === "pawn") return pawnMoves(state, row, col, piece.team);
		if (piece.type === "ship") return shipMoves(row, col);
		if (piece.type === "horse") return horseMoves(row, col);
		if (piece.type === "elephant") return slideMoves(state, row, col, [
			[1, 0],
			[-1, 0],
			[0, 1],
			[0, -1]
		]);
		return [];
	}
	function pawnMoves(state, row, col, team) {
		const spec = {
			yellow: {
				forward: [1, 0],
				captures: [[1, -1], [1, 1]]
			},
			red: {
				forward: [0, 1],
				captures: [[-1, 1], [1, 1]]
			},
			green: {
				forward: [-1, 0],
				captures: [[-1, -1], [-1, 1]]
			},
			blue: {
				forward: [0, -1],
				captures: [[-1, -1], [1, -1]]
			}
		}[team];
		if (!spec) return [];
		const out = [];
		const [fr, fc] = spec.forward;
		const fRow = row + fr;
		const fCol = col + fc;
		if (inBounds(fRow, fCol) && !state.board[fRow][fCol]) out.push([fRow, fCol]);
		spec.captures.forEach(([dr, dc]) => {
			const r = row + dr;
			const c = col + dc;
			if (!inBounds(r, c)) return;
			const target = state.board[r][c];
			if (target && target.team !== team) out.push([r, c]);
		});
		return out;
	}
	function kingMoves(row, col) {
		return oneStepMoves(row, col, [
			[1, 0],
			[-1, 0],
			[0, 1],
			[0, -1],
			[1, 1],
			[1, -1],
			[-1, 1],
			[-1, -1]
		]);
	}
	function horseMoves(row, col) {
		return [
			[2, 1],
			[2, -1],
			[-2, 1],
			[-2, -1],
			[1, 2],
			[1, -2],
			[-1, 2],
			[-1, -2]
		].map(([dr, dc]) => [row + dr, col + dc]).filter(([r, c]) => inBounds(r, c));
	}
	function shipMoves(row, col) {
		return [
			[2, 2],
			[2, -2],
			[-2, 2],
			[-2, -2]
		].map(([dr, dc]) => [row + dr, col + dc]).filter(([r, c]) => inBounds(r, c));
	}
	function oneStepMoves(row, col, dirs) {
		return dirs.map(([dr, dc]) => [row + dr, col + dc]).filter(([r, c]) => inBounds(r, c));
	}
	function slideMoves(state, row, col, dirs) {
		const out = [];
		for (const [dr, dc] of dirs) for (let step = 1; step < 8; step += 1) {
			const r = row + dr * step;
			const c = col + dc * step;
			if (!inBounds(r, c)) break;
			out.push([r, c]);
			if (state.board[r][c]) break;
		}
		return out;
	}
	function maybePromotePawn(piece, row, col, moveLog) {
		if (!piece || piece.type !== "pawn") return;
		const promotionType = PROMOTION_PIECES[piece.team]?.[`${row},${col}`];
		if (!promotionType) return;
		piece.type = promotionType;
		piece.isRoyal = false;
		moveLog.unshift(`${TEAM_LABEL[piece.team]} pawn promoted to ${PIECE_NAME[promotionType]}`);
	}
	function removeTeamPieces(board, team) {
		for (let row = 0; row < ROWS; row += 1) for (let col = 0; col < COLS; col += 1) if (board[row][col]?.team === team) board[row][col] = null;
	}
	function checkWinner(state) {
		const alive = PLAYERS.filter((team) => teamHasKing(state.board, team));
		if (alive.length > 1) return state;
		return touch({
			...state,
			gameOver: true,
			winner: alive[0] || null,
			selected: null,
			legalMoves: []
		});
	}
	function getPlacements(state) {
		const eliminated = state.eliminatedTeams || [];
		const alive = PLAYERS.filter((team) => teamHasKing(state.board, team));
		const winner = state.winner || alive[0] || null;
		const ordered = [];
		if (winner) ordered.push(winner);
		[...eliminated].reverse().forEach((team) => {
			if (!ordered.includes(team)) ordered.push(team);
		});
		PLAYERS.forEach((team) => {
			if (!ordered.includes(team)) ordered.push(team);
		});
		return ordered.slice(0, 4);
	}
	function isRoyalKing(piece) {
		return piece?.type === "king" && piece.isRoyal !== false;
	}
	function teamHasKing(board, team) {
		return board.some((row) => row.some((piece) => piece && piece.team === team && isRoyalKing(piece)));
	}
	function inBounds(row, col) {
		return row >= 0 && row < ROWS && col >= 0 && col < COLS;
	}
	function dedupeMoves(moves) {
		const seen = /* @__PURE__ */ new Set();
		return moves.filter((move) => {
			const key = `${move.fromRow},${move.fromCol},${move.toRow},${move.toCol},${move.dieIndex}`;
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		});
	}
	function cloneBoard(board) {
		return board.map((row) => row.map((piece) => piece ? { ...piece } : null));
	}
	function rollD6() {
		return Math.floor(Math.random() * 6) + 1;
	}
	function touch(state) {
		return {
			...state,
			updatedAt: Date.now()
		};
	}
	module.exports = {
		DICE_ROLLS,
		PLAYERS,
		TEAM_LABEL,
		PIECE_NAME,
		PROMOTION_PIECES,
		createInitialGameState,
		currentTeam,
		rollDiceForState,
		selectSquare,
		endTurn,
		applyMove,
		hasAnyLegalMoveForTeam,
		pickBotMove,
		getPlacements
	};
}));

// mobile/arctic-play/src/dominionTeams.js
var import_gameRules = /* @__PURE__ */ __toESM(require_gameRules(), 1);
const DOMINION_TEAMS = Object.freeze([Object.freeze({
	id: "green-pink",
	name: "Green + Pink",
	seats: Object.freeze(["green", "yellow"])
}), Object.freeze({
	id: "red-blue",
	name: "Red + Blue",
	seats: Object.freeze(["red", "blue"])
})]);
const teamFor = (seat) => DOMINION_TEAMS.find((team) => team.seats.includes(seat));
const teammates = (a, b) => !!teamFor(a) && teamFor(a) === teamFor(b);

// mobile/arctic-play/src/chaturangaLongDice.js
const LONG_DICE_PROFILE = "chaturanga-long-dice-v1";
const LONG_DICE_ACTION = "roll-long|control:roll-long";
const LONG_DICE_ROLES = Object.freeze({
	2: ["ship"],
	3: ["horse"],
	4: ["elephant"],
	5: ["king", "pawn"]
});
const HERITAGE_NAMES = Object.freeze({
	ship: "Boat",
	horse: "Knight",
	elephant: "Rook",
	king: "King",
	pawn: "Pawn"
});
const originalFace = {
	2: 4,
	3: 3,
	4: 2,
	5: 5
};
const seats = import_gameRules.default.PLAYERS;
const clone = (state) => ({
	...state,
	board: state.board.map((row) => row.map((p) => p ? { ...p } : null)),
	dice: {
		...state.dice,
		values: [...state.dice.values],
		used: [...state.dice.used]
	},
	royalCaptures: { ...state.royalCaptures },
	frozenTeams: [...state.frozenTeams || []],
	revivalAvailable: [...state.revivalAvailable || []],
	moveLog: [...state.moveLog || []]
});
const isLongDiceState = (state) => state?.rulesProfile === LONG_DICE_PROFILE;
const royal = (p, team) => p?.team === team && p.type === "king" && p.isRoyal !== false;
const hasKing = (state, team) => state.board.some((row) => row.some((p) => royal(p, team)));
const needsKingReturn = (state) => isLongDiceState(state) && state.revivalAvailable?.includes(state.turn) && !hasKing(state, state.turn);
function normalize(state) {
	const { updatedAt, ...next } = state;
	return {
		...next,
		turn: seats[next.currentPlayerIndex],
		selected: null,
		legalMoves: []
	};
}
function createLongDiceGame(options = {}) {
	const state = import_gameRules.default.createInitialGameState();
	state.board = state.board.map((row, r) => row.map((p, c) => p ? {
		...p,
		id: `${p.team}-${p.type}-${r}-${c}`
	} : null));
	return normalize({
		...state,
		rulesProfile: LONG_DICE_PROFILE,
		teamMode: options.teamMode === "2v2" ? "2v2" : "free-for-all",
		dice: {
			...state.dice,
			count: 2
		},
		mobileTurnNumber: 0,
		royalCaptures: Object.fromEntries(seats.map((s) => [s, 0])),
		frozenTeams: [],
		revivalAvailable: [],
		revivalPassRequired: false
	});
}
const control = (id, kind, raw) => ({
	id,
	kind,
	source: "control:" + kind,
	target: null,
	promote: false,
	raw
});
function longDiceActions(state) {
	if (state.gameOver || state.mobileResult) return [];
	if (needsKingReturn(state)) return state.board.flatMap((row, r) => row.flatMap((p, c) => p ? [] : [{
		id: `revive|control:revive|${r},${c}`,
		kind: "revive",
		source: "control:revive",
		target: `${r},${c}`,
		promote: false,
		raw: {
			row: r,
			col: c
		}
	}]));
	if (state.revivalPassRequired) return [control("end|control:end", "end", { kind: "end" })];
	if (!hasKing(state, state.turn)) return [];
	if (!state.dice.rolled) return [control(LONG_DICE_ACTION, "roll", {
		kind: "roll",
		count: 2
	}), control("skip|control:skip", "skip", { kind: "skip" })];
	const query = {
		...state,
		selected: null,
		legalMoves: [],
		dice: {
			...state.dice,
			values: state.dice.values.map((v) => originalFace[v] || null)
		}
	}, moves = [];
	for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
		const p = state.board[r][c];
		if (p?.team !== state.turn) continue;
		for (const move of import_gameRules.default.selectSquare(query, r, c).legalMoves) {
			const victim = state.board[move.toRow][move.toCol];
			if (state.teamMode === "2v2" && victim && teammates(p.team, victim.team)) continue;
			const source = `piece:${p.id}`, target = `${move.toRow},${move.toCol}`;
			moves.push({
				id: `move|${source}|${target}|die:${move.dieIndex}`,
				source,
				target,
				kind: "move",
				promote: false,
				raw: move
			});
		}
	}
	return [
		...moves,
		...state.dice.used.flatMap((used, index) => used ? [] : [control(`pass-die|control:pass-die:${index}`, "pass", { index })]),
		control("end|control:end", "end", { kind: "end" })
	];
}
function nextTurn(state) {
	let index = state.currentPlayerIndex;
	for (let i = 0; i < seats.length; i++) {
		index = (index + 1) % seats.length;
		if (hasKing(state, seats[index]) || state.revivalAvailable.includes(seats[index])) break;
	}
	return normalize({
		...state,
		currentPlayerIndex: index,
		mobileTurnNumber: (state.mobileTurnNumber || 0) + 1,
		dice: {
			rolled: false,
			values: [null, null],
			used: [false, false],
			count: 2
		},
		revivalPassRequired: false
	});
}
function checkWinner(state) {
	const alive = seats.filter((s) => hasKing(state, s));
	if (state.teamMode === "2v2") {
		const teams = DOMINION_TEAMS.filter((t) => t.seats.some((s) => alive.includes(s)));
		if (teams.length <= 1) return {
			...state,
			gameOver: true,
			winner: teams[0]?.seats[0] || null,
			winningTeam: teams[0]?.id || null,
			winningSeats: teams[0] ? [...teams[0].seats] : []
		};
	} else if (alive.length <= 1) return {
		...state,
		gameOver: true,
		winner: alive[0] || null
	};
	return state;
}
function randomFace() {
	const bytes = /* @__PURE__ */ new Uint8Array(1);
	globalThis.crypto.getRandomValues(bytes);
	return bytes[0] % 4 + 2;
}
function applyLongDice(state, actionOrId, verifiedRoll) {
	const id = typeof actionOrId === "string" ? actionOrId : actionOrId?.id;
	const action = longDiceActions(state).find((a) => a.id === id);
	if (!action) throw Error("This action is no longer legal.");
	let next = clone(state);
	if (action.kind === "roll") {
		if (verifiedRoll && (!Array.isArray(verifiedRoll.values) || verifiedRoll.values.length !== 2 || verifiedRoll.values.some((v) => !Number.isInteger(v) || v < 2 || v > 5))) throw Error("The verified long dice do not match this roll.");
		const values = verifiedRoll ? [...verifiedRoll.values] : [randomFace(), randomFace()];
		next.dice = {
			rolled: true,
			values,
			used: [false, false],
			count: 2
		};
		next.mobileLastRoll = {
			team: state.turn,
			values: [...values],
			count: 2,
			skipped: false
		};
		return normalize(next);
	}
	if (action.kind === "skip") {
		next.mobileLastSkip = {
			team: state.turn,
			turnNumber: state.mobileTurnNumber || 0
		};
		return nextTurn(next);
	}
	if (action.kind === "end") return nextTurn(next);
	if (action.kind === "pass") {
		next.dice.used[action.raw.index] = true;
		return next.dice.used.every(Boolean) ? nextTurn(next) : normalize(next);
	}
	if (action.kind === "revive") {
		const { row, col } = action.raw;
		next.board[row][col] = {
			id: `${state.turn}-royal-return-${state.royalCaptures[state.turn]}`,
			team: state.turn,
			type: "king",
			isRoyal: true
		};
		next.frozenTeams = next.frozenTeams.filter((s) => s !== state.turn);
		next.revivalAvailable = next.revivalAvailable.filter((s) => s !== state.turn);
		next.dice = {
			rolled: true,
			values: [null, null],
			used: [true, false],
			count: 2
		};
		next.revivalPassRequired = true;
		next.moveLog.unshift(`${import_gameRules.default.TEAM_LABEL[state.turn]} returned their King. Pass the second move.`);
		return normalize(next);
	}
	const m = action.raw, piece = next.board[m.fromRow][m.fromCol], victim = next.board[m.toRow][m.toCol];
	next.board[m.toRow][m.toCol] = piece;
	next.board[m.fromRow][m.fromCol] = null;
	next.dice.used[m.dieIndex] = true;
	next.moveLog.unshift(`${import_gameRules.default.TEAM_LABEL[piece.team]} ${victim ? "captured " + import_gameRules.default.TEAM_LABEL[victim.team] + " " + HERITAGE_NAMES[victim.type] : "moved " + HERITAGE_NAMES[piece.type]}`);
	if (piece.type === "pawn") {
		const promotion = import_gameRules.default.PROMOTION_PIECES[piece.team]?.[`${m.toRow},${m.toCol}`];
		if (promotion) {
			piece.type = promotion;
			piece.isRoyal = false;
			next.moveLog.unshift(`${import_gameRules.default.TEAM_LABEL[piece.team]} Pawn promoted to ${HERITAGE_NAMES[promotion]}`);
		}
	}
	if (victim && royal(victim, victim.team)) {
		next.royalCaptures[victim.team] = (next.royalCaptures[victim.team] || 0) + 1;
		if (!next.frozenTeams.includes(victim.team)) next.frozenTeams.push(victim.team);
		next.revivalAvailable = next.revivalAvailable.filter((s) => s !== victim.team);
		next.moveLog.unshift(`${import_gameRules.default.TEAM_LABEL[victim.team]} is frozen; their remaining pieces stay on the board.`);
		if (next.teamMode === "2v2") {
			const partner = teamFor(piece.team).seats.find((s) => s !== piece.team);
			if (next.frozenTeams.includes(partner) && next.royalCaptures[partner] === 1 && !next.revivalAvailable.includes(partner)) next.revivalAvailable.push(partner);
		}
	}
	next.moveLog = next.moveLog.slice(0, 8);
	next = checkWinner(next);
	if (next.gameOver) return normalize(next);
	return next.dice.used.every(Boolean) ? nextTurn(next) : normalize(next);
}
function longDiceResult(state) {
	if (state.mobileResult) return state.mobileResult;
	if (!state.gameOver) return null;
	return {
		winner: state.winner || null,
		winners: state.winningSeats,
		winningTeam: state.winningTeam,
		draw: !state.winner,
		reason: state.winningTeam ? "Both opposing royal kingdoms captured" : state.winner ? "Last surviving royal kingdom" : "No royal kingdom remains"
	};
}
function chooseLongDiceBot(state) {
	const legal = longDiceActions(state);
	if (!legal.length) return null;
	const roll = legal.find((a) => a.kind === "roll");
	if (roll) return roll.id;
	const revivals = legal.filter((a) => a.kind === "revive");
	if (revivals.length) return revivals.sort((a, b) => Math.min(a.raw.row, 7 - a.raw.row, a.raw.col, 7 - a.raw.col) - Math.min(b.raw.row, 7 - b.raw.row, b.raw.col, 7 - b.raw.col))[0].id;
	const moves = legal.filter((a) => a.kind === "move");
	if (moves.length) {
		const value = {
			king: 1e3,
			elephant: 10,
			horse: 5,
			ship: 3,
			pawn: 1
		};
		const score = (a) => (value[a.raw.captured?.type] || 0) * 100 + (Math.abs(a.raw.fromRow - 3.5) + Math.abs(a.raw.fromCol - 3.5) - Math.abs(a.raw.toRow - 3.5) - Math.abs(a.raw.toCol - 3.5)) * .2 + Math.random() * .15;
		return moves.map((a) => ({
			a,
			score: score(a)
		})).sort((a, b) => b.score - a.score)[0].a.id;
	}
	return legal.find((a) => a.kind === "end")?.id || legal[0].id;
}

exports.HERITAGE_NAMES = HERITAGE_NAMES;
exports.LONG_DICE_ACTION = LONG_DICE_ACTION;
exports.LONG_DICE_PROFILE = LONG_DICE_PROFILE;
exports.LONG_DICE_ROLES = LONG_DICE_ROLES;
exports.applyLongDice = applyLongDice;
exports.chooseLongDiceBot = chooseLongDiceBot;
exports.createLongDiceGame = createLongDiceGame;
exports.isLongDiceState = isLongDiceState;
exports.longDiceActions = longDiceActions;
exports.longDiceResult = longDiceResult;
exports.needsKingReturn = needsKingReturn;