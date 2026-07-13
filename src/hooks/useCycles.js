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
      setCycles(res.data);
      setError("");
    } catch {
      setError("Could not load cycles.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { cycles, loading, error, reload };
}
