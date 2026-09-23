import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

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

    const getDocumentUrl = (document) => {
        if (!document.file_path) {
            return "#";
        }

        if (
            document.file_path.startsWith(
                "http://"
            ) ||
            document.file_path.startsWith(
                "https://"
            )
        ) {
            return document.file_path;
        }

        return `http://localhost:5000/${document.file_path.replace(
            /^\/+/,
            ""
        )}`;
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

                {/* =========================
                    OVERLAP ALERT
                ========================= */}

                {overlaps.length > 0 && (
                    <section className="details-overlap-alert">

                        <div className="overlap-alert-icon">
                            !
                        </div>

                        <div className="overlap-alert-content">

                            <div className="overlap-alert-title">

                                <span>
                                    POTENTIAL OVERLAP DETECTED
                                </span>

                                <strong>
                                    {overlaps.length} overlap
                                    {overlaps.length > 1
                                        ? "s"
                                        : ""}
                                </strong>

                            </div>

                            <p>
                                Some coverage periods
                                overlap. This does not
                                necessarily mean duplicate
                                protection. Review the
                                actual coverage terms.
                            </p>

                            <div className="overlap-alert-list">

                                {overlaps.map(
                                    (
                                        overlap,
                                        index
                                    ) => (
                                        <div
                                            key={index}
                                            className="overlap-alert-item"
                                        >

                                            <span>
                                                {
                                                    overlap.coverage_1_type
                                                }
                                            </span>

                                            <b>
                                                ↔
                                            </b>

                                            <span>
                                                {
                                                    overlap.coverage_2_type
                                                }
                                            </span>

                                            <small>
                                                {
                                                    overlap.overlap_days
                                                }{" "}
                                                days
                                            </small>

                                        </div>
                                    )
                                )}

                            </div>

                        </div>

                    </section>
                )}

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

                                                            const documentUrl =
                                                                getDocumentUrl(
                                                                    document
                                                                );

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

                                                                        <a
                                                                            href={
                                                                                documentUrl
                                                                            }
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="document-view-button"
                                                                        >
                                                                            View
                                                                        </a>

                                                                        <a
                                                                            href={
                                                                                documentUrl
                                                                            }
                                                                            download={
                                                                                document.file_name
                                                                            }
                                                                            className="document-download-button"
                                                                        >
                                                                            Download
                                                                        </a>

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

                                    const documentUrl =
                                        getDocumentUrl(
                                            document
                                        );

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

                                                <a
                                                    href={
                                                        documentUrl
                                                    }
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="document-view-button"
                                                >
                                                    View
                                                </a>

                                                <a
                                                    href={
                                                        documentUrl
                                                    }
                                                    download={
                                                        document.file_name
                                                    }
                                                    className="document-download-button"
                                                >
                                                    Download
                                                </a>

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

            </div>
        </div>
    );
}

export default AssetDetails;