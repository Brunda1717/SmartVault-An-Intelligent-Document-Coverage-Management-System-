import { useState } from "react";
import { useNavigate } from "react-router-dom";

function AddAsset() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        asset_name: "",
        category: "",
        brand: "",
        model: "",
        purchase_date: "",
        purchase_value: "",
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const categories = [
        { name: "Smartphone", icon: "📱" },
        { name: "Laptop", icon: "💻" },
        { name: "Television", icon: "📺" },
        { name: "Appliance", icon: "🏠" },
        { name: "Vehicle", icon: "🚗" },
        { name: "Other", icon: "◈" },
    ];

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value,
        });
    };

    const handleCategory = (category) => {
        setForm({
            ...form,
            category,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setError("");

        if (!form.asset_name.trim()) {
            setError("Please enter an asset name.");
            return;
        }

        if (!form.category) {
            setError("Please select an asset category.");
            return;
        }

        setLoading(true);

        try {
            const token = localStorage.getItem("token");

            const response = await fetch(
                "http://localhost:5000/api/assets",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        ...form,
                        purchase_value:
                            form.purchase_value === ""
                                ? 0
                                : Number(form.purchase_value),
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                setError(
                    data.message || "Failed to create asset."
                );
                setLoading(false);
                return;
            }

            navigate(`/asset/${data.asset_id}`);
        } catch (error) {
            console.error(error);
            setError("Unable to connect to server.");
        }

        setLoading(false);
    };

    return (
        <div className="add-asset-page">

            <div className="add-asset-background-orb orb-one" />
            <div className="add-asset-background-orb orb-two" />

            <div className="add-asset-container">

                <div className="add-asset-header">

                    <button
                        className="back-button"
                        onClick={() => navigate("/dashboard")}
                    >
                        ← Dashboard
                    </button>

                    <div className="add-asset-title">
                        <span className="section-kicker">
                            BUILD YOUR VAULT
                        </span>

                        <h1>
                            Add a new asset
                        </h1>

                        <p>
                            Start by telling SmartVault what
                            you want to protect and track.
                        </p>
                    </div>

                    <div className="asset-step-indicator">
                        <span className="active">01</span>
                        <div />
                        <span>02</span>
                    </div>

                </div>

                <div className="add-asset-layout">

                    <aside className="asset-preview-card">

                        <div className="preview-glow" />

                        <div className="preview-icon">
                            {form.category
                                ? categories.find(
                                      (item) =>
                                          item.name ===
                                          form.category
                                  )?.icon
                                : "◈"}
                        </div>

                        <span className="preview-label">
                            ASSET PREVIEW
                        </span>

                        <h2>
                            {form.asset_name ||
                                "Your asset"}
                        </h2>

                        <p>
                            {form.brand ||
                                "Brand"}
                            {form.model
                                ? ` • ${form.model}`
                                : ""}
                        </p>

                        <div className="preview-divider" />

                        <div className="preview-info">
                            <span>Category</span>
                            <strong>
                                {form.category ||
                                    "Not selected"}
                            </strong>
                        </div>

                        <div className="preview-info">
                            <span>Purchase value</span>
                            <strong>
                                ₹
                                {Number(
                                    form.purchase_value || 0
                                ).toLocaleString("en-IN")}
                            </strong>
                        </div>

                        <div className="preview-info">
                            <span>Purchase date</span>
                            <strong>
                                {form.purchase_date ||
                                    "Not added"}
                            </strong>
                        </div>

                        <div className="preview-tip">
                            <span>✦</span>
                            <p>
                                You can add warranties,
                                protection plans and other
                                coverage after creating this
                                asset.
                            </p>
                        </div>

                    </aside>

                    <main className="asset-form-card">

                        <div className="form-card-heading">

                            <div>
                                <span className="form-number">
                                    01
                                </span>

                                <div>
                                    <h2>
                                        Asset information
                                    </h2>

                                    <p>
                                        Add the basic details of
                                        the item you want to
                                        manage.
                                    </p>
                                </div>
                            </div>

                        </div>

                        <form onSubmit={handleSubmit}>

                            <div className="form-group">
                                <label>
                                    Asset name
                                    <span>*</span>
                                </label>

                                <input
                                    name="asset_name"
                                    value={
                                        form.asset_name
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="e.g. Samsung Galaxy S24"
                                />
                            </div>

                            <div className="form-group">

                                <label>
                                    Category
                                    <span>*</span>
                                </label>

                                <div className="category-grid">

                                    {categories.map(
                                        (category) => (
                                            <button
                                                type="button"
                                                key={
                                                    category.name
                                                }
                                                className={`category-option ${
                                                    form.category ===
                                                    category.name
                                                        ? "selected"
                                                        : ""
                                                }`}
                                                onClick={() =>
                                                    handleCategory(
                                                        category.name
                                                    )
                                                }
                                            >
                                                <span>
                                                    {
                                                        category.icon
                                                    }
                                                </span>

                                                <strong>
                                                    {
                                                        category.name
                                                    }
                                                </strong>
                                            </button>
                                        )
                                    )}

                                </div>

                            </div>

                            <div className="form-row">

                                <div className="form-group">
                                    <label>
                                        Brand
                                    </label>

                                    <input
                                        name="brand"
                                        value={form.brand}
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="e.g. Samsung"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>
                                        Model
                                    </label>

                                    <input
                                        name="model"
                                        value={form.model}
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="e.g. Galaxy S24"
                                    />
                                </div>

                            </div>

                            <div className="form-row">

                                <div className="form-group">
                                    <label>
                                        Purchase date
                                    </label>

                                    <input
                                        type="date"
                                        name="purchase_date"
                                        value={
                                            form.purchase_date
                                        }
                                        onChange={
                                            handleChange
                                        }
                                    />
                                </div>

                                <div className="form-group">
                                    <label>
                                        Purchase value
                                    </label>

                                    <div className="currency-input">
                                        <span>₹</span>

                                        <input
                                            type="number"
                                            name="purchase_value"
                                            value={
                                                form.purchase_value
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            placeholder="50000"
                                            min="0"
                                        />
                                    </div>
                                </div>

                            </div>

                            {error && (
                                <div className="asset-form-error">
                                    <span>!</span>
                                    {error}
                                </div>
                            )}

                            <div className="form-actions">

                                <button
                                    type="button"
                                    className="form-cancel-button"
                                    onClick={() =>
                                        navigate(
                                            "/dashboard"
                                        )
                                    }
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="form-submit-button"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <span className="button-spinner" />
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            Create asset
                                            <span>→</span>
                                        </>
                                    )}
                                </button>

                            </div>

                        </form>

                    </main>

                </div>

            </div>
        </div>
    );
}

export default AddAsset;