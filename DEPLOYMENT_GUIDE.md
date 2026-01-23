# 🚀 Free Deployment Guide for EdgeVoice

This guide will help you deploy your EdgeVoice project completely **FREE** using:
- **Render.com** for the Flask backend (free tier)
- **Vercel** or **Netlify** for the React frontend (free tier)

## 📋 Prerequisites

1. GitHub account (to deploy from repository)
2. Push your code to GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/edgevoice.git
git push -u origin main
```

## 🔧 Part 1: Deploy Backend to Render.com

### Step 1: Sign up for Render
1. Go to [render.com](https://render.com)
2. Sign up with your GitHub account (free)

### Step 2: Create a New Web Service
1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Select your EdgeVoice repository

### Step 3: Configure the Service
Use these settings:

- **Name**: `edgevoice-backend`
- **Region**: Choose closest to you
- **Branch**: `main`
- **Root Directory**: Leave empty
- **Runtime**: `Python 3`
- **Build Command**: 
  ```bash
  pip install -r EdgeVoice_Project/backend/requirements.txt
  ```
- **Start Command**: 
  ```bash
  cd EdgeVoice_Project/backend && gunicorn app:app
  ```
- **Plan**: **Free** (select this!)

### Step 4: Environment Variables
Add these in Render dashboard:
- `PYTHON_VERSION` = `3.11.0`

### Step 5: Deploy
1. Click **"Create Web Service"**
2. Wait 5-10 minutes for deployment
3. Your backend will be at: `https://edgevoice-backend.onrender.com`

⚠️ **Note**: Free tier sleeps after 15 minutes of inactivity. First request takes ~30 seconds to wake up.

## 🎨 Part 2: Deploy Frontend to Vercel

### Option A: Vercel (Recommended)

#### Step 1: Sign up for Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub (free)

#### Step 2: Import Project
1. Click **"Add New"** → **"Project"**
2. Import your GitHub repository
3. Configure:
   - **Framework Preset**: `Create React App`
   - **Root Directory**: `edgevoice-ui`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`

#### Step 3: Environment Variables
Add in Vercel dashboard:
- `REACT_APP_API_URL` = `https://edgevoice-backend.onrender.com`

#### Step 4: Deploy
1. Click **"Deploy"**
2. Wait 2-3 minutes
3. Your frontend will be at: `https://edgevoice-ui.vercel.app`

### Option B: Netlify (Alternative)

#### Step 1: Sign up for Netlify
1. Go to [netlify.com](https://netlify.com)
2. Sign up with GitHub (free)

#### Step 2: Import Project
1. Click **"Add new site"** → **"Import an existing project"**
2. Connect to GitHub
3. Select your repository
4. Configure:
   - **Base directory**: `edgevoice-ui`
   - **Build command**: `npm run build`
   - **Publish directory**: `edgevoice-ui/build`

#### Step 3: Environment Variables
In Netlify dashboard → Site settings → Environment variables:
- `REACT_APP_API_URL` = `https://edgevoice-backend.onrender.com`

#### Step 4: Deploy
1. Click **"Deploy site"**
2. Your site will be at: `https://random-name.netlify.app`

## 🔄 Part 3: Update Frontend to Use Deployed Backend

After deployment, update your React app to use the deployed backend URL:

1. Create a `.env` file in `edgevoice-ui/`:
   ```bash
   REACT_APP_API_URL=https://your-backend-url.onrender.com
   ```

2. Update your API calls in the React app to use `process.env.REACT_APP_API_URL`

3. Commit and push changes - Vercel/Netlify will auto-deploy!

## 📱 Part 4: Deploy Static Frontend (Optional)

If you want to deploy the vanilla JS frontend (`EdgeVoice_Project/frontend/`):

### Using GitHub Pages (Free)
1. Go to your repository → Settings → Pages
2. Source: Deploy from a branch
3. Branch: `main`, Folder: `/EdgeVoice_Project/frontend`
4. Save
5. Your site will be at: `https://YOUR_USERNAME.github.io/edgevoice/`

### Using Netlify Drop
1. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag and drop the `EdgeVoice_Project/frontend/` folder
3. Instant deployment!

## 🎉 You're Done!

Your EdgeVoice project is now deployed for FREE!

### Your URLs:
- Backend API: `https://edgevoice-backend.onrender.com`
- React Frontend: `https://edgevoice-ui.vercel.app`
- Static Frontend (if deployed): `https://YOUR_USERNAME.github.io/edgevoice/`

## 🔍 Troubleshooting

### Backend not responding
- Check Render logs for errors
- Verify all dependencies in `requirements.txt`
- Free tier sleeps - first request is slow

### Frontend can't connect to backend
- Check CORS settings in backend
- Verify `REACT_APP_API_URL` environment variable
- Check browser console for errors

### CORS Errors
The backend already has CORS configured for `*`. If issues persist:
1. Check Render logs
2. Ensure HTTPS is used (not HTTP)
3. Clear browser cache

## 💰 Cost Breakdown

| Service | Tier | Cost | Limits |
|---------|------|------|--------|
| Render (Backend) | Free | $0/month | 750 hours/month, sleeps after 15 min |
| Vercel (Frontend) | Hobby | $0/month | 100 GB bandwidth, unlimited sites |
| Netlify (Alternative) | Starter | $0/month | 100 GB bandwidth |
| GitHub Pages | Free | $0/month | 100 GB bandwidth |

**Total: $0/month** 🎉

## 🚀 Upgrade Options (If Needed Later)

If you need:
- **No sleep time**: Render Starter ($7/month)
- **More resources**: Render Standard ($25/month)
- **Custom domain**: All platforms support free

## 📚 Additional Resources

- [Render Documentation](https://render.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Netlify Documentation](https://docs.netlify.com)
- [Flask Deployment Guide](https://flask.palletsprojects.com/en/2.3.x/deploying/)

## 🔐 Security Notes

For production:
1. Never commit `.env` files (already in `.gitignore`)
2. Use environment variables for secrets
3. Keep dependencies updated
4. Monitor Render/Vercel logs

---

Need help? Check the logs on Render/Vercel dashboard or open an issue on GitHub!
