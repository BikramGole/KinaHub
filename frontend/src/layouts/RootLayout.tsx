import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import MobileBottomNav from '../components/MobileBottomNav';
import AiAssistantWidget from '../components/AiAssistantWidget';

export default function RootLayout() {
  return (
    <div className="min-h-screen bg-background text-primary selection:bg-accent/30 flex flex-col font-sans">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to main content
      </a>
      <Navbar />
      <main id="main-content" className="flex-grow pb-20 md:pb-0">
        <Outlet />
      </main>
      <Footer />
      <AiAssistantWidget />
      <MobileBottomNav />
    </div>
  );
}
