import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function Logo() {
    return (
        <div className="brand">
            <div className="brand-logo">
                <svg
                    viewBox="0 0 48 48"
                    width="30"
                    height="30"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        d="M24 4L39 10V21C39 31.5 32.8 40.2 24 44C15.2 40.2 9 31.5 9 21V10L24 4Z"
                        fill="url(#logoGradient)"
                    />
                    <path
                        d="M24 10L33 13.6V21C33 27.9 29.3 33.9 24 36.8C18.7 33.9 15 27.9 15 21V13.6L24 10Z"
                        fill="white"
                        fillOpacity="0.96"
                    />
                    <path
                        d="M19 22.5L22.5 26L29.5 18.5"
                        stroke="#3155D9"
                        strokeWidth="2.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <defs>
                        <linearGradient
                            id="logoGradient"
                            x1="9"
                            y1="4"
                            x2="39"
                            y2="44"
                            gradientUnits="userSpaceOnUse"
                        >
                            <stop stopColor="#3155D9" />
                            <stop offset="1" stopColor="#6D5DF5" />
                        </linearGradient>
                    </defs>
                </svg>
            </div>

            <span className="brand-text">
                Smart<span>Vault</span>
            </span>
        </div>
    );
}

function Landing() {
    const navigate = useNavigate();

    useEffect(() => {
        const elements = document.querySelectorAll(".reveal");

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("visible");
                    }
                });
            },
            {
                threshold: 0.12
            }
        );

        elements.forEach((element) => observer.observe(element));

        return () => observer.disconnect();
    }, []);

    return (
        <div className="landing">

            {/* ================= NAVBAR ================= */}

            <nav className="landing-navbar">
                <div className="nav-inner">
                    <Logo />

                    <div className="nav-links">
                        <a href="#how-it-works">How It Works</a>
                        <a href="#features">Features</a>
                        <a href="#intelligence">Intelligence</a>
                    </div>

                    <div className="nav-actions">
                        <button
                            className="nav-login"
                            onClick={() => navigate("/login")}
                        >
                            Sign In
                        </button>

                        <button
                            className="nav-start"
                            onClick={() => navigate("/register")}
                        >
                            Get Started
                            <span>→</span>
                        </button>
                    </div>
                </div>
            </nav>

            {/* ================= HERO ================= */}

            <section className="hero">

                <div className="hero-background-shape shape-one" />
                <div className="hero-background-shape shape-two" />

                <div className="hero-inner">

                    <div className="hero-content reveal">

                        <div className="hero-label">
                            <span className="status-dot" />
                            Smart document & coverage management
                        </div>

                        <h1>
                            Your documents.
                            <br />
                            Your coverage.
                            <br />
                            <span>Under control.</span>
                        </h1>

                        <p className="hero-description">
                            SmartVault helps you organize important documents,
                            manage multiple coverage records, identify
                            potential overlaps, and stay ahead of coverage deadlines.
                        </p>

                        <div className="hero-buttons">

                            <button
                                className="primary-button"
                                onClick={() => navigate("/register")}
                            >
                                Create Your Vault
                                <span>→</span>
                            </button>

                            <a
                                className="secondary-button"
                                href="#how-it-works"
                            >
                                See How It Works
                                <span>↓</span>
                            </a>

                        </div>

                        <div className="hero-trust">

                            <div className="trust-item">
                                <strong>01</strong>
                                <span>Organize</span>
                            </div>

                            <div className="trust-line" />

                            <div className="trust-item">
                                <strong>02</strong>
                                <span>Analyze</span>
                            </div>

                            <div className="trust-line" />

                            <div className="trust-item">
                                <strong>03</strong>
                                <span>Act</span>
                            </div>

                        </div>

                    </div>

                    {/* ================= HERO VISUAL ================= */}

                    <div className="hero-visual reveal">

                        <div className="dashboard-window">

                            <div className="window-top">
                                <div className="window-dots">
                                    <span />
                                    <span />
                                    <span />
                                </div>

                                <span className="window-title">
                                    SmartVault
                                </span>
                            </div>

                            <div className="mock-dashboard">

                                <div className="mock-sidebar">

                                    <div className="mock-logo-small">
                                        <div className="mini-shield">
                                            ✓
                                        </div>
                                        SmartVault
                                    </div>

                                    <div className="mock-menu active">
                                        <span>⌂</span>
                                        Dashboard
                                    </div>

                                    <div className="mock-menu">
                                        <span>▣</span>
                                        Assets
                                    </div>

                                    <div className="mock-menu">
                                        <span>◈</span>
                                        Coverage
                                    </div>

                                    <div className="mock-menu">
                                        <span>□</span>
                                        Documents
                                    </div>

                                    <div className="mock-menu">
                                        <span>◷</span>
                                        Reminders
                                    </div>

                                </div>

                                <div className="mock-main">

                                    <div className="mock-heading">
                                        <div>
                                            <small>OVERVIEW</small>
                                            <h3>Your Coverage</h3>
                                        </div>

                                        <div className="mock-date">
                                            Today
                                        </div>
                                    </div>

                                    <div className="mock-stats">

                                        <div className="mock-stat">
                                            <small>Assets</small>
                                            <strong>04</strong>
                                            <span>Tracked</span>
                                        </div>

                                        <div className="mock-stat green">
                                            <small>Active</small>
                                            <strong>06</strong>
                                            <span>Coverage</span>
                                        </div>

                                        <div className="mock-stat orange">
                                            <small>Attention</small>
                                            <strong>02</strong>
                                            <span>Required</span>
                                        </div>

                                    </div>

                                    <div className="mock-panels">

                                        <div className="mock-panel priority-panel">

                                            <div className="panel-title">
                                                Priority Overview
                                            </div>

                                            <div className="priority-bars">

                                                <div>
                                                    <span>
                                                        Critical
                                                    </span>
                                                    <div className="bar">
                                                        <i className="critical-bar" />
                                                    </div>
                                                </div>

                                                <div>
                                                    <span>
                                                        Attention
                                                    </span>
                                                    <div className="bar">
                                                        <i className="attention-bar" />
                                                    </div>
                                                </div>

                                                <div>
                                                    <span>
                                                        Safe
                                                    </span>
                                                    <div className="bar">
                                                        <i className="safe-bar" />
                                                    </div>
                                                </div>

                                            </div>

                                        </div>

                                        <div className="mock-panel">

                                            <div className="panel-title">
                                                Upcoming
                                            </div>

                                            <div className="upcoming-item">
                                                <div className="item-icon">
                                                    S
                                                </div>

                                                <div>
                                                    <strong>
                                                        Smartphone
                                                    </strong>
                                                    <small>
                                                        Warranty
                                                    </small>
                                                </div>

                                                <span>
                                                    12d
                                                </span>
                                            </div>

                                            <div className="upcoming-item">
                                                <div className="item-icon purple">
                                                    T
                                                </div>

                                                <div>
                                                    <strong>
                                                        Television
                                                    </strong>
                                                    <small>
                                                        Extended Warranty
                                                    </small>
                                                </div>

                                                <span>
                                                    48d
                                                </span>
                                            </div>

                                        </div>

                                    </div>

                                </div>

                            </div>
                        </div>

                        <div className="floating-card floating-reminder">
                            <div className="floating-icon orange">
                                !
                            </div>

                            <div>
                                <strong>Attention required</strong>
                                <span>Coverage expires in 7 days</span>
                            </div>
                        </div>

                        <div className="floating-card floating-overlap">
                            <div className="floating-icon blue">
                                ↔
                            </div>

                            <div>
                                <strong>Potential overlap</strong>
                                <span>2 coverage periods intersect</span>
                            </div>
                        </div>

                    </div>

                </div>

                <div className="hero-scroll">
                    <span>Scroll to explore</span>
                    <div className="scroll-arrow">↓</div>
                </div>

            </section>

            {/* ================= WHAT WE DO ================= */}

            <section className="section what-section" id="how-it-works">

                <div className="section-heading reveal">

                    <div className="section-label">
                        HOW SMARTVAULT WORKS
                    </div>

                    <h2>
                        From documents to
                        <span> useful decisions.</span>
                    </h2>

                    <p>
                        SmartVault does more than store files. It turns your
                        coverage information into something you can actually
                        understand and act on.
                    </p>

                </div>

                <div className="process-line">

                    <div className="process-step reveal">
                        <div className="step-number">
                            01
                        </div>

                        <div className="step-icon">
                            +
                        </div>

                        <h3>Add your asset</h3>

                        <p>
                            Enter basic details such as the asset name,
                            category, purchase date and value.
                        </p>
                    </div>

                    <div className="process-connector" />

                    <div className="process-step reveal">
                        <div className="step-number">
                            02
                        </div>

                        <div className="step-icon">
                            □
                        </div>

                        <h3>Store coverage</h3>

                        <p>
                            Add warranties, extended warranties and other
                            coverage records with their validity periods.
                        </p>
                    </div>

                    <div className="process-connector" />

                    <div className="process-step reveal">
                        <div className="step-number">
                            03
                        </div>

                        <div className="step-icon">
                            ↔
                        </div>

                        <h3>Detect overlaps</h3>

                        <p>
                            SmartVault compares coverage periods and flags
                            potential overlaps for you to review.
                        </p>
                    </div>

                    <div className="process-connector" />

                    <div className="process-step reveal">
                        <div className="step-number">
                            04
                        </div>

                        <div className="step-icon">
                            ✓
                        </div>

                        <h3>Know what matters</h3>

                        <p>
                            A transparent priority score shows which coverage
                            needs your attention first.
                        </p>
                    </div>

                </div>

            </section>

            {/* ================= FEATURES ================= */}

            <section className="section features-section" id="features">

                <div className="section-heading reveal">

                    <div className="section-label">
                        BUILT FOR REAL PROBLEMS
                    </div>

                    <h2>
                        Everything important,
                        <span> in one place.</span>
                    </h2>

                </div>

                <div className="feature-grid">

                    <div className="feature-card large reveal">

                        <div className="feature-number">
                            01
                        </div>

                        <div className="feature-icon blue-icon">
                            ▣
                        </div>

                        <h3>Centralized Document Vault</h3>

                        <p>
                            Keep warranty and coverage documents connected
                            to the assets they belong to instead of searching
                            through folders and messages.
                        </p>

                        <div className="feature-visual document-visual">
                            <div className="document-stack">
                                <div>PDF</div>
                                <div>PDF</div>
                                <div>DOC</div>
                            </div>
                        </div>

                    </div>

                    <div className="feature-card reveal">

                        <div className="feature-number">
                            02
                        </div>

                        <div className="feature-icon purple-icon">
                            ↔
                        </div>

                        <h3>Potential Overlap Detection</h3>

                        <p>
                            Identify when two coverage periods apply to the
                            same asset at the same time.
                        </p>

                        <div className="timeline-visual">

                            <div className="timeline-line">
                                <span />
                                <span />
                            </div>

                            <div className="timeline-row">
                                <label>Warranty</label>
                                <div className="timeline-bar first" />
                            </div>

                            <div className="timeline-row">
                                <label>Extended</label>
                                <div className="timeline-bar second" />
                            </div>

                        </div>

                    </div>

                    <div className="feature-card reveal">

                        <div className="feature-number">
                            03
                        </div>

                        <div className="feature-icon green-icon">
                            ✓
                        </div>

                        <h3>Explainable Priorities</h3>

                        <p>
                            Understand why something is marked Critical,
                            Attention or Safe instead of seeing an unexplained
                            number.
                        </p>

                        <div className="score-visual">
                            <strong>70</strong>
                            <span>Priority Score</span>
                        </div>

                    </div>

                    <div className="feature-card wide reveal">

                        <div className="feature-number">
                            04
                        </div>

                        <div className="feature-icon orange-icon">
                            ◷
                        </div>

                        <h3>Expiry Awareness</h3>

                        <p>
                            SmartVault calculates remaining coverage time and
                            highlights upcoming expirations with 30-day and
                            7-day reminders.
                        </p>

                        <div className="expiry-visual">

                            <div>
                                <small>Coverage</small>
                                <strong>7 days</strong>
                            </div>

                            <div className="expiry-progress">
                                <span />
                            </div>

                            <div className="expiry-alert">
                                Attention
                            </div>

                        </div>

                    </div>

                </div>

            </section>

            {/* ================= INTELLIGENCE ================= */}

            <section
                className="intelligence-section"
                id="intelligence"
            >

                <div className="intelligence-inner">

                    <div className="intelligence-content reveal">

                        <div className="section-label light">
                            THE INTELLIGENCE BEHIND SMARTVAULT
                        </div>

                        <h2>
                            Not just information.
                            <br />
                            <span>Useful context.</span>
                        </h2>

                        <p>
                            SmartVault combines coverage dates, asset value
                            and coverage situations to produce a transparent
                            priority score.
                        </p>

                        <div className="reason-list">

                            <div>
                                <span>01</span>
                                <p>
                                    <strong>Expiry urgency</strong>
                                    <br />
                                    How soon the coverage ends.
                                </p>
                            </div>

                            <div>
                                <span>02</span>
                                <p>
                                    <strong>Asset value</strong>
                                    <br />
                                    Higher-value assets receive more
                                    attention.
                                </p>
                            </div>

                            <div>
                                <span>03</span>
                                <p>
                                    <strong>Coverage situation</strong>
                                    <br />
                                    Potential overlapping coverage is
                                    highlighted.
                                </p>
                            </div>

                        </div>

                    </div>

                    <div className="intelligence-card reveal">

                        <div className="score-header">
                            <span>PRIORITY ANALYSIS</span>
                            <span className="live-indicator">
                                LIVE
                            </span>
                        </div>

                        <div className="big-score">
                            <strong>70</strong>
                            <span>Critical</span>
                        </div>

                        <div className="score-reason">

                            <div>
                                <span>Expiry urgency</span>
                                <strong>+50</strong>
                            </div>

                            <div>
                                <span>Asset value</span>
                                <strong>+10</strong>
                            </div>

                            <div>
                                <span>Coverage situation</span>
                                <strong>+10</strong>
                            </div>

                        </div>

                        <div className="score-total">
                            <span>Total Priority Score</span>
                            <strong>70 / 100</strong>
                        </div>

                    </div>

                </div>

            </section>

            {/* ================= FINAL CTA ================= */}

            <section className="final-section reveal">

                <div className="final-background" />

                <div className="final-content">

                    <div className="final-logo">
                        <Logo />
                    </div>

                    <h2>
                        Stop searching.
                        <br />
                        Start knowing.
                    </h2>

                    <p>
                        Bring your documents and coverage information
                        together with SmartVault.
                    </p>

                    <button
                        className="primary-button"
                        onClick={() => navigate("/register")}
                    >
                        Create Your Vault
                        <span>→</span>
                    </button>

                </div>

            </section>

            {/* ================= FOOTER ================= */}

            <footer className="landing-footer">

                <Logo />

                <p>
                    SmartVault — intelligent document and coverage
                    management.
                </p>

                <span>
                    © 2026 SmartVault
                </span>

            </footer>

        </div>
    );
}

export default Landing;