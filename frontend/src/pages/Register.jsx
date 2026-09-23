import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Register() {
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleRegister = async (e) => {
        e.preventDefault();

        setMessage("");

        if (password !== confirmPassword) {
            setMessage("Passwords do not match.");
            return;
        }

        if (password.length < 6) {
            setMessage("Password must contain at least 6 characters.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(
                "http://localhost:5000/api/auth/register",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        name,
                        email,
                        password
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                setMessage(data.message || "Registration failed.");
                setLoading(false);
                return;
            }

            navigate("/login");

        } catch (error) {
            console.error(error);
            setMessage("Unable to connect to server.");
        }

        setLoading(false);
    };

    return (
        <div className="auth-page register-page">

            <div className="auth-orb auth-orb-one" />
            <div className="auth-orb auth-orb-two" />

            <div className="auth-container register-container">

                {/* LEFT */}

                <div className="auth-info register-info">

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
                            START YOUR SMARTVAULT
                        </div>

                        <h1>
                            Bring everything
                            <br />
                            <span>under control.</span>
                        </h1>

                        <p>
                            Create your personal vault and start organizing
                            assets, documents and coverage information in one
                            place.
                        </p>

                        <div className="register-steps">

                            <div className="register-step active">
                                <div className="register-step-number">
                                    1
                                </div>

                                <div>
                                    <strong>Create your account</strong>
                                    <span>
                                        Set up your secure SmartVault login.
                                    </span>
                                </div>
                            </div>

                            <div className="register-step-line" />

                            <div className="register-step">
                                <div className="register-step-number">
                                    2
                                </div>

                                <div>
                                    <strong>Add your assets</strong>
                                    <span>
                                        Start with your phone, TV, vehicle or
                                        other important asset.
                                    </span>
                                </div>
                            </div>

                            <div className="register-step-line" />

                            <div className="register-step">
                                <div className="register-step-number">
                                    3
                                </div>

                                <div>
                                    <strong>Stay ahead</strong>
                                    <span>
                                        Track coverage, overlaps and expiry
                                        priorities.
                                    </span>
                                </div>
                            </div>

                        </div>

                    </div>

                    <div className="auth-footer-note">
                        One place for everything that protects what matters.
                    </div>

                </div>


                {/* RIGHT */}

                <div className="auth-form-area">

                    <div className="auth-card register-card">

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
                                Create your account
                            </h2>

                            <p>
                                Start managing your coverage smarter.
                            </p>

                        </div>

                        <form onSubmit={handleRegister}>

                            {/* NAME */}

                            <div className="auth-field">

                                <label>
                                    Full name
                                </label>

                                <div className="input-wrapper">

                                    <span className="input-icon">
                                        ◯
                                    </span>

                                    <input
                                        type="text"
                                        placeholder="Your name"
                                        value={name}
                                        onChange={(e) =>
                                            setName(e.target.value)
                                        }
                                        required
                                    />

                                </div>

                            </div>


                            {/* EMAIL */}

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


                            {/* PASSWORD */}

                            <div className="auth-field">

                                <label>
                                    Password
                                </label>

                                <div className="input-wrapper">

                                    <span className="input-icon">
                                        •
                                    </span>

                                    <input
                                        type="password"
                                        placeholder="At least 6 characters"
                                        value={password}
                                        onChange={(e) =>
                                            setPassword(e.target.value)
                                        }
                                        required
                                    />

                                </div>

                            </div>


                            {/* CONFIRM PASSWORD */}

                            <div className="auth-field">

                                <label>
                                    Confirm password
                                </label>

                                <div className="input-wrapper">

                                    <span className="input-icon">
                                        ✓
                                    </span>

                                    <input
                                        type="password"
                                        placeholder="Re-enter your password"
                                        value={confirmPassword}
                                        onChange={(e) =>
                                            setConfirmPassword(
                                                e.target.value
                                            )
                                        }
                                        required
                                    />

                                </div>

                            </div>


                            {/* PASSWORD STRENGTH */}

                            {password && (
                                <div className="password-strength">

                                    <div className="strength-track">
                                        <span
                                            className={
                                                password.length >= 10
                                                    ? "strong"
                                                    : password.length >= 6
                                                    ? "medium"
                                                    : "weak"
                                            }
                                        />
                                    </div>

                                    <span>
                                        {password.length >= 10
                                            ? "Strong password"
                                            : password.length >= 6
                                            ? "Good password"
                                            : "Password is too short"}
                                    </span>

                                </div>
                            )}


                            {/* ERROR */}

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
                                    ? "Creating account..."
                                    : "Create Account"}

                                {!loading && (
                                    <span>→</span>
                                )}
                            </button>

                        </form>


                        <div className="auth-divider">
                            <span />
                            <p>Already have an account?</p>
                            <span />
                        </div>


                        <button
                            className="create-account-button"
                            onClick={() => navigate("/login")}
                        >
                            Sign in instead
                        </button>


                        <p className="auth-security">
                            🔒 Your password is securely protected.
                        </p>

                    </div>

                </div>

            </div>

        </div>
    );
}

export default Register;