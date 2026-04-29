# Short JWT Frontend Auth Guide

This guide explains the new frontend login flow for SpeedCopy.

## Goal

Use the Firebase ID token only once during login, then switch to a much smaller backend JWT for all regular API requests.

Benefits:

- smaller `Authorization` headers
- fewer proxy and Cloud Run header issues
- faster request handling
- cleaner separation between login verification and API authorization

## New Flow

1. User signs in with Firebase as usual.
2. Frontend gets the Firebase ID token from the Firebase client SDK.
3. Frontend calls `POST /api/auth/verify` once with that Firebase token in the `Authorization` header.
4. Backend verifies the Firebase token and returns a short JWT.
5. Frontend stores that short JWT.
6. Frontend uses only the short JWT for all protected backend APIs after that.

## Verify Endpoint

Route:

```txt
POST /api/auth/verify
```

Headers:

```txt
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

Optional body:

```json
{
  "role": "user"
}
```

Notes:

- `role` is only relevant during first signup when Firebase custom claims do not already define the role.
- For existing users, backend keeps the stored or claimed role.

Success response:

```json
{
  "success": true,
  "message": "Token issued successfully",
  "data": {
    "token": "<short_jwt>"
  }
}
```

## Frontend Implementation

### Web example

```ts
const firebaseToken = await user.getIdToken();

const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${firebaseToken}`,
  },
  body: JSON.stringify({ role: "user" }),
});

const payload = await response.json();

if (!response.ok || !payload?.data?.token) {
  throw new Error(payload?.message || "Unable to exchange Firebase token");
}

localStorage.setItem("token", payload.data.token);
```

### React Native example

```ts
const firebaseToken = await user.getIdToken();

const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${firebaseToken}`,
  },
  body: JSON.stringify({ role: "user" }),
});

const payload = await response.json();

if (!response.ok || !payload?.data?.token) {
  throw new Error(payload?.message || "Unable to exchange Firebase token");
}

await AsyncStorage.setItem("token", payload.data.token);
```

## All Protected API Calls

After login exchange, every protected backend request must use the short JWT:

```txt
Authorization: Bearer <short_jwt>
```

Example:

```ts
const token = localStorage.getItem("token");

const response = await fetch(`${API_BASE_URL}/api/orders`, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

## Important Rules

- Do not send Firebase ID tokens to normal backend APIs anymore.
- Do not mix Firebase token and backend JWT on protected requests.
- If the short JWT is missing or expired, refresh the Firebase session if needed and call `POST /api/auth/verify` again.
- If the frontend needs profile data after login, call `GET /api/auth/me` using the short JWT.

## Logout

On logout:

1. Sign out from Firebase on the client.
2. Remove the stored backend JWT.

Example:

```ts
await signOut(firebaseAuth);
localStorage.removeItem("token");
```

## Migration Checklist

- update login flow to call `user.getIdToken()`
- exchange Firebase token at `POST /api/auth/verify`
- store `payload.data.token`
- replace all old Firebase-token API usage with the short JWT
- update any shared API client or interceptor to read the short JWT from storage
- clear both Firebase session and stored backend JWT on logout
