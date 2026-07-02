import Navbar from "../components/Navbar"
import Footer from "../components/Footer"

export default function CustomDesign() {
  return (
    <div className="bg-[#F8F5F2] min-h-screen">

      <Navbar />

      {/* Hero */}
      <section className="bg-[#1E1E1E] text-white py-24 px-8 lg:px-16 text-center">

        <p className="uppercase tracking-[5px] text-[#C8A27A] text-sm mb-4">
          Custom Design Service
        </p>

        <h1 className="text-4xl lg:text-6xl font-serif mb-6">
          Bring Your Vision To Life
        </h1>

        <p className="max-w-3xl mx-auto text-lg text-gray-300">
          Have a design in mind? Share your inspiration, measurements and ideas, and we'll craft a custom outfit tailored exclusively for you.
        </p>

      </section>

      {/* Process */}
      <section className="px-8 lg:px-16 py-24">

        <h2 className="text-4xl lg:text-5xl font-serif text-center mb-16">
          How It Works
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-8">

          <div className="bg-white p-8 rounded-[30px] shadow-lg text-center">
            <h3 className="text-2xl font-serif mb-4">1</h3>
            <p>Share Your Idea</p>
          </div>

          <div className="bg-white p-8 rounded-[30px] shadow-lg text-center">
            <h3 className="text-2xl font-serif mb-4">2</h3>
            <p>Send Inspiration Photos</p>
          </div>

          <div className="bg-white p-8 rounded-[30px] shadow-lg text-center">
            <h3 className="text-2xl font-serif mb-4">3</h3>
            <p>Discuss Measurements</p>
          </div>

          <div className="bg-white p-8 rounded-[30px] shadow-lg text-center">
            <h3 className="text-2xl font-serif mb-4">4</h3>
            <p>Tailoring Begins</p>
          </div>

          <div className="bg-white p-8 rounded-[30px] shadow-lg text-center">
            <h3 className="text-2xl font-serif mb-4">5</h3>
            <p>Delivery</p>
          </div>

        </div>

      </section>

      {/* CTA */}
      <section className="text-center px-8 pb-24">

        <a
          href="https://wa.me/919876543210"
          target="_blank"
          rel="noreferrer"
          className="bg-[#C8A27A] hover:bg-[#b89068] transition text-white px-10 py-5 rounded-full shadow-lg"
        >
          Start Your Custom Design
        </a>

      </section>

      <Footer />

    </div>
  )
}