import { useState } from "react";

export default function UploadButton({ onUpload, uploading }) {
  const [fileName, setFileName] = useState("No file selected");

  const handleChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await onUpload(file);
      setFileName("Book uploaded");
    } catch (err) {
      setFileName(file.name);
      alert(err.message);
    }
  };

  return (
    <div className="file-upload">
      <div className="upload-icon">📁</div>
      <label htmlFor="upload" className="upload-btn">
        {uploading ? "Uploading..." : "Choose book (EPUB or PDF)"}
      </label>
      <input
        type="file"
        id="upload"
        accept=".epub,.pdf"
        onChange={handleChange}
        disabled={uploading}
      />
      <span id="file-name">{fileName}</span>
    </div>
  );
}
