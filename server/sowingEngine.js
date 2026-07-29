function cloneGameState(value) { return JSON.parse(JSON.stringify(value)); }
function sowOneLap({ route, startIndex, hand, read, write, onDrop, maxDrops = 20000 }) {
  if (!Array.isArray(route) || !route.length) throw new Error("Relay route cannot be empty.");
  if (!Number.isInteger(startIndex) || startIndex < 0 || startIndex >= route.length) throw new Error("Invalid relay start index.");
  let cursor = startIndex;
  let drops = 0;
  while (hand > 0) {
    drops += 1;
    if (drops > maxDrops) throw new Error("Relay sowing exceeded the safety limit.");
    cursor = (cursor + 1) % route.length;
    const slot = route[cursor];
    const nextCount = Number(read(slot) || 0) + 1;
    write(slot, nextCount);
    hand -= 1;
    if (onDrop) onDrop({ slot, cursor, count: nextCount, hand });
  }
  return { cursor, drops };
}
function sumCounters(values) { return (values || []).reduce((sum, value) => sum + Number(value || 0), 0); }
function assertConserved(total, expected, label = "counter") { if (total !== expected) throw new Error(`${label} invariant failed: expected ${expected}, received ${total}.`); return true; }
module.exports = { assertConserved, cloneGameState, sowOneLap, sumCounters };
