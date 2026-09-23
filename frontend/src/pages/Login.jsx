import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Login() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();

        setLoading(true);
        setMessage("");

        try {
            const response = await fetch(
                "http://localhost:5000/api/auth/login",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        email,
                        password
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                setMessage(data.message || "Login failed");
                setLoading(false);
                return;
            }

            localStorage.setItem("token", data.token);

            navigate("/dashboard");
        } catch (error) {
            console.error(error);
            setMessage("Unable to connect to server");
        }

        setLoading(false);
    };

    return (
        <div className="auth-page">

            {/* Background decoration */}
            <div className="auth-orb auth-orb-one" />
            <div className="auth-orb auth-orb-two" />

            <div className="auth-container">

                {/* LEFT SIDE */}

                <div className="auth-info">

                    <button
                        className="auth-back"
                        onClick={() => navigate("/")}
                    >
                        ← Back to SmartVault
                    </button>

                    <div className="auth-brand">
                        <div className="auth-logo">
                            ✓
                        </div>

                        <span>
                            Smart<span>Vault</span>
                        </span>
                    </div>

                    <div className="auth-info-content">

                        <div className="auth-label">
                            SECURE COVERAGE MANAGEMENT
                        </div>

                        <h1>
                            Everything important,
                            <br />
                            <span>within reach.</span>
                        </h1>

                        <p>
                            Access your assets, documents, coverage
                            records and priority insights from one
                            organized workspace.
                        </p>

                        <div className="auth-points">

                            <div>
                                <span>✓</span>
                                <p>
                                    Centralized document management
                                </p>
                            </div>

                            <div>
                                <span>✓</span>
                                <p>
                                    Potential coverage overlap detection
                                </p>
                            </div>

                            <div>
                                <span>✓</span>
                                <p>
                                    Explainable priority scoring
                                </p>
                            </div>

                        </div>

                    </div>

                    <div className="auth-footer-note">
                        Your coverage. Your documents. Your control.
                    </div>

                </div>


                {/* RIGHT SIDE */}

                <div className="auth-form-area">

                    <div className="auth-card">

                        <div className="mobile-auth-brand">
                            <div className="auth-logo">
                                ✓
                            </div>

                            <span>
                                Smart<span>Vault</span>
                            </span>
                        </div>

                        <div className="auth-heading">

                            <h2>
                                Welcome back
                            </h2>

                            <p>
                                Sign in to continue to your vault.
                            </p>

                        </div>

                        <form onSubmit={handleLogin}>

                            <div className="auth-field">

                                <label>
                                    Email address
                                </label>

                                <div className="input-wrapper">

                                    <span className="input-icon">
                                        @
                                    </span>

                                    <input
                                        type="email"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) =>
                                            setEmail(e.target.value)
                                        }
                                        required
                                    />

                                </div>

                            </div>


                            <div className="auth-field">

                                <div className="field-heading">

                                    <label>
                                        Password
                                    </label>

                                    <span>
                                        Secure login
                                    </span>

                                </div>

                                <div className="input-wrapper">

                                    <span className="input-icon">
                                        •
                                    </span>

                                    <input
                                        type="password"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) =>
                                            setPassword(e.target.value)
                                        }
                                        required
                                    />

                                </div>

                            </div>


                            {message && (
                                <div className="auth-error">
                                    <span>!</span>
                                    {message}
                                </div>
                            )}


                            <button
                                type="submit"
                                className="auth-submit"
                                disabled={loading}
                            >
                                {loading
                                    ? "Signing in..."
                                    : "Sign In"}

                                {!loading && (
                                    <span>→</span>
                                )}
                            </button>

                        </form>


                        <div className="auth-divider">
                            <span />
                            <p>New to SmartVault?</p>
                            <span />
                        </div>


                        <button
                            className="create-account-button"
                            onClick={() =>
                                navigate("/register")
                            }
                        >
                            Create an account
                        </button>


                        <p className="auth-security">
                            🔒 Your account is protected with secure
                            authentication.
                        </p>

                    </div>

                </div>

            </div>

        </div>
    );
}

export default Login;