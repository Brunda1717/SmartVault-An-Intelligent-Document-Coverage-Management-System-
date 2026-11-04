import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ScanDocument, { ScanBadge } from "../components/ScanDocument";

function AddCoverage() {
    const { id, coverageId } = useParams();
    const isEdit = Boolean(coverageId);
    const navigate = useNavigate();

    const [asset, setAsset] = useState(null);
    const [form, setForm] = useState({
        coverage_type: "Warranty",
        provider: "",
        policy_number: "",
        start_date: "",
        end_date: "",
        status: "",
    });

    const [documentFile, setDocumentFile] = useState(null);
    const [documentType, setDocumentType] = useState("Warranty Document");

    const [scanMeta, setScanMeta] = useState({});
    const [scanUsed, setScanUsed] = useState(false);
    const [verified, setVerified] = useState(false);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchAsset = async () => {
            const token = localStorage.getItem("token");

            try {
                const response = await fetch(
                    `http://localhost:5000/api/assets/${id}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    setError(
                        data.message ||
                            "Unable to load asset."
                    );
                    return;
                }

                if (coverageId) {
                    const covRes = await fetch(`http://localhost:5000/api/coverage/asset/${id}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    const covList = await covRes.json();
                    const existing = Array.isArray(covList)
                        ? covList.find((c) => String(c.coverage_id) === String(coverageId))
                        : null;
                    if (!existing) { setError("Coverage not found."); return; }
                    setForm({
                        coverage_type: existing.coverage_type,
                        provider: existing.provider || "",
                        policy_number: existing.policy_number || "",
                        start_date: (existing.start_date || "").slice(0, 10),
                        end_date: (existing.end_date || "").slice(0, 10),
                        status: existing.status || "",
                    });
                }

                setAsset(data);
            } catch (err) {
                console.error(err);
                setError(
                    "Unable to connect to server."
                );
            } finally {
                setLoading(false);
            }
        };

        fetchAsset();
    }, [id, coverageId]);

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value,
        });
    };

    const calculateDays = () => {
        if (!form.start_date || !form.end_date) {
            return null;
        }

        const start = new Date(form.start_date);
        const end = new Date(form.end_date);

        const difference =
            Math.round(
                (end - start) /
                    (1000 * 60 * 60 * 24)
            ) + 1;

        return difference > 0 ? difference : 0;
    };

    const duration = calculateDays();

    const handleScanResult = (r) => {
        setForm((prev) => {
            const next = { ...prev };
            Object.entries(r.fields).forEach(([key, value]) => {
                if (value) next[key] = value;
            });
            return next;
        });
        if (r.documentType) setDocumentType(r.documentType);
        setDocumentFile(r.file || null);
        setScanMeta(r.meta || {});
        setScanUsed(true);
        setVerified(false);
        setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setError("");

        if (
            !form.provider.trim() ||
            !form.start_date ||
            !form.end_date
        ) {
            setError(
                "Please complete the required coverage details."
            );
            return;
        }

        if (
            new Date(form.end_date) <
            new Date(form.start_date)
        ) {
            setError(
                "End date cannot be before the start date."
            );
            return;
        }

        if (scanUsed && !verified) {
            setError("Please tick the box to confirm you have checked the details read from your document.");
            return;
        }

        setSaving(true);

        try {
            const token = localStorage.getItem("token");

            const response = await fetch(
                isEdit ? `http://localhost:5000/api/coverage/${coverageId}` : "http://localhost:5000/api/coverage",
                {
                    method: isEdit ? "PUT" : "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        asset_id: Number(id),
                        coverage_type:
                            form.coverage_type,
                        provider: form.provider,
                        policy_number:
                            form.policy_number,
                        start_date:
                            form.start_date,
                        end_date:
                            form.end_date,
                        status: form.status,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                setError(
                    data.message ||
                        (isEdit ? "Failed to update coverage." : "Failed to add coverage.")
                );
                setSaving(false);
                return;
            }

            /* Upload document only if not editing and the user selected one */
            if (!isEdit && documentFile) {
                const documentFormData = new FormData();

                documentFormData.append(
                    "document",
                    documentFile
                );

                documentFormData.append(
                    "asset_id",
                    id
                );

                documentFormData.append(
                    "coverage_id",
                    data.coverage_id
                );

                documentFormData.append(
                    "document_type",
                    documentType
                );

                const documentResponse = await fetch(
                    "http://localhost:5000/api/documents",
                    {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                        body: documentFormData,
                    }
                );

                const documentData =
                    await documentResponse.json();

                if (!documentResponse.ok) {
                    setError(
                        documentData.message ||
                            "Coverage was saved, but document upload failed."
                    );

                    setSaving(false);
                    return;
                }
            }

            navigate(`/asset/${id}`);
        } catch (err) {
            console.error(err);
            setError(
                "Unable to connect to server."
            );
        }

        setSaving(false);
    };

    if (loading) {
        return (
            <div className="coverage-page-loading">
                <div className="coverage-loader" />
                <h3>Loading asset...</h3>
            </div>
        );
    }

    if (error && !asset) {
        return (
            <div className="coverage-page-error">
                <div>!</div>
                <h2>Unable to load asset</h2>
                <p>{error}</p>

                <button
                    onClick={() =>
                        navigate(
                            `/asset/${id}`
                        )
                    }
                >
                    Back to Asset
                </button>
            </div>
        );
    }

    const baseTypes = [
        { name: "Warranty", icon: "◈", text: "Manufacturer warranty" },
        { name: "Extended Warranty", icon: "✦", text: "Extended protection" },
        { name: "Insurance", icon: "◆", text: "Insurance policy" },
    ];
    const typeOptions = baseTypes.some((t) => t.name === form.coverage_type)
        ? baseTypes
        : [...baseTypes, { name: form.coverage_type, icon: "◇", text: "Current type" }];

    return (
        <div className="add-coverage-page">

            <div className="coverage-bg coverage-bg-one" />
            <div className="coverage-bg coverage-bg-two" />

            <div className="add-coverage-container">

                <header className="coverage-header">

                    <button
                        className="coverage-back"
                        onClick={() =>
                            navigate(
                                `/asset/${id}`
                            )
                        }
                    >
                        ← Back to asset
                    </button>

                    <div className="coverage-header-center">
                        <span>
                            SMARTVAULT / COVERAGE
                        </span>

                        <h1>
                            {isEdit ? "Edit coverage" : "Add coverage"}
                        </h1>

                        <p>
                            {isEdit ? "Modify protection details for your asset." : "Track another layer of protection for your asset."}
                        </p>
                    </div>

                    <div className="coverage-step">
                        <span>02</span>
                        <small>OF 02</small>
                    </div>

                </header>

                <section className="coverage-asset-banner">

                    <div className="coverage-asset-icon">
                        {asset?.asset_name
                            ?.charAt(0)
                            ?.toUpperCase() || "A"}
                    </div>

                    <div>
                        <span>{isEdit ? "EDITING COVERAGE FOR" : "ADDING COVERAGE TO"}</span>
                        <h2>{asset?.asset_name}</h2>
                        <p>
                            {asset?.brand || "Unknown brand"}
                            {asset?.model
                                ? ` • ${asset.model}`
                                : ""}
                        </p>
                    </div>

                    <div className="coverage-asset-value">
                        <span>ASSET VALUE</span>
                        <strong>
                            ₹
                            {Number(
                                asset?.purchase_value || 0
                            ).toLocaleString("en-IN")}
                        </strong>
                    </div>

                </section>

                <div className="coverage-layout">

                    <main className="coverage-form-card">

                        <div className="coverage-form-heading">

                            <span className="form-icon">
                                ◇
                            </span>

                            <div>
                                <span>
                                    COVERAGE DETAILS
                                </span>

                                <h2>
                                    What protects this asset?
                                </h2>

                                <p>
                                    Enter the details exactly as
                                    they appear on the warranty,
                                    policy or protection document.
                                </p>
                            </div>

                        </div>

                        <form onSubmit={handleSubmit}>

                            {!isEdit && <ScanDocument asset={asset} onResult={handleScanResult} />}

                            <div className="coverage-field">

                                <label>
                                    Coverage type
                                    <span>*</span>
                                </label>
                                <ScanBadge meta={scanMeta.coverage_type} current={form.coverage_type} />

                                <div className="coverage-type-grid">

                                    {typeOptions.map(
                                        (item) => (
                                            <button
                                                type="button"
                                                key={item.name}
                                                className={`coverage-type-option ${
                                                    form.coverage_type ===
                                                    item.name
                                                        ? "selected"
                                                        : ""
                                                }`}
                                                onClick={() =>
                                                    setForm({
                                                        ...form,
                                                        coverage_type:
                                                            item.name,
                                                    })
                                                }
                                            >
                                                <span>
                                                    {
                                                        item.icon
                                                    }
                                                </span>

                                                <strong>
                                                    {item.name}
                                                </strong>

                                                <small>
                                                    {item.text}
                                                </small>
                                            </button>
                                        )
                                    )}

                                </div>

                            </div>

                            <div className="coverage-form-row">

                                <div className="coverage-field">

                                    <label>
                                        Provider
                                        <span>*</span>
                                    </label>

                                    <input
                                        name="provider"
                                        value={
                                            form.provider
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="e.g. Sony, Samsung Care"
                                    />
                                    <ScanBadge meta={scanMeta.provider} current={form.provider} />

                                </div>

                                <div className="coverage-field">

                                    <label>
                                        Policy / reference number
                                    </label>

                                    <input
                                        name="policy_number"
                                        value={
                                            form.policy_number
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="e.g. WAR-2026-001"
                                    />
                                    <ScanBadge meta={scanMeta.policy_number} current={form.policy_number} />

                                </div>

                            </div>

                            <div className="coverage-form-row">

                                <div className="coverage-field">

                                    <label>
                                        Coverage starts
                                        <span>*</span>
                                    </label>

                                    <input
                                        type="date"
                                        name="start_date"
                                        value={
                                            form.start_date
                                        }
                                        onChange={
                                            handleChange
                                        }
                                    />
                                    <ScanBadge meta={scanMeta.start_date} current={form.start_date} />

                                </div>

                                <div className="coverage-field">

                                    <label>
                                        Coverage ends
                                        <span>*</span>
                                    </label>

                                    <input
                                        type="date"
                                        name="end_date"
                                        value={
                                            form.end_date
                                        }
                                        onChange={
                                            handleChange
                                        }
                                    />
                                    <ScanBadge meta={scanMeta.end_date} current={form.end_date} />

                                </div>

                            </div>

                            {duration !== null && (
                                <div
                                    className={`coverage-duration ${
                                        duration === 0
                                            ? "invalid"
                                            : ""
                                    }`}
                                >
                                    <span>◷</span>

                                    <div>
                                        <strong>
                                            {duration > 0
                                                ? `${duration} days of coverage`
                                                : "Invalid coverage period"}
                                        </strong>

                                        {duration > 0 && (
                                            <p>
                                                SmartVault will
                                                monitor this
                                                period for
                                                expiry and
                                                potential overlap.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {!isEdit && (
                                <div className="coverage-document-section">

                                    <div className="coverage-document-heading">
                                        <div>
                                            <span>SUPPORTING DOCUMENT</span>
                                            <h3>Attach your coverage document</h3>
                                            <p>
                                                Upload the warranty, policy, invoice, or protection
                                                document associated with this coverage.
                                            </p>
                                        </div>

                                        <span className="document-optional">
                                            OPTIONAL
                                        </span>
                                    </div>

                                    <div className="coverage-document-grid">

                                        <div className="coverage-field">
                                            <label>Document type</label>

                                            <select
                                                value={documentType}
                                                onChange={(e) =>
                                                    setDocumentType(e.target.value)
                                                }
                                            >
                                                <option>Warranty Document</option>
                                                <option>Insurance Policy</option>
                                                <option>Purchase Invoice</option>
                                                <option>Protection Plan</option>
                                                <option>Other</option>
                                            </select>
                                        </div>

                                        <div className="coverage-document-upload">

                                            <input
                                                id="coverage-document"
                                                type="file"
                                                accept=".pdf,.jpg,.jpeg,.png"
                                                onChange={(e) =>
                                                    setDocumentFile(
                                                        e.target.files?.[0] || null
                                                    )
                                                }
                                                hidden
                                            />

                                            <label
                                                htmlFor="coverage-document"
                                                className="document-upload-box"
                                            >
                                                <span className="document-upload-icon">
                                                    📄
                                                </span>

                                                <div>
                                                    <strong>
                                                        {documentFile
                                                            ? documentFile.name
                                                            : "Choose a document"}
                                                    </strong>

                                                    <small>
                                                        {documentFile
                                                            ? `${(
                                                                documentFile.size /
                                                                (1024 * 1024)
                                                              ).toFixed(2)} MB`
                                                            : "PDF, JPG or PNG • Max 5 MB"}
                                                    </small>
                                                </div>

                                                <span className="document-upload-action">
                                                    Browse
                                                </span>
                                            </label>

                                        </div>

                                    </div>

                                </div>
                            )}

                            {scanUsed && (
                                <label style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: 14, margin: "16px 0", borderRadius: 12, background: verified ? "#dcfce7" : "#fef3c7", color: "#1f2937", cursor: "pointer", fontSize: 14, lineHeight: 1.5 }}>
                                    <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} style={{ marginTop: 3 }} />
                                    <span>
                                        <strong>I have checked these details against my document.</strong>{" "}
                                        They were read automatically and can contain mistakes, so please confirm every field above is correct.
                                    </span>
                                </label>
                            )}

                            {error && (
                                <div className="coverage-form-error">
                                    <span>!</span>
                                    {error}
                                </div>
                            )}

                            <div className="coverage-form-actions">

                                <button
                                    type="button"
                                    className="coverage-cancel"
                                    onClick={() =>
                                        navigate(
                                            `/asset/${id}`
                                        )
                                    }
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="coverage-submit"
                                    disabled={saving}
                                >
                                    {saving ? (
                                        <>
                                            <span className="coverage-spinner" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            {isEdit ? "Save changes" : "Save coverage"}
                                            <span>→</span>
                                        </>
                                    )}
                                </button>

                            </div>

                        </form>

                    </main>

                    <aside className="coverage-preview-panel">

                        <div className="coverage-preview-card">

                            <span className="preview-kicker">
                                LIVE PREVIEW
                            </span>

                            <div className="coverage-preview-icon">
                                {form.coverage_type ===
                                "Insurance"
                                    ? "◆"
                                    : form.coverage_type ===
                                      "Extended Warranty"
                                    ? "✦"
                                    : "◈"}
                            </div>

                            <h2>
                                {form.coverage_type}
                            </h2>

                            <p>
                                {form.provider ||
                                    "Provider name"}
                            </p>

                            <div className="preview-coverage-line">
                                <div>
                                    <span>
                                        START
                                    </span>
                                    <strong>
                                        {form.start_date ||
                                            "—"}
                                    </strong>
                                </div>
                                <div>
                                    <span>
                                        END
                                    </span>
                                    <strong>
                                        {form.end_date ||
                                            "—"}
                                    </strong>
                                </div>
                            </div>

                        </div>

                    </aside>

                </div>

            </div>

        </div>
    );
}

export default AddCoverage;