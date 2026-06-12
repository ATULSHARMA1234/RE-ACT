const fs = require('fs');
let html = fs.readFileSync('node_modules/landing page/landingpage.html', 'utf8');

const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/);
let body = bodyMatch ? bodyMatch[1] : html;
body = body.replace(/<script>[\s\S]*?<\/script>/g, '');

let jsx = body
  .replace(/class=/g, 'className=')
  .replace(/<!--/g, '{/*')
  .replace(/-->/g, '*/}')
  .replace(/stroke-width=/g, 'strokeWidth=')
  .replace(/stroke-linecap=/g, 'strokeLinecap=')
  .replace(/stroke-linejoin=/g, 'strokeLinejoin=')
  .replace(/fill-rule=/g, 'fillRule=')
  .replace(/clip-rule=/g, 'clipRule=')
  .replace(/<img([^>]+[^\/])>/g, '<img$1 />')
  .replace(/<br>/g, '<br />')
  .replace(/style="([^"]*)"/g, (match, style) => {
    if (style.includes('font-variation-settings')) return `style={{ fontVariationSettings: "'FILL' 0" }}`;
    return match;
  })
  .replace(/className="demo-trigger/g, 'onClick={triggerDemoFlow} className="demo-trigger');

const componentCode = `
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();
  const [zoomed, setZoomed] = useState(false);
  const [fadedOut, setFadedOut] = useState(false);

  const triggerDemoFlow = (e: React.MouseEvent) => {
    e.preventDefault();
    setZoomed(true);
    setTimeout(() => {
      setFadedOut(true);
    }, 1200);
    setTimeout(() => {
      router.push('/dashboard');
    }, 2200);
  };

  return (
    <div className={\`min-h-screen bg-background text-on-background overflow-x-hidden antialiased \${fadedOut ? 'opacity-0 transition-opacity duration-1000' : ''}\`}>
      <style dangerouslySetInnerHTML={{ __html: \`
        .ambient-shadow { box-shadow: 0 4px 20px 0px rgba(47, 48, 56, 0.04); }
        .glass-panel { background: rgba(251, 248, 255, 0.8); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
        .hero-image-container { transition: transform 2.5s cubic-bezier(0.4, 0, 0.2, 1); transform-origin: center center; }
        .hero-content-wrapper { transition: opacity 1.2s ease-in-out, transform 1.2s ease-in-out; }
        .zoomed .hero-image-container { transform: scale(4); }
        .zoomed .hero-content-wrapper { opacity: 0; transform: scale(0.95); pointer-events: none; }
        .zoomed .nav-transition { opacity: 0; pointer-events: none; }
        .nav-transition { transition: opacity 0.8s ease-in-out; }
      \`}} />
      <div className={\`min-h-screen flex flex-col \${zoomed ? 'zoomed' : ''}\`}>
        ${jsx}
      </div>
    </div>
  );
}
`;

fs.writeFileSync('apps/crm/src/app/page.tsx', componentCode);
console.log("Conversion complete");
