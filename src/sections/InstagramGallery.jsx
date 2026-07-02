export default function InstagramGallery() {
  return (
    <section className="px-8 lg:px-16 py-24 bg-[#F8F5F2]">

      <div className="text-center mb-16">

        <p className="uppercase tracking-[5px] text-[#C8A27A] text-sm mb-3">
          Follow Our Journey
        </p>

        <h2 className="text-5xl font-serif text-[#1E1E1E]">
          @AProduction
        </h2>

      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">

        <img
          src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=1200&auto=format&fit=crop"
          alt="Gallery 1"
          className="rounded-[25px] h-[320px] object-cover w-full hover:scale-105 transition duration-300"
        />

        <img
          src="https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=1200&auto=format&fit=crop"
          alt="Gallery 2"
          className="rounded-[25px] h-[320px] object-cover w-full hover:scale-105 transition duration-300"
        />

        <img
          src="https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?q=80&w=1200&auto=format&fit=crop"
          alt="Gallery 3"
          className="rounded-[25px] h-[320px] object-cover w-full hover:scale-105 transition duration-300"
        />

        <img
          src="https://images.unsplash.com/photo-1617038220319-276d3cfab638?q=80&w=1200&auto=format&fit=crop"
          alt="Gallery 4"
          className="rounded-[25px] h-[320px] object-cover w-full hover:scale-105 transition duration-300"
        />

      </div>

    </section>
  )
}