# 🚀 Deployment Guide - Aegis V3 Frontend

## Quick Deploy to Vercel (Recommended)

### Option 1: Deploy via Vercel Website (Easiest)

1. **Push your code to GitHub** (already done!)
   ```bash
   git push origin dev-teju
   ```

2. **Go to Vercel**
   - Visit: https://vercel.com
   - Sign in with your GitHub account

3. **Import Project**
   - Click "Add New..." → "Project"
   - Select your repository: `ParthRathix0/IIT-Trihacker-Finale`
   - Branch: `dev-teju`

4. **Configure Build Settings**
   - Framework Preset: **Next.js**
   - Root Directory: `packages/nextjs`
   - Build Command: `yarn build`
   - Output Directory: `.next`

5. **Environment Variables** (Optional)
   If you need any custom RPC endpoints, add:
   ```
   NEXT_PUBLIC_ALCHEMY_API_KEY=your_key_here
   ```

6. **Deploy!**
   - Click "Deploy"
   - Wait ~2-3 minutes
   - You'll get a live link like: `https://aegis-v3-xxx.vercel.app`

---

### Option 2: Deploy via Vercel CLI (Advanced)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   cd packages/nextjs
   yarn vercel:login
   ```

3. **Deploy**
   ```bash
   # For production deployment
   yarn vercel --prod
   
   # Or use the pre-configured command
   yarn vercel
   ```

4. **Follow prompts:**
   - Set up and deploy? **Y**
   - Which scope? Select your account
   - Link to existing project? **N** (first time)
   - What's your project's name? `aegis-v3`
   - In which directory is your code located? `./`
   - Override settings? **N**

5. **Get your live link!**
   ```
   ✅ Production: https://aegis-v3.vercel.app
   ```

---

## Alternative Deployment Options

### Option 3: Deploy to Netlify

1. **Push to GitHub** (done)

2. **Go to Netlify**
   - Visit: https://netlify.com
   - Sign in with GitHub

3. **Import from Git**
   - Select repository: `IIT-Trihacker-Finale`
   - Branch: `dev-teju`

4. **Build Settings**
   ```
   Base directory: packages/nextjs
   Build command: yarn build
   Publish directory: packages/nextjs/.next
   ```

5. **Deploy!**
   - Get link like: `https://aegis-v3.netlify.app`

---

### Option 4: Deploy to GitHub Pages (Static)

For static export only:

1. **Update next.config.ts**
   ```typescript
   output: 'export',
   ```

2. **Build**
   ```bash
   cd packages/nextjs
   yarn build
   ```

3. **Deploy to gh-pages**
   ```bash
   npx gh-pages -d out
   ```

---

## 🎯 Quick Commands

### For Vercel (Recommended):

```bash
# One-time setup
cd packages/nextjs
npm install -g vercel
yarn vercel:login

# Deploy to production
yarn vercel --prod

# Deploy preview
yarn vercel
```

### For Testing Locally:

```bash
# Build production version
cd packages/nextjs
yarn build

# Test production build locally
yarn serve
# Visit: http://localhost:3000
```

---

## 📊 Expected Results

After deployment, you'll get:

✅ **Live URL**: `https://your-project.vercel.app`
- Example: `https://aegis-v3.vercel.app`

✅ **Features Available**:
- Connect wallet (RainbowKit)
- View Aegis dashboard
- Interact with Sepolia contracts
- Block explorer
- Debug contracts page

✅ **Auto-deploys**:
- Every push to `dev-teju` branch triggers new deployment
- Preview URLs for every commit

---

## 🔧 Configuration Files

### `vercel.json` (Already configured)
```json
{
  "installCommand": "yarn install"
}
```

### Build Settings (Auto-detected)
- Framework: Next.js 15
- Node Version: 18.x
- Package Manager: Yarn

---

## 🌐 Live Link Examples

Based on your deployment, you'll get URLs like:

- **Production**: `https://iit-trihacker-finale.vercel.app`
- **Preview**: `https://iit-trihacker-finale-git-dev-teju-parthRathix0.vercel.app`
- **Branch**: `https://dev-teju--iit-trihacker-finale.vercel.app`

---

## 🐛 Troubleshooting

### Issue: Build fails on Vercel

**Solution 1**: Set build environment variables
```bash
vercel --build-env YARN_ENABLE_IMMUTABLE_INSTALLS=false
```

**Solution 2**: Use the pre-configured YOLO command
```bash
cd packages/nextjs
yarn vercel:yolo
```

### Issue: Contracts not loading

**Check**:
1. Sepolia contracts are deployed (✅ already done)
2. `deployedContracts.ts` is updated with correct addresses
3. RPC endpoint is accessible

### Issue: Wallet connection fails

**Solution**: Ensure WalletConnect project ID is set in `wagmiConfig.tsx`

---

## 📝 Post-Deployment Checklist

After deploying, verify:

- ✅ Site loads correctly
- ✅ Wallet connection works (try MetaMask)
- ✅ Switch to Sepolia network
- ✅ Aegis dashboard shows data
- ✅ Block explorer functions
- ✅ Debug page shows deployed contracts

---

## 🚀 Recommended: Vercel Web Deploy

**Easiest method** (No CLI needed):

1. Go to: https://vercel.com/new
2. Import: `ParthRathix0/IIT-Trihacker-Finale`
3. Set root directory: `packages/nextjs`
4. Click Deploy

**Result**: Live in ~2 minutes!

---

## 📧 Share Your Live Link

Once deployed, share with judges:

```
🌐 Live Demo: https://your-project.vercel.app
📊 Sepolia Contracts: https://sepolia.etherscan.io/address/0xe8C3672A7348Fe8fF81814C42f1bf411D69C39b1
📖 GitHub: https://github.com/ParthRathix0/IIT-Trihacker-Finale
```

---

## 🎉 Next Steps

1. Deploy using Vercel web interface (recommended)
2. Get your live link
3. Test the deployment
4. Update README.md with the live link
5. Share with judges!

**Estimated Time**: 3-5 minutes for complete deployment! 🚀
