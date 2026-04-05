## Admin Panel - Complete User Management System

Now you have full control over all users in the admin panel!

### ✅ What You Can Do:

#### 1. **View All Users**
- See all registered users with their status
- Search by name or email
- See subscription status and credits at a glance

#### 2. **Subscription Management**
- **Activate** - Assign monthly, yearly, or unlimited plans
- **Deactivate** - Cancel any user's subscription
- **Unlimited Tier** - Give/remove unlimited access

#### 3. **Credit Management**
- Add credits to user accounts
- Deduct credits (negative values)
- Full transaction history

#### 4. **Money/Funds Management**
- Add money to user accounts (£ amounts)
- Deduct money from user accounts
- Track all fund transactions

#### 5. **User Control**
- Suspend or restore users
- Edit user details
- View complete user history

#### 6. **Score Management**
- Edit individual scores
- Delete scores
- View score history

---

## 🚀 How to Use the Admin Panel:

### Step 1: Login
```
Email:    admin@golfcharity.com
Password: Admin@1234
```

### Step 2: Go to Admin Panel
After login, click on "Admin" or navigate to `/admin`

### Step 3: View Users
Click on **Users** in the sidebar to see all registered users.

### Step 4: Manage Users
Click on any user to expand and access management options:

**Subscription Management:**
- If no subscription → Choose plan → Click "Activate"
- If active subscription → Click "Deactivate" or toggle "Unlimited"

**Add Credits:**
- Enter amount (positive = grant, negative = deduct)
- Add description
- Click "Apply"

**Add Funds:**
- Enter amount in £ (e.g., 50.00)
- Add description
- Click "Apply"

**Edit Scores:**
- Hover over score and click pencil icon
- Enter new score (1-45)
- Click checkmark

---

## 📊 Admin Dashboard Overview:

**Sidebar Navigation:**
- 📊 **Overview** - Statistics and KPIs
- 👥 **Users** - User management
- 🏆 **Draws** - Draw creation and execution
- ✅ **Winners** - Prize approvals and payments
- ❤️ **Charities** - Charity management
- ⚙️ **Prize Config** - Prize pool percentages
- 🔔 **Notifications** - Send alerts to users
- 📈 **Reports** - Detailed analytics
- 📝 **Audit Log** - Action history

---

## 🔧 Important: Database Update

You need to update your Supabase database to support unlimited plans:

### Go to Supabase SQL Editor and run:
```sql
ALTER TABLE subscriptions DROP CONSTRAINT subscriptions_plan_check;

ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_check 
  CHECK (plan in ('monthly', 'yearly', 'unlimited'));
```

---

## ✨ Features Summary:

| Feature | Status |
|---------|--------|
| View all users | ✅ |
| Search users | ✅ |
| Suspend/Restore | ✅ |
| Add/Deduct Credits | ✅ |
| Add/Deduct Funds | ✅ |
| Manage Subscriptions | ✅ |
| Unlimited Tier | ✅ |
| Edit Scores | ✅ |
| View Transactions | ✅ |
| Audit Logging | ✅ |

---

## 🚨 Troubleshooting:

**Q: Users list not showing?**
- Make sure backend is running: `npm run dev` in backend folder
- Frontend should access: `http://localhost:5173`
- Check browser console for errors (F12)

**Q: Can't activate subscription?**
- Run the SQL migration in Supabase first
- Make sure backend has no errors

**Q: Changes not saving?**
- Check browser Network tab in DevTools (F12)
- Look for error responses from API
- Verify backend is accessible at `http://localhost:5000/api`

---

## 📝 Notes:

- All admin actions are **audited** - stored in admin_logs table
- Users are **notified** of subscription/fund changes via notifications
- Transactions are **immutable** - all history is preserved
- By default, admin can **give unlimited access** to any user

---

**API Endpoints Used:**

```
GET  /api/admin/users              - List all users
GET  /api/admin/users/:id          - Get user details
POST /api/admin/users/:id/credits  - Add/deduct credits
POST /api/admin/users/:id/funds    - Add/deduct funds
POST /api/admin/users/:id/subscription/activate    - Activate subscription
POST /api/admin/users/:id/subscription/deactivate  - Deactivate subscription
POST /api/admin/users/:id/unlimited - Enable/disable unlimited
```
