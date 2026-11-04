import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import OverlapExplainer from "../components/OverlapExplainer";
import NotificationBell from "../components/NotificationBell";

function AssetDetails() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [asset, setAsset] = useState(null);
    const [coverage, setCoverage] = useState([]);
    const [overlaps, setOverlaps] = useState([]);
    const [priorities, setPriorities] = useState({});
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [editingDoc, setEditingDoc] = useState(null);
    const [docForm, setDocForm] = useState({ document_type: "", coverage_id: "" });

    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem("token");

            try {
                // =========================
                // ASSET
                // =========================

                const assetResponse = await fetch(
                    `http://localhost:5000/api/assets/${id}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                const assetData = await assetResponse.json();

                if (!assetResponse.ok) {
                    setError(
                        assetData.message ||
                            "Failed to load asset."
                    );
                    setLoading(false);
                    return;
                }

                setAsset(assetData);

                // =========================
                // COVERAGE
                // =========================

                const coverageResponse = await fetch(
                    `http://localhost:5000/api/coverage/asset/${id}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                const coverageData =
                    await coverageResponse.json();

                if (coverageResponse.ok) {
                    setCoverage(coverageData);

                    // =========================
                    // PRIORITY
                    // =========================

                    const priorityResults = {};

                    for (const item of coverageData) {
                        const response = await fetch(
                            `http://localhost:5000/api/coverage/${item.coverage_id}/priority`,
                            {
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                },
                            }
                        );

                        if (response.ok) {
                            priorityResults[
                                item.coverage_id
                            ] = await response.json();
                        }
                    }

                    setPriorities(priorityResults);
                }

                // =========================
                // OVERLAPS
                // =========================

                const overlapResponse = await fetch(
                    `http://localhost:5000/api/coverage/asset/${id}/overlaps`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                const overlapData =
                    await overlapResponse.json();

                if (overlapResponse.ok) {
                    setOverlaps(
                        overlapData.overlaps || []
                    );
                }

                // =========================
                // DOCUMENTS
                // =========================

                const documentResponse = await fetch(
                    `http://localhost:5000/api/documents/asset/${id}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                const documentData =
                    await documentResponse.json();

                if (documentResponse.ok) {
                    setDocuments(
                        Array.isArray(documentData)
                            ? documentData
                            : documentData.documents || []
                    );
                }

            } catch (err) {
                console.error(err);

                setError(
                    "Unable to connect to the SmartVault server."
                );
            }

            setLoading(false);
        };

        fetchData();
    }, [id]);

    // =========================
    // LOADING
    // =========================

    if (loading) {
        return (
            <div className="asset-details-loading">
                <div className="asset-details-loader" />

                <h3>
                    Analyzing your asset...
                </h3>

                <p>
                    Checking coverage, documents,
                    overlaps and priority.
                </p>
            </div>
        );
    }

    // =========================
    // ERROR
    // =========================

    if (error) {
        return (
            <div className="asset-details-error">
                <div>!</div>

                <h2>
                    Unable to load asset
                </h2>

                <p>{error}</p>

                <button
                    onClick={() =>
                        navigate("/dashboard")
                    }
                >
                    Back to Dashboard
                </button>
            </div>
        );
    }

    // =========================
    // SUMMARY COUNTS
    // =========================

    const criticalCount = Object.values(
        priorities
    ).filter(
        (item) => item.priority === "Critical"
    ).length;

    const attentionCount = Object.values(
        priorities
    ).filter(
        (item) => item.priority === "Attention"
    ).length;

    const safeCount = Object.values(
        priorities
    ).filter(
        (item) => item.priority === "Safe"
    ).length;

    // =========================
    // HELPERS
    // =========================

    const getPriorityClass = (priority) => {
        if (priority === "Critical") {
            return "critical";
        }

        if (priority === "Attention") {
            return "attention";
        }

        if (priority === "Lapsed") {
            return "lapsed";
        }

        return "safe";
    };

    const getCoverageIcon = (type) => {
        const value =
            type?.toLowerCase() || "";

        if (value.includes("warranty")) {
            return "◈";
        }

        if (value.includes("insurance")) {
            return "◆";
        }

        if (value.includes("protection")) {
            return "✦";
        }

        return "◇";
    };

    const getDocumentIcon = (fileName) => {
        const extension =
            fileName
                ?.split(".")
                .pop()
                ?.toLowerCase();

        if (extension === "pdf") {
            return "PDF";
        }

        if (
            extension === "jpg" ||
            extension === "jpeg" ||
            extension === "png"
        ) {
            return "IMG";
        }

        return "DOC";
    };

    const getFileSize = (size) => {
        if (!size) {
            return "Document";
        }

        const mb =
            Number(size) /
            (1024 * 1024);

        return `${mb.toFixed(2)} MB`;
    };

    // Open a protected document using the authenticated backend route.
    // The document list intentionally does not expose its server file path.
    const handleViewDocument = async (document) => {
        const token = localStorage.getItem("token");
        const newTab = window.open("about:blank", "_blank");

        if (!newTab) {
            alert("Please allow pop-ups to view this document.");
            return;
        }

        try {
            const response = await fetch(
                `http://localhost:5000/api/documents/${document.document_id}/view`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                const result = await response.json().catch(() => ({}));
                newTab.close();
                alert(result.message || "Failed to open document.");
                return;
            }

            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            newTab.location.href = objectUrl;
        } catch (err) {
            console.error("Document view error:", err);
            newTab.close();
            alert("Unable to open document. Please check that the SmartVault server is running.");
        }
    };

    // Download documents through the same authenticated endpoint.
    const handleDownloadDocument = async (document) => {
        const token = localStorage.getItem("token");

        try {
            const response = await fetch(
                `http://localhost:5000/api/documents/${document.document_id}/view`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                const result = await response.json().catch(() => ({}));
                alert(result.message || "Failed to download document.");
                return;
            }

            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            const link = window.document.createElement("a");
            link.href = objectUrl;
            link.download = document.file_name || "document";
            window.document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
        } catch (err) {
            console.error("Document download error:", err);
            alert("Unable to download document. Please check that the SmartVault server is running.");
        }
    };

    const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
    const dangerStyle = { background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", font: "inherit" };
    const editStyle = { background: "transparent", color: "inherit", border: "1px solid currentColor", borderRadius: 8, padding: "8px 14px", cursor: "pointer", font: "inherit" };

    const callDelete = async (url, okAction) => {
        try {
            const res = await fetch(url, { method: "DELETE", headers: authHeader() });
            if (res.ok) { okAction(); return; }
            const r = await res.json().catch(() => ({}));
            alert(r.message || "Delete failed.");
        } catch {
            alert("Unable to connect to server.");
        }
    };

    const handleDeleteAsset = () => {
        if (!window.confirm(`Delete "${asset.asset_name}"?\n\nAll its coverage records and uploaded documents will be permanently removed.`)) return;
        callDelete(`http://localhost:5000/api/assets/${id}`, () => navigate("/dashboard"));
    };

    const handleDeleteCoverage = (item) => {
        if (!window.confirm(`Delete this ${item.coverage_type} record?\n\nDocuments linked to it will be kept in the vault.`)) return;
        callDelete(`http://localhost:5000/api/coverage/${item.coverage_id}`, () => window.location.reload());
    };

    const handleDeleteDocument = (doc) => {
        if (!window.confirm(`Delete "${doc.file_name}"? The file will be permanently removed.`)) return;
        callDelete(`http://localhost:5000/api/documents/${doc.document_id}`, () => window.location.reload());
    };

    const openEditDocument = (doc) => {
        setEditingDoc(doc);
        setDocForm({ document_type: doc.document_type || "Other", coverage_id: doc.coverage_id || "" });
    };

    const saveDocument = async (e) => {
        e.preventDefault();
        const res = await fetch(`http://localhost:5000/api/documents/${editingDoc.document_id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", ...authHeader() },
            body: JSON.stringify({
                document_type: docForm.document_type,
                coverage_id: docForm.coverage_id || null,
            }),
        });
        if (res.ok) { window.location.reload(); return; }
        const r = await res.json().catch(() => ({}));
        alert(r.message || "Update failed.");
    };

    return (
        <div className="asset-details-page">

            <div className="asset-details-bg bg-one" />
            <div className="asset-details-bg bg-two" />

            <div className="asset-details-container">

                {/* =========================
                    HEADER
                ========================= */}

                <header className="asset-details-header">

                    <button
                        className="details-back-button"
                        onClick={() =>
                            navigate("/dashboard")
                        }
                    >
                        ← Dashboard
                    </button>

                    <div className="details-header-actions">

                        <NotificationBell />

                        <button style={editStyle} onClick={() => navigate(`/edit-asset/${id}`)}>✎ Edit</button>
                        <button style={dangerStyle} onClick={handleDeleteAsset}>Delete</button>

                        <button
                            className="details-secondary-btn"
                            onClick={() =>
                                window.location.reload()
                            }
                        >
                            ↻ Refresh
                        </button>

                        <button
                            className="details-primary-btn"
                            onClick={() =>
                                navigate(
                                    `/asset/${id}/add-coverage`
                                )
                            }
                        >
                            + Add Coverage
                        </button>

                    </div>

                </header>

                {/* =========================
                    ASSET HERO
                ========================= */}

                <section className="asset-hero-card">

                    <div className="asset-hero-left">

                        <div className="asset-large-icon">
                            {asset.asset_name
                                ?.charAt(0)
                                ?.toUpperCase() || "A"}
                        </div>

                        <div>

                            <span className="details-kicker">
                                ASSET PROFILE
                            </span>

                            <h1>
                                {asset.asset_name}
                            </h1>

                            <p className="asset-subtitle">

                                {asset.brand ||
                                    "Unknown brand"}

                                {asset.model
                                    ? ` • ${asset.model}`
                                    : ""}

                                {asset.category
                                    ? ` • ${asset.category}`
                                    : ""}

                            </p>

                        </div>

                    </div>

                    <div className="asset-value-card">

                        <span>
                            PURCHASE VALUE
                        </span>

                        <strong>
                            ₹
                            {Number(
                                asset.purchase_value || 0
                            ).toLocaleString("en-IN")}
                        </strong>

                        <small>
                            Purchased{" "}
                            {asset.purchase_date ||
                                "—"}
                        </small>

                    </div>

                </section>

                {/* =========================
                    SUMMARY
                ========================= */}

                <section className="details-summary-grid">

                    <div className="detail-summary-card">

                        <span className="summary-icon blue">
                            ◈
                        </span>

                        <div>
                            <span>
                                Coverage records
                            </span>

                            <strong>
                                {coverage.length}
                            </strong>
                        </div>

                    </div>

                    <div className="detail-summary-card">

                        <span className="summary-icon red">
                            !
                        </span>

                        <div>
                            <span>
                                Critical
                            </span>

                            <strong>
                                {criticalCount}
                            </strong>
                        </div>

                    </div>

                    <div className="detail-summary-card">

                        <span className="summary-icon orange">
                            ◷
                        </span>

                        <div>
                            <span>
                                Attention
                            </span>

                            <strong>
                                {attentionCount}
                            </strong>
                        </div>

                    </div>

                    <div className="detail-summary-card">

                        <span className="summary-icon green">
                            ✓
                        </span>

                        <div>
                            <span>
                                Safe
                            </span>

                            <strong>
                                {safeCount}
                            </strong>
                        </div>

                    </div>

                </section>

                <OverlapExplainer assetId={id} />

                {/* =========================
                    COVERAGE TIMELINE
                ========================= */}

                <section className="details-main-grid">

                    <div className="coverage-section">

                        <div className="details-section-heading">

                            <div>

                                <span className="details-kicker">
                                    COVERAGE INTELLIGENCE
                                </span>

                                <h2>
                                    Protection timeline
                                </h2>

                                <p>
                                    Every coverage record
                                    associated with this
                                    asset.
                                </p>

                            </div>

                            <span className="coverage-count">
                                {coverage.length} record
                                {coverage.length !== 1
                                    ? "s"
                                    : ""}
                            </span>

                        </div>

                        {coverage.length === 0 ? (

                            <div className="no-coverage-card">

                                <div>
                                    ◇
                                </div>

                                <h3>
                                    No coverage added yet
                                </h3>

                                <p>
                                    Add a warranty,
                                    insurance or protection
                                    plan to start tracking
                                    this asset.
                                </p>

                                <button
                                    onClick={() =>
                                        navigate(
                                            `/asset/${id}/add-coverage`
                                        )
                                    }
                                >
                                    Add coverage →
                                </button>

                            </div>

                        ) : (

                            <div className="coverage-timeline">

                                {coverage.map(
                                    (
                                        item,
                                        index
                                    ) => {

                                        const priority =
                                            priorities[
                                                item.coverage_id
                                            ];

                                        const priorityClass =
                                            getPriorityClass(
                                                priority?.priority
                                            );

                                        return (

                                            <div
                                                className="coverage-timeline-item"
                                                key={
                                                    item.coverage_id
                                                }
                                            >

                                                <div className="timeline-marker">

                                                    <span>
                                                        {getCoverageIcon(
                                                            item.coverage_type
                                                        )}
                                                    </span>

                                                    {index !==
                                                        coverage.length -
                                                            1 && (
                                                        <div className="timeline-line" />
                                                    )}

                                                </div>

                                                <div className="coverage-card">

                                                    {/* COVERAGE HEADER */}

                                                    <div className="coverage-card-top">

                                                        <div>

                                                            <span className="coverage-type">
                                                                {
                                                                    item.coverage_type
                                                                }
                                                            </span>

                                                            <h3>
                                                                {item.provider ||
                                                                    "Unknown provider"}
                                                            </h3>

                                                        </div>

                                                        {priority && (
                                                            <span
                                                                className={`coverage-priority ${priorityClass}`}
                                                            >
                                                                {
                                                                    priority.priority
                                                                }
                                                            </span>
                                                        )}

                                                    </div>

                                                    <div style={{ display: "flex", gap: 8, margin: "10px 0" }}>
                                                        <button style={editStyle} onClick={() => navigate(`/asset/${id}/edit-coverage/${item.coverage_id}`)}>✎ Edit</button>
                                                        <button style={dangerStyle} onClick={() => handleDeleteCoverage(item)}>Delete</button>
                                                    </div>

                                                    {/* DATES */}

                                                    <div className="coverage-dates">

                                                        <div>

                                                            <span>
                                                                START
                                                            </span>

                                                            <strong>
                                                                {
                                                                    item.start_date
                                                                }
                                                            </strong>

                                                        </div>

                                                        <div className="date-arrow">
                                                            →
                                                        </div>

                                                        <div>

                                                            <span>
                                                                END
                                                            </span>

                                                            <strong>
                                                                {
                                                                    item.end_date
                                                                }
                                                            </strong>

                                                        </div>

                                                        {priority && (
                                                            <strong className="coverage-days">
                                                                {
                                                                    priority.days_remaining
                                                                }{" "}
                                                                days
                                                            </strong>
                                                        )}

                                                    </div>

                                                    {/* =========================
                                                        PRIORITY INTELLIGENCE
                                                    ========================= */}

                                                    {priority && (

                                                        <div className="coverage-priority-panel">

                                                            <div className="priority-panel-header">

                                                                <div>

                                                                    <span className="priority-kicker">
                                                                        PRIORITY INTELLIGENCE
                                                                    </span>

                                                                    <h3>
                                                                        Why does this coverage need attention?
                                                                    </h3>

                                                                </div>

                                                                <div
                                                                    className={`priority-score-badge ${priorityClass}`}
                                                                >

                                                                    <strong>
                                                                        {
                                                                            priority.score
                                                                        }
                                                                    </strong>

                                                                    <span>
                                                                        Score
                                                                    </span>

                                                                </div>

                                                            </div>

                                                            <div className="priority-status-row">

                                                                <span
                                                                    className={`priority-status ${priorityClass}`}
                                                                >
                                                                    {
                                                                        priority.priority
                                                                    }
                                                                </span>

                                                                <span>

                                                                    {priority.days_remaining <
                                                                    0
                                                                        ? "Coverage has expired"
                                                                        : `${priority.days_remaining} days remaining`}

                                                                </span>

                                                            </div>

                                                            {priority.explanation && (

                                                                <div className="priority-reason-grid">

                                                                    <div className="priority-reason-card">

                                                                        <div className="priority-reason-top">

                                                                            <span>
                                                                                EXPIRY URGENCY
                                                                            </span>

                                                                            <strong>
                                                                                +
                                                                                {
                                                                                    priority
                                                                                        .explanation
                                                                                        .urgency_score
                                                                                }
                                                                            </strong>

                                                                        </div>

                                                                        <p>
                                                                            {
                                                                                priority
                                                                                    .explanation
                                                                                    .urgency_reason
                                                                            }
                                                                        </p>

                                                                    </div>

                                                                    <div className="priority-reason-card">

                                                                        <div className="priority-reason-top">

                                                                            <span>
                                                                                ASSET VALUE
                                                                            </span>

                                                                            <strong>
                                                                                +
                                                                                {
                                                                                    priority
                                                                                        .explanation
                                                                                        .value_score
                                                                                }
                                                                            </strong>

                                                                        </div>

                                                                        <p>
                                                                            {
                                                                                priority
                                                                                    .explanation
                                                                                    .value_reason
                                                                            }
                                                                        </p>

                                                                    </div>

                                                                    <div className="priority-reason-card">

                                                                        <div className="priority-reason-top">

                                                                            <span>
                                                                                COVERAGE SITUATION
                                                                            </span>

                                                                            <strong>
                                                                                +
                                                                                {
                                                                                    priority
                                                                                        .explanation
                                                                                        .coverage_score
                                                                                }
                                                                            </strong>

                                                                        </div>

                                                                        <p>
                                                                            {
                                                                                priority
                                                                                    .explanation
                                                                                    .coverage_reason
                                                                            }
                                                                        </p>

                                                                    </div>

                                                                </div>

                                                            )}

                                                        </div>

                                                    )}

                                                    {/* =========================
                                                        LINKED DOCUMENT
                                                    ========================= */}

                                                    {documents.filter(
                                                        (document) =>
                                                            Number(
                                                                document.coverage_id
                                                            ) ===
                                                            Number(
                                                                item.coverage_id
                                                            )
                                                    ).map(
                                                        (
                                                            document
                                                        ) => {

                                                            return (

                                                                <div
                                                                    key={
                                                                        document.document_id
                                                                    }
                                                                    className="coverage-linked-document"
                                                                >

                                                                    <div className="linked-document-icon">
                                                                        📄
                                                                    </div>

                                                                    <div className="linked-document-info">

                                                                        <span>
                                                                            SUPPORTING DOCUMENT
                                                                        </span>

                                                                        <strong>
                                                                            {
                                                                                document.file_name
                                                                            }
                                                                        </strong>

                                                                        <small>
                                                                            {
                                                                                document.document_type ||
                                                                                "Coverage document"
                                                                            }{" "}
                                                                            •{" "}
                                                                            {getFileSize(
                                                                                document.file_size
                                                                            )}
                                                                        </small>

                                                                    </div>

                                                                    <div className="linked-document-actions">

                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleViewDocument(document)}
                                                                            className="document-view-button" style={{ cursor: "pointer", font: "inherit" }}
                                                                        >
                                                                            View
                                                                        </button>

                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleDownloadDocument(document)}
                                                                            className="document-download-button" style={{ cursor: "pointer", font: "inherit" }}
                                                                        >
                                                                            Download
                                                                        </button>

                                                                    </div>

                                                                </div>

                                                            );
                                                        }
                                                    )}

                                                </div>

                                            </div>

                                        );
                                    }
                                )}

                            </div>

                        )}

                    </div>

                </section>

                {/* =========================
                    DOCUMENT VAULT
                ========================= */}

                <section className="asset-documents-section">

                    <div className="asset-section-heading">

                        <div>

                            <span>
                                DOCUMENT VAULT
                            </span>

                            <h2>
                                Your documents
                            </h2>

                            <p>
                                Warranty certificates,
                                invoices and protection
                                documents linked to this
                                asset.
                            </p>

                        </div>

                        <div className="document-count">

                            {documents.length}

                            <span>
                                {documents.length === 1
                                    ? "file"
                                    : "files"}
                            </span>

                        </div>

                    </div>

                    {documents.length === 0 ? (

                        <div className="documents-empty-state">

                            <div className="documents-empty-icon">
                                📁
                            </div>

                            <h3>
                                No documents yet
                            </h3>

                            <p>
                                Upload a warranty,
                                policy, invoice or
                                protection document
                                while adding coverage.
                            </p>

                            <button
                                className="documents-add-button"
                                onClick={() =>
                                    navigate(
                                        `/asset/${id}/add-coverage`
                                    )
                                }
                            >
                                Add coverage + document →
                            </button>

                        </div>

                    ) : (

                        <div className="documents-grid">

                            {documents.map(
                                (document) => {

                                    return (

                                        <div
                                            className="document-card"
                                            key={
                                                document.document_id
                                            }
                                        >

                                            <div className="document-card-top">

                                                <div className="document-file-icon">

                                                    {getDocumentIcon(
                                                        document.file_name
                                                    )}

                                                </div>

                                                <span className="document-type-badge">
                                                    {
                                                        document.document_type ||
                                                        "Document"
                                                    }
                                                </span>

                                            </div>

                                            <h3
                                                title={
                                                    document.file_name
                                                }
                                            >
                                                {
                                                    document.file_name
                                                }
                                            </h3>

                                            <p className="document-meta">

                                                {getFileSize(
                                                    document.file_size
                                                )}

                                                {document.coverage_id && (
                                                    <>
                                                        {" • "}
                                                        Linked to coverage
                                                    </>
                                                )}

                                            </p>

                                            <div className="document-actions">

                                                <button
                                                    type="button"
                                                    onClick={() => handleViewDocument(document)}
                                                    className="document-view-button" style={{ cursor: "pointer", font: "inherit" }}
                                                >
                                                    View
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleDownloadDocument(document)}
                                                    className="document-download-button" style={{ cursor: "pointer", font: "inherit" }}
                                                >
                                                    Download
                                                </button>

                                                <button type="button" style={editStyle} onClick={() => openEditDocument(document)}>Edit</button>
                                                <button type="button" style={dangerStyle} onClick={() => handleDeleteDocument(document)}>Delete</button>

                                            </div>

                                        </div>

                                    );
                                }
                            )}

                        </div>

                    )}

                </section>

                {/* =========================
                    BOTTOM CTA
                ========================= */}

                <div className="asset-details-bottom-actions">

                    <button
                        className="details-primary-btn"
                        onClick={() =>
                            navigate(
                                `/asset/${id}/add-coverage`
                            )
                        }
                    >
                        + Add another coverage
                    </button>

                </div>

                {editingDoc && (
                    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "grid", placeItems: "center", zIndex: 1000 }}
                         onClick={() => setEditingDoc(null)}>
                        <form onSubmit={saveDocument} onClick={(e) => e.stopPropagation()}
                              style={{ background: "#111827", color: "#fff", padding: 24, borderRadius: 14, width: 360, display: "grid", gap: 12 }}>
                            <h3>Edit document</h3>
                            <label>Document type
                                <select value={docForm.document_type} style={{ width: "100%" }}
                                        onChange={(e) => setDocForm({ ...docForm, document_type: e.target.value })}>
                                    {["Warranty Document", "Insurance Policy", "Purchase Invoice", "Protection Plan", "Other"].map((t) => <option key={t}>{t}</option>)}
                                </select>
                            </label>
                            <label>Linked coverage
                                <select value={docForm.coverage_id} style={{ width: "100%" }}
                                        onChange={(e) => setDocForm({ ...docForm, coverage_id: e.target.value })}>
                                    <option value="">None (asset only)</option>
                                    {coverage.map((c) => <option key={c.coverage_id} value={c.coverage_id}>{c.coverage_type} – {c.provider || "Unknown"}</option>)}
                                </select>
                            </label>
                            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                                <button type="button" style={editStyle} onClick={() => setEditingDoc(null)}>Cancel</button>
                                <button type="submit" style={{ ...dangerStyle, background: "#2563eb" }}>Save</button>
                            </div>
                        </form>
                    </div>
                )}

            </div>
        </div>
    );
}

export default AssetDetails;