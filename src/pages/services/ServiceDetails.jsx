import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getService } from '../../services/serviceApi';
import { getServiceImageUrl, getServiceCategory, getCategoryIcon } from '../../utils/imageUtils';
import AdminPageContainer from '../../components/AdminPageContainer';
import AdminPageHeader from '../../components/AdminPageHeader';
import styles from './ServiceForm.module.scss';

const ServiceDetails = () => {
  const { id } = useParams();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const fetchService = async () => {
      try {
        setLoading(true);
        const data = await getService(id);
        setService(data);
      } catch (err) {
        setError(err.message || 'Failed to load service details.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchService();
    }
  }, [id]);

  const imageUrl = service ? getServiceImageUrl(service.imageUrl) : null;

  return (
    <AdminPageContainer>
      <AdminPageHeader
        title="Service Details"
        subtitle="View service settings and information"
        actions={
          <Link to="/services" className={styles.secondaryBtn}>
            ← Back to Services
          </Link>
        }
      />

      {error && <div className={styles.errorBox}>{error}</div>}

      <div className={styles.card}>
        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <p>Loading service details...</p>
          </div>
        ) : !service ? (
          <div className={styles.errorBox}>Service record not found.</div>
        ) : (
          <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div
              style={{
                width: '180px',
                height: '180px',
                borderRadius: '16px',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #FFF0F5, #F5DADE)',
                border: '1px solid #E8D4D7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {!imgError && imageUrl ? (
                <img
                  src={imageUrl}
                  alt={service.serviceName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={() => setImgError(true)}
                />
              ) : (
                <div style={{ color: '#D8A4A9' }}>
                  {getCategoryIcon(service.serviceName, 64)}
                </div>
              )}
            </div>

            <div style={{ flex: 1, minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    color: '#9C8285',
                    background: '#FFF0F5',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    border: '1px solid #E8D4D7',
                  }}
                >
                  SERVICE ID: #{service.serviceId}
                </span>
                <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '26px', margin: '8px 0 4px', color: '#3B2A2C' }}>
                  {service.serviceName}
                </h2>
                <p style={{ color: '#705C60', fontSize: '14px', margin: 0 }}>
                  Category: <strong>{getServiceCategory(service.serviceName)}</strong>
                </p>
              </div>

              <div>
                <span style={{ fontSize: '13px', color: '#705C60', display: 'block', marginBottom: '6px' }}>Status</span>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    borderRadius: '50px',
                    fontSize: '13px',
                    fontWeight: '600',
                    backgroundColor: service.isActive ? '#ECFDF5' : '#F3F4F6',
                    color: service.isActive ? '#065F46' : '#6B7280',
                    border: service.isActive ? '1px solid #A7F3D0' : '1px solid #E5E7EB',
                  }}
                >
                  {service.isActive ? 'Active — Available for booking' : 'Inactive — Hidden from booking'}
                </span>
              </div>

              <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
                <Link to={`/services`} className={styles.primaryBtn} style={{ textDecoration: 'none' }}>
                  Manage in Service List
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminPageContainer>
  );
};

export default ServiceDetails;
