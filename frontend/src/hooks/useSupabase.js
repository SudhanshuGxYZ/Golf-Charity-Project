import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

/**
 * Example hook for querying Supabase data
 * Usage: const { data, loading, error } = useSupabaseQuery('todos');
 */
export function useSupabaseQuery(table, filters = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        let query = supabase.from(table).select();

        // Apply filters if provided
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });

        const { data: result, error: err } = await query;

        if (err) {
          setError(err.message);
          console.error(`Error fetching from ${table}:`, err);
        } else {
          setData(result || []);
        }
      } catch (err) {
        setError(err.message);
        console.error('Unexpected error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [table, JSON.stringify(filters)]);

  return { data, loading, error };
}

/**
 * Example hook for inserting data into Supabase
 */
export function useSupabaseInsert(table) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const insert = async (record) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase
        .from(table)
        .insert([record])
        .select()
        .single();

      if (err) {
        setError(err.message);
        console.error(`Error inserting into ${table}:`, err);
        return null;
      }

      return data;
    } catch (err) {
      setError(err.message);
      console.error('Unexpected error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { insert, loading, error };
}
