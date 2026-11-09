import { Link } from 'react-router-dom'
import { useEffect } from 'react'

import acne from '@/images/acne.png'
import acnescars from '@/images/acnescars.png'
import blackheads from '@/images/blackheads.png'
import dryskin from '@/images/dryskin.png'
import oily from '@/images/oily.png'
import redness from '@/images/redness.png'
import hyperpigmentation from '@/images/hyperpigmentation.png'
import darkcircles from '@/images/darkcircle.png'
import poren from '@/images/poren.png'
import sensibleskin from '@/images/sensibleskin.png'
import stressbreakouts from '@/images/stressbreakout.png'
import rasierpickel from '@/images/rasierpickel.png'

const hautProbleme = [
  {
    slug: 'acne',
    title: "Acne",
    image: acne,
    description: "Pimples, inflammation, and clogged pores.",
  },
  {
    slug: 'blackheads',
    title: "Blackheads",
    image: blackheads,
    description: "Clogged pores visible on the skin's surface.",
  },
  {
    slug: 'dry-skin',
    title: "Dry skin",
    image: dryskin,
    description: "Skin that feels dry and is often itchy or rough.",
  },
  {
    slug: 'oily-skin',
    title: "Oily skin",
    image: oily,
    description: "Increased oil production and a shiny appearance.",
  },
  {
    slug: 'redness',
    title: "Redness",
    image: redness,
    description: "Sensitive skin and visible redness.",
  },
  {
    slug: 'hyperpigmentation',
    title: "Hyperpigmentation",
    image: hyperpigmentation,
    description: "Dark spots and uneven skin tone.",
  },
  {
    slug: 'dark-circles',
    title: "Dark circles",
    image: darkcircles,
    description: "Tired-looking under-eye area.",
  },
  {
    slug: 'large-pores',
    title: "Large pores",
    image: poren,
    description: "Visible pores and uneven skin texture.",
  },
  {
    slug: 'sensitive-skin',
    title: "Sensitive skin",
    image: sensibleskin,
    description: "Reacts quickly to external factors.",
  },
  {
    slug: 'acne-scars',
    title: "Post-acne marks",
    image: acnescars,
    description: "Lasting scars after acne.",
  },
  {
    slug: 'stress-breakouts',
    title: "Stress-related breakouts",
    image: stressbreakouts,
    description: "Blemishes caused by stress and lack of sleep.",
  },
  {
    slug: 'razor-bumps',
    title: "Razor bumps",
    image: rasierpickel,
    description: "Irritation and ingrown hairs after shaving.",
  },
]

export default function Hautwissen() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <main className="min-h-screen bg-[#FFF9F5] px-4 pt-24 pb-12 sm:px-6 sm:pt-32 sm:pb-16 !font-sans">
      <div className="mx-auto max-w-6xl">
        <section className="text-center mb-10 sm:mb-16">
          <p className="text-[#D4A574] font-semibold uppercase tracking-wider font-sans text-sm sm:text-base">
            SelfGlow skin guide
          </p>

          <h1 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-bold text-[#2a1c10] !font-sans">
            Understand your skin better
          </h1>

          <p className="mt-6 max-w-2xl mx-auto text-base sm:text-lg text-gray-600 leading-7 sm:leading-8 font-sans">
            Explore helpful information about common skin concerns and learn how to care for your skin.
          </p>
        </section>

        <section id="hautprobleme">
          <h2 className="mb-6 sm:mb-8 text-center text-2xl sm:text-3xl font-bold text-[#2a1c10] !font-sans">
            Common skin concerns
          </h2>

          <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {hautProbleme.map((item) => (
              <Link
                key={item.slug}
                to={`/hautwissen/${item.slug}`}
                className="group overflow-hidden rounded-[32px] bg-white shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
              >
                <div className="relative overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="h-48 sm:h-64 w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>

                <div className="p-5 sm:p-6">
                  <h3 className="text-xl sm:text-2xl font-bold text-[#2a1c10] !font-sans">
                    {item.title}
                  </h3>

                  <p className="mt-3 leading-7 text-gray-600 !font-sans">
                    {item.description}
                  </p>

                  <div className="mt-6 flex items-center justify-between">
                    <span className="font-semibold text-[#D4A574] transition group-hover:translate-x-1">
                      Learn more →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}