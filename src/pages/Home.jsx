import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

import Hero from "../sections/Hero";
import DepartmentShowcase from "../sections/DepartmentShowcase";
import FeaturedCollections from "../sections/FeaturedCollections";
import CustomTailoring from "../sections/CustomTailoring";
import WhyChooseUs from "../sections/WhyChooseUs";

export default function Home() {
  return (
    <div>
      <Navbar />

      <Hero />

      <DepartmentShowcase />

      <FeaturedCollections />

      <CustomTailoring />

      <WhyChooseUs />

      <Footer />
    </div>
  );
}