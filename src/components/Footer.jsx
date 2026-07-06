export default function Footer() {
  return (<footer className="bg-[#1E1E1E] text-white px-8 lg:px-16 py-20">

    
    <div className="grid lg:grid-cols-4 gap-12">

      {/* Brand */}
      <div>

        <h2 className="text-4xl font-serif text-[#C8A27A] mb-5">
          A Production
        </h2>

        <p className="text-gray-400 leading-relaxed">
          Custom fashion studio specialising in made-to-order couture, contemporary fashion, bridal inspirations and personalized tailoring.
        </p>

      </div>

      {/* Quick Links */}
      <div>

        <h3 className="text-2xl font-serif mb-5 text-[#C8A27A]">
          Quick Links
        </h3>

        <ul className="space-y-3 text-gray-400">

          <li className="hover:text-white transition cursor-pointer">
            Home
          </li>

          <li className="hover:text-white transition cursor-pointer">
            Collections
          </li>

          <li className="hover:text-white transition cursor-pointer">
            Custom Design
          </li>

          <li className="hover:text-white transition cursor-pointer">
            Contact
          </li>

        </ul>

      </div>

      {/* Contact */}
      <div>

        <h3 className="text-2xl font-serif mb-5 text-[#C8A27A]">
          Contact
        </h3>

        <ul className="space-y-3 text-gray-400">

          <li>
            +91 8765176866
          </li>

          <li>
            aprodcoution@gmail.com
          </li>

        </ul>

      </div>

      {/* Socials */}
      <div>

        <h3 className="text-2xl font-serif mb-5 text-[#C8A27A]">
          Connect
        </h3>

        <div className="space-y-3 text-gray-400">

          <a
            href="https://instagram.com/YOUR_INSTAGRAM"
            target="_blank"
            rel="noreferrer"
            className="block hover:text-white transition"
          >
            Instagram
          </a>

          <a
            href="https://wa.me/918765176866"
            target="_blank"
            rel="noreferrer"
            className="block hover:text-white transition"
          >
            WhatsApp
          </a>

        </div>

      </div>

    </div>

    <div className="border-t border-[#3B2A21] mt-16 pt-8 text-center text-gray-500 text-sm">

      © 2026 A Production. All rights reserved.

    </div>

  </footer>


  )
}
