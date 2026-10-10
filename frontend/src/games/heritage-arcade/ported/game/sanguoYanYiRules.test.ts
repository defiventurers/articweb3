import { describe, expect, it } from "vitest";
import { agreeYanYiDraw, applyYanYiMove, chooseYanYiBotMove, createYanYiState, inYanYiBoard, legalYanYiTargets, nextYanYiFaction, pseudoYanYiTargets, resignYanYi, validYanYiSave, yanYiCoordinate, yanYiElephantPoints, yanYiFile, yanYiHorseRoute, yanYiIsInCheck, yanYiLegalActions, yanYiPositionKey, YAN_YI_FACTIONS, YAN_YI_POINTS, type YanYiFaction, type YanYiPiece, type YanYiRole, type YanYiState } from "./sanguoYanYiRules";
const p = (id: string, owner: YanYiFaction | null, role: YanYiRole, x: number, y: number, origin: YanYiPiece["origin"] = owner || "han"): YanYiPiece => ({ id, owner, role, x, y, origin });
const kings = () => [p("bk", "blue", "king", 8, 0), p("gk", "green", "king", 16, 8), p("rk", "red", "king", 8, 16)];
const position = (pieces: YanYiPiece[], turn: YanYiFaction = "blue", extra: Partial<YanYiState> = {}): YanYiState => ({ ...createYanYiState(), pieces: [...kings(), ...pieces], turn, opening: { blue: true, green: true, red: true }, ply: 6, ...extra });
const includes = (targets: { x: number; y: number }[], x: number, y: number) => targets.some(p => p.x === x && p.y === y);
const han = () => createYanYiState().pieces.filter(p => p.origin === "han");
describe("Yan Yi cross and starting position", () => {
  it("has exactly 225 unique playable intersections, excludes every blank corner", () => {
    expect(YAN_YI_POINTS).toHaveLength(225); expect(new Set(YAN_YI_POINTS.map(p => `${p.x},${p.y}`)).size).toBe(225);
    for (const [x, y] of [[0, 0], [3, 3], [13, 3], [3, 13], [16, 16], [-1, 8], [8, 17]]) expect(inYanYiBoard({ x, y })).toBe(false);
    expect(inYanYiBoard({ x: 4, y: 3 })).toBe(true); expect(inYanYiBoard({ x: 3, y: 4 })).toBe(true);
  });
  it("starts Wu first with 16 pieces per player and five inactive Han pieces", () => {
    const s = createYanYiState(); expect(s.turn).toBe("green"); expect(s.pieces).toHaveLength(53);
    YAN_YI_FACTIONS.forEach(f => expect(s.pieces.filter(p => p.owner === f)).toHaveLength(16)); expect(han()).toHaveLength(5); expect(validYanYiSave(s)).toBe(true);
    expect(s.pieces.find(p => p.owner === "green" && p.role === "king")).toMatchObject({ x: 16, y: 8 });
    expect(nextYanYiFaction("green", [])).toBe("blue"); expect(nextYanYiFaction("blue", [])).toBe("red"); expect(nextYanYiFaction("red", [])).toBe("green");
  });
  it("uses controller coordinates and King file 9, Chariot files 5 and 13", () => {
    const s = createYanYiState(); for (const f of YAN_YI_FACTIONS) {
      expect(yanYiFile(f, s.pieces.find(p => p.owner === f && p.role === "king")!)).toBe(9);
      expect(s.pieces.filter(p => p.owner === f && p.role === "chariot").map(p => yanYiFile(f, p)).sort((a, b) => a - b)).toEqual([5, 13]);
    }
    expect(yanYiCoordinate("green", { x: 3, y: 6 })).toContain("file 11");
  });
});
describe("movement and blocking", () => {
  it("does not import Xiangqi flying-General prohibition", () => {
    const s = position([]); expect(yanYiIsInCheck(s, "blue")).toBe(false); expect(yanYiIsInCheck(s, "red")).toBe(false);
    expect(includes(legalYanYiTargets(s, s.pieces[0]), 8, 1)).toBe(true);
  });
  it("keeps Kings in their own nine-point palace", () => { const s = position([]); expect(legalYanYiTargets(s, s.pieces[0]).every(p => p.x >= 7 && p.x <= 9 && p.y <= 2)).toBe(true); });
  it("Chariots stop at pieces, cannot capture friends or inactive Han", () => {
    const r = p("r", "blue", "chariot", 7, 6), s = position([r, p("friend", "blue", "soldier", 7, 8), p("neutral", null, "chariot", 3, 6), p("enemy", "red", "horse", 10, 6)]);
    const t = pseudoYanYiTargets(s, r); expect(includes(t, 7, 7)).toBe(true); expect(includes(t, 7, 8)).toBe(false); expect(includes(t, 7, 9)).toBe(false); expect(includes(t, 3, 6)).toBe(false); expect(includes(t, 10, 6)).toBe(true); expect(includes(t, 11, 6)).toBe(false);
  });
  it("Cannon capture requires exactly one screen, including neutral Han", () => {
    const c = p("c", "blue", "cannon", 7, 6), enemy = p("enemy", "green", "chariot", 1, 6);
    expect(includes(pseudoYanYiTargets(position([c, enemy]), c), 1, 6)).toBe(false);
    const screen = p("neutral", null, "chariot", 3, 6);
    expect(includes(pseudoYanYiTargets(position([c, screen, enemy]), c), 1, 6)).toBe(true);
    expect(includes(pseudoYanYiTargets(position([c, screen, enemy, p("other", "red", "soldier", 2, 6)]), c), 1, 6)).toBe(false);
  });
  it("first full round Cannon stays behind the defensive line, later moves are unrestricted", () => {
    const s = createYanYiState(), c = s.pieces.find(p => p.owner === "green" && p.role === "cannon")!;
    expect(includes(pseudoYanYiTargets(s, c), 13, c.y)).toBe(true); expect(includes(pseudoYanYiTargets(s, c), 12, c.y)).toBe(false);
    expect(includes(pseudoYanYiTargets({ ...s, ply: 3 }, c), 12, c.y)).toBe(true);
  });
  it("Horse ignores occupied leg but cannot cross the excluded corner", () => {
    const h = p("h", "blue", "horse", 8, 8), s = position([h, p("leg", "red", "soldier", 9, 8)]);
    expect(includes(pseudoYanYiTargets(s, h), 10, 9)).toBe(true);
    expect(yanYiHorseRoute({ x: 3, y: 4 }, { x: 4, y: 2 })).toBe(false);
    expect(yanYiHorseRoute({ x: 2, y: 4 }, { x: 4, y: 3 })).toBe(false);
    expect(yanYiHorseRoute({ x: 4, y: 3 }, { x: 3, y: 5 })).toBe(true);
  });
  it("Elephants ignore their eyes, stay on seven home points and cannot capture across an enemy boundary", () => {
    const e = p("e", "blue", "elephant", 6, 0), s = position([e, p("eye", "blue", "soldier", 7, 1)]);
    expect(includes(pseudoYanYiTargets(s, e), 8, 2)).toBe(true); expect(yanYiElephantPoints("blue")).toHaveLength(7);
    const border = p("e2", "blue", "elephant", 10, 4); expect(includes(pseudoYanYiTargets(position([border]), border), 12, 6)).toBe(false);
  });
  it("Soldiers move sideways from the opening; cannot retreat inside their own boundary", () => {
    const soldier = p("s", "blue", "soldier", 8, 3), s = position([soldier]);
    expect(includes(pseudoYanYiTargets(s, soldier), 7, 3)).toBe(true); expect(includes(pseudoYanYiTargets(s, soldier), 8, 4)).toBe(true); expect(includes(pseudoYanYiTargets(s, soldier), 8, 2)).toBe(false);
    const outside = { ...soldier, y: 5 }; expect(includes(pseudoYanYiTargets(position([outside]), outside), 8, 4)).toBe(true);
    const boundary = { ...soldier, y: 4 }; expect(includes(pseudoYanYiTargets(position([boundary]), boundary), 8, 3)).toBe(false);
  });
  it("inherited Soldiers use their new controller, including inside enemy territory", () => {
    const soldier = p("s", "blue", "soldier", 8, 3, "green"), s = position([soldier]);
    expect(includes(pseudoYanYiTargets(s, soldier), 8, 2)).toBe(false); expect(includes(pseudoYanYiTargets(s, soldier), 8, 4)).toBe(true);
    const enemyCamp = { ...soldier, y: 14 }; expect(includes(pseudoYanYiTargets(position([enemyCamp]), enemyCamp), 8, 13)).toBe(true);
  });
});
describe("Han activation and alliances", () => {
  it.each(YAN_YI_FACTIONS)("%s captures retain the attacker's identity when the destination is an occupied piece", owner => {
    const enemy = YAN_YI_FACTIONS.find(f => f !== owner)!;
    const attacker = p("attacker", owner, "chariot", 7, 7), victim = p("victim", enemy, "horse", 7, 9);
    const s = position([attacker, victim], owner);
    const next = applyYanYiMove(s, attacker.id, victim)!;
    expect(next).not.toBeNull();
    expect(next.pieces.find(p => p.id === attacker.id)).toEqual({ ...attacker, x: 7, y: 9 });
    expect(next.pieces.some(p => p.id === victim.id)).toBe(false);
    expect(next.pieces).toHaveLength(s.pieces.length - 1);
    expect(next.events.at(-1)).toMatchObject({ actor: owner, pieceId: attacker.id, capture: "horse", to: { x: 7, y: 9 } });
    expect(Object.keys(next.events.at(-1)!.to!)).toEqual(["x", "y"]);
  });
  it("red's occupied-piece regicide preserves its Horse and lets both red and inherited Han capture allied rivals", () => {
    const horse = p("red-horse", "red", "horse", 2, 7);
    const redR = p("red-chariot", "red", "chariot", 7, 7);
    const blueTarget = p("blue-target", "blue", "soldier", 6, 6);
    const greenTarget = p("green-target", "green", "horse", 7, 9);
    const s = position([...han(), horse, redR, blueTarget, greenTarget], "red");
    const emperor = s.pieces.find(p => p.role === "emperor")!;
    const activated = applyYanYiMove(s, horse.id, emperor)!;
    expect(activated.pieces.find(p => p.id === horse.id)).toEqual({ ...horse, x: 0, y: 8 });
    expect(activated.hanOwner).toBe("red"); expect(activated.alliance).toEqual(["green", "blue"]);
    for (const [attackerId, victim] of [["han-chariot-6", blueTarget], [redR.id, greenTarget]] as const) {
      const turn = { ...activated, turn: "red" as const };
      const attacker = turn.pieces.find(p => p.id === attackerId)!;
      expect(includes(legalYanYiTargets(turn, attacker), victim.x, victim.y)).toBe(true);
      const captured = applyYanYiMove(turn, attacker.id, victim)!;
      expect(captured.pieces.find(p => p.id === attacker.id)).toEqual({ ...attacker, x: victim.x, y: victim.y });
      expect(captured.pieces.some(p => p.id === victim.id)).toBe(false);
    }
  });
  it("Horse landing on another faction's point forces alliance and gives Han to the third", () => {
    const h = p("h", "blue", "horse", 2, 6), s = position([...han(), h]);
    const next = applyYanYiMove(s, h.id, { x: 0, y: 7 })!; expect(next).not.toBeNull(); expect(next.alliance).toEqual(["blue", "red"]); expect(next.hanOwner).toBe("green"); expect(next.pieces.filter(p => p.origin === "han")).toHaveLength(4); expect(next.pieces.filter(p => p.origin === "han").every(p => p.owner === "green")).toBe(true);
  });
  it("own alliance point has no effect", () => { const h = p("h", "blue", "horse", 2, 10), next = applyYanYiMove(position([...han(), h]), h.id, { x: 0, y: 9 })!; expect(next.activationUsed).toBe(false); expect(next.hanOwner).toBeNull(); });
  it("only a Horse captures the inactive Emperor, receives Han and unites the two rivals", () => {
    const h = p("h", "blue", "horse", 2, 7), s = position([...han(), h]); const next = applyYanYiMove(s, h.id, { x: 0, y: 8 })!;
    expect(next.hanOwner).toBe("blue"); expect(next.alliance).toEqual(["green", "red"]); expect(next.pieces.some(p => p.role === "emperor")).toBe(false);
    const r = p("r", "blue", "chariot", 0, 5); expect(includes(pseudoYanYiTargets(position([...han(), r]), r), 0, 8)).toBe(false);
  });
  it("activation happens only once and active Han units can then be captured", () => {
    const h = p("h", "blue", "horse", 2, 6), s = position([h, ...han().filter(p => p.role !== "emperor").map(p => ({ ...p, owner: "green" as const }))], "blue", { activationUsed: true, hanOwner: "green", alliance: ["blue", "red"] });
    const next = applyYanYiMove(s, h.id, { x: 0, y: 7 })!; expect(next.hanOwner).toBe("green"); expect(next.alliance).toEqual(["blue", "red"]);
    const r = p("r", "blue", "chariot", 7, 6); expect(includes(pseudoYanYiTargets({ ...s, pieces: [...s.pieces, r] }, r), 3, 6)).toBe(true);
  });
  it("an alliance can answer check, and allies cannot capture or check each other", () => {
    const h = p("h", "blue", "horse", 2, 6), redR = p("rr", "red", "chariot", 8, 5), s = position([...han(), h, redR]);
    expect(yanYiIsInCheck(s, "blue")).toBe(true); expect(includes(legalYanYiTargets(s, h), 0, 7)).toBe(true);
    const next = applyYanYiMove(s, h.id, { x: 0, y: 7 })!; expect(yanYiIsInCheck(next, "blue")).toBe(false);
    const blueR = p("br", "blue", "chariot", 7, 5); expect(includes(pseudoYanYiTargets({ ...next, pieces: [...next.pieces, blueR] }, blueR), 8, 5)).toBe(false);
  });
  it("rejects moving an allied shield away from an ally's king", () => {
    const shield = p("shield", "red", "chariot", 8, 4), s = position([shield, p("enemy", "green", "chariot", 8, 8), p("guard", "red", "advisor", 8, 15)], "red", { alliance: ["red", "blue"], activationUsed: true, hanOwner: "green" });
    expect(yanYiIsInCheck(s, "blue")).toBe(false); expect(includes(legalYanYiTargets(s, shield), 9, 4)).toBe(false); expect(includes(legalYanYiTargets(s, shield), 8, 3)).toBe(true);
  });
});
describe("check, inheritance and endings", () => {
  it("a checked previous seat immediately replies, then the checking player goes again", () => {
    const r = p("r", "blue", "chariot", 13, 6), s = position([r]); const checked = applyYanYiMove(s, r.id, { x: 13, y: 8 })!;
    expect(checked.turn).toBe("green"); expect(yanYiIsInCheck(checked, "green")).toBe(true);
    const reply = applyYanYiMove(checked, "gk", { x: 16, y: 7 })!; expect(reply.turn).toBe("blue");
  });
  it("active Kings cannot be captured directly and self-check moves are rejected", () => {
    const r = p("r", "blue", "chariot", 13, 8), s = position([r]); expect(includes(pseudoYanYiTargets(s, r), 16, 8)).toBe(true); expect(includes(legalYanYiTargets(s, r), 16, 8)).toBe(false);
    const shield = p("shield", "blue", "chariot", 8, 4), enemy = p("enemy", "red", "chariot", 8, 8); expect(includes(legalYanYiTargets(position([shield, enemy]), shield), 9, 4)).toBe(false);
  });
  it("checkmate removes the king immediately, inherits remaining units, dissolves the alliance", () => {
    const r = p("mover", "blue", "chariot", 13, 6), army = [r, p("r1", "blue", "chariot", 14, 7), p("r2", "blue", "chariot", 14, 9), p("gh", "green", "horse", 16, 4)];
    const s = position(army, "blue", { alliance: ["blue", "red"], hanOwner: "green", activationUsed: true });
    const next = applyYanYiMove(s, r.id, { x: 13, y: 8 })!; expect(next.defeated).toContain("green"); expect(next.pieces.some(p => p.id === "gk")).toBe(false); expect(next.pieces.find(p => p.id === "gh")?.owner).toBe("blue"); expect(next.claims.green).toBe("blue"); expect(next.alliance).toBeNull(); expect(next.hanOwner).toBe("blue");
  });
  it("credits the direct checking faction when the mover only supplies a Cannon screen", () => {
    const h = p("screen", "blue", "horse", 12, 6), s = position([h, p("r1", "red", "chariot", 14, 7), p("r2", "red", "chariot", 14, 9), p("c", "red", "cannon", 10, 8)]);
    const next = applyYanYiMove(s, h.id, { x: 13, y: 8 })!; expect(next.defeated).toContain("green"); expect(next.claims.green).toBe("red");
  });
  it("keeps the proposed early-conquest Han rule off unless selected", () => {
    const r = p("mover", "blue", "chariot", 13, 6), pieces = [...han(), r, p("r1", "blue", "chariot", 14, 7), p("r2", "blue", "chariot", 14, 9)];
    const normal = applyYanYiMove(position(pieces), r.id, { x: 13, y: 8 })!; expect(normal.hanOwner).toBeNull();
    const option = applyYanYiMove(position(pieces, "blue", { options: { checkLimit: 6, balanceHan: true } }), r.id, { x: 13, y: 8 })!; expect(option.hanOwner).toBe("red"); expect(option.alliance).toBeNull();
  });
  it("permits inherited Advisor transfers only to EMPTY legal palace points, one move", () => {
    const guard = p("ga", "blue", "advisor", 16, 7, "green"), s = position([guard], "blue", { claims: { blue: "blue", green: "blue", red: "red" }, defeated: ["green"] });
    expect(includes(legalYanYiTargets(s, guard), 7, 0)).toBe(true); expect(includes(legalYanYiTargets(s, guard), 8, 0)).toBe(false); expect(includes(legalYanYiTargets(s, guard), 7, 1)).toBe(false);
    const next = applyYanYiMove(s, guard.id, { x: 7, y: 0 })!; expect(next.pieces.find(p => p.id === guard.id)).toMatchObject({ x: 7, y: 0 }); expect(next.ply).toBe(s.ply + 1);
  });
  it("inherited Elephants use controlled neighboring points and the Han route, never enemy Wu", () => {
    const e = p("e", "blue", "elephant", 10, 4), s = position([e], "blue", { claims: { blue: "blue", green: "blue", red: "red" }, defeated: ["green"] }); expect(includes(pseudoYanYiTargets(s, e), 12, 6)).toBe(true);
    const left = p("e2", "blue", "elephant", 6, 4), opposite = position([left], "blue", { claims: { blue: "blue", green: "green", red: "blue" }, defeated: ["red"] }); expect(includes(pseudoYanYiTargets(opposite, left), 4, 6)).toBe(false); expect(includes(pseudoYanYiTargets({ ...opposite, hanOwner: "blue" }, left), 4, 6)).toBe(true);
  });
  it("resignation retains the face-down king and all pieces as capturable inactive screens", () => {
    const s = createYanYiState(), next = resignYanYi(s, "green")!; expect(next.pieces).toHaveLength(53); expect(next.pieces.filter(p => p.owner === "green").every(p => p.inactive)).toBe(true); expect(next.turn).toBe("blue"); expect(next.defeated).toContain("green");
    const r = p("r", "blue", "chariot", 15, 8), captureState = { ...next, pieces: [...next.pieces.filter(p => p.x !== 15 || p.y !== 8), r] }; expect(includes(legalYanYiTargets(captureState, r), 16, 8)).toBe(true);
  });
  it("requires all surviving approvals for a draw and skips defeated seats", () => { const s = createYanYiState(); expect(agreeYanYiDraw(s, ["green", "blue"])).toBeNull(); expect(agreeYanYiDraw(s, [...YAN_YI_FACTIONS])?.draw).toBe(true); expect(nextYanYiFaction("blue", ["red"])).toBe("green"); });
  it("repeated checks against the previous seat forfeit after the selected warning limit", () => {
    const r = p("r", "blue", "chariot", 13, 6), s = position([r]); const samePosition = { ...s, pieces: s.pieces.map(p => p.id === r.id ? { ...p, x: 13, y: 8 } : p) };
    s.checks.blue = { target: "green", count: 6, positions: [yanYiPositionKey(samePosition)] };
    const next = applyYanYiMove(s, r.id, { x: 13, y: 8 })!; expect(next.defeated).toContain("blue"); expect(next.pieces.find(p => p.id === r.id)?.owner).toBe("green");
  });
  it("a distinct forcing check does not forfeit, and checks against the next seat are permitted", () => {
    const r = p("r", "blue", "chariot", 13, 6), s = position([r]); s.checks.blue = { target: "green", count: 9, positions: ["different position"] };
    const next = applyYanYiMove(s, r.id, { x: 13, y: 8 })!; expect(next.defeated).not.toContain("blue"); expect(next.checks.blue.count).toBe(1);
    const redCheck = p("r2", "blue", "chariot", 6, 12), nextSeat = position([redCheck]); const allowed = applyYanYiMove(nextSeat, redCheck.id, { x: 8, y: 12 })!; expect(allowed.turn).toBe("red"); expect(allowed.checks.blue.count).toBe(0);
  });
  it("last surviving kingdom wins, including after resignation", () => { let s = createYanYiState(); s = resignYanYi(s, "green")!; s = resignYanYi(s, "red")!; expect(s.winner).toBe("blue"); expect(applyYanYiMove(s, "blue-horse-1", { x: 4, y: 2 })).toBeNull(); });
  it("rejects invalid saves and a bot always returns a legal action", () => {
    const s = createYanYiState(); expect(validYanYiSave({ ...s, version: "legacy" })).toBe(false); expect(validYanYiSave({ ...s, pieces: [...s.pieces, s.pieces[0]] })).toBe(false);
    const action = chooseYanYiBotMove(s, "medium", () => .5)!; expect(action).not.toBeNull(); expect(yanYiLegalActions(s)).toContainEqual(action); expect(applyYanYiMove(s, action.pieceId, action.to)).not.toBeNull();
  });
});
