// Shared hook that returns active acquisition channels grouped by category.
// Single source of truth for the Funnel Builder Elements panel and any other
// consumer that needs channels rendered as a grouped list.

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface GroupedChannel {
  id: string;
  key: string;
  label: string;
  icon: string | null;
  color: string | null;
  category_id: string | null;
}

export interface ChannelCategory {
  id: string;
  key: string;
  label: string;
  sort_order: number;
}

export function useAcquisitionChannelsGrouped() {
  const [channels, setChannels] = useState<GroupedChannel[]>([]);
  const [categories, setCategories] = useState<ChannelCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [ch, cat] = await Promise.all([
        supabase.from("acquisition_channels")
          .select("id,key,label,icon,color,category_id,sort_order")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase.from("acquisition_channel_categories")
          .select("id,key,label,sort_order")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
      ]);
      if (cancelled) return;
      if (ch.data) setChannels(ch.data as any);
      if (cat.data) setCategories(cat.data as any);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const groups = useMemo(() => {
    const groupsMap = new Map<string | null, GroupedChannel[]>();
    for (const c of channels) {
      const arr = groupsMap.get(c.category_id) ?? [];
      arr.push(c);
      groupsMap.set(c.category_id, arr);
    }
    const ordered = categories.map((cat) => ({
      id: cat.id,
      key: cat.key,
      label: cat.label,
      channels: groupsMap.get(cat.id) ?? [],
    }));
    const uncategorised = groupsMap.get(null) ?? [];
    if (uncategorised.length) ordered.push({ id: "__none__", key: "uncategorised", label: "Uncategorised", channels: uncategorised });
    return ordered;
  }, [channels, categories]);

  // Lookup by key (compat with legacy funnel node types).
  const byKey = useMemo(() => {
    const map = new Map<string, GroupedChannel>();
    for (const c of channels) map.set(c.key, c);
    return map;
  }, [channels]);

  return { channels, categories, groups, byKey, loading };
}
