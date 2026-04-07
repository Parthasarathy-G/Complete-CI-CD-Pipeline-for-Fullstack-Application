import Image from "next/image";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "./components/NavBar";
import HeroSection from "./components/HeroSection";
import Stats from "./components/Stats";
import Features from "./components/Features";
import EnterpriseFeatures from "./components/System";
import Testimonials from "./components/Testimonials";
import HealthCare from "./components/HealthCare";
import Contact from "./components/Contact";
import Footer from "./components/Footer";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function Home() {
  return (
    <>
    <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Navbar/>
      <HeroSection/>
      <Stats/>
      <Features/>
      <EnterpriseFeatures/>
      <Testimonials/>
      <HealthCare/>
      <Contact/>
      <Footer/>
      </div>
    </>
  );
}
