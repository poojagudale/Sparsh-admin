import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { FiEdit2, FiTrash2, FiPlus, FiSearch } from 'react-icons/fi';
import { getServices, updateService, deleteService } from '../../services/serviceApi';
import { getServiceImageUrl, getServiceCategory, getCategoryIcon } from '../../utils/imageUtils';
import AdminPageContainer from '../../components/AdminPageContainer';
import AdminPageHeader from '../../components/AdminPageHeader';
import Toast from '../../components/Toast';
import ServiceModal from './ServiceModal';
import styles from './ServiceList.module.scss';

// Safe image component with graceful fallback
const ServiceThumbnail = ({ service, size = 54 }) => {
  const [imgError, setImgError] = useState(false);
  const imageUrl = getServiceImageUrl(service.imageUrl);

  return (
    <div className={styles.thumbnailWrap} style={{ width: size, height: size }}>
      {!imgError && imageUrl ? (
        <img
          src={imageUrl}
          alt={service.serviceName}
          className={styles.thumbnail}
          onError={() => setImgError(true)}
          loading="lazy"
        />
      ) : (
        <div className={styles.thumbnailFallback}>
          {getCategoryIcon(service.serviceName, Math.round(size * 0.48))}
        </div>
      )}
    </div>
  );
};

const ServiceList = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Toggling status in-flight ID
  const [togglingId, setTogglingId] = useState(null);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getServices();
      setServices(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Unable to load services catalog.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  // Filtered by search query
  const filteredServices = useMemo(() => {
    if (!searchQuery.trim()) return services;
    const q = searchQuery.toLowerCase().trim();
    return services.filter(
      (s) =>
        s.serviceName?.toLowerCase().includes(q) ||
        String(s.serviceId).includes(q)
    );
  }, [services, searchQuery]);

  const activeCount = useMemo(() => {
    return services.filter((s) => s.isActive).length;
  }, [services]);

  // Toggle active status
  const handleToggleStatus = async (service) => {
    if (togglingId) return;
    setTogglingId(service.serviceId);

    const newStatus = !service.isActive;
    try {
      await updateService(service.serviceId, {
        serviceName: service.serviceName,
        isActive: newStatus,
      });

      setServices((prev) =>
        prev.map((s) =>
          s.serviceId === service.serviceId ? { ...s, isActive: newStatus } : s
        )
      );

      setToast({
        message: `"${service.serviceName}" is now ${newStatus ? 'Active' : 'Inactive'}.`,
        type: 'success',
      });
    } catch (err) {
      setToast({
        message: err.message || 'Failed to update service status.',
        type: 'error',
      });
    } finally {
      setTogglingId(null);
    }
  };

  // Open Edit Modal
  const handleEdit = (service) => {
    setEditingService(service);
    setModalOpen(true);
  };

  // Open Create Modal
  const handleCreate = () => {
    setEditingService(null);
    setModalOpen(true);
  };

  // Delete Action
  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);

    try {
      await deleteService(deleteTarget.serviceId);
      setServices((prev) => prev.filter((s) => s.serviceId !== deleteTarget.serviceId));
      setToast({
        message: `"${deleteTarget.serviceName}" was deleted successfully.`,
        type: 'success',
      });
      setDeleteTarget(null);
    } catch (err) {
      setToast({
        message: err.message || 'Failed to delete service.',
        type: 'error',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminPageContainer>
      <Toast
        message={toast?.message}
        type={toast?.type}
        onClose={() => setToast(null)}
      />

      {/* Standard Admin Header */}
      <AdminPageHeader
        title="Manage Services"
        subtitle="View and manage salon services"
        actions={
          <button
            type="button"
            className={styles.headerBtn}
            onClick={handleCreate}
            id="add-service-btn"
          >
            <FiPlus size={18} />
            <span> Add Service</span>
          </button>
        }
      />

      {/* Stats bar & Search */}
      <div className={styles.statsBar}>
        <div className={styles.statsChips}>
          <div className={styles.statChip}>
            Total: <strong>{services.length}</strong> services
          </div>
          <div className={styles.statChip}>
            Active: <strong>{activeCount}</strong>
          </div>
          <div className={styles.statChip}>
            Inactive: <strong>{services.length - activeCount}</strong>
          </div>
        </div>

        <div className={styles.searchWrap}>
          <FiSearch className={styles.searchIcon} size={16} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search services by name "
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className={styles.errorBox} role="alert">
          <span>{error}</span>
          <button type="button" className={styles.retryBtn} onClick={fetchServices}>
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className={styles.tableWrapper}>
          <div className={styles.loadingWrap}>
            <div className={styles.spinner} />
            <p>Loading services catalog...</p>
          </div>
        </div>
      ) : filteredServices.length === 0 ? (
        /* Empty state */
        <div className={styles.tableWrapper}>
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <FiPlus size={26} />
            </div>
            <h3 className={styles.emptyTitle}>
              {searchQuery ? 'No matching services found' : 'No services added yet'}
            </h3>
            <p className={styles.emptyText}>
              {searchQuery
                ? `No service name matches "${searchQuery}". Try a different keyword.`
                : 'Get started by creating your first salon service record.'}
            </p>
            {!searchQuery && (
              <button
                type="button"
                className={styles.headerBtn}
                onClick={handleCreate}
                style={{ marginTop: 8 }}
              >
                <FiPlus size={16} />
                <span>Add First Service</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead className={styles.thead}>
                <tr>
                  <th style={{ width: '50%' }}>Service</th>
                  <th style={{ width: '25%' }}>Availability Status</th>
                  <th style={{ width: '25%', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody className={styles.tbody}>
                {filteredServices.map((service) => (
                  <tr key={service.serviceId}>
                    {/* Service column: Thumbnail + Name + Category */}
                    <td>
                      <div className={styles.serviceCell}>
                        <ServiceThumbnail service={service} size={54} />
                        <div className={styles.serviceInfo}>
                          <h4 className={styles.serviceName}>{service.serviceName}</h4>
                          <span className={styles.serviceCategory}>
                            {getServiceCategory(service.serviceName)}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Status & interactive toggle */}
                    <td>
                      <div className={styles.statusCell}>
                        <button
                          type="button"
                          className={`${styles.toggleSwitch} ${service.isActive ? styles.toggleActive : styles.toggleInactive
                            }`}
                          onClick={() => handleToggleStatus(service)}
                          disabled={togglingId === service.serviceId}
                          aria-label={`Toggle status for ${service.serviceName}`}
                          title={service.isActive ? 'Click to deactivate' : 'Click to activate'}
                        >
                          <span className={styles.toggleKnob} />
                        </button>
                        <span
                          className={`${styles.statusBadge} ${service.isActive ? styles.badgeActive : styles.badgeInactive
                            }`}
                        >
                          {service.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td>
                      <div className={styles.actionsCell} style={{ justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => handleEdit(service)}
                          title="Edit service"
                        >
                          <FiEdit2 size={14} />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                          onClick={() => setDeleteTarget(service)}
                          title="Delete service"
                        >
                          <FiTrash2 size={14} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className={styles.mobileCardList}>
            {filteredServices.map((service) => (
              <div key={service.serviceId} className={styles.mobileCard}>
                <div className={styles.mobileCardTop}>
                  <ServiceThumbnail service={service} size={50} />
                  <div className={styles.serviceInfo} style={{ flex: 1 }}>
                    <h4 className={styles.serviceName}>{service.serviceName}</h4>
                    <span className={styles.serviceCategory}>
                      {getServiceCategory(service.serviceName)}
                    </span>
                  </div>
                  <span className={styles.idBadge}>#{service.serviceId}</span>
                </div>

                <div className={styles.mobileCardBody}>
                  <span style={{ fontSize: 13, color: '#705C60' }}>Status</span>
                  <div className={styles.statusCell}>
                    <button
                      type="button"
                      className={`${styles.toggleSwitch} ${service.isActive ? styles.toggleActive : styles.toggleInactive
                        }`}
                      onClick={() => handleToggleStatus(service)}
                      disabled={togglingId === service.serviceId}
                      aria-label={`Toggle status for ${service.serviceName}`}
                    >
                      <span className={styles.toggleKnob} />
                    </button>
                    <span
                      className={`${styles.statusBadge} ${service.isActive ? styles.badgeActive : styles.badgeInactive
                        }`}
                    >
                      {service.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div className={styles.mobileCardActions}>
                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={() => handleEdit(service)}
                  >
                    <FiEdit2 size={14} />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                    onClick={() => setDeleteTarget(service)}
                  >
                    <FiTrash2 size={14} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add / Edit Service Modal */}
      <ServiceModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingService(null);
        }}
        onSuccess={(msg) => {
          setToast({ message: msg, type: 'success' });
          fetchServices();
        }}
        service={editingService}
      />

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <div className={styles.confirmOverlay} onClick={() => { if (!deleting) setDeleteTarget(null); }}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()} role="dialog">
            <div className={styles.confirmIconWrap}>
              <FiTrash2 size={26} />
            </div>
            <h3 className={styles.confirmTitle}>Delete Service</h3>
            <p className={styles.confirmText}>
              Are you sure you want to delete <strong>{deleteTarget.serviceName}</strong>?
              This action cannot be undone.
            </p>
            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.confirmCancelBtn}
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.confirmDeleteBtn}
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete Service'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminPageContainer>
  );
};

export default ServiceList;
