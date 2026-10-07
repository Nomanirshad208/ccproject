import { useEffect, useState, useMemo } from 'react'
import { supabase, isConfigured } from './supabaseClient'

const TABLE = 'contacts'
const LOCAL_STORAGE_KEY = 'hm1_contacts_demo_cache'

export default function App() {
  const [usingDemoMode, setUsingDemoMode] = useState(!isConfigured)
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedId, setCopiedId] = useState(null)
  const [sqlCopied, setSqlCopied] = useState(false)

  // Auto-dismiss notifications
  useEffect(() => {
    if (!successMsg) return
    const timer = setTimeout(() => setSuccessMsg(''), 3500)
    return () => clearTimeout(timer)
  }, [successMsg])

  // READ / Load records
  async function loadRecords() {
    setLoading(true)
    setError('')
    try {
      if (isConfigured && !usingDemoMode) {
        const { data, error } = await supabase
          .from(TABLE)
          .select('*')
          .order('created_at', { ascending: false })

        if (error) {
          setError(error.message)
        } else {
          setRows(data ?? [])
        }
      } else {
        // Fallback demo storage for immediate testing before keys are supplied
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
        if (saved) {
          try {
            setRows(JSON.parse(saved))
          } catch {
            setRows([])
          }
        } else {
          // Pre-populate with sample contacts in demo mode
          const samples = [
            {
              id: 'demo-1',
              name: 'Dr. Sarah Connor',
              contact: '+1 (555) 432-8765',
              created_at: new Date(Date.now() - 3600000).toISOString(),
            },
            {
              id: 'demo-2',
              name: 'Arthur Dent',
              contact: '+44 20 7946 0912',
              created_at: new Date(Date.now() - 86400000).toISOString(),
            },
          ]
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(samples))
          setRows(samples)
        }
      }
    } catch (err) {
      setError(err?.message || 'Failed to load records')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRecords()
  }, [usingDemoMode])

  function resetForm() {
    setName('')
    setContact('')
    setEditingId(null)
    setError('')
  }

  // CREATE + UPDATE
  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const trimmedName = name.trim()
    const trimmedContact = contact.trim()

    if (!trimmedName || !trimmedContact) {
      setError('Both Name and Contact number are required.')
      return
    }

    setSubmitting(true)

    try {
      if (isConfigured && !usingDemoMode) {
        if (editingId) {
          // UPDATE
          const { error } = await supabase
            .from(TABLE)
            .update({ name: trimmedName, contact: trimmedContact })
            .eq('id', editingId)

          if (error) throw error
          setSuccessMsg(`Record for "${trimmedName}" updated successfully!`)
        } else {
          // CREATE
          const { error } = await supabase
            .from(TABLE)
            .insert([{ name: trimmedName, contact: trimmedContact }])

          if (error) throw error
          setSuccessMsg(`Record for "${trimmedName}" saved permanently!`)
        }
      } else {
        // Demo Mode operations
        const existing = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]')
        let updated
        if (editingId) {
          updated = existing.map((r) =>
            r.id === editingId ? { ...r, name: trimmedName, contact: trimmedContact } : r
          )
          setSuccessMsg(`Record for "${trimmedName}" updated in local demo mode!`)
        } else {
          const newRecord = {
            id: 'local-' + Date.now(),
            name: trimmedName,
            contact: trimmedContact,
            created_at: new Date().toISOString(),
          }
          updated = [newRecord, ...existing]
          setSuccessMsg(`Record for "${trimmedName}" created in local demo mode!`)
        }
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated))
        setRows(updated)
      }

      resetForm()
      if (isConfigured && !usingDemoMode) {
        await loadRecords()
      }
    } catch (err) {
      setError(err?.message || 'Operation failed. Please verify Supabase configuration.')
    } finally {
      setSubmitting(false)
    }
  }

  // DELETE
  async function handleDelete(id) {
    setError('')
    try {
      if (isConfigured && !usingDemoMode) {
        const { error } = await supabase.from(TABLE).delete().eq('id', id)
        if (error) throw error
        await loadRecords()
      } else {
        const existing = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]')
        const updated = existing.filter((r) => r.id !== id)
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated))
        setRows(updated)
      }

      if (editingId === id) resetForm()
      setDeleteConfirmId(null)
      setSuccessMsg('Record deleted successfully.')
    } catch (err) {
      setError(err?.message || 'Failed to delete record.')
    }
  }

  // START EDIT
  function startEdit(row) {
    setEditingId(row.id)
    setName(row.name)
    setContact(row.contact)
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // COPY PHONE TO CLIPBOARD
  function copyToClipboard(row) {
    navigator.clipboard.writeText(row.contact)
    setCopiedId(row.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // FILTERED RECORDS
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows
    const q = searchQuery.toLowerCase()
    return rows.filter(
      (r) =>
        r.name?.toLowerCase().includes(q) ||
        r.contact?.toLowerCase().includes(q)
    )
  }, [rows, searchQuery])

  function getInitials(nameStr) {
    if (!nameStr) return '?'
    const parts = nameStr.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  function formatDate(isoStr) {
    if (!isoStr) return ''
    try {
      const d = new Date(isoStr)
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return ''
    }
  }

  const sqlSchema = `create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text not null,
  created_at timestamptz not null default now()
);

alter table public.contacts enable row level security;

create policy "anon full access" on public.contacts
  for all to anon using (true) with check (true);`

  function copySql() {
    navigator.clipboard.writeText(sqlSchema)
    setSqlCopied(true)
    setTimeout(() => setSqlCopied(false), 2500)
  }

  return (
    <main className="wrap">
      {/* Header */}
      <header className="header">
        <div className="header-top">
          <div className="brand">
            <div className="brand-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 2.75a2.25 2.25 0 110 4.5 2.25 2.25 0 010-4.5zM4 17.2v-.7c0-1.8 3.6-2.8 8-2.8s8 1 8 2.8v.7H4z" />
              </svg>
            </div>
            <div>
              <h1>Contact Directory</h1>
              <p className="sub">Cloud-backed persistent records · React + Supabase CRUD</p>
            </div>
          </div>

          <div>
            {isConfigured ? (
              <span className="badge badge-connected" title="Connected to Supabase PostgreSQL database">
                <span className="dot pulse" /> Supabase Live
              </span>
            ) : (
              <span className="badge badge-warning" title="Running in local preview mode until .env keys are added">
                <span className="dot" /> Demo Preview Mode
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Setup Guide Card if Supabase is not configured */}
      {!isConfigured && (
        <section className="card" style={{ marginBottom: '1.5rem', borderColor: 'rgba(245, 158, 11, 0.4)' }}>
          <div className="card-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fbbf24' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              Supabase Configuration Notice
            </span>
            <button type="button" className="btn-ghost btn-sm" onClick={copySql}>
              {sqlCopied ? '✓ Copied SQL!' : 'Copy SQL Schema'}
            </button>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-sub)' }}>
            The app is currently functioning in <strong>Demo Preview Mode</strong> with full CRUD support. To connect your persistent Supabase cloud database:
          </p>
          <div className="setup-guide">
            <div className="setup-step">
              <span className="step-num">1</span>
              <div className="step-content">
                <h3>Create the table</h3>
                <p>In your Supabase project's <strong>SQL Editor</strong>, run the schema:</p>
                <pre>{sqlSchema}</pre>
              </div>
            </div>
            <div className="setup-step">
              <span className="step-num">2</span>
              <div className="step-content">
                <h3>Set Environment Variables</h3>
                <p>
                  Copy <code>.env.example</code> to <code>.env</code> locally, or add them to your <strong>Vercel Project Settings → Environment Variables</strong>:
                </p>
                <pre>VITE_SUPABASE_URL=https://your-project.supabase.co&#10;VITE_SUPABASE_ANON_KEY=your-anon-key</pre>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Edit Banner if editing */}
      {editingId && (
        <div className="edit-banner">
          <span>
            ✏️ Editing record for <strong>{name || 'contact'}</strong>
          </span>
          <button type="button" className="btn-ghost btn-sm" onClick={resetForm}>
            Cancel Edit
          </button>
        </div>
      )}

      {/* Input Form Card */}
      <section className="card">
        <h2 className="card-title" style={{ margin: 0, marginBottom: '1.25rem' }}>
          {editingId ? 'Update Contact Record' : 'Add New Contact Record'}
        </h2>

        <form onSubmit={handleSubmit} className="form-grid">
          <div className="field">
            <label htmlFor="name-input">Full Name</label>
            <div className="input-container">
              <span className="input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <input
                id="name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Kaif Sadiq"
                disabled={submitting}
                autoComplete="name"
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="contact-input">Contact Number</label>
            <div className="input-container">
              <span className="input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </span>
              <input
                id="contact-input"
                type="tel"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="e.g. +92 300 1234567"
                disabled={submitting}
                autoComplete="tel"
              />
            </div>
          </div>

          <div className="actions">
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? (
                <>
                  <span className="spinner" /> Saving...
                </>
              ) : editingId ? (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Save Changes
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Submit Record
                </>
              )}
            </button>

            {editingId && (
              <button type="button" className="btn-ghost" onClick={resetForm} disabled={submitting}>
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* Feedback Messages */}
        {error && (
          <div className="alert alert-error">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="alert alert-success">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>{successMsg}</span>
          </div>
        )}
      </section>

      {/* History List Section */}
      <section>
        <div className="section-header">
          <h2>
            <span>Directory History</span>
            <span className="count-badge">{rows.length} {rows.length === 1 ? 'record' : 'records'}</span>
          </h2>

          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={loadRecords}
            disabled={loading}
            title="Refresh records from database"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Search bar if there are records */}
        {rows.length > 0 && (
          <div className="search-box">
            <span className="search-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search contacts by name or number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}

        {loading && rows.length === 0 ? (
          <div className="loading-box">
            <span className="spinner" />
            <span>Loading directory history...</span>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            {searchQuery ? (
              <p>No records matched "{searchQuery}".</p>
            ) : (
              <>
                <p style={{ fontWeight: 600, color: 'var(--text-sub)', marginBottom: '0.25rem' }}>
                  No directory records stored yet
                </p>
                <p style={{ fontSize: '0.85rem' }}>
                  Submit the form above to permanently save your first contact.
                </p>
              </>
            )}
          </div>
        ) : (
          <ul className="list">
            {filteredRows.map((row) => {
              const isDeleting = deleteConfirmId === row.id
              const isEditing = editingId === row.id

              return (
                <li key={row.id} className={`row ${isEditing ? 'editing-row' : ''}`}>
                  <div className="row-content">
                    <div className="avatar">{getInitials(row.name)}</div>
                    <div className="row-details">
                      <div className="row-name">{row.name}</div>
                      <div className="row-num">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                        <span>{row.contact}</span>
                      </div>
                      {row.created_at && (
                        <div className="row-meta">Stored: {formatDate(row.created_at)}</div>
                      )}
                    </div>
                  </div>

                  <div className="row-actions">
                    {/* Copy contact button */}
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      onClick={() => copyToClipboard(row)}
                      title="Copy contact number"
                    >
                      {copiedId === row.id ? '✓ Copied' : 'Copy'}
                    </button>

                    {/* Inline Delete Confirmation or Standard Actions */}
                    {isDeleting ? (
                      <div className="delete-confirm-box">
                        <button
                          type="button"
                          className="btn-danger btn-sm"
                          onClick={() => handleDelete(row.id)}
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          className="btn-ghost btn-sm"
                          onClick={() => setDeleteConfirmId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn-ghost btn-sm"
                          onClick={() => startEdit(row)}
                          title="Edit this record"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn-danger btn-sm"
                          onClick={() => setDeleteConfirmId(row.id)}
                          title="Delete this record"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </main>
  )
}
