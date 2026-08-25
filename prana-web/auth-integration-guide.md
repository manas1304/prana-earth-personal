# Prana Earth - Shared Authentication Integration Guide

This guide is for the frontend team to integrate the shared authentication layer into the client applications (Predict Platform & Marketplace).

All authentication logic is encapsulated in **Next.js Server Actions** located in `@/actions/auth.actions`.

---

## Response Formats

### Standard Success Response

Every successful API / Server Action returns:

```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": {
    "user": {
      "id": "uuid",
      "fullName": "Sofikul Sk",
      "email": "sofikul@example.com",
      "role": "USER",
      "isEmailVerified": true
    }
  }
}
```

### Standard Error Response

Whenever input validation fails or a credentials mismatch occurs, the returned object follows this format:

```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": [
    {
      "field": "password",
      "message": "Password is incorrect."
    }
  ]
}
```

---

## API Reference (Server Actions)

### 1. Register (Local)

**Action**: `register(input)`
**Input**:

```json
{
  "fullName": "Sofikul Sk",
  "email": "sofikul@example.com",
  "password": "Password@123",
  "confirmPassword": "Password@123"
}
```

**Example Call**:

```typescript
import { register } from "@/actions/auth.actions";

const response = await register({
  fullName: "Sofikul Sk",
  email: "sofikul@example.com",
  password: "Password@123",
  confirmPassword: "Password@123",
});
```

---

### 2. Login (Local)

**Action**: `login(input)`
**Input**:

```json
{
  "email": "sofikul@example.com",
  "password": "Password@123"
}
```

**Example Call**:

```typescript
import { login } from "@/actions/auth.actions";

const response = await login({
  email: "sofikul@example.com",
  password: "Password@123",
});
```

---

### 3. Google Login

**Action**: `loginWithGoogle(input)`
**Input**:

```json
{
  "idToken": "GOOGLE_ID_TOKEN"
}
```

**Example Call**:

```typescript
import { loginWithGoogle } from "@/actions/auth.actions";

const response = await loginWithGoogle({
  idToken: "GOOGLE_ID_TOKEN",
});
```

---

### 4. Refresh Access Token

**Action**: `refreshSession()`
**Input**: None. (Refresh Token is read automatically from the HTTP-only cookie).
**Example Call**:

```typescript
import { refreshSession } from "@/actions/auth.actions";

const response = await refreshSession();
```

---

### 5. Logout

**Action**: `logout()`
**Input**: None.
**Example Call**:

```typescript
import { logout } from "@/actions/auth.actions";

const response = await logout();
```

---

### 6. Forgot Password

**Action**: `forgotPassword(input)`
**Input**:

```json
{
  "email": "sofikul@example.com"
}
```

**Example Call**:

```typescript
import { forgotPassword } from "@/actions/auth.actions";

const response = await forgotPassword({
  email: "sofikul@example.com",
});
```

---

### 7. Reset Password

**Action**: `resetPassword(input)`
**Input**:

```json
{
  "token": "PASSWORD_RESET_TOKEN",
  "password": "NewPassword@123",
  "confirmPassword": "NewPassword@123"
}
```

**Example Call**:

```typescript
import { resetPassword } from "@/actions/auth.actions";

const response = await resetPassword({
  token: "PASSWORD_RESET_TOKEN",
  password: "NewPassword@123",
  confirmPassword: "NewPassword@123",
});
```

---

### 8. Verify Email

**Action**: `verifyEmail(input)`
**Input**:

```json
{
  "token": "EMAIL_VERIFICATION_TOKEN"
}
```

**Example Call**:

```typescript
import { verifyEmail } from "@/actions/auth.actions";

const response = await verifyEmail({
  token: "EMAIL_VERIFICATION_TOKEN",
});
```

---

### 9. Resend Verification Email

**Action**: `resendVerification(input)`
**Input**:

```json
{
  "email": "sofikul@example.com"
}
```

**Example Call**:

```typescript
import { resendVerification } from "@/actions/auth.actions";

const response = await resendVerification({
  email: "sofikul@example.com",
});
```

---

### 10. Get Current User

**Action**: `getCurrentUser()`
**Input**: None. (Access Token is read automatically from the HTTP-only cookie).
**Example Call**:

```typescript
import { getCurrentUser } from "@/actions/auth.actions";

const response = await getCurrentUser();
```

---

### 11. Update Profile

**Action**: `updateProfile(userId, input)`
**Input**: (All fields optional)

```json
{
  "fullName": "Sofikul Sk",
  "phone": "+919999999999",
  "jobTitle": "Backend Developer",
  "countryRegion": "India",
  "timezone": "Asia/Kolkata",
  "locale": "en-IN",
  "avatarUrl": "https://example.com/avatar.png"
}
```

**Example Call**:

```typescript
import { updateProfile } from "@/actions/auth.actions";

const response = await updateProfile(userId, {
  fullName: "Sofikul Sk",
  phone: "+919999999999",
});
```

---

### 12. Change Password

**Action**: `changePassword(userId, input)`
**Input**:

```json
{
  "currentPassword": "Password@123",
  "newPassword": "NewPassword@123",
  "confirmPassword": "NewPassword@123"
}
```

**Example Call**:

```typescript
import { changePassword } from "@/actions/auth.actions";

const response = await changePassword(userId, {
  currentPassword: "Password@123",
  newPassword: "NewPassword@123",
  confirmPassword: "NewPassword@123",
});
```

---

### 13. Delete Current Session (Logout Current Device)

**Action**: `deleteSession()`
**Input**: None.
**Example Call**:

```typescript
import { deleteSession } from "@/actions/auth.actions";

const response = await deleteSession();
```

---

### 14. Delete All Sessions (Logout All Devices)

**Action**: `deleteAllSessions(userId)`
**Input**: None (requires userId string argument).
**Example Call**:

```typescript
import { deleteAllSessions } from "@/actions/auth.actions";

const response = await deleteAllSessions(userId);
```
