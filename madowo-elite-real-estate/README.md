# Madowo Elite Real Estate Property and Investments

A responsive real estate website with a public-facing front end and a private admin back end.

## Included
- Public homepage, property search/filter, property cards and enquiry form
- Nairobi/Kenya positioning and KES currency formatting
- Admin login, add property with photo upload, change listing status, delete listings
- Enquiry inbox and enquiry status tracking
- SQLite database created automatically on first start

## Requirements
- Node.js 18 or newer
- npm

## Run locally
1. Extract the ZIP.
2. Open a terminal in this folder.
3. Run `npm install`.
4. Copy `.env.example` to `.env`.
5. Create an admin password hash:
   ```bash
   node -e "console.log(require('bcryptjs').hashSync('Choose-A-Strong-Password', 12))"
   ```
6. Put the resulting hash in `ADMIN_PASSWORD_HASH` in `.env`. Change `JWT_SECRET` to a long random secret. The example environment file is prefilled with the supplied company phone (+254796811569), WhatsApp number (254796811569) and email (markmadowo01@gmail.com). Confirm these details before launch.
7. Run `npm start`.
8. Visit `http://localhost:3000`. Admin portal: `http://localhost:3000/admin`.

## Important before launch
- Three sample property listings are inserted automatically for layout demonstration. They are illustrative placeholders, not verified properties. Replace them with genuine listings, correct prices, accurate descriptions and photos before publishing.
- Change all example contact details in `.env`.
- Deploy to a Node.js host that supports persistent disk storage. The SQLite database is stored in `data/` and uploaded images in `uploads/`; these folders must persist between deployments. For multiple server instances, use a managed database and object storage instead.
- Use HTTPS in production. Keep `.env` private and never commit it to source control.
- Back up `data/madowo.sqlite` and `uploads/` regularly.
- Configure hosting, domain/DNS, backups, email delivery and any required privacy/legal notices before accepting real customer data.
- The enquiry form saves messages to the database; it does not yet send email or WhatsApp notifications automatically.
- Before marketing investment opportunities, verify property ownership, title, permissions, costs and applicable Kenyan legal/regulatory requirements. Do not publish guaranteed returns.

## Suggested next steps
Register or connect a domain name, your preferred domain `madowoeliterealestate.com` if available, and deploy the app to a Node.js hosting provider. This project is source code; it is not yet deployed or publicly live.
