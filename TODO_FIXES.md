# SpeedCopy Critical Fixes Plan

## Information Gathered
- All 5 critical issues are frontend-only fixes
- Backend APIs verified: avatar upload (`POST /api/users/profile/avatar`), address management, cart APIs all exist and work
- Wallet payment for orders is NOT supported by backend (only top-up exists) — fix is UX-only
- Navigation types already support all needed route params

---

## Plan: 5 Critical Frontend Fixes

### Fix 1: Cart Quantity Controls
**File:** `SpeedCopy/src/screens/cart/CartScreen.tsx`
**Problem:** Users cannot change item quantity in cart (no +/- buttons).
**Solution:** Add quantity stepper buttons (+ and -) next to the quantity text in each cart item card. Wire to existing `updateQuantity()` store action.
**Changes:**
- Add `Minus` and `Plus` imports from `lucide-react-native`
- Replace static quantity text with interactive row: `[ - ]  02  [ + ]`
- Minus button: calls `updateQuantity(item.id, item.quantity - 1)` (removes if <= 0)
- Plus button: calls `updateQuantity(item.id, item.quantity + 1)`
- Style with bordered circular buttons

---

### Fix 2: Design Cards in Cart — Add Navigation
**File:** `SpeedCopy/src/screens/cart/CartScreen.tsx`
**Problem:** "Explore Premium designs" and "Start design" cards have empty `onPress` handlers.
**Solution:** Wire them to navigate to actual design flows.
**Changes:**
- "Explore Premium designs" → navigate to `BusinessShopByCategory` (entry point for templates)
- "Start design" → navigate to `PrintStore` (entry point for blank canvas)

---

### Fix 3: Persist Profile Avatar to Backend
**File:** `SpeedCopy/src/screens/profile/ProfileScreen.tsx` + `SpeedCopy/src/api/user.ts`
**Problem:** Profile image picker only updates local state, never saves to backend.
**Solution:** After picking image, upload via API and then update local state with the returned URL.
**Changes:**
- In `user.ts`: Add `uploadAvatar(fileUri: string): Promise<{ avatar: string }>` function
  - Uses `FormData` with `avatar` field (multipart/form-data)
  - Posts to `/api/users/profile/avatar`
- In `ProfileScreen.tsx`: In `pickImage()`, after getting `result.assets[0].uri`:
  - Call `await userApi.uploadAvatar(uri)`
  - Then `setProfileImage(response.avatar)` with the backend URL
  - Wrap in try/catch with loading indicator

---

### Fix 4: Wallet Payment UX Improvement
**File:** `SpeedCopy/src/screens/cart/PaymentMethodScreen.tsx`
**Problem:** Hardcoded `walletCheckoutUnavailable = true` blocks wallet with jarring Alert.
**Solution:** Remove the blocking Alert. Instead show a friendly inline note that wallet checkout is coming soon, and auto-suggest UPI when user tries to pay.
**Changes:**
- Remove `walletCheckoutUnavailable` state variable entirely
- In wallet method card: always show balance, add note "For checkout, please use UPI/Card"
- In `onPay`: if wallet selected, show friendly Alert "Wallet checkout is coming soon! Please select UPI, Card, or Net Banking to complete your order." → then return (do NOT block, just inform)

---

### Fix 5: Address Change Button on Payment Summary
**File:** `SpeedCopy/src/screens/cart/PaymentScreen.tsx`
**Problem:** "Home" link next to "Delivery To" has no `onPress` handler.
**Solution:** Navigate to Address screen when tapped, with params to return back.
**Changes:**
- Add `onPress` to the "Home" `TouchableOpacity`
- Navigate to `Address` screen with `couponCode` and `couponDiscount` params
- After returning from Address screen, re-read `route.params?.addressId` to update selected address

---

## Dependent Files
- `SpeedCopy/src/screens/cart/CartScreen.tsx` (Fixes 1, 2)
- `SpeedCopy/src/screens/cart/PaymentScreen.tsx` (Fix 5)
- `SpeedCopy/src/screens/cart/PaymentMethodScreen.tsx` (Fix 4)
- `SpeedCopy/src/screens/profile/ProfileScreen.tsx` (Fix 3)
- `SpeedCopy/src/api/user.ts` (Fix 3)

## Followup Steps
1. Create/update TODO.md with progress tracking
2. Implement fixes one by one
3. Verify no TypeScript errors
4. No new dependencies needed (all use existing APIs)

