# 🚗 Motor & Non-Motor Claims Portal

A modern Insurance Claims Management Portal developed using **Angular 19**, **Angular Material**, and **Supabase**. The application streamlines the complete insurance claim lifecycle—from First Notice of Loss (FNOL) to claim closure—through an intuitive dashboard and role-based workflow.

---

## 📌 Project Overview

The Motor & Non-Motor Claims Portal digitizes insurance claim processing by enabling policyholders and claim handlers to efficiently register, assess, approve, track, and close claims.

The application provides a clean and responsive user interface built with Angular Material while leveraging Supabase for backend services and authentication.

---

## ✨ Features

- Secure User Authentication
- Interactive Dashboard
- First Notice of Loss (FNOL)
- Motor Claim Registration
- Non-Motor Claim Processing
- Claims Listing & Search
- Claim Details View
- Damage Assessment
- Approval Workflow
- Payment Management
- Claim Closure
- Responsive UI
- Real-time Data Integration
- Material Design Components

---

## 🛠 Tech Stack

### Frontend

- Angular 19
- TypeScript
- Angular Material
- RxJS
- Angular Router

### Backend

- Supabase
- Authentication
- Database
- REST APIs

### Development Tools

- Angular CLI
- Git
- GitHub

---

## 📂 Project Structure

```
src/
│
├── auth/
├── dashboard/
├── claims/
├── assessment/
├── approvals/
├── payments/
├── closure/
├── motor-fnol/
├── services/
├── shared/
├── models/
└── environments/
```

---

## 🚀 Modules

### Authentication

- Login
- User Validation
- Session Management

### Dashboard

- Claim Statistics
- Pending Tasks
- Claim Summary
- Quick Navigation

### FNOL

- Policy Details
- Vehicle Details
- Accident Information
- Driver Information
- Claim Registration

### Claims

- Claim Listing
- Search & Filter
- Claim Details

### Assessment

- Damage Inspection
- Assessment Status
- Survey Information

### Approval

- Review Claims
- Approve / Reject Workflow

### Payments

- Payment Processing
- Settlement Tracking

### Closure

- Final Claim Closure
- Completion Status

---

## ⚙️ Installation

Clone the repository

```bash
git clone https://github.com/shubhamdhapade/MotorAndNonMotorClaimsPortal.git
```

Move into the project

```bash
cd MotorAndNonMotorClaimsPortal
```

Install dependencies

```bash
npm install
```

Run the application

```bash
ng serve
```

Navigate to

```
http://localhost:4200
```

---

## 🔐 Environment Variables

Configure your Supabase credentials inside:

```
src/environments/environment.ts
```

Example

```ts
export const environment = {
  production: false,
  supabaseUrl: "YOUR_SUPABASE_URL",
  supabaseKey: "YOUR_SUPABASE_ANON_KEY"
};
```

---

## 📊 Workflow

```
Login
      ↓
Dashboard
      ↓
FNOL Registration
      ↓
Claim Creation
      ↓
Assessment
      ↓
Approval
      ↓
Payment
      ↓
Claim Closure
```

---

## 📱 UI Highlights

- Modern Angular Material UI
- Responsive Design
- Dashboard Cards
- Data Tables
- Stepper Forms
- Status Chips
- Search & Filters

---

## Future Enhancements

- Role-Based Access Control
- Document Upload
- Email Notifications
- SMS Alerts
- Audit Logs
- Report Generation
- Analytics Dashboard
- Multi-language Support

---

## Author

**Shubham Dhapade**

Software Developer

GitHub:
https://github.com/shubhamdhapade

LinkedIn:
www.linkedin.com/in/shubham-dhapade-3220b1135

---

## License

This project is developed for learning and portfolio purposes.
