import Navbar from "../components/Navbar"
import Footer from "../components/Footer"
import { useParams } from "react-router-dom"

import design1 from "../assets/images/design1.png"
import design2 from "../assets/images/design2.png"
import design3 from "../assets/images/design3.png"
import design5 from "../assets/images/design5.png"
import design6 from "../assets/images/design6.png"
import design8 from "../assets/images/design8.png"

export default function ProductDetails() {

  const { id } = useParams()

  const products = {
    1: {
      title: "Royal Heritage Ensemble",
      image: design1,
      description:
        "Inspired by traditional craftsmanship and timeless elegance."
    },

    2: {
      title: "Contemporary Fusion Look",
      image: design2,
      description:
        "A blend of modern silhouettes and traditional artistry."
    },

    3: {
      title: "Luxury Evening Couture",
      image: design3,
      description:
        "Designed for celebrations, events and special occasions."
    },

    4: {
      title: "Bridal Inspiration",
      image: design8,
      description:
        "Elegant bridal concepts tailored to your vision."
    },

    5: {
      title: "Minimalist Modern Set",
      image: design5,
      description:
        "Clean, contemporary styling with premium tailoring."
    },

    6: {
      title: "Signature Custom Creation",
      image: design6,
      description:
        "Bring your inspiration and create something uniquely yours."
    }
  }

  const product = products[id] || products[1]

  const whatsappMessage =
    `Hi, I am interested in "${product.title}" and would like to discuss customization options.`

  const whatsappLink =
    `https://wa.me/918765176866?text=${encodeURIComponent(whatsappMessage)}`

  return (
    <div className="bg-[#F8F5F2] min-h-screen">

      <Navbar />

      <section className="px-8 lg:px-16 py-24">

        <div className="grid lg:grid-cols-2 gap-16 items-center">

          <div>
            <img
              src={product.image}
              alt={product.title}
              className="rounded-[40px] w-full h-[700px] object-cover shadow-2xl"
            />
          </div>

          <div>

            <p className="uppercase tracking-[5px] text-[#C8A27A] text-sm mb-4">
              A Production Couture
            </p>

            <h1 className="text-4xl lg:text-6xl font-serif text-[#1E1E1E] mb-6">
              {product.title}
            </h1>

            <p className="text-3xl text-[#8B5E3C] font-semibold mb-8">
              Custom Quote Available
            </p>

            <p className="text-gray-600 text-lg leading-relaxed mb-10">
              {product.description}
            </p>

            <div className="bg-white p-6 rounded-[20px] shadow-lg mb-10">

              <h3 className="text-2xl font-serif mb-5 text-[#8B5E3C]">
                Customization Available
              </h3>

              <ul className="space-y-3 text-gray-600">

                <li>✓ Made To Order</li>
                <li>✓ Custom Measurements</li>
                <li>✓ Design Modifications Available</li>
                <li>✓ Fabric Selection Available</li>
                <li>✓ Personal Tailoring Support</li>

              </ul>

            </div>

            <div className="flex flex-wrap gap-5">

              <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                className="bg-[#25D366] hover:bg-[#1ebc59] transition text-white px-10 py-5 rounded-full text-lg shadow-xl"
              >
                Discuss This Design
              </a>

            </div>

          </div>

        </div>

      </section>

      <Footer />

    </div>
  )
}