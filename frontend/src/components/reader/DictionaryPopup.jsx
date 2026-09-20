export default function DictionaryPopup({ selection, entry, loading, error, onClose }) {
  if (!selection) return null;

  const meanings = entry?.meanings || [];
  const phonetic = entry?.phonetic || entry?.phonetics?.find((item) => item.text)?.text;
  const audio = entry?.phonetics?.find((item) => item.audio)?.audio;
  const word = selection.text.split(/\s+/)[0];
  const examples = meanings.flatMap((meaning) =>
    (meaning.definitions || [])
      .filter((definition) => definition.example)
      .map((definition) => ({ partOfSpeech: meaning.partOfSpeech, text: definition.example }))
  ).slice(0, 3);
  const popupStyle = selection.anchor
    ? { left: `${selection.anchor.left}px`, top: `${selection.anchor.top}px` }
    : undefined;
  const popupClass = `dictionary-popup${selection.anchor ? " dictionary-popup--anchored" : ""}${selection.anchor?.above ? " dictionary-popup--above" : ""}`;

  return (
    <div className={popupClass} style={popupStyle} role="dialog" aria-label="Word definition">
      <button className="dictionary-popup__close" onClick={onClose} aria-label="Close">
        &times;
      </button>
      <strong>{word}</strong>
      {phonetic && <em className="dictionary-popup__pos"> {phonetic}</em>}
      {audio && (
        <audio className="dictionary-popup__audio" controls preload="none" src={audio.startsWith("//") ? `https:${audio}` : audio} />
      )}
      {loading && <p>Looking it up...</p>}
      {error && <p>{error}</p>}
      {!loading && !error && meanings.slice(0, 3).map((meaning) => (
        <section className="dictionary-popup__meaning" key={meaning.partOfSpeech}>
          {meaning.partOfSpeech && <em className="dictionary-popup__pos">{meaning.partOfSpeech}</em>}
          <ol>
            {(meaning.definitions || []).slice(0, 3).map((definition) => (
              <li key={definition.definition}>{definition.definition}</li>
            ))}
          </ol>
        </section>
      ))}
      {!loading && !error && examples.length > 0 && (
        <div className="dictionary-popup__examples">
          <strong>Examples</strong>
          {examples.map((example) => <p key={example.text}>“{example.text}”</p>)}
        </div>
      )}
    </div>
  );
}
