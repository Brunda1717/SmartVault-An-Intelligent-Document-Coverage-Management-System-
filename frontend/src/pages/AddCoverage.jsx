import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

function AddCoverage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [asset, setAsset] = useState(null);
    const [form, setForm] = useState({
        coverage_type: "Warranty",
        provider: "",
        policy_number: "",
        start_date: "",
        end_date: "",
    });

    const [documentFile, setDocumentFile] = useState(null);
    const [documentType, setDocumentType] = useState("Warranty Document");

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
    }, [id]);

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

        setSaving(true);

        try {
            const token = localStorage.getItem("token");

            const response = await fetch(
                "http://localhost:5000/api/coverage",
                {
                    method: "POST",
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
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                setError(
                    data.message ||
                        "Failed to add coverage."
                );
                setSaving(false);
                return;
            }

            /* Upload document only if the user selected one */
            if (documentFile) {
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
                            Add coverage
                        </h1>

                        <p>
                            Track another layer of protection
                            for your asset.
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
                        <span>ADDING COVERAGE TO</span>
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

                            <div className="coverage-field">

                                <label>
                                    Coverage type
                                    <span>*</span>
                                </label>

                                <div className="coverage-type-grid">

                                    {[
                                        {
                                            name: "Warranty",
                                            icon: "◈",
                                            text:
                                                "Manufacturer warranty",
                                        },
                                        {
                                            name:
                                                "Extended Warranty",
                                            icon: "✦",
                                            text:
                                                "Extended protection",
                                        },
                                        {
                                            name: "Insurance",
                                            icon: "◆",
                                            text:
                                                "Insurance policy",
                                        },
                                    ].map(
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
                                            Save coverage
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