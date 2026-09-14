# Render deployment with Aiven MySQL

The repository-level `render.yaml` creates two services:

- `afroel-sms-api`: Node/Express backend from `backend/`
- `afroel-sms-web`: Vite static frontend from `frontend/`

## 1. Create Aiven MySQL

Create an Aiven for MySQL service and copy its connection information into the
Render backend environment:

```text
DB_HOST=<Aiven host>
DB_PORT=<Aiven port>
DB_NAME=defaultdb
DB_USER=avnadmin
DB_PASSWORD=<Aiven password>
DB_DIALECT=mysql
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true
```

Download Aiven's CA certificate. In Render, paste the complete PEM certificate
into the `DB_SSL_CA` environment variable, including the BEGIN/END lines.
Alternatively, add a Render secret file named `aiven-ca.pem` and set:

```text
DB_SSL_CA_PATH=/etc/secrets/aiven-ca.pem
```

Use either `DB_SSL_CA` or `DB_SSL_CA_PATH`, not both.

## 2. Create the Render Blueprint

Push this repository, then in Render choose **New > Blueprint** and select it.
Render reads `render.yaml` from the repository root.

Fill every variable marked `sync: false`. In particular, the backend needs the
Aiven values above plus:

```text
FRONTEND_URL=https://<frontend-service>.onrender.com
CORS_ORIGIN=https://<frontend-service>.onrender.com
AT_USERNAME=<Africa's Talking username>
AT_API_KEY=<Africa's Talking API key>
AT_SENDER_ID=<approved sender ID>
SMTP_HOST=<SMTP host>
SMTP_USER=<SMTP username>
SMTP_PASS=<SMTP password>
SMTP_FROM=Afroel SMS <sender@example.com>
```

Set the frontend's `VITE_API_BASE_URL` to:

```text
https://<backend-service>.onrender.com
```

The backend start command applies pending migrations before starting Node. The
health check is `GET /health`.

Never commit `.env`, Aiven credentials, API keys, SMTP passwords, or the CA
certificate to Git.
