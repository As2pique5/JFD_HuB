import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PostgrestError } from '@supabase/supabase-js';

type QueryOptions<T> = {
  table: string;
  columns?: string;
  filters?: {
    column: string;
    operator: string;
    value: any;
  }[];
  orderBy?: {
    column: string;
    ascending?: boolean;
  };
  limit?: number;
  single?: boolean;
  relationships?: string[];
};

export function useSupabaseQuery<T>(options: QueryOptions<T>) {
  const [data, setData] = useState<T | T[] | null>(null);
  const [error, setError] = useState<PostgrestError | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      try {
        // Start building the query
        let query = supabase
          .from(options.table)
          .select(options.columns || '*');
        
        // Add filters if provided
        if (options.filters && options.filters.length > 0) {
          options.filters.forEach(filter => {
            switch (filter.operator) {
              case 'eq':
                query = query.eq(filter.column, filter.value);
                break;
              case 'neq':
                query = query.neq(filter.column, filter.value);
                break;
              case 'gt':
                query = query.gt(filter.column, filter.value);
                break;
              case 'gte':
                query = query.gte(filter.column, filter.value);
                break;
              case 'lt':
                query = query.lt(filter.column, filter.value);
                break;
              case 'lte':
                query = query.lte(filter.column, filter.value);
                break;
              case 'like':
                query = query.like(filter.column, `%${filter.value}%`);
                break;
              case 'ilike':
                query = query.ilike(filter.column, `%${filter.value}%`);
                break;
              case 'in':
                query = query.in(filter.column, filter.value);
                break;
              default:
                query = query.eq(filter.column, filter.value);
            }
          });
        }
        
        // Add order by if provided
        if (options.orderBy) {
          query = query.order(
            options.orderBy.column, 
            { ascending: options.orderBy.ascending ?? true }
          );
        }
        
        // Add limit if provided
        if (options.limit) {
          query = query.limit(options.limit);
        }
        
        // Execute the query
        const { data, error } = options.single 
          ? await query.single() 
          : await query;
        
        if (error) {
          setError(error);
          setData(null);
        } else {
          setData(data as T | T[]);
          setError(null);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err as PostgrestError);
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [
    options.table, 
    options.columns, 
    JSON.stringify(options.filters), 
    JSON.stringify(options.orderBy),
    options.limit,
    options.single
  ]);
  
  return { data, error, loading };
}