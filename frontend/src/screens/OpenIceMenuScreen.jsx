export function OpenIceMenuScreen({ onCreateRoom, onJoinRoom, onBack }) {
  return (
    <section className="open-ice-image-page">
      <div className="open-ice-image-stage open-ice-menu-stage">
        <img className="open-ice-screen-art" src="/assets/screens/open-ice.png" alt="Open Ice" />

        <button className="open-ice-hit open-ice-menu-create-hit" onClick={onCreateRoom} />
        <button className="open-ice-hit open-ice-menu-join-hit" onClick={onJoinRoom} />
        <button className="open-ice-hit open-ice-menu-back-hit" onClick={onBack} />
      </div>
    </section>
  );
}
