# 🚀 Quick Start Guide - Golf Charity Platform

## Prerequisites Check
- ✅ Node.js installed
- ✅ Backend `.env` configured (Supabase credentials)
- ✅ Frontend `.env` configured (API URL: `http://localhost:5000/api`)
- ✅ Admin user created (seed script ran)

---

## 🔴 Starting the Servers

### **Terminal 1: Start Backend**

```bash
cd backend
npm install  # (if not done yet)
npm run dev
```

Expected output:
```
🚀 Server running on port 5000
Environment: development
```

### **Terminal 2: Start Frontend**

```bash
cd frontend
npm install  # (if not done yet)
npm run dev
```

Expected output:
```
VITE v5.0.0 ready in 123 ms
Local:    http://localhost:5173/
```

---

## 📝 Login to Admin

1. Open browser: **http://localhost:5173**
2. Click "Sign In" or go to `/login`
3. Enter credentials:
   - **Email:** `admin@golfcharity.com`
   - **Password:** `Admin@1234`
4. Click "Sign In"

---

## ✅ What to Expect After Login

### As Admin, You Should See:
- ✅ Navbar shows your profile
- ✅ Sidebar shows "Admin Panel" option in top right
- ✅ Click "Admin Panel" → `/admin` dashboard
- ✅ Sidebar with admin menu items
- ✅ "Users" section showing all registered users

### User Management Panel Shows:
- User name, email, role, subscription status
- Credits balance
- Last score submission date
- Expandable user detail cards

### When You Click on a User:
- User info expands
- Actions available:
  - Suspend/Restore button
  - Subscription management (Activate/Deactivate/Unlimited)
  - Add credits
  - Add funds
  - Score history
  - Win history
  - Transaction history

---

## 🐛 Troubleshooting

### Issue: "404 - Login Failed"

**Solution:**
- Check API URL in frontend `.env`:
  ```
  VITE_API_URL=http://localhost:5000/api
  ```
- Restart frontend: `Ctrl+C` then `npm run dev`

### Issue: "Can't see users in admin panel"

**Check:**
1. Backend running? (Should see `🚀 Server running on port 5000`)
2. Admin logged in? (Check browser DevTools)
3. Open DevTools (F12) → Network tab
4. Click on user, check API calls for errors
5. Check backend console for errors

### Issue: "Subscription activation doesn't work"

**Solution:**
1. Run SQL migration in Supabase:
   ```sql
   ALTER TABLE subscriptions DROP CONSTRAINT subscriptions_plan_check;
   ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_check 
     CHECK (plan in ('monthly', 'yearly', 'unlimited'));
   ```
2. Restart backend

### Issue: "Changes not saving"

**Check:**
- Open DevTools (F12) → Network tab
- Try making a change
- Look for failed API requests (red)
- Check response error message
- Check backend console for errors

---

## 📊 API Health Check

Test if backend is responding:

```bash
# Terminal
curl http://localhost:5000/health

# Expected response:
# {"status":"ok","timestamp":"2026-04-05T..."}
```

---

## 🔑 Key Environment Variables

### Backend (`.env`)
```
SUPABASE_URL=https://ekfhosewnakegkxogvwa.supabase.co
SUPABASE_SERVICE_KEY=sb_publishable_...
JWT_SECRET=mysecret12345678901234567890
PORT=5000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

### Frontend (`.env`)
```
VITE_API_URL=http://localhost:5000/api
VITE_SUPABASE_URL=https://ekfhosewnakegkxogvwa.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbG...
```

---

## 🎯 Feature Checklist

After login as admin, verify these work:

- [ ] See "Users" in sidebar
- [ ] Click "Users" loads user list
- [ ] Search for user by name/email works
- [ ] Click on user expands details
- [ ] Can suspend/restore user
- [ ] Can activate subscription (choose plan)
- [ ] Can add credits (positive/negative)
- [ ] Can add funds (£ amounts)
- [ ] All changes show success message
- [ ] User history loads (scores, wins, transactions)

---

## 🆘 Emergency Commands

```bash
# Kill lingering processes
# Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# macOS/Linux:
lsof -ti:5000 | xargs kill -9

# Clear npm cache
npm cache clean --force

# Reinstall node_modules
rm -rf node_modules
npm install
```

---

## 📞 Support Info

If still having issues:
1. Check both servers are running (no errors)
2. Verify all `.env` files are correct
3. Refresh browser and try again
4. Check browser DevTools Console (F12)
5. Check backend terminal for errors
6. Try different browser if possible

---

**Happy administrating! 🎉**
