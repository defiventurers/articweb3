import { useMemo, useState } from "react";
import { selectRoomTeam } from "../network/socketClient.js";

const OPTIONS = {
  retsba: { name: "RETSBA", team: "red" },
  abster: { name: "ABSTER", team: "green" },
  polly: { name: "POLLY", team: "yellow" },
  pengu: { name: "PENGU", team: "blue" }
};

export function TeamSelectScreen({ room, profile, onRoomUpdate, onContinue, onBack }) {
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const takenTeams = useMemo(() => {
    return new Set(
      (room.players || [])
        .filter((player) => player.wallet !== profile.wallet && player.team)
        .map((player) => player.team)
    );
  }, [room.players, profile.wallet]);

  function choose(id) {
    const option = OPTIONS[id];
    if (!option) return;
    if (takenTeams.has(option.team)) {
      setError(`${option.name} is already taken.`);
      return;
    }
    setSelected(id);
    setError("");
  }

  async function continueToWaitingRoom() {
    if (!selected) {
      setError("Choose a team first.");
      return;
    }

    try {
      setBusy(true);
      setError("");
      const updatedRoom = await selectRoomTeam({
        roomCode: room.roomCode,
        profile,
        team: OPTIONS[selected].team
      });
      onRoomUpdate(updatedRoom);
      onContinue(updatedRoom);
    } catch (err) {
      setError(err.message || "Could not select team.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="team-select-page" aria-label="Team select">
      <div className="team-select-stage">
        <img className="team-select-art" src="/assets/screens/team-select.png" alt="Choose your team" />

        <button className="team-select-hit hit-continue" aria-label="Continue" onClick={continueToWaitingRoom} disabled={busy} />

        {Object.entries(OPTIONS).map(([id, option]) => {
          const isSelected = selected === id;
          const isTaken = takenTeams.has(option.team);
          const stateClass = `${isSelected ? "selected" : ""} ${isTaken ? "taken" : ""}`;
          return (
            <div key={id}>
              <button
                className={`team-select-hit hit-${id}-team ${stateClass}`}
                aria-label={`Select ${option.name}`}
                disabled={busy || isTaken}
                onClick={() => choose(id)}
              />
              <button
                className={`team-select-hit hit-${id}-label ${stateClass}`}
                aria-label={`Select ${option.name}`}
                disabled={busy || isTaken}
                onClick={() => choose(id)}
              />
            </div>
          );
        })}

        <button className="team-select-back" onClick={onBack} disabled={busy}>Back</button>

        {(selected || error) && (
          <div className="team-select-status" aria-live="polite">
            {error || `Selected ${OPTIONS[selected].name}`}
          </div>
        )}
      </div>
    </section>
  );
}
