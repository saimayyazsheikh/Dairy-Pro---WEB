# Dairy Pro Management System

![Dairy Pro](https://placehold.co/800x200?text=Dairy+Pro+Management+System)

A comprehensive, mobile-responsive web application designed to digitize and streamline operations for Dairy Pro. This system manages livestock, milk production, health records, inventory, HR, and finances in a centralized platform.

## Key Features

### Livestock Management (Cattle)
-   **Digital Herd Registry**: Track Cows, Bulls, Heifers, and Calves with unique Tag IDs.
-   **Genealogy Tracking**: Link animals to their mothers for lineage tracking.
-   **Reproductive Cycle**: Auto-calculate "Expected Delivery Date" (275 days) based on insemination.
-   **Status Tracking**: Monitor statuses like Milking, Pregnant, Dry, Sick, etc.
-   **Mobile Card View**: Responsive design switches to stacked cards on mobile for easy browsing.

### Milk Production & Sales
-   **Daily Logging**: Record Morning, Evening, and Night yields per cow.
-   **Sales Audit**: Log daily sales to multiple vendors (e.g., Angro, Mansoor, Walk-in).
-   **Automated Financials**: Auto-calculate revenue based on customizable rates.
-   **Performance Analytics**: View monthly breakdowns of individual cow yields.
-   **Export Tools**: Download reports in **PDF** or **Excel** formats.

### Health & Veterinary
-   **Medical History**: Log Vaccinations, Checkups, and Inseminations.
-   **Cost Tracking**: Split costs between "Medicine" and "Doctor Fees" for accurate accounting.
-   **Alerts**: Visual indicators for upcoming Vaccinations or Delivery dates.

### Inventory & Feed
-   **Stock Management**: Track feed, medicine, and machinery.
-   **Low Stock Alerts**: Auto-notification when items dip below thresholds.
-   **Recurring Auto-Logs**: Set templates (e.g., "Daily Feed Mix") to auto-deduct stock every day.
-   **Smart Cleanup**: Self-healing logic to prevent duplicate auto-logs on the same day.

### HR & Finance
-   **Payroll**: Manage staff salaries, advances, and bonuses.
-   **Expense Ledger**: Track all farm expenses (Feed, Medical, Maintenance, Utilities).
-   **P&L Overview**: Real-time Dashboard showing Revenue vs. Expenses.

## Mobile-First Design
The application is fully responsive and optimized for mobile browsers:
-   **Collapsible Sidebar**: Hamburger menu for small screens.
-   **Touch-Friendly**: Larger buttons and inputs.
-   **Adaptive Views**: Complex tables automatically convert to easy-to-read cards on phones.

## Technology Stack
-   **Frontend**: React.js (Vite), Tailwind CSS
-   **Backend / Database**: Firebase Realtime Database
-   **Authentication**: Firebase Auth
-   **Icons**: Lucide React
-   **Charts**: Recharts

## Installation & Setup

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/saimayyazsheikh/Dairy-Pro---WEB.git
    cd Dairy-Pro---WEB
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Environment Setup**:
    Create a `.env` file in the root and add your Firebase config:
    ```env
    VITE_FIREBASE_API_KEY=your_api_key
    VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
    VITE_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
    VITE_FIREBASE_PROJECT_ID=your_project_id
    VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
    VITE_FIREBASE_MESSAGING_SENDER_ID=your_id
    VITE_FIREBASE_APP_ID=your_app_id
    ```

4.  **Run Development Server**:
    ```bash
    npm run dev
    ```

5.  **Build for Production**:
    ```bash
    npm run build
    ```

## License
Private Property of Dairy Pro.
