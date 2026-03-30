import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, CheckCircle, Circle, Activity, FileText } from 'lucide-react';
import './App.css';

interface Item {
  id: number;
  name: string;
  description: string;
  status: string;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/items`);
      setItems(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch items. Is the backend running?');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const response = await axios.post(`${API_BASE_URL}/api/items`, {
        name,
        description,
        status: 'pending'
      });
      setItems([...items, response.data]);
      setName('');
      setDescription('');
    } catch (err) {
      setError('Failed to add item');
      console.error(err);
    }
  };

  const toggleStatus = async (item: Item) => {
    const newStatus = item.status === 'done' ? 'pending' : 'done';
    try {
      const response = await axios.put(`${API_BASE_URL}/api/items/${item.id}`, {
        ...item,
        status: newStatus
      });
      setItems(items.map(i => i.id === item.id ? response.data : i));
    } catch (err) {
      setError('Failed to update item');
      console.error(err);
    }
  };

  const deleteItem = async (id: number) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/items/${id}`);
      setItems(items.filter(i => i.id !== id));
    } catch (err) {
      setError('Failed to delete item');
      console.error(err);
    }
  };

  return (
    <div className="container">
      <header>
        <h1>Infra Test App</h1>
        <div className="links">
          <a href={`${API_BASE_URL}/metrics`} target="_blank" rel="noreferrer" className="badge metrics">
            <Activity size={16} /> Metrics
          </a>
          <a href={`${API_BASE_URL}/health`} target="_blank" rel="noreferrer" className="badge health">
            <CheckCircle size={16} /> Health
          </a>
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <main>
        <section className="form-section">
          <h2>Add New Task</h2>
          <form onSubmit={addItem}>
            <input 
              type="text" 
              placeholder="Task Name" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              required 
            />
            <textarea 
              placeholder="Description" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
            />
            <button type="submit" className="btn-primary">
              <Plus size={20} /> Add Item
            </button>
          </form>
        </section>

        <section className="list-section">
          <h2>Tasks</h2>
          {loading ? (
            <p>Loading items...</p>
          ) : items.length === 0 ? (
            <p>No tasks found. Add one above!</p>
          ) : (
            <div className="item-list">
              {items.map(item => (
                <div key={item.id} className={`item-card ${item.status}`}>
                  <div className="item-content">
                    <button 
                      onClick={() => toggleStatus(item)} 
                      className="status-toggle"
                      title={item.status === 'done' ? 'Mark as pending' : 'Mark as done'}
                    >
                      {item.status === 'done' ? <CheckCircle className="icon-done" /> : <Circle />}
                    </button>
                    <div className="text-content">
                      <h3 className={item.status === 'done' ? 'strikethrough' : ''}>{item.name}</h3>
                      <p>{item.description}</p>
                    </div>
                  </div>
                  <button onClick={() => deleteItem(item.id)} className="btn-delete" title="Delete">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer>
        <p><FileText size={14} /> Backend logs are being streamed to stdout and Logstash.</p>
      </footer>
    </div>
  );
}

export default App;
