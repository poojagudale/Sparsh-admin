# Sparsh Admin Portal

Administrative frontend for Sparsh Salon & Spa operations.

## Features
- **Dashboard**: Real-time business metrics (total customers, total services, upcoming appointments, pending bookings, and recent bookings).
- **Bookings Management**: Review, confirm, complete, cancel, or reject customer appointment requests.
- **Services Catalog**: Add, update, delete services with image uploads and CSV bulk import.
- **Birthday Offers**: Track upcoming birthdays, preview promotional templates, and trigger WhatsApp greetings directly.
- **Customer Directory**: View, edit, and manage registered salon customer records.
- **Role Verification**: Enforces database-driven `ADMIN` role authentication.

## Development & Run Commands

```bash
# Install dependencies
npm install

# Start Vite dev server on port 5174
npm run dev

# Build production bundle
npm run build

# Preview production build
npm run preview
```

- **Local Port**: `http://localhost:5174`
- **Backend API Proxy**: `http://localhost:8080` (routes `/api` and `/uploads` proxy to Spring Boot)

"# Sparsh-admin" 
