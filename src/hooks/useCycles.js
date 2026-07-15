import { useEffect, useState, useCallback } from "react";
import client from "../api/client";

export function useCycles() {
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await client.get("/cycles/");
      // Handle both a plain array response and DRF-style pagination
      // ({ count, next, previous, results }). Falls back to [] for
      // any other unexpected shape so `.find`/`.filter` never break.
      const data = Array.isArray(res.data) ? res.data : res.data?.results ?? [];
      setCycles(data);
      setError("");
    } catch {
      setError("Could not load cycles.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { cycles, loading, error, reload };
}
