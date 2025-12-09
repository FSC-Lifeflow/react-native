import { supabase } from '../lib/supabase';

export type WorkoutInsert = {
  user_id: string;
  started_at: string; // ISO string
  type: string;
  duration_minutes: number;
  satisfaction?: number | null;
  notes?: string | null;
  source?: string | null; // e.g., 'fitbit' | 'manual'
  external_id?: string | null;
};

export type Workout = WorkoutInsert & {
  id: string;
  created_at: string;
};

export const workoutService = {
  async addWorkout(input: WorkoutInsert): Promise<Workout> {
    const { data, error } = await supabase
      .from('workouts')
      .insert({
        user_id: input.user_id,
        started_at: input.started_at,
        type: input.type,
        duration_minutes: input.duration_minutes,
        satisfaction: input.satisfaction ?? null,
        notes: input.notes ?? null,
        source: input.source ?? 'manual',
        external_id: input.external_id ?? null,
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return data as Workout;
  },

  async listRecent(userId: string, limit = 10): Promise<Workout[]> {
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return (data as Workout[]) ?? [];
  },

  async existsExternal(userId: string, source: string, externalId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('workouts')
      .select('id')
      .eq('user_id', userId)
      .eq('source', source)
      .eq('external_id', externalId)
      .limit(1)
      .maybeSingle();

    if (error) return false;
    return Boolean(data?.id);
  },

  async addExternalIfNew(input: WorkoutInsert & { source: string; external_id: string }): Promise<Workout> {
    const already = await this.existsExternal(input.user_id, input.source, input.external_id);
    if (already) {
      return {
        id: 'duplicate',
        created_at: new Date().toISOString(),
        ...input,
      };
    }

    return this.addWorkout(input);
  },
};
