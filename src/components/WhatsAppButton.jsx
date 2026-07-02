export default function WhatsAppButton() {

  const whatsappMessage =
    "Hi, I want to know more about A Production collections."

  const whatsappLink =
    `https://wa.me/918765176866?text=${encodeURIComponent(whatsappMessage)}`

  return (
    <a
      href={whatsappLink}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-6 right-6 bg-[#25D366] hover:bg-[#1ebc59] text-white px-6 py-4 rounded-full shadow-2xl z-50 transition duration-300"
    >
      WhatsApp
    </a>
  )
}