export default function ReaderControls({ onIncreaseFont, onDecreaseFont, theme, onThemeChange }) {
  return (
    <div className="reader-controls">
      <div className="control-group font-buttons">
        <label>Font</label>
        <button onClick={onDecreaseFont} aria-label="Decrease font size">A−</button>
        <button onClick={onIncreaseFont} aria-label="Increase font size">A+</button>
      </div>
      <div className="control-group reading-theme">
        <label>Theme</label>
        <select value={theme} onChange={(e) => onThemeChange(e.target.value)}>
          <option value="dark">Dark</option>
          <option value="light">Light</option>
          <option value="sepia">Sepia</option>
        </select>
      </div>
    </div>
  );
}
