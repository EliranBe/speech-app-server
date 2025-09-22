import { supabase } from "../utils/supabaseClient";

export const UserPreferencesAPI = {
  get: async (user_id) => {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle(); 
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = אין רשומות
    return data;
  },

  createOrUpdate: async (user_id, preferences) => {
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert({ user_id, ...preferences }, { onConflict: ['user_id'], returning: "representation" });
    if (error) throw error;
    return data;
  }
};
