import { supabase } from "../utils/supabaseClient";

export const UserPreferencesAPI = {
  get: async (user_id) => {
    const { data, error } = await supabase
      .from('UserPreferences')
      .select('*')
      .eq('user_id', user_id)
      .single();
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = אין רשומות
    return data;
  },

  createOrUpdate: async (user_id, preferences) => {
    const { data, error } = await supabase
      .from('UserPreferences')
      .upsert({ user_id, ...preferences }, { onConflict: ['user_id'] });
    if (error) throw error;
    return data;
  }
};
