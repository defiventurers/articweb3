import { assertInvariant, createKhasiFishflowState } from "./rules.js";

export function createKhasiHandicapDrillState() {
  const state = createKhasiFishflowState({ mode: "drill" });
  state.rows.blue = [1, 0, 0, 0, 0, 0, 0];
  state.rows.coral = [0, 3, 0, 0, 0, 0, 0];
  state.active.blue = [true, false, false, false, false, false, false];
  state.active.coral = [true, true, false, false, false, false, false];
  state.stores = { blue: 31, coral: 29 };
  state.roundReserve = { blue: 4, coral: 2 };
  state.handicapTarget = { blue: 4, coral: 3 };
  state.partialPit = { blue: null, coral: 1 };
  state.currentPlayer = "blue";
  state.roundStarter = "blue";
  assertInvariant(state);
  return state;
}
