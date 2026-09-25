// Shared HUD-frame corner accents — used by the Outpost page, the homepage teaser,
// and the Community page's control panel so they read as the same "thing".
export default function OutpostCorners() {
  return (
    <>
      <span className="outpost-corner outpost-corner-tl" aria-hidden="true" />
      <span className="outpost-corner outpost-corner-tr" aria-hidden="true" />
      <span className="outpost-corner outpost-corner-bl" aria-hidden="true" />
      <span className="outpost-corner outpost-corner-br" aria-hidden="true" />
    </>
  );
}
