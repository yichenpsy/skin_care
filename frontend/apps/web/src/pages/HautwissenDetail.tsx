import { Link, useNavigate, useParams } from 'react-router-dom'
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
    intro:
      "Acne often appears as pimples, inflamed areas, and clogged pores.",
    symptoms: ["Pimples", "Inflammation", "Clogged pores", "Oily skin"],
    causes: [
      "Excess oil production",
      "Pores clogged by dead skin cells",
      "Hormonal changes",
      "Bacteria and inflammation",
    ],
    tips: [
      "Cleanse your face gently without harsh products.",
      "Avoid squeezing pimples.",
      "Use lightweight, non-comedogenic skincare.",
      "Wear sunscreen every day.",
    ],
    ingredients: [
      { name: "Salicylic acid", text: "Helps clear clogged pores." },
      { name: "Niacinamide", text: "Soothes the skin and supports the skin barrier." },
      { name: "Azelaic acid", text: "May reduce redness and post-acne marks." },
      { name: "Benzoyl peroxide", text: "Targets acne-causing bacteria." },
    ],
  },
  {
    slug: 'blackheads',
    title: "Blackheads",
    image: blackheads,
    intro:
      "Blackheads are small clogged pores, often visible on the nose, forehead, and chin.",
    symptoms: ["Black dots", "Clogged pores", "Oily T-zone", "Blemish-prone skin"],
    causes: [
      "Oil builds up in pores",
      "Dead skin cells clog the skin's surface",
      "Oily skin can contribute to blackheads",
      "Skincare products that are too rich",
    ],
    tips: [
      "Use a gentle cleanser.",
      "Use a gentle BHA exfoliant occasionally.",
      "Avoid very greasy products.",
      "Avoid squeezing blackheads aggressively.",
    ],
    ingredients: [
      { name: "Salicylic acid", text: "Penetrates pores and helps clear blockages." },
      { name: "Niacinamide", text: "May help balance oil production." },
      { name: "Clay", text: "Absorbs excess oil." },
      { name: "Retinol", text: "Supports skin renewal." },
    ],
  },
  {
    slug: 'dry-skin',
    title: "Dry skin",
    image: dryskin,
    intro:
      "Dry skin often feels tight, rough, or flaky and needs extra hydration and protection.",
    symptoms: ["tightness", "Flaky skin", "Rough patches", "Itching"],
    causes: [
      "Weakened skin barrier",
      "Cold weather, indoor heating, or frequent washing",
      "Harsh cleansing products",
      "Not enough hydration in your skincare routine",
    ],
    tips: [
      "Use a gentle cleanser.",
      "Apply moisturizer regularly.",
      "Avoid very hot water on your face.",
      "Support your skin barrier with soothing products.",
    ],
    ingredients: [
      { name: "Hyaluronic acid", text: "Helps retain moisture in the skin." },
      { name: "Glycerin", text: "Hydrates and protects against dryness." },
      { name: "Ceramides", text: "Support the natural skin barrier." },
      { name: "Panthenol", text: "Soothes dry and irritated skin." },
    ],
  },
  {
    slug: 'oily-skin',
    title: "Oily skin",
    image: oily,
    intro:
      "Oily skin becomes shiny quickly and produces more oil than normal skin. It still needs hydration.",
    symptoms: ["Shine", "Oily T-zone", "Enlarged pores", "Blemishes"],
    causes: [
      "Increased oil production",
      "Genetic factors",
      "Hormonal fluctuations",
      "Harsh cleansing",
    ],
    tips: [
      "Use lightweight, oil-free skincare.",
      "Cleanse your face gently and regularly.",
      "Avoid heavy creams.",
      "Use mattifying products without drying out your skin.",
    ],
    ingredients: [
      { name: "Niacinamide", text: "May reduce shine and soothe the skin." },
      { name: "Salicylic acid", text: "Helps clear clogged pores." },
      { name: "Zinc", text: "May help regulate excess oil." },
      { name: "Green tea", text: "Provides soothing and antioxidant benefits." },
    ],
  },
  {
    slug: 'redness',
    title: "Redness",
    image: redness,
    intro:
      "Redness can result from sensitive skin, irritation, or external factors.",
    symptoms: ["Burning", "Warm sensation", "Sensitivity", "Visible redness"],
    causes: [
      "Sensitive or irritated skin",
      "Heat, cold, or sun exposure",
      "Harsh skincare products",
      "Stress or certain foods",
    ],
    tips: [
      "Use gentle, soothing skincare.",
      "Avoid fragrances and harsh exfoliants.",
      "Wear sunscreen daily.",
      "Notice which triggers make your skin redder.",
    ],
    ingredients: [
      { name: "Panthenol", text: "Soothes irritated skin and supports the skin barrier." },
      { name: "Centella Asiatica", text: "Helps soothe sensitive skin." },
      { name: "Aloe Vera", text: "Hydrates and gently cools the skin." },
      { name: "Niacinamide", text: "May reduce redness and strengthen the skin." },
    ],
  },
  {
    slug: 'hyperpigmentation',
    title: "Hyperpigmentation",
    image: hyperpigmentation,
    intro:
      "Hyperpigmentation appears as dark spots or uneven skin tone.",
    symptoms: ["Dark spots", "Post-acne marks", "Uneven skin tone", "Dark spots"],
    causes: [
      "Sun exposure",
      "Post-inflammatory acne marks",
      "Hormonal changes",
      "Uneven melanin production",
    ],
    tips: [
      "Wear sunscreen every day.",
      "Avoid picking at pimples.",
      "Use brightening ingredients consistently.",
      "Be patient, as spots take time to fade.",
    ],
    ingredients: [
      { name: "Vitamin C", text: "May help even out skin tone." },
      { name: "Niacinamide", text: "Helps promote a more balanced appearance." },
      { name: "Azelaic acid", text: "May reduce dark spots and redness." },
      { name: "Alpha-Arbutin", text: "Often used for dark spots." },
    ],
  },
  {
    slug: 'dark-circles',
    title: "Dark circles",
    image: darkcircles,
    intro:
      "Dark circles can make the eye area look tired and have various causes.",
    symptoms: ["Dark shadows", "Tired appearance", "Dry under-eye area", "Mild puffiness"],
    causes: [
      "Lack of sleep",
      "Genetic factors",
      "Thin skin under the eyes",
      "Dehydration or stress",
    ],
    tips: [
      "Get enough sleep.",
      "Keep the eye area hydrated.",
      "Cooling eye patches may provide temporary relief.",
      "Apply sunscreen carefully around the eye area.",
    ],
    ingredients: [
      { name: "Caffeine", text: "May reduce the appearance of puffiness." },
      { name: "Hyaluronic acid", text: "Hydrates and visibly plumps the skin." },
      { name: "Peptides", text: "Support a smoother appearance." },
      { name: "Vitamin C", text: "May help the eye area look fresher." },
    ],
  },
  {
    slug: 'large-pores',
    title: "Large pores",
    image: poren,
    intro:
      "Large pores are often linked to oil, skin texture, and clogged pores. Pores cannot disappear completely, but they can look smaller.",
    symptoms: ["Visible pores", "Uneven skin texture", "Oily areas", "Clogged pores"],
    causes: [
      "Increased oil production",
      "Clogged pores",
      "Genetic factors",
      "Reduced skin elasticity",
    ],
    tips: [
      "Cleanse your skin regularly and gently.",
      "Use BHA to help clear clogged pores.",
      "Avoid heavy, comedogenic products.",
      "Remember sunscreen.",
    ],
    ingredients: [
      { name: "Niacinamide", text: "May make pores look smaller." },
      { name: "Salicylic acid", text: "Helps cleanse inside pores." },
      { name: "Retinol", text: "Supports skin renewal." },
      { name: "Clay", text: "Absorbs excess oil." },
    ],
  },
  {
    slug: 'sensitive-skin',
    title: "Sensitive skin",
    image: sensibleskin,
    intro:
      "Sensitive skin can quickly react with burning, itching, dryness, or mild redness.",
    symptoms: ["Burning", "Itching", "Dryness", "Easily irritated"],
    causes: [
      "Weakened skin barrier",
      "Fragrances or irritating ingredients",
      "Weather changes",
      "Too many products at once",
    ],
    tips: [
      "Keep your routine simple and gentle.",
      "Avoid fragrances and alcohol.",
      "Patch-test new products first.",
      "Use soothing skincare that supports your skin barrier.",
    ],
    ingredients: [
      { name: "Ceramides", text: "Support the skin barrier." },
      { name: "Panthenol", text: "Soothes sensitive skin." },
      { name: "Aloe Vera", text: "Hydrates and cools." },
      { name: "Centella Asiatica", text: "Soothes irritated skin." },
    ],
  },
  {
    slug: 'acne-scars',
    title: "Post-acne marks",
    image: acnescars,
    intro:
      "Post-acne marks often remain after inflammation and may appear as dark or reddish spots.",
    symptoms: ["Reddish spots", "Dark spots", "Uneven skin tone", "Marks left by pimples"],
    causes: [
      "Inflamed pimples",
      "Squeezing or scratching",
      "Sun exposure can make spots more noticeable",
      "Slow skin renewal",
    ],
    tips: [
      "Wear sunscreen every day.",
      "Avoid squeezing pimples.",
      "Use ingredients that support skin renewal.",
      "Be patient, post-acne marks take time to fade.",
    ],
    ingredients: [
      { name: "Niacinamide", text: "May reduce spots and redness." },
      { name: "Vitamin C", text: "Supports a more even skin tone." },
      { name: "Azelaic acid", text: "Helps with redness and post-acne marks." },
      { name: "Retinol", text: "Promotes skin renewal." },
    ],
  },
  {
    slug: 'stress-breakouts',
    title: "Stress-related breakouts",
    image: stressbreakouts,
    intro:
      "Stress can also affect the skin and worsen blemishes.",
    symptoms: ["Sudden breakouts", "Unsettled skin", "Redness", "More oil"],
    causes: [
      "Stress hormones affect oil production",
      "Less sleep during stressful periods",
      "Inconsistent skincare routine",
      "Frequently touching your face",
    ],
    tips: [
      "Keep your skincare routine simple.",
      "Make time for sleep and rest.",
      "Avoid touching your face unnecessarily.",
      "Use soothing skincare.",
    ],
    ingredients: [
      { name: "Niacinamide", text: "Soothes the skin and supports the barrier." },
      { name: "Salicylic acid", text: "Helps clear clogged pores." },
      { name: "Panthenol", text: "Soothes irritated skin." },
      { name: "Green tea", text: "Provides soothing and antioxidant benefits." },
    ],
  },
  {
    slug: 'razor-bumps',
    title: "Razor bumps",
    image: rasierpickel,
    intro:
      "Razor bumps often appear after shaving as small red bumps, irritation, or ingrown hairs.",
    symptoms: ["Red bumps", "Ingrown hairs", "Itching", "Irritation after shaving"],
    causes: [
      "Irritation caused by shaving",
      "Ingrown hairs",
      "Dull razor blades",
      "Not enough care after shaving",
    ],
    tips: [
      "Use a clean, sharp razor.",
      "Shave in the direction of hair growth where possible.",
      "Soothe your skin after shaving.",
      "Avoid irritating products immediately after shaving.",
    ],
    ingredients: [
      { name: "Aloe Vera", text: "Cools and soothes irritated skin." },
      { name: "Panthenol", text: "Supports the skin barrier." },
      { name: "Salicylic acid", text: "May help prevent ingrown hairs." },
      { name: "Centella Asiatica", text: "Soothes sensitive and irritated skin." },
    ],
  },
]

export default function HautwissenDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()

   useEffect(() => {
    window.scrollTo(0, 0)
  }, [slug])

  const problem = hautProbleme.find((item) => item.slug === slug)

  if (!problem) {
    return (
      <main className="min-h-screen bg-[#FFF9F5] px-4 pt-24 sm:px-6 sm:pt-32 !font-sans">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-6 sm:p-8 shadow-sm !font-sans">
          <h1 className="text-3xl font-bold text-[#2a1c10] !font-sans">
            Skin concern not found
          </h1>

          <Link
            to="/hautwissen"
            className="mt-6 inline-block font-semibold text-[#D4A574] !font-sans"
          >
            Back to skin guide
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#FFF9F5] px-4 pt-24 pb-12 sm:px-6 sm:pt-28 sm:pb-16 !font-sans">
      <article className="mx-auto max-w-6xl !font-sans">
        <Link
          to="/hautwissen"
          className="mb-6 inline-block font-semibold text-[#D4A574] !font-sans"
        >
          ← Back to skin guide
        </Link>

        <section className="grid overflow-hidden rounded-[36px] bg-white shadow-lg md:grid-cols-2 !font-sans">
          <div className="h-[220px] sm:h-[320px] md:h-auto !font-sans">
            <img
              src={problem.image}
              alt={problem.title}
              className="h-full w-full object-cover !font-sans"
            />
          </div>

          <div className="flex flex-col justify-center p-6 sm:p-8 md:p-12 !font-sans">
            <span className="mb-4 w-fit rounded-full bg-[#FDECEC] px-4 py-2 text-sm font-semibold text-[#b76b5f] !font-sans">
              Skin guide
            </span>

            <h1 className="text-3xl font-bold text-[#2a1c10] sm:text-4xl md:text-5xl !font-sans">
              {problem.title}
            </h1>

            <p className="mt-5 text-lg leading-7 text-gray-600 sm:leading-8 !font-sans">
              {problem.intro}
            </p>

            {/* <button
              onClick={() => navigate('/chatbot')}
              className="mt-8 w-fit rounded-full bg-[#D4A574] px-7 py-3 font-semibold text-white transition hover:bg-[#c4945f]"
            >
              Start AI consultation
            </button> */}
          </div>
        </section>

        {/* <section className="mt-8 rounded-[32px] bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-[#2a1c10] !font-sans">
            Typische Symptome
          </h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {problem.symptoms.map((symptom) => (
              <div
                key={symptom}
                className="rounded-2xl bg-[#FFF9F5] p-5 text-center font-semibold text-[#8a5f36]"
              >
                {symptom}
              </div>
            ))}
          </div>
        </section> */}

        <section className="mt-8 grid gap-4 sm:gap-6 md:grid-cols-2 !font-sans">
          <div className="rounded-[32px] bg-white p-6 sm:p-8 shadow-sm !font-sans">
            <h2 className="text-xl sm:text-2xl font-bold text-[#2a1c10] !font-sans">
              What causes it?
            </h2>

            <div className="mt-5 grid gap-4 !font-sans">
              {problem.causes.map((cause) => (
                <div
                  key={cause}
                  className="rounded-2xl border border-[#F0E0CC] bg-[#FFF9F5] p-4 text-gray-600"
                >
                  <span className="mr-2 text-[#D4A574]">●</span>
                  {cause}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] bg-white p-8 shadow-sm !font-sans">
            <h2 className="text-xl sm:text-2xl font-bold text-[#2a1c10] !font-sans">
              What can help?
            </h2>

            <div className="mt-5 grid gap-4 !font-sans">
              {problem.tips.map((tip) => (
                <div
                  key={tip}
                  className="rounded-2xl border border-[#F0E0CC] bg-[#FFF9F5] p-4 text-gray-600 !font-sans"
                >
                  <span className="mr-2 font-bold text-[#D4A574]">✓</span>
                  {tip}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[32px] bg-white p-6 sm:p-8 shadow-sm !font-sans">
          <h2 className="text-xl sm:text-2xl font-bold text-[#2a1c10] !font-sans">
            Suitable ingredients
          </h2>

          <div className="mt-6 grid gap-4 sm:gap-5 md:grid-cols-2 !font-sans">
            {problem.ingredients.map((ingredient) => (
              <div
                key={ingredient.name}
                className="rounded-3xl bg-[#FFF9F5] p-5 sm:p-6 !font-sans"
              >
                <h3 className="text-lg sm:text-xl font-bold text-[#2a1c10] !font-sans">
                  {ingredient.name}
                </h3>
                <p className="mt-3 leading-7 text-gray-600 !font-sans">
                  {ingredient.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-[36px] bg-[#2a1c10] p-6 text-white sm:p-8 md:p-10">
          <h2 className="text-2xl font-bold sm:text-3xl !font-sans">
            Not sure what suits your skin?
          </h2>

          <p className="mt-4 max-w-2xl text-sm text-white/80 sm:text-base !font-sans">
            Start an AI consultation for more personalized skincare recommendations.
          </p>

   <button
  onClick={() =>
    navigate('/chatbot', {
      state: {
        newChat: true,
        problemTitle: problem.title,
        problemIntro: problem.intro,
        problemImage: problem.image,
      },
    })
  }
  className="mt-7 w-full rounded-full bg-[#D4A574] px-8 py-3 text-center font-semibold text-white transition hover:bg-[#c4945f] sm:w-auto !font-sans"
>
  Start AI consultation
</button>
        </section>

        <p className="mt-8 text-sm text-gray-500 !font-sans">
          Note: This information does not replace medical advice.
        </p>
      </article>
    </main>
  )
}