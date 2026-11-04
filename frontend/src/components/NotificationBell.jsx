import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

const API = "http://localhost:5000/api/notifications";
const colors = { info: "#3b82f6", warning: "#f59e0b", critical: "#ef4444" };
const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

const linkBtn = {
    background: "none", border: "none", color: "#93c5fd",
    cursor: "pointer", font: "inherit", fontSize: 13, padding: 0,
};

function NotificationBell() {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [unread, setUnread] = useState(0);
    const [pos, setPos] = useState({ top: 0, right: 0 });
    const buttonRef = useRef(null);
    const panelRef = useRef(null);

    const load = useCallback(async () => {
        try {
            const res = await fetch(API, { headers: authHeader() });
            if (!res.ok) return;
            const data = await res.json();
            setItems(data.notifications || []);
            setUnread(data.unread || 0);
        } catch {
            /* server offline: ignore */
        }
    }, []);

    useEffect(() => {
        load();
        const timer = setInterval(load, 60000);
        return () => clearInterval(timer);
    }, [load]);

    // close on outside click (the panel lives in <body>, so check both elements)
    useEffect(() => {
        const onClick = (e) => {
            if (buttonRef.current?.contains(e.target)) return;
            if (panelRef.current?.contains(e.target)) return;
            setOpen(false);
        };
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, []);

    // the panel is fixed-position, so close it if the page scrolls or resizes
    useEffect(() => {
        if (!open) return;
        const close = () => setOpen(false);
        window.addEventListener("scroll", close);
        window.addEventListener("resize", close);
        return () => {
            window.removeEventListener("scroll", close);
            window.removeEventListener("resize", close);
        };
    }, [open]);

    const toggle = () => {
        if (!open && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setPos({
                top: rect.bottom + 8,
                right: Math.max(8, window.innerWidth - rect.right),
            });
        }
        setOpen(!open);
    };

    const markRead = async (n) => {
        if (n.is_read) return;
        await fetch(`${API}/${n.notification_id}/read`, { method: "PATCH", headers: authHeader() });
        load();
    };

    const markAll = async () => {
        await fetch(`${API}/read-all`, { method: "PATCH", headers: authHeader() });
        load();
    };

    const remove = async (e, n) => {
        e.stopPropagation();
        await fetch(`${API}/${n.notification_id}`, { method: "DELETE", headers: authHeader() });
        load();
    };

    const checkNow = async () => {
        await fetch(`${API}/check-now`, { method: "POST", headers: authHeader() });
        load();
    };

    const openItem = async (n) => {
        await markRead(n);
        setOpen(false);
        if (n.asset_id) navigate(`/asset/${n.asset_id}`);
    };

    const panel = (
        <div
            ref={panelRef}
            style={{
                position: "fixed", top: pos.top, right: pos.right,
                width: "min(380px, calc(100vw - 16px))",
                maxHeight: "min(440px, calc(100vh - 100px))", overflowY: "auto",
                background: "#111827", color: "#f9fafb",
                border: "1px solid #374151", borderRadius: 12,
                zIndex: 2147483647,
                boxShadow: "0 12px 32px rgba(0,0,0,.45)", textAlign: "left",
            }}
        >
            <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "12px 14px", borderBottom: "1px solid #374151",
            }}>
                <strong>Notifications {unread > 0 && `(${unread} new)`}</strong>
                <span style={{ display: "flex", gap: 12 }}>
                    <button style={linkBtn} onClick={checkNow}>↻ Check now</button>
                    <button style={linkBtn} onClick={markAll}>Mark all read</button>
                </span>
            </div>

            {items.length === 0 ? (
                <p style={{ padding: 20, opacity: 0.7, margin: 0 }}>
                    No notifications yet. Reminders appear here when coverage is
                    about to expire, expires, or overlaps.
                </p>
            ) : (
                items.map((n) => (
                    <div
                        key={n.notification_id}
                        onClick={() => openItem(n)}
                        style={{
                            display: "flex", gap: 10, padding: "12px 14px", cursor: "pointer",
                            borderBottom: "1px solid #1f2937",
                            borderLeft: `4px solid ${colors[n.severity] || colors.info}`,
                            background: n.is_read ? "transparent" : "rgba(59,130,246,.10)",
                        }}
                    >
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: n.is_read ? 500 : 700, fontSize: 14 }}>
                                {n.title}
                            </div>
                            <div style={{ fontSize: 13, opacity: 0.85, margin: "4px 0" }}>
                                {n.message}
                            </div>
                            <small style={{ opacity: 0.6 }}>
                                {String(n.created_at).slice(0, 16).replace("T", " ")}
                                {" • "}email {n.email_status}
                            </small>
                        </div>
                        <button
                            onClick={(e) => remove(e, n)}
                            title="Delete"
                            style={{ ...linkBtn, color: "#9ca3af", alignSelf: "flex-start" }}
                        >
                            ✕
                        </button>
                    </div>
                ))
            )}
        </div>
    );

    return (
        <div style={{ position: "relative", display: "inline-block" }}>
            <button
                ref={buttonRef}
                onClick={toggle}
                aria-label="Notifications"
                style={{
                    position: "relative", cursor: "pointer", font: "inherit",
                    padding: "8px 12px", borderRadius: 10, fontSize: 18,
                }}
            >
                🔔
                {unread > 0 && (
                    <span style={{
                        position: "absolute", top: -6, right: -6, background: "#ef4444",
                        color: "#fff", borderRadius: 999, fontSize: 11, fontWeight: 700,
                        minWidth: 18, height: 18, display: "grid", placeItems: "center", padding: "0 4px",
                    }}>
                        {unread > 99 ? "99+" : unread}
                    </span>
                )}
            </button>

            {open && createPortal(panel, document.body)}
        </div>
    );
}

export default NotificationBell;