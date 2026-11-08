import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiCheck,
  FiX,
  FiCheckCircle,
  FiEye,
  FiCalendar,
  FiClock,
  FiUser,
  FiMessageSquare,
  FiAlertCircle,
  FiAlertTriangle,
} from 'react-icons/fi';
import {
  adminGetAllBookings,
  adminConfirmBooking,
  adminRejectBooking,
  adminCompleteBooking,
  adminCancelBooking,
} from '../api/bookingApi';
import { getServiceImageUrl, getCategoryIcon } from '../utils/imageUtils';
import { formatPhoneDisplay } from '../utils/whatsappUtils';
import AdminPageContainer from '../components/AdminPageContainer';
import AdminPageHeader from '../components/AdminPageHeader';
import Toast from '../components/Toast';
import styles from './AdminBookings.module.scss';

const FILTER_KEYS = [
  { key: 'ALL', label: 'All' },
  { key: 'REQUESTED', label: 'Requested' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

// Helper to format date cleanly
const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '—');

const parseClientInfo = (b) => {
  let name = b.userName || b.customerName || (b.customer ? `${b.customer.fName || ''} ${b.customer.lName || ''}`.trim() : null);
  let phone = b.contactNumber || b.customerPhone || b.customer?.mobile || b.mobile;

  if (b.specialRequest) {
    const match = b.specialRequest.match(/Phone\/WhatsApp Booking for\s+([^(|]+)(?:\(([^)]+)\))?/i);
    if (match) {
      if (match[1] && match[1].trim()) name = match[1].trim();
      if (match[2] && match[2].trim()) phone = match[2].trim();
    }
  }
  return {
    name: name || 'Customer',
    phone: phone || null,
  };
};

const isFutureAppointment = (booking) => {
  const dateVal = booking?.preferredDate || booking?.bookingDate;
  if (!dateVal) return false;

  let dateStr = '';
  if (typeof dateVal === 'string') {
    dateStr = dateVal.split('T')[0];
  } else if (Array.isArray(dateVal)) {
    const [y, m, d] = dateVal;
    dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  if (!dateStr) return false;

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return dateStr > todayStr;
};

const BookingThumbnail = ({ src, name }) => {
  const [imgError, setImgError] = useState(false);
  const normalized = getServiceImageUrl(src);

  return (
    <div className={styles.serviceThumb}>
      {!imgError && normalized ? (
        <img
          src={normalized}
          alt={name || 'Service'}
          onError={() => setImgError(true)}
          loading="lazy"
        />
      ) : (
        <div style={{ color: '#D8A4A9' }}>{getCategoryIcon(name, 20)}</div>
      )}
    </div>
  );
};

const AdminBookings = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [toast, setToast] = useState(null);

  // In-flight action loading ID
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Action Confirmation Modal State
  // { type: 'REJECT' | 'CANCEL' | 'COMPLETE', booking: Object }
  const [confirmDialog, setConfirmDialog] = useState(null);

  // Quick View Detail Modal State
  const [viewBooking, setViewBooking] = useState(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminGetAllBookings();
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load bookings list.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Live filter counts derived directly from actual bookings
  const counts = useMemo(() => {
    const res = {
      ALL: bookings.length,
      REQUESTED: 0,
      CONFIRMED: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };
    bookings.forEach((b) => {
      if (b.status === 'REQUESTED') res.REQUESTED++;
      else if (b.status === 'CONFIRMED') res.CONFIRMED++;
      else if (b.status === 'COMPLETED') res.COMPLETED++;
      else if (b.status === 'CANCELLED' || b.status === 'REJECTED') res.CANCELLED++;
    });
    return res;
  }, [bookings]);

  // Filtered list
  const filteredBookings = useMemo(() => {
    if (activeFilter === 'ALL') return bookings;
    if (activeFilter === 'CANCELLED') {
      return bookings.filter((b) => b.status === 'CANCELLED' || b.status === 'REJECTED');
    }
    return bookings.filter((b) => b.status === activeFilter);
  }, [bookings, activeFilter]);

  // Status badge CSS helper
  const getStatusBadge = (status) => {
    switch (status) {
      case 'REQUESTED':
        return <span className={`${styles.statusBadge} ${styles.statusRequested}`}>Requested</span>;
      case 'CONFIRMED':
        return <span className={`${styles.statusBadge} ${styles.statusConfirmed}`}>Confirmed</span>;
      case 'COMPLETED':
        return <span className={`${styles.statusBadge} ${styles.statusCompleted}`}>Completed</span>;
      case 'CANCELLED':
        return <span className={`${styles.statusBadge} ${styles.statusCancelled}`}>Cancelled</span>;
      case 'REJECTED':
        return <span className={`${styles.statusBadge} ${styles.statusRejected}`}>Rejected</span>;
      default:
        return <span className={styles.statusBadge}>{status}</span>;
    }
  };

  // ── Action Handlers ─────────────────────────────────────────────

  // Confirm directly (REQUESTED -> CONFIRMED)
  const handleConfirm = async (booking) => {
    if (actionLoadingId) return;
    setActionLoadingId(booking.bookingId);

    try {
      const updated = await adminConfirmBooking(booking.bookingId);
      setBookings((prev) =>
        prev.map((b) => (b.bookingId === booking.bookingId ? updated : b))
      );
      if (viewBooking?.bookingId === booking.bookingId) setViewBooking(updated);
      setToast({
        message: `Appointment #${booking.bookingId} for ${booking.userName} is Confirmed.`,
        type: 'success',
      });
    } catch (err) {
      setToast({ message: err.message || 'Failed to confirm booking.', type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Safe Complete action with future appointment restriction
  const handleCompleteClick = (booking) => {
    if (isFutureAppointment(booking)) {
      setToast({
        message: 'Future appointments cannot be marked as completed.',
        type: 'error',
      });
      return;
    }
    setConfirmDialog({ type: 'COMPLETE', booking });
  };

  // Perform dialog-confirmed action
  const handleExecuteConfirmedAction = async () => {
    if (!confirmDialog || actionLoadingId) return;
    const { type, booking } = confirmDialog;

    // Guard against future-dated completion
    if (type === 'COMPLETE' && isFutureAppointment(booking)) {
      setToast({
        message: 'Future appointments cannot be marked as completed.',
        type: 'error',
      });
      setConfirmDialog(null);
      return;
    }

    setActionLoadingId(booking.bookingId);

    try {
      let updated;
      let successMsg = '';

      if (type === 'REJECT') {
        updated = await adminRejectBooking(booking.bookingId);
        successMsg = `Appointment #${booking.bookingId} was Rejected.`;
      } else if (type === 'COMPLETE') {
        updated = await adminCompleteBooking(booking.bookingId);
        successMsg = `Appointment #${booking.bookingId} marked as Completed.`;
      } else if (type === 'CANCEL') {
        updated = await adminCancelBooking(booking.bookingId);
        successMsg = `Appointment #${booking.bookingId} was Cancelled.`;
      }

      setBookings((prev) =>
        prev.map((b) => (b.bookingId === booking.bookingId ? updated : b))
      );
      if (viewBooking?.bookingId === booking.bookingId) setViewBooking(updated);
      setToast({ message: successMsg, type: 'success' });
      setConfirmDialog(null);
    } catch (err) {
      setToast({ message: err.message || 'Action failed.', type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <AdminPageContainer>
      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />

      {/* Standard Admin Header */}
      <AdminPageHeader
        title="Manage Bookings"
        subtitle="View and manage all customer appointments"
        actions={
          <button
            type="button"
            onClick={() => navigate('/admin/birthday-offers')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '9999px',
              border: '1px solid #D8A4A9',
              background: '#FFF0F5',
              color: '#3B2A2C',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            🎂 Birthday Offers
          </button>
        }
      />

      {/* Booking status filter pills with live counts */}
      <div className={styles.filterRow} role="tablist" aria-label="Filter bookings by status">
        {FILTER_KEYS.map((tab) => {
          const count = counts[tab.key] || 0;
          const isActive = activeFilter === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`${styles.filterPill} ${isActive ? styles.pillActive : ''}`}
              onClick={() => setActiveFilter(tab.key)}
            >
              <span>{tab.label}</span>
              <span className={styles.pillCount}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Error state */}
      {error && (
        <div className={styles.errorBox} role="alert">
          <span>{error}</span>
          <button type="button" className={styles.retryBtn} onClick={fetchBookings}>
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className={styles.tableWrapper}>
          <div className={styles.loadingWrap}>
            <div className={styles.spinner} />
            <p>Loading appointments list...</p>
          </div>
        </div>
      ) : filteredBookings.length === 0 ? (
        /* Empty state */
        <div className={styles.tableWrapper}>
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <FiCalendar size={28} />
            </div>
            <h3 className={styles.emptyTitle}>No appointments found</h3>
            <p className={styles.emptyText}>
              There are no {activeFilter === 'ALL' ? '' : activeFilter.toLowerCase()} appointments
              recorded in the system right now.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Structured Table for Desktop */}
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead className={styles.thead}>
                <tr>
                  <th style={{ width: '24%' }}>Customer</th>
                  <th style={{ width: '24%' }}>Service</th>
                  <th style={{ width: '18%' }}>Schedule</th>
                  <th style={{ width: '12%' }}>Status</th>
                  <th style={{ width: '22%', minWidth: '240px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody className={styles.tbody}>
                {filteredBookings.map((b) => {
                  const isProcessing = actionLoadingId === b.bookingId;
                  const client = parseClientInfo(b);
                  return (
                    <tr key={b.bookingId}>
                      {/* Customer Name & Phone */}
                      <td>
                        <div className={styles.customerCell}>
                          <span className={styles.customerName}>{client.name}</span>
                          {client.phone && (
                            <span style={{ fontSize: '11px', color: '#705C60', marginTop: '2px' }}>
                              {formatPhoneDisplay(client.phone)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Service info */}
                      <td>
                        <div className={styles.serviceCell}>
                          <BookingThumbnail src={b.serviceImageUrl} name={b.serviceName} />
                          <span className={styles.serviceName}>{b.serviceName}</span>
                        </div>
                      </td>

                      {/* Schedule info */}
                      <td>
                        <div className={styles.scheduleCell}>
                          <span className={styles.scheduleDate}>{formatDate(b.preferredDate)}</span>
                          <span className={styles.periodBadge}>{capitalize(b.preferredPeriod)}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td>{getStatusBadge(b.status)}</td>

                      {/* Actions */}
                      <td>
                        <div className={styles.actionsCell}>
                          {b.status === 'REQUESTED' && (
                            <>
                              <button
                                type="button"
                                className={`${styles.actionBtn} ${styles.confirmBtn}`}
                                onClick={() => handleConfirm(b)}
                                disabled={isProcessing}
                                title="Confirm this request"
                              >
                                <FiCheck size={14} />
                                <span>Confirm</span>
                              </button>
                              <button
                                type="button"
                                className={`${styles.actionBtn} ${styles.rejectBtn}`}
                                onClick={() => setConfirmDialog({ type: 'REJECT', booking: b })}
                                disabled={isProcessing}
                                title="Reject this request"
                              >
                                <FiX size={14} />
                                <span>Reject</span>
                              </button>
                            </>
                          )}

                          {b.status === 'CONFIRMED' && (
                            <>
                              <button
                                type="button"
                                className={`${styles.actionBtn} ${styles.completeBtn}`}
                                onClick={() => handleCompleteClick(b)}
                                disabled={isProcessing}
                                title="Mark as completed"
                              >
                                <FiCheckCircle size={14} />
                                <span>Complete</span>
                              </button>
                              <button
                                type="button"
                                className={`${styles.actionBtn} ${styles.cancelBtn}`}
                                onClick={() => setConfirmDialog({ type: 'CANCEL', booking: b })}
                                disabled={isProcessing}
                                title="Cancel appointment"
                              >
                                <FiX size={14} />
                                <span>Cancel</span>
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            className={`${styles.actionBtn} ${styles.viewBtn}`}
                            onClick={() => setViewBooking(b)}
                            title="View details"
                          >
                            <FiEye size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className={styles.mobileCardList}>
            {filteredBookings.map((b) => {
              const isProcessing = actionLoadingId === b.bookingId;
              return (
                <div key={b.bookingId} className={styles.mobileCard}>
                  <div className={styles.mobileCardHeader}>
                    <span className={styles.idBadge}>#{b.bookingId}</span>
                    {getStatusBadge(b.status)}
                  </div>

                  <div className={styles.mobileCardService}>
                    <BookingThumbnail src={b.serviceImageUrl} name={b.serviceName} />
                    <div>
                      <h4 style={{ margin: 0, fontSize: 15, color: '#3B2A2C' }}>
                        {b.serviceName}
                      </h4>
                      <p style={{ margin: '2px 0 0', fontSize: 13, color: '#705C60' }}>
                        {b.userName}
                      </p>
                    </div>
                  </div>

                  <div className={styles.mobileCardDetails}>
                    <div className={styles.mobileDetailItem}>
                      <span className={styles.mobileDetailLabel}>Date</span>
                      <strong>{formatDate(b.preferredDate)}</strong>
                    </div>
                    <div className={styles.mobileDetailItem}>
                      <span className={styles.mobileDetailLabel}>Period</span>
                      <span>{capitalize(b.preferredPeriod)}</span>
                    </div>
                    {b.specialRequest && (
                      <div className={styles.mobileDetailItem} style={{ gridColumn: 'span 2' }}>
                        <span className={styles.mobileDetailLabel}>Note</span>
                        <span style={{ fontStyle: 'italic', color: '#705C60' }}>
                          "{b.specialRequest}"
                        </span>
                      </div>
                    )}
                  </div>

                  <div className={styles.mobileCardActions}>
                    {b.status === 'REQUESTED' && (
                      <>
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${styles.confirmBtn}`}
                          onClick={() => handleConfirm(b)}
                          disabled={isProcessing}
                        >
                          <FiCheck size={14} />
                          <span>Confirm</span>
                        </button>
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${styles.rejectBtn}`}
                          onClick={() => setConfirmDialog({ type: 'REJECT', booking: b })}
                          disabled={isProcessing}
                        >
                          <FiX size={14} />
                          <span>Reject</span>
                        </button>
                      </>
                    )}

                    {b.status === 'CONFIRMED' && (
                      <>
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${styles.completeBtn}`}
                          onClick={() => handleCompleteClick(b)}
                          disabled={isProcessing}
                        >
                          <FiCheckCircle size={14} />
                          <span>Complete</span>
                        </button>
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${styles.cancelBtn}`}
                          onClick={() => setConfirmDialog({ type: 'CANCEL', booking: b })}
                          disabled={isProcessing}
                        >
                          <FiX size={14} />
                          <span>Cancel</span>
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      className={`${styles.actionBtn} ${styles.viewBtn}`}
                      onClick={() => setViewBooking(b)}
                    >
                      <FiEye size={14} />
                      <span>Details</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Confirmation Dialog for Destructive / Irreversible Actions */}
      {confirmDialog && (
        <div
          className={styles.modalOverlay}
          onClick={() => {
            if (!actionLoadingId) setConfirmDialog(null);
          }}
        >
          <div
            className={styles.confirmModal}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div
              className={`${styles.confirmIconWrap} ${
                confirmDialog.type === 'COMPLETE' ? styles.iconSuccess : styles.iconDanger
              }`}
            >
              {confirmDialog.type === 'COMPLETE' ? (
                <FiCheckCircle size={28} />
              ) : (
                <FiAlertTriangle size={28} />
              )}
            </div>

            <h3 className={styles.confirmTitle}>
              {confirmDialog.type === 'REJECT' && 'Reject Appointment Request?'}
              {confirmDialog.type === 'CANCEL' && 'Cancel Confirmed Appointment?'}
              {confirmDialog.type === 'COMPLETE' && 'Complete Appointment?'}
            </h3>

            <p className={styles.confirmText}>
              {confirmDialog.type === 'REJECT' && (
                <>
                  Are you sure you want to reject booking{' '}
                  <strong>#{confirmDialog.booking.bookingId}</strong> for{' '}
                  <strong>{confirmDialog.booking.userName}</strong>? The customer will see their
                  appointment as rejected.
                </>
              )}
              {confirmDialog.type === 'CANCEL' && (
                <>
                  Are you sure you want to cancel booking{' '}
                  <strong>#{confirmDialog.booking.bookingId}</strong> for{' '}
                  <strong>{confirmDialog.booking.userName}</strong>? This cannot be undone.
                </>
              )}
              {confirmDialog.type === 'COMPLETE' && (
                <>
                  Confirm that appointment <strong>#{confirmDialog.booking.bookingId}</strong> for{' '}
                  <strong>{confirmDialog.booking.userName}</strong> ({confirmDialog.booking.serviceName}) has been fulfilled.
                </>
              )}
            </p>

            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.cancelModalBtn}
                onClick={() => setConfirmDialog(null)}
                disabled={Boolean(actionLoadingId)}
              >
                Go Back
              </button>
              <button
                type="button"
                className={`${styles.actionModalBtn} ${
                  confirmDialog.type === 'COMPLETE' ? styles.btnSuccess : styles.btnDanger
                }`}
                onClick={handleExecuteConfirmedAction}
                disabled={Boolean(actionLoadingId)}
              >
                {actionLoadingId ? (
                  <span>Processing…</span>
                ) : confirmDialog.type === 'REJECT' ? (
                  'Reject Appointment'
                ) : confirmDialog.type === 'CANCEL' ? (
                  'Cancel Appointment'
                ) : (
                  'Mark as Completed'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick View Details Modal */}
      {viewBooking && (
        <div className={styles.modalOverlay} onClick={() => setViewBooking(null)}>
          <div
            className={styles.detailModal}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className={styles.detailHeader}>
              <h3 className={styles.detailTitle}>Appointment #{viewBooking.bookingId}</h3>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setViewBooking(null)}
                aria-label="Close"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Status */}
            <div className={styles.detailSection}>
              <p className={styles.detailSectionTitle}>Current Status</p>
              <div>{getStatusBadge(viewBooking.status)}</div>
            </div>

            {/* Customer Details */}
            <div className={styles.detailSection}>
              <p className={styles.detailSectionTitle}>Customer Details</p>
              <div className={styles.detailRow}>
                <span className={styles.label}>Name</span>
                <span className={styles.value}>{viewBooking.userName || 'Customer'}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.label}>Contact Number</span>
                <span className={styles.value}>{viewBooking.contactNumber || '—'}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.label}>Email</span>
                <span className={styles.value}>{viewBooking.userEmail}</span>
              </div>
            </div>

            {/* Service */}
            <div className={styles.detailSection}>
              <p className={styles.detailSectionTitle}>Service</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <BookingThumbnail
                  src={viewBooking.serviceImageUrl}
                  name={viewBooking.serviceName}
                />
                <div>
                  <h4 style={{ margin: 0, fontSize: 15, color: '#3B2A2C' }}>
                    {viewBooking.serviceName}
                  </h4>
                  <span style={{ fontSize: 12, color: '#705C60' }}>
                    Service ID: #{viewBooking.serviceId}
                  </span>
                </div>
              </div>
            </div>

            {/* Schedule */}
            <div className={styles.detailSection}>
              <p className={styles.detailSectionTitle}>Schedule</p>
              <div className={styles.detailRow}>
                <span className={styles.label}>Date</span>
                <span className={styles.value}>{formatDate(viewBooking.preferredDate)}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.label}>Preferred Period</span>
                <span className={styles.value}>{capitalize(viewBooking.preferredPeriod)}</span>
              </div>
            </div>

            {/* Special Request */}
            {viewBooking.specialRequest && (
              <div className={styles.detailSection}>
                <p className={styles.detailSectionTitle}>Special Request / Note</p>
                <div className={styles.specialRequestBox}>
                  "{viewBooking.specialRequest}"
                </div>
              </div>
            )}

            {/* Action buttons inside detail modal */}
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              {viewBooking.status === 'REQUESTED' && (
                <>
                  <button
                    type="button"
                    className={`${styles.actionBtn} ${styles.confirmBtn}`}
                    style={{ flex: 1, padding: '10px 14px', fontSize: 14 }}
                    onClick={() => handleConfirm(viewBooking)}
                    disabled={Boolean(actionLoadingId)}
                  >
                    <FiCheck size={16} />
                    <span>Confirm Booking</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.actionBtn} ${styles.rejectBtn}`}
                    style={{ flex: 1, padding: '10px 14px', fontSize: 14 }}
                    onClick={() => {
                      setConfirmDialog({ type: 'REJECT', booking: viewBooking });
                    }}
                    disabled={Boolean(actionLoadingId)}
                  >
                    <FiX size={16} />
                    <span>Reject</span>
                  </button>
                </>
              )}

              {viewBooking.status === 'CONFIRMED' && (
                <>
                  <button
                    type="button"
                    className={`${styles.actionBtn} ${styles.completeBtn}`}
                    style={{ flex: 1, padding: '10px 14px', fontSize: 14 }}
                    onClick={() => handleCompleteClick(viewBooking)}
                    disabled={Boolean(actionLoadingId)}
                  >
                    <FiCheckCircle size={16} />
                    <span>Mark Completed</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.actionBtn} ${styles.cancelBtn}`}
                    style={{ flex: 1, padding: '10px 14px', fontSize: 14 }}
                    onClick={() => {
                      setConfirmDialog({ type: 'CANCEL', booking: viewBooking });
                    }}
                    disabled={Boolean(actionLoadingId)}
                  >
                    <FiX size={16} />
                    <span>Cancel Booking</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminPageContainer>
  );
};

export default AdminBookings;
