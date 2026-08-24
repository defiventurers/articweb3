/* Arctic Dominion experience note: individual heritage games receive their own material, colour, and feedback layer; the main Arctic Dominion shell is intentionally excluded. */
export function HeritageExperienceFrame({ gameId, children }) {
  return (
    <div className="heritage-experience-frame" data-heritage-game={gameId}>
      <div className="heritage-atmosphere" aria-hidden="true" />
      {children}
    </div>
  );
}
