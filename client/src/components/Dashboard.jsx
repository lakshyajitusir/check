import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';

function Dashboard() {
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({ id: null, name: '', email: '', password: '' });
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('user'));
  const token = localStorage.getItem('token');

  // Setup axios default auth header
  const api = axios.create({
    baseURL: API_URL,
    headers: { Authorization: `Bearer ${token}` }
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        handleLogout();
      } else {
        setError('Failed to fetch users');
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (formData.id) {
        // Update user (PUT)
        await api.put(`/users/${formData.id}`, { name: formData.name, email: formData.email });
      } else {
        // Create user (POST) - requiring password
        await api.post('/users', { name: formData.name, email: formData.email, password: formData.password });
      }
      setFormData({ id: null, name: '', email: '', password: '' });
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving user');
    }
  };

  const editUser = (user) => {
    setFormData({ id: user.id, name: user.name, email: user.email, password: '' });
  };

  const deleteUser = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await api.delete(`/users/${id}`);
        fetchUsers();
      } catch (err) {
        setError('Error deleting user');
      }
    }
  };

  return (
    <div className="dashboard-container">
      <nav className="navbar">
        <h2>Security Authority Dashboard</h2>
        <div className="user-info">
          <span>Welcome, {currentUser?.name}</span>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </nav>

      <div className="content">
        {error && <div className="error-message">{error}</div>}
        
        <div className="form-section">
          <h3>{formData.id ? 'Edit Authority' : 'Add New Authority'}</h3>
          <form onSubmit={handleSubmit} className="crud-form">
            <input 
              type="text" 
              name="name" 
              placeholder="Name" 
              value={formData.name} 
              onChange={handleInputChange} 
              required 
            />
            <input 
              type="email" 
              name="email" 
              placeholder="Email" 
              value={formData.email} 
              onChange={handleInputChange} 
              required 
            />
            {!formData.id && (
              <input 
                type="password" 
                name="password" 
                placeholder="Password" 
                value={formData.password} 
                onChange={handleInputChange} 
                required 
              />
            )}
            <button type="submit" className="primary-btn">
              {formData.id ? 'Update Authority' : 'Save Authority'}
            </button>
            {formData.id && (
              <button 
                type="button" 
                className="cancel-btn"
                onClick={() => setFormData({ id: null, name: '', email: '', password: '' })}
              >
                Cancel
              </button>
            )}
          </form>
        </div>

        <div className="list-section">
          <h3>Authority List</h3>
          <table className="users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <button className="edit-btn" onClick={() => editUser(user)}>Edit</button>
                    <button className="delete-btn" onClick={() => deleteUser(user.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
