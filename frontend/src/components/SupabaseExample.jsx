import { useSupabaseQuery, useSupabaseInsert } from '../hooks/useSupabase';

/**
 * Example component showing how to use the Supabase client
 * This demonstrates fetching data and inserting records
 */
export default function SupabaseExample() {
  const { data: todos, loading, error } = useSupabaseQuery('todos');
  const { insert: insertTodo, loading: inserting } = useSupabaseInsert('todos');

  const handleAddTodo = async () => {
    const newTodo = await insertTodo({ 
      name: 'New Todo', 
      completed: false 
    });
    if (newTodo) {
      console.log('Todo added:', newTodo);
    }
  };

  if (loading) return <div>Loading todos...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Todos from Supabase</h1>
      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>{todo.name}</li>
        ))}
      </ul>
      <button 
        onClick={handleAddTodo} 
        disabled={inserting}
      >
        {inserting ? 'Adding...' : 'Add Todo'}
      </button>
    </div>
  );
}
