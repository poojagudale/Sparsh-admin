import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FiUsers,
  FiScissors,
  FiCalendar,
  FiClock,
  FiRefreshCw,
  FiAlertCircle,
  FiInbox,
  FiPieChart,
  FiChevronLeft,
  FiChevronRight,
  FiArrowUpRight,
  FiActivity,
  FiPhone,
  FiPlus,
} from 'react-icons/fi';
import AdminPageContainer from '../components/AdminPageContainer';
import AdminPageHeader from '../components/AdminPageHeader';
import Toast from '../components/Toast';
import ScheduleBookingModal from '../components/ScheduleBookingModal';
import { getAllCustomers } from '../api/CustomerApi';
import { getServices } from '../services/serviceApi';
import { adminGetAllBookings } from '../api/bookingApi';
import { formatPhoneDisplay } from '../utils/whatsappUtils';
import styles from './AdminHome.module.scss';

// ── Date Normalizers & Helpers ─────────────────────────────────────
const normalizeDateStr = (dateVal) => {
  if (!dateVal) return '';
  if (typeof dateVal === 'string') {
    return dateVal.split('T')[0];
  }
  if (Array.isArray(dateVal)) {
    const [y, m, d] = dateVal;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return '';
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }
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

const formatSelectedDateHeader = (dateStr) => {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return d.toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
  } catch {
    return dateStr;
  }
  return dateStr;
};

// Parses customer info from booking response or Phone/WhatsApp booking notes
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
    name: name || 'Salon Client',
    phone: phone || null,
  };
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── Component ──────────────────────────────────────────────────────
const AdminHome = () => {
  // Loading & notification states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  // Raw data from APIs
  const [allBookings, setAllBookings] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [customersList, setCustomersList] = useState([]);

  // UI Interactive States
  const [hoveredTrendPoint, setHoveredTrendPoint] = useState(null);
  const [hoveredSlice, setHoveredSlice] = useState(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // Calendar State
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // ── Fetch Dashboard Data ─────────────────────────────────────────
  const loadDashboardData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const [customersRes, servicesRes, bookingsRes] = await Promise.allSettled([
        getAllCustomers(),
        getServices(),
        adminGetAllBookings(),
      ]);

      if (customersRes.status === 'fulfilled' && Array.isArray(customersRes.value)) {
        setCustomersList(customersRes.value);
      }

      if (servicesRes.status === 'fulfilled' && Array.isArray(servicesRes.value)) {
        setServicesList(servicesRes.value);
      }

      if (bookingsRes.status === 'fulfilled' && Array.isArray(bookingsRes.value)) {
        setAllBookings(bookingsRes.value);
      }

      if (isManualRefresh) {
        setToast({ message: 'Dashboard updated with latest salon data.', type: 'success' });
      }
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
      setError('Unable to load some salon statistics. Please verify server connectivity.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Callback when a new appointment is scheduled through the modal
  const handleBookingSuccess = ({ clientName, bookingDate: bookedDate }) => {
    loadDashboardData();
    if (bookedDate) {
      setSelectedDate(bookedDate);
      const parts = bookedDate.split('-');
      if (parts.length === 3) {
        setCurrentYear(parseInt(parts[0], 10));
        setCurrentMonth(parseInt(parts[1], 10) - 1);
      }
    }
    setToast({
      message: `Appointment scheduled for ${clientName} successfully!`,
      type: 'success',
    });
  };

  // ── 1. Top KPI Summary ───────────────────────────────────────────
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];

    const pendingCount = allBookings.filter(
      (b) => (b.status || '').toUpperCase() === 'REQUESTED'
    ).length;

    const upcomingCount = allBookings.filter((b) => {
      const st = (b.status || '').toUpperCase();
      const bDate = normalizeDateStr(b.preferredDate || b.bookingDate);
      if (st === 'CONFIRMED') {
        return !bDate || bDate >= today;
      }
      return false;
    }).length;

    const activeServicesCount = servicesList.filter((s) => s.isActive).length;

    return {
      totalCustomers: customersList.length,
      totalServices: servicesList.length,
      upcomingAppointments: upcomingCount,
      pendingBookings: pendingCount,
      activeServicesCount,
    };
  }, [allBookings, customersList, servicesList]);

  // ── 2. Simplified Activity Graph (Basic Appointment Activity) ───
  const trendData = useMemo(() => {
    if (allBookings.length === 0) return [];

    const dateMap = {};
    allBookings.forEach((b) => {
      const dStr = normalizeDateStr(b.preferredDate || b.bookingDate);
      if (!dStr) return;
      if (!dateMap[dStr]) {
        dateMap[dStr] = { date: dStr, count: 0, confirmed: 0, pending: 0, completed: 0, cancelled: 0 };
      }
      dateMap[dStr].count += 1;
      const st = (b.status || '').toUpperCase();
      if (st === 'CONFIRMED') dateMap[dStr].confirmed += 1;
      else if (st === 'REQUESTED') dateMap[dStr].pending += 1;
      else if (st === 'COMPLETED') dateMap[dStr].completed += 1;
      else if (st === 'CANCELLED' || st === 'REJECTED') dateMap[dStr].cancelled += 1;
    });

    const sortedDates = Object.keys(dateMap).sort();
    return sortedDates.map((dStr) => {
      const item = dateMap[dStr];
      const parts = dStr.split('-');
      const label =
        parts.length === 3
          ? `${parseInt(parts[2], 10)} ${MONTH_NAMES[parseInt(parts[1], 10) - 1].slice(0, 3)}`
          : dStr;
      return {
        ...item,
        label,
      };
    });
  }, [allBookings]);

  // SVG coordinates for Trend Graph
  const graphMetrics = useMemo(() => {
    if (trendData.length === 0) return null;
    const width = 580;
    const height = 180;
    const padLeft = 38;
    const padRight = 20;
    const padTop = 20;
    const padBottom = 32;

    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    const values = trendData.map((d) => d.count);
    const rawMax = Math.max(...values, 1);
    const maxVal = Math.max(rawMax, 4);

    const points = trendData.map((d, i) => {
      const val = d.count;
      const x =
        trendData.length === 1
          ? padLeft + plotW / 2
          : padLeft + (i / (trendData.length - 1)) * plotW;
      const y = padTop + plotH - (val / maxVal) * plotH;
      return { ...d, x, y, val };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const areaPath =
      points.length > 0
        ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${padTop + plotH} L ${points[0].x.toFixed(1)} ${padTop + plotH} Z`
        : '';

    return {
      width,
      height,
      padLeft,
      padRight,
      padTop,
      padBottom,
      plotW,
      plotH,
      maxVal,
      points,
      linePath,
      areaPath,
    };
  }, [trendData]);

  // ── 3. Status Donut Chart Data ───────────────────────────────────
  const statusStats = useMemo(() => {
    let confirmed = 0;
    let pending = 0;
    let completed = 0;
    let cancelled = 0;

    allBookings.forEach((b) => {
      const st = (b.status || '').toUpperCase();
      if (st === 'CONFIRMED') confirmed++;
      else if (st === 'REQUESTED') pending++;
      else if (st === 'COMPLETED') completed++;
      else if (st === 'CANCELLED' || st === 'REJECTED') cancelled++;
    });

    const total = confirmed + pending + completed + cancelled;

    const slices = [
      { key: 'CONFIRMED', label: 'Confirmed', count: confirmed, color: '#2B6CB0' },
      { key: 'REQUESTED', label: 'Pending', count: pending, color: '#D97706' },
      { key: 'COMPLETED', label: 'Completed', count: completed, color: '#16A34A' },
      { key: 'CANCELLED', label: 'Cancelled / Rejected', count: cancelled, color: '#C53030' },
    ];

    const radius = 64;
    const circumference = 2 * Math.PI * radius; // ≈ 402.12
    let accumulated = 0;

    const slicesWithArcs = slices.map((s) => {
      const ratio = total > 0 ? s.count / total : 0;
      const strokeLength = ratio * circumference;
      const dashoffset = -accumulated;
      accumulated += strokeLength;
      const percentage = total > 0 ? Math.round(ratio * 100) : 0;
      return {
        ...s,
        strokeDasharray: `${strokeLength} ${circumference}`,
        strokeDashoffset: dashoffset,
        percentage,
      };
    });

    return { total, slices: slicesWithArcs };
  }, [allBookings]);

  // ── 4. Service Analytics (Popular Services) ──────────────────────
  const topServices = useMemo(() => {
    const counts = {};
    allBookings.forEach((b) => {
      const name = b.serviceName || b.service?.serviceName || 'Salon Service';
      if (!counts[name]) {
        counts[name] = { name, count: 0 };
      }
      counts[name].count += 1;
    });

    const list = Object.values(counts).sort((a, b) => b.count - a.count);
    const maxCount = list.length > 0 ? list[0].count : 1;

    return list.slice(0, 6).map((s) => ({
      ...s,
      percentage: allBookings.length > 0 ? Math.round((s.count / allBookings.length) * 100) : 0,
      barWidth: Math.round((s.count / maxCount) * 100),
    }));
  }, [allBookings]);

  // ── 5. Monthly Interactive Calendar ──────────────────────────────
  const bookingsByDate = useMemo(() => {
    const map = {};
    allBookings.forEach((b) => {
      const dStr = normalizeDateStr(b.preferredDate || b.bookingDate);
      if (!dStr) return;
      if (!map[dStr]) map[dStr] = [];
      map[dStr].push(b);
    });
    return map;
  }, [allBookings]);

  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days = [];

    // Previous month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevM = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevY = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({
        dayNum,
        dateStr,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNum: d,
        dateStr,
        isCurrentMonth: true,
      });
    }

    // Next month padding days to complete full grid
    const totalCells = days.length <= 35 ? 35 : 42;
    const remaining = totalCells - days.length;
    for (let d = 1; d <= remaining; d++) {
      const nextM = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextY = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateStr = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNum: d,
        dateStr,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  const selectedDateBookings = useMemo(() => {
    return bookingsByDate[selectedDate] || [];
  }, [bookingsByDate, selectedDate]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    const tStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setSelectedDate(tStr);
  };

  const getStatusBadge = (status) => {
    const st = (status || '').toUpperCase();
    switch (st) {
      case 'REQUESTED':
        return <span className={`${styles.statusBadge} ${styles.badgeRequested}`}>Pending</span>;
      case 'CONFIRMED':
        return <span className={`${styles.statusBadge} ${styles.badgeConfirmed}`}>Confirmed</span>;
      case 'COMPLETED':
        return <span className={`${styles.statusBadge} ${styles.badgeCompleted}`}>Completed</span>;
      case 'CANCELLED':
      case 'REJECTED':
        return <span className={`${styles.statusBadge} ${styles.badgeCancelled}`}>{status}</span>;
      default:
        return <span className={styles.statusBadge}>{status || '—'}</span>;
    }
  };

  return (
    <AdminPageContainer>
      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />

      {/* Schedule Booking Modal for phone calls & WhatsApp inquiries */}
      <ScheduleBookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        initialDate={selectedDate}
        customers={customersList}
        services={servicesList}
        onBookingSuccess={handleBookingSuccess}
      />

      <AdminPageHeader
        title="Salon Overview"
        subtitle="Real-time appointment schedule, salon service demand, and booking management."
        actions={
          <button
            type="button"
            className={styles.refreshBtn}
            onClick={() => loadDashboardData(true)}
            disabled={loading || refreshing}
            title="Refresh salon statistics"
          >
            <FiRefreshCw className={refreshing ? styles.spinning : ''} />
            <span>Refresh</span>
          </button>
        }
      />

      {error && (
        <div className={styles.errorBanner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiAlertCircle />
            <span>{error}</span>
          </div>
          <button
            type="button"
            style={{
              background: 'none',
              border: 'none',
              color: '#C53030',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
            onClick={() => loadDashboardData(true)}
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className={styles.loadingBox}>
          <div className={styles.spinner} />
          <p>Loading salon dashboard & analytics...</p>
        </div>
      ) : (
        <div className={styles.adminHome}>
          {/* ── 1. Top KPI Summary Grid ─────────────────────────── */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIconWrap}>
                <FiUsers />
              </div>
              <div className={styles.statInfo}>
                <p className={styles.statLabel}>Total Customers</p>
                <h3 className={styles.statValue}>{stats.totalCustomers}</h3>
                <p className={styles.statSubtext}>Registered salon clients</p>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={`${styles.statIconWrap} ${styles.statIconServices}`}>
                <FiScissors />
              </div>
              <div className={styles.statInfo}>
                <p className={styles.statLabel}>Salon Catalog</p>
                <h3 className={styles.statValue}>{stats.totalServices}</h3>
                <p className={styles.statSubtext}>
                  {stats.activeServicesCount} active treatments
                </p>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={`${styles.statIconWrap} ${styles.statIconUpcoming}`}>
                <FiCalendar />
              </div>
              <div className={styles.statInfo}>
                <p className={styles.statLabel}>Upcoming Visits</p>
                <h3 className={styles.statValue}>{stats.upcomingAppointments}</h3>
                <p className={styles.statSubtext}>Confirmed client visits</p>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={`${styles.statIconWrap} ${styles.statIconPending}`}>
                <FiClock />
              </div>
              <div className={styles.statInfo}>
                <p className={styles.statLabel}>Pending Requests</p>
                <h3 className={styles.statValue}>{stats.pendingBookings}</h3>
                <p className={styles.statSubtext}>Awaiting confirmation</p>
              </div>
            </div>
          </div>

          {/* ── 2. Analytics Row (Activity Trends & Status Donut) ── */}
          <div className={styles.analyticsRow}>
            {/* Basic Appointment Activity Graph */}
            <div className={`${styles.card} ${styles.trendCard}`}>
              <div className={styles.cardHeader}>
                <div>
                  <h3 className={styles.cardTitle}>
                    <FiActivity /> Appointment Activity Trends
                  </h3>
                  <p className={styles.cardSubtitle}>
                    Daily appointment volume across booking dates
                  </p>
                </div>
              </div>

              {trendData.length === 0 ? (
                <div className={styles.chartEmpty}>
                  <FiInbox />
                  <p>No booking activity recorded to display trend graph.</p>
                </div>
              ) : graphMetrics ? (
                <div className={styles.graphWrapper}>
                  <svg
                    viewBox={`0 0 ${graphMetrics.width} ${graphMetrics.height}`}
                    className={styles.trendSvg}
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#D8A4A9" stopOpacity="0.45" />
                        <stop offset="100%" stopColor="#FFF0F5" stopOpacity="0.05" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Grid lines */}
                    <line
                      x1={graphMetrics.padLeft}
                      y1={graphMetrics.padTop}
                      x2={graphMetrics.width - graphMetrics.padRight}
                      y2={graphMetrics.padTop}
                      className={styles.gridLine}
                    />
                    <line
                      x1={graphMetrics.padLeft}
                      y1={graphMetrics.padTop + graphMetrics.plotH / 2}
                      x2={graphMetrics.width - graphMetrics.padRight}
                      y2={graphMetrics.padTop + graphMetrics.plotH / 2}
                      className={styles.gridLine}
                    />
                    <line
                      x1={graphMetrics.padLeft}
                      y1={graphMetrics.padTop + graphMetrics.plotH}
                      x2={graphMetrics.width - graphMetrics.padRight}
                      y2={graphMetrics.padTop + graphMetrics.plotH}
                      className={styles.gridLineBase}
                    />

                    {/* Y-Axis scale text */}
                    <text
                      x={graphMetrics.padLeft - 8}
                      y={graphMetrics.padTop + 4}
                      className={styles.axisText}
                      textAnchor="end"
                    >
                      {graphMetrics.maxVal}
                    </text>
                    <text
                      x={graphMetrics.padLeft - 8}
                      y={graphMetrics.padTop + graphMetrics.plotH / 2 + 4}
                      className={styles.axisText}
                      textAnchor="end"
                    >
                      {Math.round(graphMetrics.maxVal / 2)}
                    </text>
                    <text
                      x={graphMetrics.padLeft - 8}
                      y={graphMetrics.padTop + graphMetrics.plotH + 4}
                      className={styles.axisText}
                      textAnchor="end"
                    >
                      0
                    </text>

                    {/* Area & Line */}
                    <path d={graphMetrics.areaPath} fill="url(#activityGradient)" />
                    <path
                      d={graphMetrics.linePath}
                      fill="none"
                      stroke="#B07A80"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Data Points */}
                    {graphMetrics.points.map((p, idx) => (
                      <g key={idx}>
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={hoveredTrendPoint?.date === p.date ? 6 : 4}
                          className={`${styles.chartPoint} ${hoveredTrendPoint?.date === p.date ? styles.pointHovered : ''}`}
                          onMouseEnter={() => setHoveredTrendPoint(p)}
                          onMouseLeave={() => setHoveredTrendPoint(null)}
                        />
                        {/* X-axis date labels */}
                        <text
                          x={p.x}
                          y={graphMetrics.height - 8}
                          className={styles.xAxisLabel}
                          textAnchor="middle"
                        >
                          {p.label}
                        </text>
                      </g>
                    ))}
                  </svg>

                  {/* Hover Tooltip Pill */}
                  {hoveredTrendPoint && (
                    <div
                      className={styles.trendTooltip}
                      style={{
                        left: `${(hoveredTrendPoint.x / graphMetrics.width) * 100}%`,
                        top: `${(hoveredTrendPoint.y / graphMetrics.height) * 100}%`,
                      }}
                    >
                      <strong>{formatDate(hoveredTrendPoint.date)}</strong>
                      <div>
                        {hoveredTrendPoint.count} appointment{hoveredTrendPoint.count !== 1 ? 's' : ''}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Appointment Status Distribution (Donut Chart) */}
            <div className={`${styles.card} ${styles.donutCard}`}>
              <div className={styles.cardHeader}>
                <div>
                  <h3 className={styles.cardTitle}>
                    <FiPieChart /> Appointment Status
                  </h3>
                  <p className={styles.cardSubtitle}>
                    Real-time distribution of all {statusStats.total} bookings
                  </p>
                </div>
              </div>

              <div className={styles.donutBody}>
                <div className={styles.donutSvgWrap}>
                  <svg viewBox="0 0 160 160" className={styles.donutSvg}>
                    {/* Background track circle */}
                    <circle
                      cx="80"
                      cy="80"
                      r="64"
                      fill="none"
                      stroke="#FFF0F5"
                      strokeWidth="18"
                    />

                    {statusStats.total === 0 ? (
                      <circle
                        cx="80"
                        cy="80"
                        r="64"
                        fill="none"
                        stroke="#E8D4D7"
                        strokeWidth="18"
                        strokeDasharray="402.12"
                      />
                    ) : (
                      statusStats.slices.map((slice) => {
                        if (slice.count === 0) return null;
                        const isHovered = hoveredSlice === slice.key;
                        return (
                          <circle
                            key={slice.key}
                            cx="80"
                            cy="80"
                            r="64"
                            fill="none"
                            stroke={slice.color}
                            strokeWidth={isHovered ? 22 : 18}
                            strokeDasharray={slice.strokeDasharray}
                            strokeDashoffset={slice.strokeDashoffset}
                            transform="rotate(-90 80 80)"
                            className={styles.donutSegment}
                            onMouseEnter={() => setHoveredSlice(slice.key)}
                            onMouseLeave={() => setHoveredSlice(null)}
                          />
                        );
                      })
                    )}

                    {/* Donut Center Display */}
                    <text x="80" y="74" textAnchor="middle" className={styles.donutCenterVal}>
                      {statusStats.total}
                    </text>
                    <text x="80" y="93" textAnchor="middle" className={styles.donutCenterLabel}>
                      Total Bookings
                    </text>
                  </svg>
                </div>

                {/* Donut Legend */}
                <div className={styles.donutLegend}>
                  {statusStats.slices.map((slice) => (
                    <div
                      key={slice.key}
                      className={`${styles.legendItem} ${hoveredSlice === slice.key ? styles.legendItemActive : ''}`}
                      onMouseEnter={() => setHoveredSlice(slice.key)}
                      onMouseLeave={() => setHoveredSlice(null)}
                    >
                      <div className={styles.legendColorDot} style={{ background: slice.color }} />
                      <div className={styles.legendInfo}>
                        <span className={styles.legendLabel}>{slice.label}</span>
                        <span className={styles.legendCount}>
                          {slice.count} <small>({slice.percentage}%)</small>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── 3. Popular Salon Services (Clean Full-Width Balanced Card) ── */}
          <div className={`${styles.card} ${styles.servicesCardFull}`}>
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.cardTitle}>
                  <FiScissors /> Popular Salon Services
                </h3>
                <p className={styles.cardSubtitle}>
                  Top booked treatments ranked by client demand and booking frequency
                </p>
              </div>
              <Link to="/services" className={styles.cardLink}>
                <span>View Catalog</span> <FiArrowUpRight />
              </Link>
            </div>

            {topServices.length === 0 ? (
              <div className={styles.chartEmpty}>
                <FiInbox />
                <p>No service booking history available yet.</p>
              </div>
            ) : (
              <div className={styles.serviceRankingGrid}>
                {topServices.map((svc, idx) => (
                  <div key={svc.name} className={styles.rankingRow}>
                    <div className={styles.rankingMeta}>
                      <div className={styles.rankingHeader}>
                        <span className={styles.rankingRank}>#{idx + 1}</span>
                        <span className={styles.rankingName}>{svc.name}</span>
                      </div>
                      <div className={styles.rankingStats}>
                        <span className={styles.rankingCount}>
                          {svc.count} booking{svc.count !== 1 ? 's' : ''}
                        </span>
                        <span className={styles.rankingPercentage}>
                          {svc.percentage}% of visits
                        </span>
                      </div>
                    </div>
                    <div className={styles.rankingBarTrack}>
                      <div
                        className={styles.rankingBarFill}
                        style={{ width: `${svc.barWidth}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── 4. Interactive Monthly Appointment Calendar ─────── */}
          <div className={`${styles.card} ${styles.calendarSectionCard}`}>
            <div className={styles.calendarSectionHeader}>
              <div>
                <h3 className={styles.cardTitle}>
                  <FiCalendar /> Salon Appointment Calendar
                </h3>
                <p className={styles.cardSubtitle}>
                  Interactive schedule planner: Click any date to view appointments and client bookings
                </p>
              </div>

              {/* Month Navigation Controls - Clearly Visible High-Contrast Buttons */}
              <div className={styles.calNavControls}>
                <button
                  type="button"
                  className={styles.calNavBtn}
                  onClick={handlePrevMonth}
                  title="Previous Month"
                  aria-label="Previous Month"
                >
                  <FiChevronLeft />
                </button>
                <span className={styles.calCurrentMonthLabel}>
                  {MONTH_NAMES[currentMonth]} {currentYear}
                </span>
                <button
                  type="button"
                  className={styles.calNavBtn}
                  onClick={handleNextMonth}
                  title="Next Month"
                  aria-label="Next Month"
                >
                  <FiChevronRight />
                </button>
                <button
                  type="button"
                  className={styles.calTodayBtn}
                  onClick={handleToday}
                >
                  Today
                </button>
              </div>
            </div>

            <div className={styles.calendarLayoutGrid}>
              {/* Left: Monthly Calendar Grid */}
              <div className={styles.calendarGridContainer}>
                {/* Weekday Header */}
                <div className={styles.weekdayHeaderRow}>
                  {WEEKDAY_NAMES.map((w) => (
                    <div key={w} className={styles.weekdayHeaderCell}>
                      {w}
                    </div>
                  ))}
                </div>

                {/* Day Cells Grid */}
                <div className={styles.daysGrid}>
                  {calendarDays.map((day) => {
                    const isToday = day.dateStr === todayStr;
                    const isSelected = day.dateStr === selectedDate;
                    const dayBookings = bookingsByDate[day.dateStr] || [];

                    // Status dots breakdown
                    const hasConfirmed = dayBookings.some((b) => (b.status || '').toUpperCase() === 'CONFIRMED');
                    const hasRequested = dayBookings.some((b) => (b.status || '').toUpperCase() === 'REQUESTED');
                    const hasCompleted = dayBookings.some((b) => (b.status || '').toUpperCase() === 'COMPLETED');
                    const hasCancelled = dayBookings.some((b) => ['CANCELLED', 'REJECTED'].includes((b.status || '').toUpperCase()));

                    return (
                      <button
                        type="button"
                        key={day.dateStr}
                        onClick={() => setSelectedDate(day.dateStr)}
                        className={`
                          ${styles.dayCell}
                          ${!day.isCurrentMonth ? styles.dayCellOtherMonth : ''}
                          ${isToday ? styles.dayCellToday : ''}
                          ${isSelected ? styles.dayCellSelected : ''}
                          ${dayBookings.length > 0 ? styles.dayCellHasBookings : ''}
                        `}
                      >
                        <div className={styles.dayCellTop}>
                          <span className={styles.dayNum}>{day.dayNum}</span>
                          {isToday && <span className={styles.todayIndicator}>Today</span>}
                        </div>

                        {dayBookings.length > 0 && (
                          <div className={styles.dayBookingMeta}>
                            <div className={styles.statusDotsRow}>
                              {hasConfirmed && <span className={`${styles.statusDot} ${styles.dotConfirmed}`} title="Confirmed" />}
                              {hasRequested && <span className={`${styles.statusDot} ${styles.dotPending}`} title="Pending" />}
                              {hasCompleted && <span className={`${styles.statusDot} ${styles.dotCompleted}`} title="Completed" />}
                              {hasCancelled && <span className={`${styles.statusDot} ${styles.dotCancelled}`} title="Cancelled" />}
                            </div>
                            <span className={styles.bookingCountBadge}>
                              {dayBookings.length} {dayBookings.length === 1 ? 'visit' : 'visits'}
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Calendar Legend */}
                <div className={styles.calendarStatusLegend}>
                  <div className={styles.legendPill}>
                    <span className={`${styles.statusDot} ${styles.dotConfirmed}`} /> Confirmed
                  </div>
                  <div className={styles.legendPill}>
                    <span className={`${styles.statusDot} ${styles.dotPending}`} /> Pending
                  </div>
                  <div className={styles.legendPill}>
                    <span className={`${styles.statusDot} ${styles.dotCompleted}`} /> Completed
                  </div>
                  <div className={styles.legendPill}>
                    <span className={`${styles.statusDot} ${styles.dotCancelled}`} /> Cancelled
                  </div>
                </div>
              </div>

              {/* Right: Selected Date Schedule Details */}
              <div className={styles.selectedSchedulePanel}>
                <div className={styles.scheduleHeader}>
                  <div>
                    <h4 className={styles.scheduleDateTitle}>
                      {formatSelectedDateHeader(selectedDate)}
                    </h4>
                    <p className={styles.scheduleSub}>
                      {selectedDateBookings.length} appointment{selectedDateBookings.length !== 1 ? 's' : ''} scheduled
                    </p>
                  </div>
                  {/* Schedule Booking Button */}
                  <button
                    type="button"
                    className={styles.scheduleBookingBtn}
                    onClick={() => setIsBookingModalOpen(true)}
                    title="Schedule appointment for phone or WhatsApp client"
                  >
                    <FiPlus />
                    <span>Schedule Booking</span>
                  </button>
                </div>

                {selectedDateBookings.length === 0 ? (
                  <div className={styles.scheduleEmpty}>
                    <FiCalendar className={styles.scheduleEmptyIcon} />
                    <h5>No Appointments</h5>
                    <p>No client bookings recorded for this date. The salon slot is open.</p>
                    <button
                      type="button"
                      className={styles.emptyAddBtn}
                      onClick={() => setIsBookingModalOpen(true)}
                    >
                      <FiPlus size={13} />
                      <span>Schedule for this date</span>
                    </button>
                  </div>
                ) : (
                  <div className={styles.scheduleList}>
                    {selectedDateBookings.map((b) => {
                      const client = parseClientInfo(b);
                      const sName = b.serviceName || b.service?.serviceName || 'Salon Service';
                      const slotPeriod = b.preferredPeriod || b.slotTime || 'Scheduled Visit';

                      return (
                        <div key={b.bookingId} className={styles.scheduleItemCard}>
                          <div className={styles.itemCardTop}>
                            <span className={styles.itemServiceName}>{sName}</span>
                            <div className={styles.itemSlotTag}>
                              <FiClock /> {slotPeriod}
                            </div>
                          </div>

                          <div className={styles.itemClientRow}>
                            <div className={styles.itemClientInfo}>
                              <span className={styles.itemClientName}>{client.name}</span>
                              {client.phone && (
                                <span className={styles.itemClientPhone}>
                                  <FiPhone /> {formatPhoneDisplay(client.phone)}
                                </span>
                              )}
                            </div>
                            <div>{getStatusBadge(b.status)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminPageContainer>
  );
};

export default AdminHome;
