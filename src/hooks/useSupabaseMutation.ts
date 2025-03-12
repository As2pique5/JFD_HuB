import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { PostgrestError } from '@supabase/supabase-js';

type MutationOptions = {
  table: string;
};

export function useSupabaseMutation<T>(options: MutationOptions) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<PostgrestError | null>(null);
  
  // Insert a new record
  const insert = async (data: Partial<T> | Partial<T>[]) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: result, error } = await supabase
        .from(options.table)
        .insert(data)
        .select();
      
      if (error) {
        setError(error);
        return { data: null, error };
      }
      
      return { data: result, error: null };
    } catch (err) {
      console.error('Error inserting data:', err);
      setError(err as PostgrestError);
      return { data: null, error: err as PostgrestError };
    } finally {
      setLoading(false);
    }
  };
  
  // Update an existing record
  const update = async (id: string, data: Partial<T>) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: result, error } = await supabase
        .from(options.table)
        .update(data)
        .eq('id', id)
        .select();
      
      if (error) {
        setError(error);
        return { data: null, error };
      }
      
      return { data: result, error: null };
    } catch (err) {
      console.error('Error updating data:', err);
      setError(err as PostgrestError);
      return { data: null, error: err as PostgrestError };
    } finally {
      setLoading(false);
    }
  };
  
  // Delete a record
  const remove = async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase
        .from(options.table)
        .delete()
        .eq('id', id);
      
      if (error) {
        setError(error);
        return { success: false, error };
      }
      
      return { success: true, error: null };
    } catch (err) {
      console.error('Error deleting data:', err);
      setError(err as PostgrestError);
      return { success: false, error: err as PostgrestError };
    } finally {
      setLoading(false);
    }
  };
  
  // Upsert (insert if not exists, update if exists)
  const upsert = async (data: Partial<T> | Partial<T>[]) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: result, error } = await supabase
        .from(options.table)
        .upsert(data)
        .select();
      
      if (error) {
        setError(error);
        return { data: null, error };
      }
      
      return { data: result, error: null };
    } catch (err) {
      console.error('Error upserting data:', err);
      setError(err as PostgrestError);
      return { data: null, error: err as PostgrestError };
    } finally {
      setLoading(false);
    }
  };
  
  return {
    insert,
    update,
    remove,
    upsert,
    loading,
    error
  };
}