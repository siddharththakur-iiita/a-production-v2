import { Routes, Route } from "react-router-dom"

import Home from "./pages/Home"
import Collections from "./pages/Collections"
import Contact from "./pages/Contact"
import ProductDetails from "./pages/ProductDetails"
import CustomDesign from "./pages/CustomDesign"
import WhatsAppButton from "./components/WhatsAppButton"
import About from "./pages/About"
import Women from "./pages/Women";
import Men from "./pages/Men";
import Kid from "./pages/Kid";
import CustomTailoring from "./pages/CustomTailoring";
import Search from "./pages/Search";
import NotFound from "./pages/NotFound";
export default function App() {
  return (
    <>

      <Routes>

        <Route path="/" element={<Home />} />

        <Route
          path="/collections"
          element={<Collections />}
        />
        <Route
          path="/kids"
          element={<Kid />}
        />
        <Route
          path="/search"
          element={<Search />}
        />

        <Route
          path="/custom-tailoring"
          element={<CustomTailoring />}
        />

        <Route
          path="/women"
          element={<Women />}
        />

        <Route
          path="/men"
          element={<Men />}
        />

        <Route
          path="/contact"
          element={<Contact />}
        />
        <Route path="/about" element={<About />} />

        <Route
          path="/product/:id"
          element={<ProductDetails />}
        />
        <Route path="/custom-design" element={<CustomDesign />} />

        <Route
          path="*"
          element={<NotFound />}
        />
      </Routes>

      <WhatsAppButton />

    </>
  )
}