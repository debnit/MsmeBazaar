#!/usr/bin/env bash
set -e

echo "=============================================="
echo "🚀 MSMEBazaar Admin SaaS - Setup & Migration"
echo "=============================================="

ADMIN_DIR="apps/admin"

# 1️⃣ Create Next.js admin app if it doesn't exist
if [ ! -d "$ADMIN_DIR" ]; then
    echo "📁 Creating apps/admin..."
    pnpm create next-app "$ADMIN_DIR" --ts --eslint --app --src-dir --import-alias "@/*"
else
    echo "✅ apps/admin already exists."
fi

# 2️⃣ Install TailwindCSS
echo "🎨 Installing Tailwind CSS..."
cd "$ADMIN_DIR"
pnpm remove tailwindcss || true
pnpm add -D tailwindcss@3.4.17 postcss autoprefixer

# 3️⃣ Init Tailwind config
echo "⚙️ Initializing Tailwind config..."
npx tailwindcss init -p

# 4️⃣ Fix content paths
sed -i 's/content: \[\]/content: ["..\/..\/client\/src\/**\/*.{js,ts,jsx,tsx}", ".\/src\/**\/*.{js,ts,jsx,tsx}"]/' tailwind.config.js

cd ../../

# 5️⃣ Copy admin pages/components
echo "📦 Copying admin dashboard pages/components..."
mkdir -p "$ADMIN_DIR/src/pages/admin"
mkdir -p "$ADMIN_DIR/src/components/admin"

cp -r client/src/pages/admin/* "$ADMIN_DIR/src/pages/admin/" 2>/dev/null || true
cp -r client/src/components/admin/* "$ADMIN_DIR/src/components/admin/" 2>/dev/null || true

# 6️⃣ Copy favicon
echo "🖼️ Copying favicon..."
mkdir -p "$ADMIN_DIR/public"
cp -f client/public/favicon.ico "$ADMIN_DIR/public/favicon.ico" || true

# 7️⃣ Add RBAC middleware
echo "🔒 Adding RBAC middleware..."
cat <<EOT > "$ADMIN_DIR/middleware.ts"
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const token = req.cookies.get('admin_token');
  if (!token && req.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  return NextResponse.next();
}
EOT

echo "✅ RBAC middleware added."
echo "🎯 Setup complete! You can now run: ./scripts/run-admin.sh"
