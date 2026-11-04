// frontend/src/components/ScanDocument.jsx
import { useRef, useState } from "react";
import { readDocument } from "../utils/readDocument";
import { parseCoverageText } from "../utils/parseCoverageText";

const FIELD_LABELS = {
    coverage_type: "coverage type",
    provider: "provider",
    policy_number: "policy number",
    start_date: "start date",
    end_date: "end date",
};

/* Small tag shown under each autofilled field */
export function ScanBadge({ meta, current }) {
    if (!meta) return null;

    let style, text;
    if (current !== meta.value) {
        style = { background: "#e5e7eb", color: "#374151" };
        text = "✎ Edited by you";
    } else if (meta.status === "read") {
        style = { background: "#dcfce7", color: "#166534" };
        text = "✓ Read from your document";
    } else {
        style = { background: "#fef3c7", color: "#92400e" };
        text = `⚠ Please double-check${meta.note ? ` — ${meta.note}` : ""}`;
    }

    return (
        <small
            style={{
                ...style,
                display: "inline-block",
                marginTop: 6,
                padding: "3px 9px",
                borderRadius: 8,
                fontSize: 11.5,
                fontWeight: 600,
                lineHeight: 1.4,
            }}
        >
            {text}
        </small>
    );
}

const btnBase = {
    font: "inherit",
    fontWeight: 700,
    fontSize: 14,
    borderRadius: 10,
    padding: "11px 18px",
    cursor: "pointer",
};
const primaryBtn = { ...btnBase, background: "#4f46e5", color: "#ffffff", border: "none" };
const secondaryBtn = { ...btnBase, background: "#ffffff", color: "#4338ca", border: "1.5px solid #c7d2fe" };

export default function ScanDocument({ asset, onResult }) {
    const [state, setState] = useState("idle"); // idle | working | done | error
    const [progress, setProgress] = useState({ percent: 0, message: "" });
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");
    const [dragOver, setDragOver] = useState(false);
    const fileRef = useRef(null);
    const cameraRef = useRef(null);

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    const handleFile = async (file) => {
        if (!file) return;

        const okType =
            /^image\/(jpeg|png|webp)$/.test(file.type) ||
            file.type === "application/pdf" ||
            /\.(jpe?g|png|webp|pdf)$/i.test(file.name);

        if (!okType) {
            setError("Please choose a JPG, PNG or PDF file.");
            setState("error");
            return;
        }

        setState("working");
        setError("");
        setProgress({ percent: 1, message: "Starting…" });

        try {
            const doc = await readDocument(file, setProgress);

            if (doc.text.replace(/\s/g, "").length < 25) {
                setError(
                    "We couldn't read any text. Try a clearer photo in good light with the whole document in frame, or enter the details manually."
                );
                setState("error");
                return;
            }

            const parsed = parseCoverageText(doc.text, asset);
            const full = {
                ...parsed,
                file: doc.attachment,
                text: doc.text,
                preview: doc.preview,
                kind: doc.kind,
                warning: doc.warning,
            };

            setResult(full);
            setState("done");
            onResult(full);
        } catch (err) {
            console.error("Scan error:", err);
            setError("Something went wrong while reading the document. You can still enter the details manually.");
            setState("error");
        }
    };

    const onPick = (e) => {
        const file = e.target.files?.[0];
        e.target.value = ""; // lets the same file be chosen again
        handleFile(file);
    };

    const card = {
        border: `1.5px dashed ${dragOver ? "#4f46e5" : "#a5b4fc"}`,
        background: "linear-gradient(135deg, #eef2ff, #f5f3ff)",
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        color: "#1e1b4b",
    };

    return (
        <div
            style={card}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (state !== "working") handleFile(e.dataTransfer.files?.[0]);
            }}
        >
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={onPick} hidden />
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={onPick} hidden />

            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <strong style={{ fontSize: 17 }}>✨ Autofill from your document</strong>
                <span style={{ background: "#4f46e5", color: "#fff", fontSize: 10, fontWeight: 800, letterSpacing: 1, padding: "3px 8px", borderRadius: 999 }}>
                    NEW
                </span>
            </div>

            {state === "idle" && (
                <>
                    <p style={{ margin: "8px 0 14px", fontSize: 14, lineHeight: 1.55, color: "#4338ca" }}>
                        Scan or upload your warranty card, policy or invoice. SmartVault reads it and fills in the form
                        below. You will check everything before saving, or you can skip this and type the details yourself.
                    </p>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {isMobile && (
                            <button type="button" style={primaryBtn} onClick={() => cameraRef.current?.click()}>
                                📷 Scan with camera
                            </button>
                        )}
                        <button type="button" style={isMobile ? secondaryBtn : primaryBtn} onClick={() => fileRef.current?.click()}>
                            ⬆ Upload photo or PDF
                        </button>
                    </div>
                    <small style={{ display: "block", marginTop: 12, color: "#6366f1" }}>
                        {isMobile ? "" : "You can also drag a file onto this box. "}
                        🔒 The document is read on your device and only uploaded when you save.
                    </small>
                </>
            )}

            {state === "working" && (
                <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 14, marginBottom: 8 }}>{progress.message}</div>
                    <div style={{ height: 10, background: "#ddd6fe", borderRadius: 999, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${progress.percent}%`, background: "#4f46e5", transition: "width .3s" }} />
                    </div>
                    <small style={{ display: "block", marginTop: 8, color: "#6366f1" }}>
                        This takes a few seconds. The first time can take longer while the reader downloads.
                    </small>
                </div>
            )}

            {state === "error" && (
                <div style={{ marginTop: 12 }}>
                    <div style={{ background: "#fee2e2", color: "#991b1b", padding: "10px 14px", borderRadius: 10, fontSize: 14 }}>
                        {error}
                    </div>
                    <button type="button" style={{ ...secondaryBtn, marginTop: 12 }} onClick={() => setState("idle")}>
                        Try again
                    </button>
                </div>
            )}

            {state === "done" && result && (
                <div style={{ marginTop: 14 }}>
                    <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
                        {result.preview ? (
                            <img src={result.preview} alt="Scanned document" style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 10, border: "1px solid #c7d2fe" }} />
                        ) : (
                            <div style={{ width: 84, height: 84, display: "grid", placeItems: "center", fontSize: 34, background: "#fff", borderRadius: 10, border: "1px solid #c7d2fe" }}>📄</div>
                        )}

                        <div style={{ flex: 1, minWidth: 220 }}>
                            <strong style={{ fontSize: 15 }}>
                                Read {result.foundCount} of 5 details from your document
                            </strong>
                            <p style={{ margin: "6px 0", fontSize: 13.5, lineHeight: 1.55, color: "#4338ca" }}>
                                Check the highlighted fields below, fix anything that is wrong, then confirm before saving.
                                Dates are read as day / month / year.
                            </p>
                            {result.missing.length > 0 && (
                                <p style={{ margin: "6px 0", fontSize: 13, color: "#92400e" }}>
                                    Could not find: {result.missing.map((k) => FIELD_LABELS[k]).join(", ")}. Please fill these in.
                                </p>
                            )}
                            {result.notes.map((n) => (
                                <p key={n} style={{ margin: "6px 0", fontSize: 13, color: "#92400e" }}>{n}</p>
                            ))}
                            {result.warning && (
                                <p style={{ margin: "6px 0", fontSize: 13, color: "#991b1b" }}>{result.warning}</p>
                            )}
                        </div>
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                        <button type="button" style={secondaryBtn} onClick={() => setState("idle")}>
                            Scan a different document
                        </button>
                    </div>

                    <details style={{ marginTop: 12 }}>
                        <summary style={{ cursor: "pointer", fontSize: 13, color: "#4338ca" }}>Show the text we read</summary>
                        <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, background: "#fff", border: "1px solid #c7d2fe", borderRadius: 10, padding: 12, maxHeight: 220, overflow: "auto", color: "#374151" }}>
                            {result.text.trim()}
                        </pre>
                    </details>
                </div>
            )}
        </div>
    );
}