
import { useEffect, useState } from 'react'
import './App.css'

const API_URL = 'http://localhost:5001'

function App() {
  const [page, setPage] = useState('login')
  const [activeTab, setActiveTab] = useState('Dashboard')
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [user, setUser] = useState(null)

  // Assignment state
  const [assignments, setAssignments] = useState([])
  const [assignmentLoading, setAssignmentLoading] = useState(false)
  const [assignmentMessage, setAssignmentMessage] = useState('')
  const [showAssignmentForm, setShowAssignmentForm] = useState(false)

  // Assignment form fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState('Medium')

  // Authentication fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Check existing login
  useEffect(() => {
    const token = localStorage.getItem('token')

    if (token) {
      loadDashboard(token)
    }
  }, [])

  // Load dashboard information
  async function loadDashboard(token) {
    try {
      const response = await fetch(`${API_URL}/api/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Session expired')
      }

      setUser(data.user)
      setPage('dashboard')
      setActiveTab('Dashboard')

      await loadAssignments()
    } catch (error) {
      localStorage.removeItem('token')
      setUser(null)
      setPage('login')
    }
  }

  // Refresh user information and coin balance
  async function loadUser() {
    const token = localStorage.getItem('token')

    if (!token) return

    try {
      const response = await fetch(`${API_URL}/api/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to refresh user')
      }

      setUser(data.user)
    } catch (error) {
      setAssignmentMessage(error.message)
    }
  }

  // Load assignments from backend
  async function loadAssignments() {
    const token = localStorage.getItem('token')

    if (!token) return

    setAssignmentLoading(true)
    setAssignmentMessage('')

    try {
      const response = await fetch(`${API_URL}/api/assignments`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to load assignments')
      }

      setAssignments(
        Array.isArray(data) ? data : data.assignments || []
      )
    } catch (error) {
      setAssignmentMessage(error.message)
    } finally {
      setAssignmentLoading(false)
    }
  }

  // Login and signup
  async function handleSubmit(e) {
    e.preventDefault()
    setMessage('')
    setLoading(true)

    try {
      const endpoint = isLogin ? 'login' : 'signup'

      const body = isLogin
        ? { email, password }
        : { name, email, password }

      const response = await fetch(
        `${API_URL}/api/auth/${endpoint}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong')
      }

      if (isLogin) {
        localStorage.setItem('token', data.token)
        setUser(data.user)
        setPage('dashboard')
        setActiveTab('Dashboard')
        setMessage('')

        await loadDashboard(data.token)
      } else {
        setMessage('Account created successfully! Please log in.')
        setIsLogin(true)
        setName('')
        setPassword('')
      }
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  // Add assignment
  async function handleAddAssignment(e) {
    e.preventDefault()

    const token = localStorage.getItem('token')

    if (!token) return

    try {
      const response = await fetch(`${API_URL}/api/assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          description,
          dueDate,
          priority
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Could not add assignment')
      }

      setTitle('')
      setDescription('')
      setDueDate('')
      setPriority('Medium')
      setShowAssignmentForm(false)

      await loadAssignments()
    } catch (error) {
      setAssignmentMessage(error.message)
    }
  }

  // Complete or undo assignment
  async function handleToggleComplete(assignment) {
    const token = localStorage.getItem('token')

    if (!token) return

    try {
      const response = await fetch(
        `${API_URL}/api/assignments/${assignment._id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            completed: !assignment.completed
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Could not update assignment')
      }

      // Update coin balance immediately
      setUser(prevUser => ({
        ...prevUser,
        coins: data.coins
      }))

      // Refresh user and assignments from backend
      await loadUser()
      await loadAssignments()

      setAssignmentMessage(data.message)
    } catch (error) {
      setAssignmentMessage(error.message)
    }
  }

  // Delete assignment
  async function handleDeleteAssignment(id) {
    const token = localStorage.getItem('token')

    try {
      const response = await fetch(
        `${API_URL}/api/assignments/${id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Could not delete assignment')
      }

      await loadAssignments()
      setAssignmentMessage(data.message)
    } catch (error) {
      setAssignmentMessage(error.message)
    }
  }

  // Logout
  function handleLogout() {
    localStorage.removeItem('token')
    setUser(null)
    setAssignments([])
    setEmail('')
    setPassword('')
    setPage('login')
    setIsLogin(true)
    setActiveTab('Dashboard')
    setMessage('')
    setAssignmentMessage('')
  }

  // Assignment statistics
  const completedCount = assignments.filter(
    assignment => assignment.completed
  ).length

  const pendingCount = assignments.length - completedCount

  const completionPercentage = assignments.length > 0
    ? Math.round((completedCount / assignments.length) * 100)
    : 0

  // Login and signup screen
  if (page !== 'dashboard') {
    return (
      <div className="auth-container">
        <div className="auth-card">

          <div className="brand">
            <div className="brand-icon">S</div>
            <h2>Student<span>Hub</span></h2>
          </div>

          <div className="auth-heading">
            <p className="eyebrow">
              STUDENT ASSIGNMENT DASHBOARD
            </p>

            <h1>
              {isLogin ? 'Welcome Back!' : 'Create Account'}
            </h1>

            <p>
              {isLogin
                ? 'Sign in to continue your learning journey.'
                : 'Join us and manage your assignments easily.'}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>

            {message && (
              <div className="message">{message}</div>
            )}

            <button
              className="primary-btn"
              type="submit"
              disabled={loading}
            >
              {loading
                ? 'Please wait...'
                : isLogin
                  ? 'Sign In'
                  : 'Create Account'}
            </button>
          </form>

          <div className="auth-switch">
            {isLogin
              ? "Don't have an account?"
              : 'Already have an account?'}

            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin)
                setMessage('')
              }}
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </div>

        </div>
      </div>
    )
  }

  // Student dashboard
  return (
    <div className="dashboard-layout">

      <aside className="sidebar">

        <div className="brand">
          <div className="brand-icon">S</div>
          <h2>Student<span>Hub</span></h2>
        </div>

        <p className="menu-label">MENU</p>

        <button
          type="button"
          className={`nav-item ${activeTab === 'Dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('Dashboard')}
        >
          <span>▦</span> Dashboard
        </button>

        <button
          type="button"
          className={`nav-item ${activeTab === 'Assignments' ? 'active' : ''}`}
          onClick={() => setActiveTab('Assignments')}
        >
          <span>▤</span> Assignments
        </button>

        <button
          type="button"
          className={`nav-item ${activeTab === 'Progress' ? 'active' : ''}`}
          onClick={() => setActiveTab('Progress')}
        >
          <span>◷</span> Progress
        </button>

        <button
          type="button"
          className={`nav-item ${activeTab === 'Settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('Settings')}
        >
          <span>⚙</span> Settings
        </button>

        <button
          className="logout-btn"
          onClick={handleLogout}
        >
          ↪ Logout
        </button>

      </aside>

      <main className="dashboard-main">

        <header className="topbar">
          <div>
            <h2>{activeTab}</h2>
            <p>Welcome to your learning space!</p>
          </div>

          <div className="profile">
            <div className="avatar">
              {user?.name?.charAt(0).toUpperCase()}
            </div>

            <div>
              <strong>{user?.name}</strong>
              <small>Student</small>
            </div>
          </div>
        </header>

        {/* Dashboard page */}
        {activeTab === 'Dashboard' && (
          <>
            <section className="welcome-banner">
              <div>
                <p>YOUR LEARNING JOURNEY</p>
                <h1>Hello, {user?.name}! 👋</h1>
                <p>
                  Keep learning, keep growing. You've got this!
                </p>
              </div>

              <div className="welcome-emoji">🎓</div>
            </section>

            <section className="stats-grid">

              <div className="stat-card">
                <div className="stat-icon purple">🪙</div>
                <p>Total Coins</p>
                <h2>{user?.coins ?? 0}</h2>
                <small>Your earned rewards</small>
              </div>

              <div className="stat-card">
                <div className="stat-icon orange">🔥</div>
                <p>Learning Streak</p>
                <h2>{user?.streak ?? 0} Days</h2>
                <small>Keep your streak alive!</small>
              </div>

              <div className="stat-card">
                <div className="stat-icon green">📚</div>
                <p>Assignments</p>
                <h2>{assignments.length}</h2>
                <small>{completedCount} completed</small>
              </div>

            </section>

            <section className="content-card">
              <h2>My Learning Space</h2>
              <p>
                Your account is connected successfully.
                Manage your assignments and track your progress.
              </p>

              <div className="learning-message">
                ✨ Small steps every day lead to big achievements!
              </div>
            </section>
          </>
        )}

        {/* Assignments page */}
        {activeTab === 'Assignments' && (
          <section className="content-card">
            <h2>My Assignments</h2>
            <p>Manage your assignments and track your work.</p>

            <button
              className="primary-btn"
              type="button"
              onClick={() => setShowAssignmentForm(!showAssignmentForm)}
            >
              {showAssignmentForm ? 'Cancel' : '+ Add Assignment'}
            </button>

            {showAssignmentForm && (
              <form onSubmit={handleAddAssignment}>

                <div className="form-group">
                  <label>Assignment Title</label>
                  <input
                    type="text"
                    placeholder="Enter assignment title"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    placeholder="Enter description"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Priority</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value)}
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <button className="primary-btn" type="submit">
                  Save Assignment
                </button>

              </form>
            )}

            {assignmentMessage && (
              <div className="message">{assignmentMessage}</div>
            )}

            {assignmentLoading ? (
              <p>Loading assignments...</p>
            ) : assignments.length === 0 ? (
              <p>No assignments yet. Add your first assignment!</p>
            ) : (
              <div className="assignment-list">

                {assignments.map(assignment => (
                  <div
                    className="assignment-item"
                    key={assignment._id}
                  >
                    <div>
                      <h3
                        style={{
                          textDecoration: assignment.completed
                            ? 'line-through'
                            : 'none'
                        }}
                      >
                        {assignment.title}
                      </h3>

                      <p>{assignment.description}</p>

                      <small>
                        Due: {new Date(assignment.dueDate).toLocaleDateString()}
                        {' | '}Priority: {assignment.priority}
                      </small>

                      <p>
                        {assignment.completed ? 'Completed' : 'Pending'}
                      </p>
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={() => handleToggleComplete(assignment)}
                      >
                        {assignment.completed ? 'Undo' : 'Complete'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteAssignment(assignment._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}

              </div>
            )}
          </section>
        )}

        {/* Progress page */}
        {activeTab === 'Progress' && (
          <section className="content-card">
            <h2>My Learning Progress</h2>
            <p>Track your assignment completion.</p>

            <div className="stats-grid">
              <div className="stat-card">
                <p>Total Assignments</p>
                <h2>{assignments.length}</h2>
              </div>

              <div className="stat-card">
                <p>Completed</p>
                <h2>{completedCount}</h2>
              </div>

              <div className="stat-card">
                <p>Pending</p>
                <h2>{pendingCount}</h2>
              </div>
            </div>

            <h3>Completion: {completionPercentage}%</h3>

            <div
              style={{
                width: '100%',
                height: '14px',
                background: '#ddd',
                borderRadius: '10px',
                overflow: 'hidden',
                marginTop: '15px'
              }}
            >
              <div
                style={{
                  width: `${completionPercentage}%`,
                  height: '100%',
                  background: '#6655e8',
                  borderRadius: '10px',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
          </section>
        )}

        {/* Settings page */}
        {activeTab === 'Settings' && (
          <section className="content-card">
            <h2>Account Settings</h2>
            <p><strong>Name:</strong> {user?.name}</p>
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>Account type:</strong> Student</p>
            <button
              className="logout-btn"
              onClick={handleLogout}
            >
              Logout
            </button>
          </section>
        )}

        <footer>
          © 2026 StudentHub. Keep learning and achieving!
        </footer>

      </main>
    </div>
  )
}

export default App
