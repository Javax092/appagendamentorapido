import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient, isSupabaseConfigured } from "../lib/supabase";

function normalizeBarber(row) {
  return {
    id: row.id,
    name: row.name,
    shortCode: row.short_code ?? row.shortCode ?? "",
    role: row.role_title ?? row.role ?? "",
    phone: row.phone ?? "",
    specialty: row.specialty ?? "",
    bio: row.bio ?? "",
    photoKey: row.photo_key ?? row.photoKey ?? "heritage",
    heroTagline: row.hero_tagline ?? row.heroTagline ?? "",
    workingHours: {
      start: row.working_start?.slice?.(0, 5) ?? row.workingHours?.start ?? "09:00",
      end: row.working_end?.slice?.(0, 5) ?? row.workingHours?.end ?? "18:00"
    },
    breakRanges: Array.isArray(row.break_ranges) ? row.break_ranges : row.breakRanges ?? [],
    daysOff: row.days_off ?? row.daysOff ?? []
  };
}

export function useBarbers() {
  const [barbers, setBarbers] = useState([]);
  const [loading, setLoading] = useState(true);

  // ALTERACAO: hook dedicado para carregar barbers do Supabase no mount.
  const reload = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setBarbers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("barbers")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      setLoading(false);
      throw error;
    }

    setBarbers((data ?? []).map(normalizeBarber));
    setLoading(false);
  }, []);

  useEffect(() => {
    reload().catch(() => setLoading(false));
  }, [reload]);

  return {
    barbers,
    loading,
    reload
  };
}
