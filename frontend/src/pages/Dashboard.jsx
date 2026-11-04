import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import NotificationBell from "../components/NotificationBell";

function Dashboard() {
    const navigate = useNavigate();

    const [summary, setSummary] = useState(null);
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const handleDeleteAsset = async (e, asset) => {
        e.stopPropagation();   // stops the card's click from opening the asset page
        if (!window.confirm(`Delete "${asset.asset_name}"?\n\nAll its coverage and documents will be permanently removed.`)) return;
        try {
            const res = await fetch(`http://localhost:5000/api/assets/${asset.asset_id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            });
            if (res.ok) { window.location.reload(); return; }
            const r = await res.json().catch(() => ({}));
            alert(r.message || "Delete failed.");
        } catch {
            alert("Unable to connect to server.");
        }
    };

    useEffect(() => {
        const fetchDashboard = async () => {
            const token = localStorage.getItem("token");

            try {
                const [summaryResponse, assetsResponse] =
                    await Promise.all([
                        fetch(
                            "http://localhost:5000/api/coverage/dashboard/summary",
                            {
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                },
                            }
                        ),

                        fetch(
                            "http://localhost:5000/api/assets",
                            {
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                },
                            }
                        ),
                    ]);

                const summaryData = await summaryResponse.json();
                const assetsData = await assetsResponse.json();

                if (!summaryResponse.ok) {
                    setError(
                        summaryData.message ||
                        "Failed to load dashboard"
                    );

                    setLoading(false);
                    return;
                }

                setSummary(summaryData);

                if (assetsResponse.ok) {
                    setAssets(
                        Array.isArray(assetsData)
                            ? assetsData
                            : []
                    );
                }

            } catch (error) {
                console.error(error);
                setError("Unable to connect to server.");
            }

            setLoading(false);
        };

        fetchDashboard();
    }, []);

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="dashboard-loader" />

                <h3>Preparing your vault...</h3>

                <p>
                    Checking assets, coverage and priorities.
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dashboard-error">
                <div className="error-icon">!</div>

                <h2>Something went wrong</h2>

                <p>{error}</p>

                <button
                    onClick={() => window.location.reload()}
                >
                    Try Again
                </button>
            </div>
        );
    }

    // Backend returns numeric counts in summary.
    const counts = summary?.summary || {};

    // Backend returns coverage records in buckets.
    const buckets = summary?.buckets || {};

    const critical = buckets.Critical || [];
    const attention = buckets.Attention || [];
    const safe = buckets.Safe || [];
    const lapsed = buckets.Lapsed || [];

    const criticalCount = counts.Critical || 0;
    const attentionCount = counts.Attention || 0;
    const safeCount = counts.Safe || 0;
    const lapsedCount = counts.Lapsed || 0;

    const totalAssets = assets.length;

    const totalTracked =
        criticalCount +
        attentionCount +
        safeCount +
        lapsedCount;

    const healthyPercentage =
        totalTracked > 0
            ? Math.round(
                (safeCount / totalTracked) * 100
            )
            : 0;

    const totalOverlaps =
        summary?.total_overlaps || 0;

    const overlapList = summary?.overlaps || [];
    const fmtDate = (d) =>
        d
            ? new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
                day: "numeric", month: "short", year: "numeric",
              })
            : "—";

    return (
        <div className="dashboard-page">

            {/* HEADER */}

            <section className="dashboard-hero">

                <div>

                    <div className="dashboard-eyebrow">
                        SMARTVAULT OVERVIEW
                    </div>

                    <h1>
                        Your coverage,
                        <br />
                        <span>under control.</span>
                    </h1>

                    <p>
                        Monitor your assets, coverage periods,
                        potential overlaps and upcoming
                        coverage end dates from one place.
                    </p>

                </div>

                <div className="dashboard-hero-actions">

                    <NotificationBell />

                    <button
                        className="dashboard-secondary-button"
                        onClick={() =>
                            window.location.reload()
                        }
                    >
                        ↻ Refresh
                    </button>

                    <button
                        className="dashboard-primary-button"
                        onClick={() =>
                            navigate("/add-asset")
                        }
                    >
                        + Add Asset
                    </button>

                </div>

            </section>


            {/* STATS */}

            <section className="dashboard-stats">

                <div className="dashboard-stat-card blue">

                    <div className="stat-top">

                        <div className="stat-icon">
                            ◈
                        </div>

                        <span className="stat-label">
                            ASSETS
                        </span>

                    </div>

                    <div className="stat-number">
                        {totalAssets}
                    </div>

                    <p>
                        Assets being managed
                    </p>

                    <div className="stat-line" />

                </div>


                <div className="dashboard-stat-card red">

                    <div className="stat-top">

                        <div className="stat-icon">
                            !
                        </div>

                        <span className="stat-label">
                            CRITICAL
                        </span>

                    </div>

                    <div className="stat-number">
                        {criticalCount}
                    </div>

                    <p>
                        Require immediate attention
                    </p>

                    <div className="stat-line" />

                </div>


                <div className="dashboard-stat-card orange">

                    <div className="stat-top">

                        <div className="stat-icon">
                            ◷
                        </div>

                        <span className="stat-label">
                            ATTENTION
                        </span>

                    </div>

                    <div className="stat-number">
                        {attentionCount}
                    </div>

                    <p>
                        Coverage needs review
                    </p>

                    <div className="stat-line" />

                </div>


                <div className="dashboard-stat-card green">

                    <div className="stat-top">

                        <div className="stat-icon">
                            ✓
                        </div>

                        <span className="stat-label">
                            SAFE
                        </span>

                    </div>

                    <div className="stat-number">
                        {safeCount}
                    </div>

                    <p>
                        Coverage currently safe
                    </p>

                    <div className="stat-line" />

                </div>

            </section>


            {/* COVERAGE HEALTH + OVERLAPS */}

            <section className="dashboard-insight-grid">

                <div className="dashboard-health-card">

                    <div className="section-title-row">

                        <div>

                            <span className="section-kicker">
                                COVERAGE HEALTH
                            </span>

                            <h2>
                                Your vault at a glance
                            </h2>

                        </div>

                        <div className="health-circle">
                            <span>
                                {healthyPercentage}%
                            </span>
                        </div>

                    </div>

                    <p className="health-description">
                        Based on the current priority state of
                        your tracked coverage records.
                    </p>

                    <div className="health-bars">

                        <div className="health-row">

                            <div>
                                <span>Safe</span>

                                <strong>
                                    {safeCount}
                                </strong>
                            </div>

                            <div className="health-track">

                                <span
                                    className="health-fill safe-fill"
                                    style={{
                                        width:
                                            totalTracked > 0
                                                ? `${(safeCount / totalTracked) * 100}%`
                                                : "0%",
                                    }}
                                />

                            </div>

                        </div>


                        <div className="health-row">

                            <div>
                                <span>Attention</span>

                                <strong>
                                    {attentionCount}
                                </strong>
                            </div>

                            <div className="health-track">

                                <span
                                    className="health-fill attention-fill"
                                    style={{
                                        width:
                                            totalTracked > 0
                                                ? `${(attentionCount / totalTracked) * 100}%`
                                                : "0%",
                                    }}
                                />

                            </div>

                        </div>


                        <div className="health-row">

                            <div>
                                <span>Critical</span>

                                <strong>
                                    {criticalCount}
                                </strong>
                            </div>

                            <div className="health-track">

                                <span
                                    className="health-fill critical-fill"
                                    style={{
                                        width:
                                            totalTracked > 0
                                                ? `${(criticalCount / totalTracked) * 100}%`
                                                : "0%",
                                    }}
                                />

                            </div>

                        </div>


                        <div className="health-row">

                            <div>
                                <span>Lapsed</span>

                                <strong>
                                    {lapsedCount}
                                </strong>
                            </div>

                            <div className="health-track">

                                <span
                                    className="health-fill lapsed-fill"
                                    style={{
                                        width:
                                            totalTracked > 0
                                                ? `${(lapsedCount / totalTracked) * 100}%`
                                                : "0%",
                                    }}
                                />

                            </div>

                        </div>

                    </div>

                </div>


                <div className="dashboard-overlap-card">

                    <div className="overlap-visual">

                        <div className="overlap-ring">

                            <span>
                                {totalOverlaps}
                            </span>

                        </div>

                    </div>

                    <div>

                        <span className="section-kicker">
                            INTELLIGENCE
                        </span>

                        <h2>
                            Potential overlaps
                        </h2>

                        <p>
                            SmartVault found{" "}
                            <strong>
                                {totalOverlaps}
                            </strong>{" "}
                            potential coverage overlap
                            {totalOverlaps === 1
                                ? ""
                                : "s"}.
                        </p>

                        <small>
                            Overlap does not automatically mean
                            duplicate coverage. Review the actual
                            terms before making a decision.
                        </small>

                        {totalOverlaps > 0 && (
                            <div className="overlap-status">
                                <span />
                                Review recommended
                            </div>
                        )}

                    </div>

                </div>

            </section>


            {/* OVERLAP REPORT */}
            <section className="dashboard-section">
                <div className="section-heading">
                    <div>
                        <span className="section-kicker">OVERLAP REPORT</span>
                        <h2>Where your coverage overlaps</h2>
                    </div>
                    <span className="section-count">
                        {overlapList.length} overlap{overlapList.length === 1 ? "" : "s"}
                    </span>
                </div>
                {overlapList.length === 0 ? (
                    <div className="empty-success">
                        <div className="success-check">✓</div>
                        <div>
                            <h3>No overlapping coverage</h3>
                            <p>None of your coverage periods run on the same days.</p>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: "grid", gap: 12 }}>
                        {overlapList.map((o, i) => (
                            <div
                                key={`${o.asset_id}-${o.coverage_1}-${o.coverage_2}-${i}`}
                                style={{
                                    display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16,
                                    padding: 16, borderRadius: 14,
                                    border: "1px solid rgba(245,158,11,.45)",
                                    background: "rgba(245,158,11,.08)",
                                }}
                            >
                                <div style={{ flex: "1 1 280px" }}>
                                    <strong>{o.asset_name}</strong>
                                    <p style={{ margin: "4px 0" }}>
                                        {o.coverage_1_type} ↔ {o.coverage_2_type}
                                    </p>
                                    <small>
                                        Both active {fmtDate(o.overlap_start)} – {fmtDate(o.overlap_end)}
                                        {" • "}{o.overlap_days} days
                                    </small>
                                </div>
                                <button
                                    style={{ cursor: "pointer", font: "inherit", padding: "8px 14px", borderRadius: 8 }}
                                    onClick={() => navigate(`/asset/${o.asset_id}`)}
                                >
                                    Review &amp; fix →
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </section>


            {/* PRIORITY CENTER */}

            <section className="dashboard-section">

                <div className="section-heading">

                    <div>

                        <span className="section-kicker">
                            PRIORITY CENTER
                        </span>

                        <h2>
                            Needs your attention
                        </h2>

                    </div>

                    <span className="section-count">

                        {critical.length +
                            attention.length +
                            lapsed.length}{" "}

                        item
                        {critical.length +
                            attention.length +
                            lapsed.length === 1
                            ? ""
                            : "s"}

                    </span>

                </div>


                {attention.length === 0 &&
                    critical.length === 0 &&
                    lapsed.length === 0 ? (

                    <div className="empty-success">

                        <div className="success-check">
                            ✓
                        </div>

                        <div>

                            <h3>
                                Everything looks good
                            </h3>

                            <p>
                                No coverage currently requires
                                your attention.
                            </p>

                        </div>

                    </div>

                ) : (

                    <div className="priority-list">

                        {[...lapsed, ...critical, ...attention]
                            .slice(0, 5)
                            .map((item, index) => {

                                const status =
                                    item.days_remaining < 0
                                        ? "Lapsed"
                                        : item.priority;

                                return (
                                    <div
                                        className={`priority-item ${status.toLowerCase()}`}
                                        key={`${item.coverage_id}-${index}`}
                                    >

                                        <div className="priority-status">
                                            <span />
                                        </div>

                                        <div className="priority-main">

                                            <div className="priority-title-row">

                                                <h3>
                                                    {item.asset_name}
                                                </h3>

                                                <span
                                                    className={`priority-badge ${status.toLowerCase()}`}
                                                >
                                                    {status}
                                                </span>

                                            </div>

                                            <p>
                                                {item.coverage_type}
                                                {" • "}
                                                Expires{" "}
                                                {item.end_date}
                                            </p>

                                        </div>

                                        <div className="priority-days">

                                            <strong>
                                                {item.days_remaining < 0
                                                    ? "Lapsed"
                                                    : item.days_remaining}
                                            </strong>

                                            {item.days_remaining >= 0 && (
                                                <span>
                                                    days left
                                                </span>
                                            )}

                                        </div>

                                        <button
                                            onClick={() =>
                                                navigate(
                                                    `/asset/${item.asset_id}`
                                                )
                                            }
                                        >
                                            View →
                                        </button>

                                    </div>
                                );
                            })}

                    </div>

                )}

            </section>


            {/* ASSETS */}

            <section className="dashboard-section">

                <div className="section-heading">

                    <div>

                        <span className="section-kicker">
                            YOUR VAULT
                        </span>

                        <h2>
                            Managed assets
                        </h2>

                    </div>

                    <button
                        className="text-action"
                        onClick={() =>
                            navigate("/add-asset")
                        }
                    >
                        + Add asset
                    </button>

                </div>


                {assets.length === 0 ? (

                    <div className="empty-assets">

                        <div className="empty-assets-icon">
                            ◈
                        </div>

                        <h3>
                            Your vault is empty
                        </h3>

                        <p>
                            Add your first asset to start tracking
                            its coverage.
                        </p>

                        <button
                            onClick={() =>
                                navigate("/add-asset")
                            }
                        >
                            Add your first asset →
                        </button>

                    </div>

                ) : (

                    <div className="asset-grid">

                        {assets.map((asset, index) => (

                            <div
                                className="asset-dashboard-card"
                                key={asset.asset_id}
                                style={{
                                    animationDelay:
                                        `${index * 0.08}s`,
                                }}
                                onClick={() =>
                                    navigate(
                                        `/asset/${asset.asset_id}`
                                    )
                                }
                            >

                                <div className="asset-card-top">

                                    <div className="asset-symbol">

                                        {asset.asset_name
                                            ?.charAt(0)
                                            ?.toUpperCase() || "A"}

                                    </div>

                                    <span>
                                        →
                                    </span>

                                </div>

                                <h3>
                                    {asset.asset_name}
                                </h3>

                                <p>
                                    {asset.brand || "Asset"}

                                    {asset.model
                                        ? ` • ${asset.model}`
                                        : ""}
                                </p>

                                <div className="asset-card-footer">

                                    <span>
                                        {asset.category || "General"}
                                    </span>

                                    <span>
                                        ₹
                                        {Number(
                                            asset.purchase_value || 0
                                        ).toLocaleString("en-IN")}
                                    </span>

                                </div>

                                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                                    <button
                                        style={{ cursor: "pointer", font: "inherit", padding: "6px 12px", borderRadius: 8 }}
                                        onClick={(e) => { e.stopPropagation(); navigate(`/edit-asset/${asset.asset_id}`); }}>
                                        ✎ Edit
                                    </button>
                                    <button
                                        style={{ cursor: "pointer", font: "inherit", padding: "6px 12px", borderRadius: 8, background: "#dc2626", color: "#fff", border: "none" }}
                                        onClick={(e) => handleDeleteAsset(e, asset)}>
                                        Delete
                                    </button>
                                </div>

                            </div>

                        ))}

                    </div>

                )}

            </section>


            {/* SYSTEM STATUS */}

            <section className="dashboard-system-strip">

                <div className="system-pulse">
                    <span />
                </div>

                <div>

                    <strong>
                        SmartVault intelligence is active
                    </strong>

                    <p>
                        Priority scores and coverage overlap
                        analysis are calculated from your latest
                        coverage records.
                    </p>

                </div>

            </section>

        </div>
    );
}

export default Dashboard;