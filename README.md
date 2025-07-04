## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- pnpm (or npm/yarn)

### Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/your-username/ChopRek.git
   cd ChopRek
   ```
2. Install dependencies:
   ```sh
   pnpm install
   # or
   npm install
   # or
   yarn install
   ```
3. Set up environment variables:
   - Copy `.env.example` to `.env.local` and fill in your Firebase and other required credentials.

4. Run the development server:
   ```sh
   pnpm dev
   # or
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) to view the app.

## Project Structure

- `app/` — Next.js app directory (pages, layouts, etc.)
- `components/` — Reusable UI and feature components
- `functions/` — Serverless functions
- `hooks/` — Custom React hooks
- `lib/` — Utilities, types, and Firebase config
- `public/` — Static assets
- `styles/` — Global styles
- `utils/` — Utility functions

## Contributing

Contributions are welcome! Please open issues or submit pull requests for improvements and bug fixes.

## License

This project is licensed under the MIT License.
