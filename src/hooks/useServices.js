import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient, isSupabaseConfigured } from "../lib/supabase";

function normalizeService(row) {
  return {
    id: row.id,
    barberId: row.barber_id ?? row.barberId,
    name: row.name,
    badge: row.badge ?? "",
    price: Number(row.price ?? 0),
    duration: Number(row.duration ?? 0),
    category: row.category ?? "",
    description: row.description ?? "",
    isActive: Boolean(row.is_active ?? row.isActive ?? true),
    sortOrder: row.sort_order ?? row.sortOrder ?? 0
  };
}

export function useServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // ALTERACAO: hook dedicado para carregar services do Supabase no mount.
  const reload = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setServices([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      setLoading(false);
      throw error;
    }

    setServices((data ?? []).map(normalizeService));
    setLoading(false);
  }, []);

  useEffect(() => {
    reload().catch(() => setLoading(false));
  }, [reload]);

  return {
    services,
    loading,
    reload
  };
}
