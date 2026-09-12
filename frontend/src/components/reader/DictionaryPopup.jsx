export default function DictionaryPopup({ selection, entry, loading, error, onClose }) {
  if (!selection) return null;

  const definition = entry?.meanings?.[0]?.definitions?.[0]?.definition;
  const partOfSpeech = entry?.meanings?.[0]?.partOfSpeech;
  const word = selection.text.split(/\s+/)[0];

  return (
    <div className="dictionary-popup" role="dialog" aria-label="Word definition">
      <button className="dictionary-popup__close" onClick={onClose} aria-label="Close">
        &times;
      </button>
      <strong>{word}</strong>
      {partOfSpeech && <em className="dictionary-popup__pos"> {partOfSpeech}</em>}
      {loading && <p>Looking it up...</p>}
      {error && <p>No definition found.</p>}
      {definition && <p>{definition}</p>}
    </div>
  );
}
