export default function NavigationControls({ pageInfo, onPrev, onNext }) {
  return (
    <div className="navigation-controls">
      <button className="nav-btn" onClick={onPrev}>← Previous</button>
      <span>{pageInfo.current ? `${pageInfo.current} / ${pageInfo.total}` : ""}</span>
      <button className="nav-btn" onClick={onNext}>Next →</button>
    </div>
  );
}
