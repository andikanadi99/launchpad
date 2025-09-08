# LaunchPad MVP

LaunchPad is a lightweight product site for entrepreneurs—claim a subdomain, add a product, accept Stripe payments, and view sales metrics in a clean dashboard, all in under 15 minutes.

## 🚀 Why LaunchPad?
Many entrepreneurs want to sell a single product quickly without building a full storefront. LaunchPad removes the friction—no complex setup, no coding—just a subdomain, Stripe Checkout, and built-in metrics.

## 🛠 Tech Stack
- **React 18** — Core UI library
- **Next.js 15** — Framework for routing, SSR, and API routes
- **Tailwind CSS + shadcn/ui** — Styling and components
- **Firebase** — Auth, Firestore, Storage
- **Stripe Connect** — Payments & payouts

## 📂 Documentation
All technical and product docs are in [`/docs`](./docs):
- Product brief  
- Architecture ADR  
- API contracts  
- Firestore data model  
- Testing plan  

## 🧑‍💻 Local Development
1. Clone the repo  
2. Copy `.env.example` → `.env.local` and fill in your Firebase and Stripe keys  
3. Install dependencies:
   ```bash
   npm install
