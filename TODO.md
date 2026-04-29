# WebSocket Integration TODO

## Phase 1: Setup & Core Infrastructure
- [x] Step 1: Add `socket.io-client` dependency to `SpeedCopy/package.json`
- [x] Step 2: Create `SpeedCopy/src/services/socket.ts` - Socket.IO client service
- [x] Step 3: Create `SpeedCopy/src/store/useSocketStore.ts` - Socket state management
- [x] Step 4: Create `SpeedCopy/src/store/useNotificationStore.ts` - Notification store
- [x] Step 5: Create `SpeedCopy/src/hooks/useSocket.ts` - React hook for socket events

## Phase 2: App Integration
- [x] Step 6: Update `SpeedCopy/App.tsx` - Initialize socket on auth state change

## Phase 3: Screen Updates
- [x] Step 7: Update `NotificationsScreen.tsx` - Real-time notification updates
- [x] Step 8: Update `SupportScreen.tsx` - Real-time ticket updates
- [x] Step 9: Update `TrackingScreen.tsx` - Live order status updates
- [x] Step 10: Update `ProfileScreen.tsx` - Notification badge with unread count

## Phase 4: Testing & Verification
- [x] Step 11: Run `npm install` to install socket.io-client
- [ ] Step 12: Verify all existing APIs still work correctly
- [ ] Step 13: Verify socket connects with JWT auth

## Summary of Changes

### New Files Created:
1. `SpeedCopy/src/services/socket.ts` - Socket.IO client service with JWT auth, auto-reconnect, and fallback URLs
2. `SpeedCopy/src/store/useSocketStore.ts` - Zustand store for socket connection state
3. `SpeedCopy/src/store/useNotificationStore.ts` - Zustand store for real-time notifications
4. `SpeedCopy/src/hooks/useSocket.ts` - React hooks for socket initialization and event listening

### Modified Files:
1. `SpeedCopy/App.tsx` - Added `AppWithSocket` component that initializes socket on auth state change
2. `SpeedCopy/src/screens/profile/NotificationsScreen.tsx` - Uses notification store for real-time updates
3. `SpeedCopy/src/screens/profile/SupportScreen.tsx` - Listens for ticket updates and replies via WebSocket
4. `SpeedCopy/src/screens/orders/TrackingScreen.tsx` - Listens for order status and delivery location updates
5. `SpeedCopy/src/screens/profile/ProfileScreen.tsx` - Shows unread notification count badge on Notifications menu item
6. `SpeedCopy/package.json` - Added `socket.io-client` dependency

### Real-Time Features Implemented:
- **Notifications**: New notifications appear instantly in the Notifications screen
- **Tickets**: Ticket status updates and new replies reflect immediately in Support screen
- **Order Tracking**: Order status changes and delivery ETA updates happen in real-time
- **Notification Badge**: Profile screen shows unread notification count badge
- **JWT Authentication**: Socket connects with the same JWT token used for API calls
- **Auto-Reconnect**: Socket automatically reconnects on disconnect with exponential backoff

