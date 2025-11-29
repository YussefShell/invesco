"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error for debugging
    console.error("Error boundary caught:", error);
  }, [error]);
  return (
    <div style={{ margin: 0, padding: "2rem", fontFamily: "system-ui, sans-serif", backgroundColor: "#0a0a0a", color: "#fff", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ maxWidth: "600px", padding: "2rem", border: "1px solid #333", borderRadius: "8px", backgroundColor: "#1a1a1a" }}>
        <h1 style={{ marginTop: 0 }}>Something went wrong</h1>
        <p style={{ color: "#999" }}>An error occurred in the application.</p>
        {error?.message && (
          <pre style={{ padding: "1rem", backgroundColor: "#2a1a1a", border: "1px solid #ff4444", borderRadius: "4px", color: "#ff6666", overflow: "auto" }}>
            {error.message}
          </pre>
        )}
        <div style={{ marginTop: "1.5rem", display: "flex", gap: "1rem" }}>
          <button
            onClick={reset}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#0066cc",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Try again
          </button>
          <button
            onClick={() => window.location.href = "/"}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "transparent",
              color: "#fff",
              border: "1px solid #666",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Go home
          </button>
        </div>
      </div>
    </div>
  );
}
