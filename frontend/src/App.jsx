import { useState, useEffect, useMemo } from 'react';

const rawBase = import.meta.env.VITE_API_BASE_URL || '';
const API_BASE = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;
const API_URL = `${API_BASE}/api/houses`;

export default function App() {
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Identity / Member state (stored locally on this device, no password required)
  const [memberName, setMemberName] = useState(() => {
    return localStorage.getItem('wedding_member_name') || '';
  });
  const [isEditingMember, setIsEditingMember] = useState(false);
  const [tempMemberName, setTempMemberName] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [guestCount, setGuestCount] = useState('');
  const [addedBy, setAddedBy] = useState(() => {
    return localStorage.getItem('wedding_member_name') || '';
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Editing state
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editGuestCount, setEditGuestCount] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState(null);

  // Delete confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Toast notification
  const [toast, setToast] = useState(null);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => {
      setToast((prev) => (prev === message ? null : prev));
    }, 3200);
  };

  // Save current user/member identity locally
  const handleSaveMemberName = () => {
    const trimmed = tempMemberName.trim();
    if (trimmed) {
      setMemberName(trimmed);
      setAddedBy(trimmed);
      localStorage.setItem('wedding_member_name', trimmed);
      showToast(`Operating as: ${trimmed}`);
    }
    setIsEditingMember(false);
  };

  // Fetch houses from MongoDB backend
  const fetchHouses = async (isManualRefresh = false) => {
    if (isManualRefresh) setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_URL);
      if (!res.ok) {
        throw new Error(`Failed to load data (HTTP ${res.status})`);
      }
      const data = await res.json();
      setHouses(Array.isArray(data) ? data : []);
      if (isManualRefresh) {
        showToast('Guest list synced with server');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Unable to connect to the server. Please check your backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHouses();
  }, []);

  // Dashboard calculations
  const totalGuests = useMemo(() => {
    return houses.reduce((acc, h) => acc + (Number(h.guestCount) || 0), 0);
  }, [houses]);

  const totalHouses = houses.length;

  // Filtered houses based on search input (by house name or who added it)
  const filteredHouses = useMemo(() => {
    if (!searchQuery.trim()) return houses;
    const q = searchQuery.trim().toLowerCase();
    return houses.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        (h.addedBy && h.addedBy.toLowerCase().includes(q))
    );
  }, [houses, searchQuery]);

  // Handle Add House
  const handleAddHouse = async (e) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = name.trim();
    const count = parseInt(guestCount, 10);
    const author = (addedBy.trim() || memberName.trim() || 'Family Member');

    if (!trimmedName) {
      setFormError('Please enter a house or family name.');
      return;
    }

    if (isNaN(count) || count < 1) {
      setFormError('Please enter a valid guest count (at least 1).');
      return;
    }

    // Client-side quick duplicate check (case-insensitive)
    const existsLocally = houses.some(
      (h) => h.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (existsLocally) {
      setFormError(`House / Family "${trimmedName}" is already on the guest list.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          guestCount: count,
          addedBy: author,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Failed to add house.');
        return;
      }

      // If user had not saved their name yet, remember it for next time
      if (!memberName && addedBy.trim()) {
        setMemberName(addedBy.trim());
        localStorage.setItem('wedding_member_name', addedBy.trim());
      }

      // Prepend newly added house
      setHouses((prev) => [data, ...prev]);
      setName('');
      setGuestCount('');
      showToast(`Added ${trimmedName} (${count} ${count === 1 ? 'guest' : 'guests'})`);
    } catch (err) {
      console.error('Add error:', err);
      setFormError('Network error while saving house. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Start editing a house
  const startEdit = (house) => {
    setEditingId(house._id);
    setEditName(house.name);
    setEditGuestCount(house.guestCount);
    setEditError(null);
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditGuestCount('');
    setEditError(null);
  };

  // Save edited house
  const handleSaveEdit = async (id) => {
    setEditError(null);
    const trimmedName = editName.trim();
    const count = parseInt(editGuestCount, 10);
    const modifier = memberName.trim() || 'Family Member';

    if (!trimmedName) {
      setEditError('House or family name cannot be empty.');
      return;
    }

    if (isNaN(count) || count < 1) {
      setEditError('Guest count must be at least 1.');
      return;
    }

    // Check duplicate among other houses
    const duplicate = houses.some(
      (h) => h._id !== id && h.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicate) {
      setEditError(`Another house / family named "${trimmedName}" already exists.`);
      return;
    }

    setEditSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          guestCount: count,
          updatedBy: modifier,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setEditError(data.error || 'Failed to update house.');
        return;
      }

      setHouses((prev) => prev.map((h) => (h._id === id ? data : h)));
      setEditingId(null);
      showToast(`Updated ${trimmedName} successfully`);
    } catch (err) {
      console.error('Update error:', err);
      setEditError('Network error while updating. Please try again.');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Handle Delete House
  const handleDeleteHouse = async (id, houseName) => {
    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to delete house.');
        return;
      }

      setHouses((prev) => prev.filter((h) => h._id !== id));
      setConfirmDeleteId(null);
      showToast(`Removed "${houseName}" from guest list`);
    } catch (err) {
      console.error('Delete error:', err);
      alert('Network error while deleting house.');
    }
  };

  // Copy shared link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    showToast('Wedding link copied to clipboard!');
  };

  // Generate formatted WhatsApp message
  const getWhatsAppMessage = () => {
    const appUrl = window.location.href;
    const sender = memberName.trim() ? `— Shared by ${memberName.trim()}` : '';
    return (
      `💍 *Wedding Guest List Update*\n\n` +
      `👥 *Total Guests:* ${totalGuests}\n` +
      `🏡 *Total Families / Houses:* ${totalHouses}\n\n` +
      `Please check or add your family details using this link:\n` +
      `👉 ${appUrl}` +
      (sender ? `\n\n_${sender}_` : '')
    );
  };

  // Share directly via WhatsApp
  const handleShareWhatsApp = () => {
    const text = getWhatsAppMessage();
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    showToast('Opening WhatsApp...');
  };

  // Copy WhatsApp message to clipboard
  const handleCopyWhatsAppMessage = () => {
    const text = getWhatsAppMessage();
    navigator.clipboard.writeText(text);
    showToast('WhatsApp message copied to clipboard!');
  };

  return (
    <div className="app-container">
      {/* Toast Notification */}
      {toast && <div className="toast-notice">{toast}</div>}

      {/* Header */}
      <header className="app-header">
        <div className="wedding-crest" title="Wedding Planner">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </div>
        <h1 className="app-title">Wedding Guest Counter</h1>
        <p className="app-subtitle">Simple, synchronized guest management for families</p>
        <div className="gold-divider"></div>
      </header>

      {/* Member Identity Bar (Who is using this device?) */}
      <div className="member-bar">
        <div className="member-info">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span>You are adding as:</span>
          {isEditingMember ? (
            <div style={{ display: 'inline-flex', gap: '6px' }}>
              <input
                type="text"
                className="member-edit-input"
                value={tempMemberName}
                onChange={(e) => setTempMemberName(e.target.value)}
                placeholder="e.g. Shabeeba, Rahul"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveMemberName();
                  if (e.key === 'Escape') setIsEditingMember(false);
                }}
              />
              <button
                type="button"
                className="btn-save"
                style={{ padding: '3px 10px', fontSize: '0.8rem' }}
                onClick={handleSaveMemberName}
              >
                Save
              </button>
            </div>
          ) : (
            <span className="member-badge">
              {memberName || 'Family Member'}
            </span>
          )}
        </div>

        {!isEditingMember && (
          <button
            type="button"
            className="sync-btn"
            onClick={() => {
              setTempMemberName(memberName);
              setIsEditingMember(true);
            }}
            title="Set who is adding guests on this device"
          >
            {memberName ? 'Change Name' : 'Set Your Name'}
          </button>
        )}
      </div>

      {/* Shared Link Notice & Live Sync */}
      <div className="shared-link-notice">
        <div>
          <span>Shared link active. All family members see live synchronized entries.</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="sync-btn" onClick={handleCopyLink} title="Copy link to share with family">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Copy Link
          </button>
          <button className="sync-btn" onClick={() => fetchHouses(true)} title="Refresh data from server">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Sync
          </button>
        </div>
      </div>

      {/* 1. Dashboard: Summary Stats */}
      <section className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-label">Total Guests</div>
          <div className="stat-value">{totalGuests}</div>
          <div className="stat-detail">
            {totalGuests === 1 ? '1 attendee expected' : `${totalGuests} attendees expected`}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Total Houses</div>
          <div className="stat-value">{totalHouses}</div>
          <div className="stat-detail">
            {totalHouses === 1 ? '1 family registered' : `${totalHouses} families registered`}
          </div>
        </div>
      </section>

      {/* WhatsApp Sharing Card */}
      <section className="whatsapp-card">
        <div className="whatsapp-header">
          <div className="whatsapp-title-group">
            <div className="whatsapp-icon-badge" title="WhatsApp">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24zm4.52 11.64c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.98-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.24-.75-.67-1.26-1.49-1.4-1.74-.15-.25-.02-.39.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.17.04-.32-.02-.45-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.78 2.72 4.31 3.81.6.26 1.07.42 1.44.54.61.19 1.16.17 1.6.1.49-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.07-.1-.23-.17-.48-.3z"/>
              </svg>
            </div>
            <div>
              <h2 className="whatsapp-title">Share Guest List on WhatsApp</h2>
              <p className="whatsapp-subtitle">Share real-time counts and access link directly to family WhatsApp chats</p>
            </div>
          </div>
        </div>

        <div className="whatsapp-preview-box">
          <span className="whatsapp-preview-tag">Message Preview</span>
          <div>💍 <strong>Wedding Guest List Update</strong></div>
          <div style={{ marginTop: '4px' }}>👥 <strong>Total Guests:</strong> {totalGuests}</div>
          <div>🏡 <strong>Total Families / Houses:</strong> {totalHouses}</div>
          <div style={{ marginTop: '8px', color: 'var(--text-secondary)' }}>
            Please check or add your family details using this link:
          </div>
          <div style={{ wordBreak: 'break-all', color: 'var(--gold-dark)', fontWeight: 600, marginTop: '2px' }}>
            {window.location.href}
          </div>
          {memberName.trim() && (
            <div style={{ marginTop: '8px', fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              — Shared by {memberName.trim()}
            </div>
          )}
        </div>

        <div className="whatsapp-actions">
          <button type="button" className="btn-whatsapp" onClick={handleShareWhatsApp}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24zm4.52 11.64c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.98-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.24-.75-.67-1.26-1.49-1.4-1.74-.15-.25-.02-.39.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.17.04-.32-.02-.45-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.78 2.72 4.31 3.81.6.26 1.07.42 1.44.54.61.19 1.16.17 1.6.1.49-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.07-.1-.23-.17-.48-.3z"/>
            </svg>
            Share on WhatsApp
          </button>

          <button type="button" className="btn-secondary" onClick={handleCopyWhatsAppMessage}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Copy WhatsApp Text
          </button>
        </div>
      </section>

      {/* 2. Add House Card */}
      <section className="section-card">
        <h2 className="section-title">
          <span className="section-title-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </span>
          Add House / Family
        </h2>

        <form onSubmit={handleAddHouse} className="add-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="house-name" className="form-label">
                House / Family Name
              </label>
              <input
                id="house-name"
                type="text"
                className="form-input"
                placeholder="e.g. Sharma Family, Mr. & Mrs. Miller"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (formError) setFormError(null);
                }}
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="guest-count" className="form-label">
                Number of People
              </label>
              <input
                id="guest-count"
                type="number"
                min="1"
                className="form-input"
                placeholder="e.g. 4"
                value={guestCount}
                onChange={(e) => {
                  setGuestCount(e.target.value);
                  if (formError) setFormError(null);
                }}
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="added-by" className="form-label">
                Added By
              </label>
              <input
                id="added-by"
                type="text"
                className="form-input"
                placeholder="Your name / side (e.g. Shabeeba)"
                value={addedBy}
                onChange={(e) => {
                  setAddedBy(e.target.value);
                  if (formError) setFormError(null);
                }}
                disabled={submitting}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={submitting}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {submitting ? 'Adding...' : 'Add House'}
            </button>
          </div>

          {formError && (
            <div className="alert alert-error">
              <span>{formError}</span>
              <button
                type="button"
                className="alert-close"
                onClick={() => setFormError(null)}
                aria-label="Close error"
              >
                &times;
              </button>
            </div>
          )}
        </form>
      </section>

      {/* 3. House List Section */}
      <section className="section-card">
        <div className="list-header-bar">
          <h2 className="section-title" style={{ margin: 0 }}>
            <span className="section-title-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </span>
            House Directory ({filteredHouses.length})
          </h2>

          {/* Search Box */}
          <div className="search-box">
            <span className="search-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              className="search-input"
              placeholder="Search by house or who added..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                &times;
              </button>
            )}
          </div>
        </div>

        {/* Global Fetch Error */}
        {error && (
          <div className="alert alert-error" style={{ marginBottom: '16px' }}>
            <span>{error}</span>
            <button className="sync-btn" onClick={() => fetchHouses(true)}>
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="empty-state">
            <div className="empty-state-desc">Loading wedding guest list...</div>
          </div>
        )}

        {/* Empty State when no houses exist */}
        {!loading && houses.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <div className="empty-state-title">No houses added yet</div>
            <div className="empty-state-desc">
              Add your first family above to begin counting wedding guests.
            </div>
          </div>
        )}

        {/* Empty State when search matches nothing */}
        {!loading && houses.length > 0 && filteredHouses.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-title">No results match "{searchQuery}"</div>
            <div className="empty-state-desc">
              Try searching with a different keyword or{' '}
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--gold-primary)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontWeight: 600,
                }}
              >
                clear search
              </button>
              .
            </div>
          </div>
        )}

        {/* House List */}
        {!loading && filteredHouses.length > 0 && (
          <div className="house-list">
            {filteredHouses.map((house) => {
              const isEditing = editingId === house._id;
              const isConfirmingDelete = confirmDeleteId === house._id;

              return (
                <div key={house._id} className="house-item">
                  {isEditing ? (
                    /* Inline Edit Mode */
                    <div className="house-edit-form">
                      <div className="edit-inputs-row">
                        <input
                          type="text"
                          className="form-input"
                          value={editName}
                          onChange={(e) => {
                            setEditName(e.target.value);
                            if (editError) setEditError(null);
                          }}
                          placeholder="House / Family Name"
                          disabled={editSubmitting}
                          autoFocus
                        />
                        <input
                          type="number"
                          min="1"
                          className="form-input"
                          value={editGuestCount}
                          onChange={(e) => {
                            setEditGuestCount(e.target.value);
                            if (editError) setEditError(null);
                          }}
                          placeholder="Guest count"
                          disabled={editSubmitting}
                        />
                      </div>

                      {editError && (
                        <div className="alert alert-error" style={{ margin: 0, padding: '8px 12px' }}>
                          <span>{editError}</span>
                        </div>
                      )}

                      <div className="edit-actions-row">
                        <button
                          type="button"
                          className="btn-save"
                          onClick={() => handleSaveEdit(house._id)}
                          disabled={editSubmitting}
                        >
                          {editSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          type="button"
                          className="btn-cancel"
                          onClick={cancelEdit}
                          disabled={editSubmitting}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Normal Display Mode */
                    <>
                      <div className="house-info">
                        <div className="house-name">{house.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <div className="house-guest-pill">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                              <circle cx="9" cy="7" r="4" />
                              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                            <span>
                              {house.guestCount} {house.guestCount === 1 ? 'Guest' : 'Guests'}
                            </span>
                          </div>

                          <div className="house-meta">
                            <span className="house-author">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                              </svg>
                              Added by <strong>{house.addedBy || 'Family Member'}</strong>
                            </span>
                            {house.updatedBy && (
                              <span className="house-updated">
                                &bull; Edited by {house.updatedBy}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="house-actions">
                        {isConfirmingDelete ? (
                          <div className="delete-confirm-box">
                            <span>Delete?</span>
                            <button
                              type="button"
                              className="btn-delete-confirm"
                              onClick={() => handleDeleteHouse(house._id, house.name)}
                            >
                              Yes, Delete
                            </button>
                            <button
                              type="button"
                              className="btn-cancel"
                              style={{ padding: '3px 8px', fontSize: '0.8rem' }}
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => startEdit(house)}
                              title="Edit house name or guest count"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                              </svg>
                              Edit
                            </button>

                            <button
                              type="button"
                              className="btn-danger"
                              onClick={() => setConfirmDeleteId(house._id)}
                              title="Delete house"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="app-footer">
        <p>Wedding Guest Counter &bull; Designed with warmth & elegance</p>
      </footer>
    </div>
  );
}
