import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const fmtDate = (d) =>
    d
        ? new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
              day: "numeric", month: "short", year: "numeric",
          })
        : "—";

const kindOf = (type = "") => {
    const t = type.toLowerCase();
    if (t.includes("extended")) return "extended";
    if (t.includes("insur") || t.includes("damage") || t.includes("protection")) return "protection";
    if (t.includes("warranty")) return "warranty";
    return "other";
};

const explainOverlap = (o) => {
    const k1 = kindOf(o.coverage_1_type);
    const k2 = kindOf(o.coverage_2_type);
    const pair = [k1, k2].sort().join("+");

    let verdict, tone, why;
    if (pair === "protection+warranty") {
        verdict = "Usually complementary"; tone = "ok";
        why = "A manufacturer warranty typically covers defects, while accidental-damage or insurance plans cover drops, spills and theft. They often start on the same day, so overlapping dates are normal here.";
    } else if (pair === "extended+warranty") {
        verdict = "Check the start date"; tone = "warn";
        why = "An extended warranty normally begins when the manufacturer warranty ends. If both run together, the extended plan may have started early, or a date was entered incorrectly. You could be paying for months you cannot use yet.";
    } else if (k1 === k2) {
        verdict = "Likely duplicate"; tone = "bad";
        why = "Two plans of the same type usually cover the same risks, so you may be paying twice for the same protection.";
    } else {
        verdict = "Worth reviewing"; tone = "warn";
        why = "Two plans are active at the same time. They may protect against different things or repeat each other. Only the policy terms can tell you which.";
    }

    const hasDates = o.coverage_1_start && o.coverage_1_end && o.coverage_2_start && o.coverage_2_end;
    let shape = "";
    let firstEnding = null;

    if (hasDates) {
        const c1Inside = o.coverage_1_start >= o.coverage_2_start && o.coverage_1_end <= o.coverage_2_end;
        const c2Inside = o.coverage_2_start >= o.coverage_1_start && o.coverage_2_end <= o.coverage_1_end;
        if (c1Inside && c2Inside) shape = "Both plans run for exactly the same period.";
        else if (c1Inside) shape = `${o.coverage_1_type} falls entirely within ${o.coverage_2_type}.`;
        else if (c2Inside) shape = `${o.coverage_2_type} falls entirely within ${o.coverage_1_type}.`;
        else shape = "They only partly overlap: one starts before the other ends.";

        firstEnding = o.coverage_1_end <= o.coverage_2_end
            ? { type: o.coverage_1_type, date: o.coverage_1_end }
            : { type: o.coverage_2_type, date: o.coverage_2_end };
    }

    const steps = [
        "Open the documents for both plans (see the Document Vault below) and compare exactly what each one covers and excludes.",
    ];
    if (pair === "extended+warranty") {
        steps.push("Check the extended plan's terms: does it start on the purchase date or when the manufacturer warranty ends? If it started early, ask the seller whether the start date can be shifted.");
    }
    steps.push(
        tone === "ok"
            ? "If the benefits are different (for example defects vs accidents), keeping both is reasonable. No action is needed."
            : "If the benefits repeat, contact the provider of the newer or costlier plan and ask about cancellation or a refund. Some plans only allow this within a short window, so do it soon."
    );
    if (firstEnding) {
        steps.push(`${firstEnding.type} ends on ${fmtDate(firstEnding.date)}. Decide before then whether to renew it or let it lapse.`);
    }
    steps.push("If any date looks wrong, edit the coverage record. The analysis updates automatically.");

    return { verdict, tone, why, shape, steps };
};

const colors = { ok: "#22c55e", warn: "#f59e0b", bad: "#ef4444" };

const btn = {
    background: "transparent", color: "#f9fafb", border: "1px solid #6b7280",
    borderRadius: 8, padding: "8px 14px", cursor: "pointer", font: "inherit",
};

function OverlapExplainer({ assetId }) {
    const navigate = useNavigate();
    const [overlaps, setOverlaps] = useState([]);
    const [status, setStatus] = useState("loading"); // loading | ok | error
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const res = await fetch(
                    `http://localhost:5000/api/coverage/asset/${assetId}/overlaps`,
                    { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
                );
                const data = await res.json();
                if (cancelled) return;

                if (!res.ok) {
                    setErrorMsg(data.message || "Failed to load overlaps.");
                    setStatus("error");
                    return;
                }
                setOverlaps(data.overlaps || []);
                setStatus("ok");
            } catch {
                if (!cancelled) {
                    setErrorMsg("Unable to connect to server.");
                    setStatus("error");
                }
            }
        };

        load();
        return () => { cancelled = true; };
    }, [assetId]);

    const box = {
        background: "#111827", color: "#f9fafb", borderRadius: 14,
        padding: 20, margin: "24px 0",
    };

    return (
        <section style={{ margin: "24px 0" }}>
            <div style={{ marginBottom: 12 }}>
                <span className="details-kicker">OVERLAP ANALYSIS</span>
                <h2 style={{ margin: "4px 0" }}>Why coverage overlaps &amp; what to do</h2>
            </div>

            {status === "loading" && <div style={box}>Checking for overlapping coverage…</div>}

            {status === "error" && (
                <div style={{ ...box, border: "1px solid #ef4444" }}>
                    Could not load the overlap analysis: {errorMsg}
                </div>
            )}

            {status === "ok" && overlaps.length === 0 && (
                <div style={{ ...box, border: "1px solid #22c55e" }}>
                    ✓ No overlapping coverage on this asset. None of its coverage periods run on the same days.
                </div>
            )}

            {status === "ok" && overlaps.length > 0 && (
                <div style={{ display: "grid", gap: 16 }}>
                    {overlaps.map((o, i) => {
                        const info = explainOverlap(o);
                        const color = colors[info.tone];

                        return (
                            <div
                                key={`${o.coverage_1}-${o.coverage_2}-${i}`}
                                style={{
                                    background: "#111827", color: "#f9fafb",
                                    border: `1px solid ${color}`, borderLeft: `6px solid ${color}`,
                                    borderRadius: 14, padding: 20, display: "grid", gap: 14,
                                }}
                            >
                                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8 }}>
                                    <h3 style={{ margin: 0 }}>{o.coverage_1_type} ↔ {o.coverage_2_type}</h3>
                                    <span style={{
                                        background: color, color: "#000", fontWeight: 600,
                                        padding: "4px 12px", borderRadius: 999, fontSize: 13,
                                    }}>
                                        {info.verdict}
                                    </span>
                                </div>

                                <small style={{ opacity: 0.8 }}>
                                    Both active {fmtDate(o.overlap_start)} – {fmtDate(o.overlap_end)} • {o.overlap_days} days
                                </small>

                                <div>
                                    <strong>Why is this happening?</strong>
                                    <p style={{ margin: "6px 0" }}>{info.why}</p>
                                    {info.shape && <p style={{ margin: "6px 0", opacity: 0.85 }}>{info.shape}</p>}
                                </div>

                                <div>
                                    <strong>What you can do</strong>
                                    <ol style={{ margin: "6px 0", paddingLeft: 20, display: "grid", gap: 6 }}>
                                        {info.steps.map((s, idx) => <li key={idx}>{s}</li>)}
                                    </ol>
                                </div>

                                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                    <button style={btn}
                                        onClick={() => navigate(`/asset/${assetId}/edit-coverage/${o.coverage_1}`)}>
                                        ✎ Edit {o.coverage_1_type}
                                    </button>
                                    <button style={btn}
                                        onClick={() => navigate(`/asset/${assetId}/edit-coverage/${o.coverage_2}`)}>
                                        ✎ Edit {o.coverage_2_type}
                                    </button>
                                    <button style={btn}
                                        onClick={() => document.querySelector(".asset-documents-section")
                                            ?.scrollIntoView({ behavior: "smooth" })}>
                                        View documents
                                    </button>
                                </div>

                                <small style={{ opacity: 0.7 }}>
                                    SmartVault compares dates only. It cannot read your policy terms, so always confirm with the actual documents.
                                </small>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

export default OverlapExplainer;