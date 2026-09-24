import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function Dashboard() {
    const navigate = useNavigate();

    const [summary, setSummary] = useState(null);
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

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
                                    Authorization: `Bearer ${token}`
                                }
                            }
                        ),

                        fetch(
                            "http://localhost:5000/api/assets",
                            {
                                headers: {
                                    Authorization: `Bearer ${token}`
                                }
                            }
                        )
                    ]);

                const summaryData =
                    await summaryResponse.json();

                const assetsData =
                    await assetsResponse.json();

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
                    onClick={() =>
                        window.location.reload()
                    }
                >
                    Try Again
                </button>
            </div>
        );
    }

    const critical =
        summary?.buckets?.Critical || [];

    const attention =
        summary?.buckets?.Attention || [];

    const safe =
        summary?.buckets?.Safe || [];

    const lapsed =
        summary?.buckets?.Lapsed || [];

    const totalAssets = assets.length;

    const totalTracked =
        critical.length +
        attention.length +
        safe.length +
        lapsed.length;

    const healthyPercentage =
        totalTracked > 0
            ? Math.round(
                  ((safe.length) / totalTracked) * 100
              )
            : 0;

    return (
        <div className="dashboard-page">

            {/* =========================================
                HEADER
            ========================================= */}

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


            {/* =========================================
                STATS
            ========================================= */}

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
                        {critical.length}
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
                        {attention.length}
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
                        {safe.length}
                    </div>

                    <p>
                        Coverage currently safe
                    </p>

                    <div className="stat-line" />

                </div>

            </section>


            {/* =========================================
                HEALTH + OVERLAP
            ========================================= */}

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
                                <span>
                                    Safe
                                </span>

                                <strong>
                                    {safe.length}
                                </strong>
                            </div>

                            <div className="health-track">
                                <span
                                    className="health-fill safe-fill"
                                    style={{
                                        width:
                                            totalTracked > 0
                                                ? `${(safe.length / totalTracked) * 100}%`
                                                : "0%"
                                    }}
                                />
                            </div>

                        </div>


                        <div className="health-row">

                            <div>
                                <span>
                                    Attention
                                </span>

                                <strong>
                                    {attention.length}
                                </strong>
                            </div>

                            <div className="health-track">
                                <span
                                    className="health-fill attention-fill"
                                    style={{
                                        width:
                                            totalTracked > 0
                                                ? `${(attention.length / totalTracked) * 100}%`
                                                : "0%"
                                    }}
                                />
                            </div>

                        </div>


                        <div className="health-row">

                            <div>
                                <span>
                                    Critical
                                </span>

                                <strong>
                                    {critical.length}
                                </strong>
                            </div>

                            <div className="health-track">
                                <span
                                    className="health-fill critical-fill"
                                    style={{
                                        width:
                                            totalTracked > 0
                                                ? `${(critical.length / totalTracked) * 100}%`
                                                : "0%"
                                    }}
                                />
                            </div>

                        </div>


                        <div className="health-row">

                            <div>
                                <span>
                                    Lapsed
                                </span>

                                <strong>
                                    {lapsed.length}
                                </strong>
                            </div>

                            <div className="health-track">
                                <span
                                    className="health-fill lapsed-fill"
                                    style={{
                                        width:
                                            totalTracked > 0
                                                ? `${(lapsed.length / totalTracked) * 100}%`
                                                : "0%"
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
                                {summary.total_overlaps}
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
                                {summary.total_overlaps}
                            </strong>{" "}
                            potential coverage overlap
                            {summary.total_overlaps === 1
                                ? ""
                                : "s"}.
                        </p>

                        <small>
                            Overlap does not automatically mean
                            duplicate coverage. Review the actual
                            terms before making a decision.
                        </small>

                        {summary.total_overlaps > 0 && (
                            <div className="overlap-status">
                                <span />
                                Review recommended
                            </div>
                        )}

                    </div>

                </div>

            </section>


            {/* =========================================
                ATTENTION
            ========================================= */}

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
                        {attention.length} item
                        {attention.length === 1
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

                                const isLapsed =
                                    lapsed.some(
                                        (x) =>
                                            x.asset_id ===
                                            item.asset_id
                                    );

                                const isCritical =
                                    critical.some(
                                        (x) =>
                                            x.asset_id ===
                                            item.asset_id
                                    );

                                const status =
                                    isLapsed
                                        ? "Lapsed"
                                        : isCritical
                                        ? "Critical"
                                        : "Attention";

                                return (
                                    <div
                                        className={`priority-item ${status.toLowerCase()}`}
                                        key={`${item.asset_id}-${index}`}
                                    >

                                        <div className="priority-status">
                                            <span />
                                        </div>

                                        <div className="priority-main">

                                            <div className="priority-title-row">

                                                <h3>
                                                    {item.asset_name}
                                                </h3>

                                                <span className={`priority-badge ${status.toLowerCase()}`}>
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


            {/* =========================================
                ASSETS
            ========================================= */}

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
                                        `${index * 0.08}s`
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
                                        {asset.category ||
                                            "General"}
                                    </span>

                                    <span>
                                        ₹
                                        {Number(
                                            asset.purchase_value || 0
                                        ).toLocaleString("en-IN")}
                                    </span>

                                </div>

                            </div>

                        ))}

                    </div>

                )}

            </section>


            {/* =========================================
                BOTTOM SYSTEM STRIP
            ========================================= */}

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