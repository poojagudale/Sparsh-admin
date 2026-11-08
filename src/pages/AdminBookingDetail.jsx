import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FiArrowLeft,
  FiCheck,
  FiX,
  FiCheckCircle,
  FiCalendar,
  FiClock,
  FiUser,
  FiMail,
} from 'react-icons/fi';
import {
  adminGetBookingById,
  adminConfirmBooking,
  adminRejectBooking,
  adminCompleteBooking,
  adminCancelBooking,
} from '../api/bookingApi';
import { getServiceImageUrl, getCategoryIcon } from '../utils/imageUtils';
import AdminPageContainer from '../components/AdminPageContainer';
import AdminPageHeader from '../components/AdminPageHeader';
import Toast from '../components/Toast';
import styles from './AdminBookings.module.scss';

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '—');

// Helper to detect if an appointment is scheduled for a future date (dynamically checked against system date)
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

const AdminBookingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const fetchBooking = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await adminGetBookingById(id);
        setBooking(data);
      } catch (err) {
        setError(err.message || 'Failed to load booking details.');
      } finally {
        setLoading(false);
      }
    };
    fetchBooking();
  }, [id]);

  const handleConfirm = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      const data = await adminConfirmBooking(id);
      setBooking(data);
      setToast({ message: 'Appointment confirmed successfully.', type: 'success' });
    } catch (err) {
      setToast({ message: err.message || 'Confirmation failed.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteClick = () => {
    if (isFutureAppointment(booking)) {
      setToast({
        message: 'Future appointments cannot be marked as completed.',
        type: 'error',
      });
      return;
    }
    setConfirmDialog({ type: 'COMPLETE' });
  };

  const handleExecuteConfirmedAction = async () => {
    if (!confirmDialog || actionLoading) return;
    const { type } = confirmDialog;

    // Guard against future-dated completion
    if (type === 'COMPLETE' && isFutureAppointment(booking)) {
      setToast({
        message: 'Future appointments cannot be marked as completed.',
        type: 'error',
      });
      setConfirmDialog(null);
      return;
    }

    setActionLoading(true);

    try {
      let data;
      let msg = '';
      if (type === 'REJECT') {
        data = await adminRejectBooking(id);
        msg = 'Appointment request rejected.';
      } else if (type === 'COMPLETE') {
        data = await adminCompleteBooking(id);
        msg = 'Appointment marked as completed.';
      } else if (type === 'CANCEL') {
        data = await adminCancelBooking(id);
        msg = 'Appointment cancelled.';
      }
      setBooking(data);
      setToast({ message: msg, type: 'success' });
      setConfirmDialog(null);
    } catch (err) {
      setToast({ message: err.message || 'Action failed.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const imageUrl = booking?.serviceImageUrl ? getServiceImageUrl(booking.serviceImageUrl) : null;

  return (
    <AdminPageContainer>
      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />

      <AdminPageHeader
        title={`Appointment #${id}`}
        subtitle="Review customer booking information and manage appointment status"
        actions={
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => navigate('/admin/bookings')}
            style={{ padding: '8px 16px', fontSize: 13 }}
          >
            <FiArrowLeft size={16} />
            <span>Back to Bookings</span>
          </button>
        }
      />

      {error && <div className={styles.errorBox}>{error}</div>}

      <div style={{ width: '100%' }}>
        {loading ? (
          <div className={styles.tableWrapper}>
            <div className={styles.loadingWrap}>
              <div className={styles.spinner} />
              <p>Loading booking details...</p>
            </div>
          </div>
        ) : !booking ? (
          <div className={styles.errorBox}>Booking record not found.</div>
        ) : (
          <div className={styles.tableWrapper} style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Status Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E8D4D7', paddingBottom: 14 }}>
              <span className={styles.idBadge}>ID #{booking.bookingId}</span>
              <span className={`${styles.statusBadge} ${styles['status' + capitalize(booking.status)]}`}>
                {booking.status}
              </span>
            </div>

            {/* Customer Details */}
            <div className={styles.detailSection}>
              <p className={styles.detailSectionTitle}>Customer Information</p>
              <div className={styles.detailRow}>
                <span className={styles.label}>Full Name:</span>
                <span className={styles.value}>{booking.userName || 'Customer'}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.label}>Contact Number:</span>
                <span className={styles.value}>{booking.contactNumber || '—'}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.label}>Email Address:</span>
                <span className={styles.value}>{booking.userEmail}</span>
              </div>
            </div>

            {/* Service Details */}
            <div className={styles.detailSection}>
              <p className={styles.detailSectionTitle}>Service Requested</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 54, height: 54, borderRadius: 12, overflow: 'hidden', background: '#FFF0F5', border: '1px solid #E8D4D7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {!imgError && imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={booking.serviceName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    <div style={{ color: '#D8A4A9' }}>{getCategoryIcon(booking.serviceName, 26)}</div>
                  )}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, color: '#3B2A2C' }}>{booking.serviceName}</h3>
                  <span style={{ fontSize: 12, color: '#705C60' }}>Service ID: #{booking.serviceId}</span>
                </div>
              </div>
            </div>

            {/* Schedule */}
            <div className={styles.detailSection}>
              <p className={styles.detailSectionTitle}>Date & Time</p>
              <div className={styles.detailRow}>
                <span className={styles.label}>Appointment Date:</span>
                <span className={styles.value}>{formatDate(booking.preferredDate)}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.label}>Preferred Period:</span>
                <span className={styles.value}>{capitalize(booking.preferredPeriod)}</span>
              </div>
            </div>

            {/* Special Request */}
            {booking.specialRequest && (
              <div className={styles.detailSection}>
                <p className={styles.detailSectionTitle}>Customer Note</p>
                <div className={styles.specialRequestBox}>
                  "{booking.specialRequest}"
                </div>
              </div>
            )}

            {/* Management Actions */}
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              {booking.status === 'REQUESTED' && (
                <>
                  <button
                    type="button"
                    className={`${styles.actionBtn} ${styles.confirmBtn}`}
                    style={{ flex: 1, padding: '10px 16px', fontSize: 14, justifyContent: 'center' }}
                    onClick={handleConfirm}
                    disabled={actionLoading}
                  >
                    <FiCheck size={16} />
                    <span>Confirm Booking</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.actionBtn} ${styles.rejectBtn}`}
                    style={{ flex: 1, padding: '10px 16px', fontSize: 14, justifyContent: 'center' }}
                    onClick={() => setConfirmDialog({ type: 'REJECT' })}
                    disabled={actionLoading}
                  >
                    <FiX size={16} />
                    <span>Reject</span>
                  </button>
                </>
              )}

              {booking.status === 'CONFIRMED' && (
                <>
                  <button
                    type="button"
                    className={`${styles.actionBtn} ${styles.completeBtn}`}
                    style={{ flex: 1, padding: '10px 16px', fontSize: 14, justifyContent: 'center' }}
                    onClick={handleCompleteClick}
                    disabled={actionLoading}
                  >
                    <FiCheckCircle size={16} />
                    <span>Mark Completed</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.actionBtn} ${styles.cancelBtn}`}
                    style={{ flex: 1, padding: '10px 16px', fontSize: 14, justifyContent: 'center' }}
                    onClick={() => setConfirmDialog({ type: 'CANCEL' })}
                    disabled={actionLoading}
                  >
                    <FiX size={16} />
                    <span>Cancel Booking</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <div className={styles.modalOverlay} onClick={() => { if (!actionLoading) setConfirmDialog(null); }}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()} role="dialog">
            <h3 className={styles.confirmTitle}>
              {confirmDialog.type === 'REJECT' && 'Reject Appointment?'}
              {confirmDialog.type === 'CANCEL' && 'Cancel Appointment?'}
              {confirmDialog.type === 'COMPLETE' && 'Complete Appointment?'}
            </h3>
            <p className={styles.confirmText}>
              Are you sure you want to proceed with this status update for booking #{id}?
            </p>
            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.cancelModalBtn}
                onClick={() => setConfirmDialog(null)}
                disabled={actionLoading}
              >
                Go Back
              </button>
              <button
                type="button"
                className={`${styles.actionModalBtn} ${
                  confirmDialog.type === 'COMPLETE' ? styles.btnSuccess : styles.btnDanger
                }`}
                onClick={handleExecuteConfirmedAction}
                disabled={actionLoading}
              >
                {actionLoading ? 'Processing…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminPageContainer>
  );
};

export default AdminBookingDetail;
