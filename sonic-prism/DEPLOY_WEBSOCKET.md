# Deploy WebSocket Server to Railway (Free)

## Steps to Enable Remote Collaboration:

### 1. Deploy WebSocket Server to Railway

1. Go to your Railway dashboard
2. Click "New Service" in your project
3. Select "Deploy from GitHub repo"
4. Choose your repo and select the `/server` directory
5. Railway will auto-detect Node.js and deploy

### 2. Get Your WebSocket Server URL

After deployment, Railway will provide a URL like:
```
https://your-websocket-server.up.railway.app
```

### 3. Configure Frontend Environment Variable

1. In your Railway frontend service:
2. Go to Variables tab
3. Add new variable:
   - Key: `REACT_APP_WEBSOCKET_URL`
   - Value: `https://your-websocket-server.up.railway.app`

### 4. Redeploy Frontend

Railway will automatically redeploy with the new environment variable.

## That's it! 

Now two users can collaborate remotely:
- User 1: Creates session, gets 6-character code
- User 2: Joins with the code
- Both can jam together in real-time!

## Testing Locally

For local development, the app will automatically use `http://localhost:3002`
Run both servers locally:
```bash
# Terminal 1 - Frontend
npm start

# Terminal 2 - WebSocket Server  
npm run server
```

## Troubleshooting

If collaboration doesn't work:
1. Check Railway logs for the WebSocket service
2. Ensure CORS is properly configured
3. Verify the REACT_APP_WEBSOCKET_URL is set correctly