# Firebase Deployment Guide

## Fixing the "Missing or insufficient permissions" Error

The error you're encountering is due to restrictive Firestore security rules. Here's how to fix it:

### Option 1: Deploy Rules Using Firebase CLI (Recommended)

1. **Install Firebase CLI** (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Initialize Firebase** (if not already done):
   ```bash
   firebase init
   ```

4. **Deploy the updated rules**:
   ```bash
   firebase deploy --only firestore:rules
   ```

### Option 2: Manual Deployment via Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `anonymous-complaint-box`
3. Go to **Firestore Database** → **Rules**
4. Replace the existing rules with the content from `firestore-rules.txt`
5. Click **Publish**

### Option 3: Using npm scripts (if Firebase CLI is configured)

```bash
npm run deploy:rules
```

## Updated Security Rules

The updated rules are more permissive for testing purposes:

- **Complaints**: Anyone can create, authenticated users can read/update/delete
- **Announcements**: Public read, authenticated users can create/update/delete
- **Announcement Requests**: Authenticated users can create/read/write

## Troubleshooting

### If you still get permission errors:

1. **Check Authentication**: Make sure you're logged in to Firebase
2. **Verify Project**: Ensure you're working with the correct Firebase project
3. **Clear Cache**: Try refreshing the page and clearing browser cache
4. **Check Console**: Look for additional error messages in the browser console

### Common Issues:

- **Wrong Project**: Make sure you're using the correct Firebase project ID
- **Not Authenticated**: Ensure the user is properly authenticated before performing admin operations
- **Rules Not Deployed**: Verify the rules have been successfully deployed

## Security Note

The current rules are more permissive for testing. For production, you should implement proper admin role checking:

```javascript
// Example of proper admin check
function isAdmin(uid) {
  return request.auth != null && 
         request.auth.uid in get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.authorizedUsers;
}
```

## Next Steps

1. Deploy the updated rules using one of the methods above
2. Test the application to ensure the error is resolved
3. Implement proper admin role management for production use
