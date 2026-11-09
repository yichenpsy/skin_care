import { displayLabel } from '@/lib/display-labels'
import { ProductImage } from '@/components/ProductImage'
import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  Star,
  ShoppingCart,
  ArrowLeft,
  Heart,
  User,
  CheckCircle,
  ChevronDown,
  Trash2,
  Sparkles,
  ShieldCheck,
  LoaderCircle,
  AlertCircle,
  X,
  Leaf,
  WineOff,
  DropletOff,
  Ruler
} from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { cn } from '@workspace/ui/lib/utils'
import { useCart } from '@/context/CartContext'
import { useWishlist } from '@/context/WishlistContext'
import { useAuth } from '@/context/AuthContext'
import { apiUrl } from '@/lib/api'
import { useReviews, type Review } from '@/context/ReviewsContext'
import ReviewForm from '@/components/ReviewForm'

type Product = {
  id: number
  name: string
  brand: string
  category: string
  price: number
  imageUrl?: string | null
  description?: string | null
  ingredients?: string | null
  rating?: number | null
  application?: string | null
  size?: string | null

  skinTypes?: string | null
  concerns?: string | null
  vegan?: boolean
  alcoholFree?: boolean
  fragranceFree?: boolean
}

const productBadges = [
  {
    key: 'vegan' as const,
    label: 'Vegan',
    Icon: Leaf,
    className: 'bg-[#E7F3E8] text-[#3F7D4E]',
  },
  {
    key: 'alcoholFree' as const,
    label: "Alcohol-free",
    Icon: WineOff,
    className: 'bg-[#F8E9EE] text-[#A64D6A]',
  },
  {
    key: 'fragranceFree' as const,
    label: "Fragrance-free",
    Icon: DropletOff,
    className: 'bg-[#E5F0F6] text-[#2F6D8A]',
  },
]

type ProductAiAction = 'explain' | 'fit'

type ProductAiResult = {
  title: string
  answer: string
  action: ProductAiAction
}

const skinTypeOptions = [
  { value: 'Normal', label: "Normal skin" },
  { value: 'Oily', label: "Oily skin" },
  { value: 'Dry', label: "Dry skin" },
  { value: 'Combination', label: "Combination skin" },
  { value: 'Sensitive', label: "Sensitive skin" },
]

export default function ProductDetail() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const from = searchParams.get('from')
  const orderId = searchParams.get('orderId') 

  const { items, addToCart, updateQuantity, removeFromCart } = useCart()
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist()
  const { isLoggedIn, user, token, updateUser } = useAuth()
  const { reviews, getProductReviews, getAverageRating, deleteReview } = useReviews()

  const [showLoginHint, setShowLoginHint] = useState(false)
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openSections, setOpenSections] = useState<string[]>([])

  const [addedToCart, setAddedToCart] = useState(false)
  const [cartToastLeaving, setCartToastLeaving] = useState(false)
  const [cartToastEntered, setCartToastEntered] = useState(false)

  const [averageRating, setAverageRating] = useState(0)
  const [reviewCount, setReviewCount] = useState(0)
  const [isReviewFormOpen, setIsReviewFormOpen] = useState(false)
  const [deletingReviewId, setDeletingReviewId] = useState<number | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [activeAiAction, setActiveAiAction] = useState<ProductAiAction | null>(null)
  const [productAiResult, setProductAiResult] = useState<ProductAiResult | null>(null)
  const [productAiError, setProductAiError] = useState<string | null>(null)
  const [showSkinTypeForm, setShowSkinTypeForm] = useState(false)
  const [selectedSkinType, setSelectedSkinType] = useState('')
  const [savingSkinType, setSavingSkinType] = useState(false)
  const [openAiResultSections, setOpenAiResultSections] = useState<ProductAiAction[]>([])

  useEffect(() => {
    async function fetchProduct() {
      try {
        const response = await fetch(apiUrl(`/api/products/${id}`))

        if (!response.ok) {
          throw new Error("Could not load the product")
        }

        const data: Product = await response.json()
        setProduct(data)
      } catch (err) {
        console.error(err)
        setError("Error loading product")
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [id])

  useEffect(() => {
    async function fetchReviews() {
      if (!id) return

      const productId = Number(id)

      await getProductReviews(productId)

      const ratingData = await getAverageRating(productId)
      setAverageRating(ratingData.average)
      setReviewCount(ratingData.count)
    }

    fetchReviews()
  }, [id])

  async function handleAddToCart() {
    if (!product) return

    await addToCart({
      id: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
      image: product.imageUrl || 'https://placehold.co/300x300?text=Kein+Bild',
     
      skinTypes: product.skinTypes,
      concerns: product.concerns,
      vegan: product.vegan,
      alcoholFree: product.alcoholFree,
      fragranceFree: product.fragranceFree,
    })

    setAddedToCart(true)
    setCartToastLeaving(false)
    setCartToastEntered(false)

    setTimeout(() => {
      setCartToastEntered(true)
    }, 50)

    setTimeout(() => {
      setCartToastLeaving(true)
    }, 2200)

    setTimeout(() => {
      setAddedToCart(false)
      setCartToastEntered(false)
    }, 2800)
  }

  function handleWishlistToggle() {
    if (!product) return

    if (!isLoggedIn) {
      setShowLoginHint(true)
      return
    }

    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id)
    } else {
      addToWishlist({
        id: product.id,
        name: product.name,
        category: product.category,
        price: product.price,
        image: product.imageUrl || 'https://placehold.co/300x300?text=Kein+Bild',
        rating: product.rating ?? 0,
        reviews: 0,
      })
    }
  }

  function toggleSection(sectionId: string) {
    setOpenSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  function toggleAiResultSection(action: ProductAiAction) {
    setOpenAiResultSections((prev) =>
      prev.includes(action)
        ? prev.filter((item) => item !== action)
        : [...prev, action]
    )
  }

  function handleAiActionClick(action: ProductAiAction) {
    if (activeAiAction !== null) return

    if (
      (productAiResult?.action === action || (action === 'fit' && showSkinTypeForm)) &&
      (openAiResultSections.includes(action) || productAiResult || showSkinTypeForm)
    ) {
      toggleAiResultSection(action)
      return
    }

    requestProductAi(action)
  }

  async function requestProductAi(
    action: ProductAiAction,
    options: { skipSkinTypePrompt?: boolean } = {}
  ) {
    if (!product) return

    if (action === 'fit' && !isLoggedIn) {
      setShowLoginHint(true)
      setProductAiError("Please sign in so we can use your skin profile.")
      return
    }

    if (action === 'fit' && !user?.skinType && !options.skipSkinTypePrompt) {
      setShowSkinTypeForm(true)
      setOpenAiResultSections((prev) => prev.includes('fit') ? prev : [...prev, 'fit'])
      setSelectedSkinType('')
      setProductAiResult(null)
      setProductAiError(null)
      return
    }

    setShowSkinTypeForm(false)
    setOpenAiResultSections((prev) => prev.includes(action) ? prev : [...prev, action])
    setActiveAiAction(action)
    setProductAiError(null)

    try {
      const response = await fetch(
        apiUrl(`/api/products/${product.id}/${action === 'explain' ? 'explain' : 'fit'}`),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(action === 'fit' && token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      )

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.message || "Could not load AI assessment")
      }

      setProductAiResult({
        title: action === 'explain' ? "Product explained" : "Does it match your skin profile?",
        answer: data.answer || "No assessment available.",
        action,
      })
    } catch (err) {
      console.error(err)
      setProductAiError(
        err instanceof Error ? err.message : "Could not load AI assessment"
      )
    } finally {
      setActiveAiAction(null)
    }
  }

  async function saveSkinTypeAndCheckFit() {
    if (!token || !user || !selectedSkinType) return

    setSavingSkinType(true)
    setProductAiError(null)

    try {
      const response = await fetch(apiUrl('/api/auth/skin-type'), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ skinType: selectedSkinType }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.message || "Could not save skin type")
      }

      if (data.user) {
        updateUser({ ...user, ...data.user, token })
      }

      setShowSkinTypeForm(false)
      await requestProductAi('fit', { skipSkinTypePrompt: true })
    } catch (err) {
      console.error(err)
      setProductAiError(
        err instanceof Error ? err.message : "Could not save skin type"
      )
    } finally {
      setSavingSkinType(false)
    }
  }
async function clearSkinType() {
  if (!token || !user) return

  setSavingSkinType(true)
  setProductAiError(null)

  try {
    const response = await fetch(apiUrl('/api/auth/skin-type'), {
      method: 'DELETE',
      headers: {
       
        Authorization: `Bearer ${token}`,
      },
     
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(data.message || "Could not remove skin type")
    }

    if (data.user) {
      updateUser({ ...user, ...data.user, token })
    }

    setProductAiResult(null)
    setOpenAiResultSections((prev) => prev.filter((item) => item !== 'fit'))
  } catch (err) {
    console.error(err)
    setProductAiError(
      err instanceof Error ? err.message : "Could not remove skin type"
    )
  } finally {
    setSavingSkinType(false)
  }
}
  function renderFitRating(line: string, index: number) {
    const ratingMatch = line.match(/^(?:Suitability|Fit|Rating|Passform|Bewertung|Score):\s*([1-5])\s*\/\s*5(?:\s*(?:stars|Sterne))?/i)

    if (!ratingMatch) return null

    const score = Number(ratingMatch[1])

    return (
      <div key={index} className="rounded-xl bg-[#FFFBF6] p-4">
        <p className="mb-2 text-sm font-semibold text-foreground">Suitability</p>
        <div className="flex items-center gap-3">
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={cn(
                  'h-5 w-5',
                  i < score
                    ? 'fill-[#D4A574] text-[#D4A574]'
                    : 'fill-muted text-muted'
                )}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-[#8A5D2F]">
            {score}/5 stars
          </span>
        </div>
      </div>
    )
  }

  function renderAiAnswer(answer: string, action: ProductAiAction) {
    return answer
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => {
        const cleanLine = line.replace(/\*\*/g, '')
        const fitRating = action === 'fit' ? renderFitRating(cleanLine, index) : null

        if (fitRating) return fitRating

        if (line === '---') {
          return <div key={index} className="my-3 border-t border-[#E8D5C0]" />
        }

        if (cleanLine.startsWith('- ')) {
          return (
            <p key={index} className="pl-4">
              <span aria-hidden="true">- </span>
              {cleanLine.slice(2)}
            </p>
          )
        }

        const labelMatch = cleanLine.match(/^([^:]+):(.*)$/)

        if (labelMatch) {
          return (
            <p key={index}>
              <span className="font-semibold text-foreground">{labelMatch[1]}:</span>
              {labelMatch[2]}
            </p>
          )
        }

        return <p key={index}>{cleanLine}</p>
      })
  }

  async function handleDeleteReview(reviewId: number) {
    if (!token) return
    setDeleteConfirmId(reviewId)
  }

  async function confirmDeleteReview() {
    if (!token || !deleteConfirmId) return

    setDeletingReviewId(deleteConfirmId)

    const success = await deleteReview(deleteConfirmId, token)

    if (success && id) {
      const productId = Number(id)

      await getProductReviews(productId)

      const ratingData = await getAverageRating(productId)
      setAverageRating(ratingData.average)
      setReviewCount(ratingData.count)
    }

    setDeletingReviewId(null)
    setDeleteConfirmId(null)
  }

  function handleReviewAdded() {
    if (!id) return

    const productId = Number(id)

    getProductReviews(productId)

    getAverageRating(productId).then((data) => {
      setAverageRating(data.average)
      setReviewCount(data.count)
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-10">
        Loading product...
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-10">
        <p className="text-red-500 mb-4">
          {error || "Product not found."}
        </p>

        <Link
  to={from === 'order' && orderId ? `/profile/orders/${orderId}` : '/shop'}
  className="text-gray-500 hover:text-[#D4A574]"
>
  ← {from === 'order' && orderId ? "Back to order" : "Back to products"}
</Link>
      </div>
    )
  }

  const displayRating = averageRating > 0 ? averageRating : product.rating ?? 0
  const inWishlist = isInWishlist(product.id)
  const cartItem = items.find((item) => item.id === product.id)
  const isInCart = Boolean(cartItem)
  const fromChatbot = searchParams.get('from') === 'chatbot'

  const detailSections = [
    {
      id: 'description',
      title: "Description",
      content: product.description || "No description available.",
    },
    {
      id: 'usage',
      title: "How to use",
      content: product.application || "No usage instructions available.",
    },
    {
      id: 'ingredients',
      title: "Ingredients",
      content: product.ingredients || "No ingredients available.",
    },
  ]
  const selectedAiAction = showSkinTypeForm
    ? 'fit'
    : activeAiAction || productAiResult?.action || null

  return (
    <div className="container mx-auto px-4 py-10">
      {addedToCart && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] pointer-events-none px-4 w-full sm:w-auto">
          <div
            className={cn(
              'flex items-center gap-3 rounded-2xl bg-[#D4A574] px-5 sm:px-6 py-3 sm:py-4 text-white shadow-2xl transition-all duration-500 ease-out mx-auto max-w-fit',
              !cartToastEntered && 'opacity-0 -translate-y-4 scale-95',
              cartToastEntered && !cartToastLeaving && 'opacity-100 translate-y-0 scale-100',
              cartToastLeaving && 'opacity-0 -translate-y-3 scale-95'
            )}
          >
            <CheckCircle className="h-5 w-5 shrink-0" />

            <span className="text-xs sm:text-sm font-medium">
              Product added to cart
            </span>
          </div>
        </div>
      )}

      <div className="mb-8 flex flex-wrap items-center gap-4">
        <Link
  to={from === 'order' && orderId ? `/profile/orders/${orderId}` : '/shop'}
  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
>
  <ArrowLeft className="h-4 w-4" />
  {from === 'order' && orderId
    ? "Back to order"
    : "Back to products"}
</Link>

        {fromChatbot && (
          <Link
            to="/chatbot"
            className="inline-flex items-center gap-2 rounded-full border border-[#E8D5C0] px-4 py-2 text-sm text-[#A97745] transition-colors hover:bg-[#FDF7F0]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to AI advisor
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
        <div className="rounded-2xl overflow-hidden flex items-start justify-center">
          <ProductImage
            src={product.imageUrl || 'https://placehold.co/600x600?text=Kein+Bild'}
            alt={product.name}
            className="max-h-[320px] sm:max-h-[440px] md:max-h-[620px] w-auto object-contain"
          />
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-2">
            {displayLabel(product.category)}
          </p>

          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            {product.name}
          </h1>

          <p className="text-muted-foreground mb-4">
            {product.brand}
          </p>

          <div className="flex items-center gap-2 mb-5">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    'h-5 w-5',
                    i < Math.floor(displayRating)
                      ? 'fill-[#D4A574] text-[#D4A574]'
                      : 'fill-muted text-muted'
                  )}
                />
              ))}
            </div>

            <span className="text-sm text-muted-foreground">
              {displayRating.toFixed(1)} ({reviewCount}{' '}
              {reviewCount === 1 ? "Rating" : "Reviews"})
            </span>
          </div>

          {product.size && (
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#E8D5C0] bg-[#FFFBF6] px-4 py-1.5 text-sm font-medium text-[#8A5D2F]">
              <Ruler className="h-4 w-4 text-[#D4A574]" />
              <span>Size: {product.size}</span>
            </div>
          )}

          {productBadges.some((badge) => product[badge.key]) && (
            <div className="mb-6 flex flex-wrap gap-2">
              {productBadges
                .filter((badge) => product[badge.key])
                .map(({ key, label, Icon, className }) => (
                  <span
                    key={key}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium',
                      className
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </span>
                ))}
            </div>
          )}

          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-3xl font-bold">
              €{product.price.toFixed(2)}
            </p>

            <div className="relative flex w-full gap-3 sm:w-auto sm:min-w-[320px]">
              {isInCart && cartItem ? (
                <div className="flex-1 flex items-center justify-center gap-4 bg-[#D4A574] text-white rounded-full py-2">
                  <span className="text-sm">Quantity</span>

                  <button
                    onClick={() => {
                      if (cartItem.quantity === 1) {
                        removeFromCart(product.id)
                      } else {
                        updateQuantity(product.id, cartItem.quantity - 1)
                      }
                    }}
                    className="px-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Decrease quantity"
                  >
                    -
                  </button>

                  <span>{cartItem.quantity}</span>

                  <button
                    onClick={() => updateQuantity(product.id, cartItem.quantity + 1)}
                    className="px-2"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              ) : (
                <Button
                  onClick={handleAddToCart}
                  className="flex-1 rounded-full px-8 text-foreground transition-colors bg-[#F5E6D3] hover:bg-[#E8D5C0]"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Add to cart
                </Button>
              )}

              <Button
                onClick={handleWishlistToggle}
                variant="outline"
                className={cn(
                  'rounded-full px-4 border-2 transition-colors',
                  inWishlist
                    ? 'border-[#D4A574] hover:bg-red-100'
                    : 'border-[#D4A574] hover:bg-[#F5E6D3]'
                )}
                aria-label={
                  inWishlist
                    ? "Remove from wishlist"
                    : "Add to wishlist"
                }
              >
                <Heart
                  className={cn(
                    'h-5 w-5',
                    inWishlist
                      ? 'fill-[#D4A574] text-[#D4A574]'
                      : 'text-[#D4A574]'
                  )}
                />
              </Button>

              {showLoginHint && (
                <div className="absolute top-14 right-0 z-20 w-64 max-w-[calc(100vw-2rem)] rounded-xl bg-white p-3 text-xs shadow-lg border border-border">
                  <p className="mb-2 text-foreground">
                    Please sign in to save products.
                  </p>

                  <Link
                    to="/login"
                    className="font-medium text-[#D4A574] hover:underline"
                  >
                    Go to sign in
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="mb-8 rounded-2xl border border-[#E8D5C0] bg-[#FFFBF6] p-4 sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Transparent product advice
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  AI uses ingredients and your skin type to help you find the best product.
                </p>
              </div>
            </div>
{isLoggedIn && user?.skinType && (
  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#E8D5C0] bg-white px-4 py-1.5 text-sm text-[#8A5D2F]">
    <span>
      Skin type:{' '}
      {skinTypeOptions.find((o) => o.value === user.skinType)?.label || user.skinType}
    </span>

    <button
      type="button"
      onClick={clearSkinType}
      disabled={savingSkinType}
      className="rounded-full p-0.5 text-[#D4A574] transition hover:bg-[#F5E6D3] disabled:opacity-50"
      aria-label="Remove skin type"
      title="Remove skin type"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  </div>
)}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Button
                type="button"
                onClick={() => handleAiActionClick('explain')}
                disabled={activeAiAction !== null}
                variant="outline"
                className={cn(
                  'h-11 rounded-full border-2 border-[#D4A574] px-5 disabled:opacity-100',
                  selectedAiAction === 'explain'
                    ? 'bg-[#D4A574] text-white hover:bg-[#C69563]'
                    : 'bg-white text-[#8A5D2F] hover:bg-[#F5E6D3]'
                )}
              >
                {activeAiAction === 'explain' ? (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Explain product
              </Button>

              <Button
                type="button"
                onClick={() => handleAiActionClick('fit')}
                disabled={activeAiAction !== null}
                variant="outline"
                className={cn(
                  'h-11 rounded-full border-2 border-[#D4A574] px-5 disabled:opacity-100',
                  selectedAiAction === 'fit'
                    ? 'bg-[#D4A574] text-white hover:bg-[#C69563]'
                    : 'bg-white text-[#8A5D2F] hover:bg-[#F5E6D3]'
                )}
              >
                {activeAiAction === 'fit' ? (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="mr-2 h-4 w-4" />
                )}
                Does it suit me?
              </Button>
            </div>

            {productAiError && (
              <div className="mt-4 flex gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <p>{productAiError}</p>
              </div>
            )}

            {showSkinTypeForm && (
              <div className="mt-5">
                {openAiResultSections.includes('fit') && (
                  <div className="relative rounded-xl border border-[#E8D5C0] bg-white p-4 pr-10 sm:p-5 sm:pr-12">
                    <button
                      type="button"
                      onClick={() => toggleAiResultSection('fit')}
                      className="absolute right-3 top-3 rounded-full p-2 text-[#D4A574] transition hover:bg-[#F5E6D3]"
                      aria-label="Collapse skin profile form"
                      aria-expanded={openAiResultSections.includes('fit')}
                    >
                      <ChevronDown className="h-5 w-5 rotate-180 transition-transform" />
                    </button>

                    <div className="mb-4">
                      <h3 className="font-semibold text-foreground">
                        Your skin type is missing
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Select your skin type so AI can assess this product for you.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {skinTypeOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setSelectedSkinType(option.value)}
                          className={cn(
                            'rounded-full border px-4 py-2 text-sm transition-colors',
                            selectedSkinType === option.value
                              ? 'border-[#D4A574] bg-[#D4A574] text-white'
                              : 'border-[#E8D5C0] bg-white text-[#8A5D2F] hover:bg-[#F5E6D3]'
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>

                    <Button
                      type="button"
                      onClick={saveSkinTypeAndCheckFit}
                      disabled={!selectedSkinType || savingSkinType}
                      className="mt-4 h-11 w-full rounded-full bg-[#D4A574] text-white hover:bg-[#C69563]"
                    >
                      {savingSkinType && (
                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Save and check
                    </Button>
                  </div>
                )}
              </div>
            )}

            {productAiResult && (
              <div className="mt-5">
                {openAiResultSections.includes(productAiResult.action) && (
                  <div className="relative rounded-xl border border-[#E8D5C0] bg-white p-4 pr-10 sm:p-5 sm:pr-12">
                    <button
                      type="button"
                      onClick={() => toggleAiResultSection(productAiResult.action)}
                      className="absolute right-3 top-3 rounded-full p-2 text-[#D4A574] transition hover:bg-[#F5E6D3]"
                      aria-label="Collapse AI assessment"
                      aria-expanded={openAiResultSections.includes(productAiResult.action)}
                    >
                      <ChevronDown className="h-5 w-5 rotate-180 transition-transform" />
                    </button>

                    <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
                      {renderAiAnswer(productAiResult.answer, productAiResult.action)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mb-8 space-y-3">
            {detailSections.map((section) => {
              const isOpen = openSections.includes(section.id)

              return (
                <div
                  key={section.id}
                  className="rounded-2xl border border-[#E8D5C0] bg-white overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left font-medium hover:bg-[#FDF7F0] transition"
                  >
                    {section.title}

                    <ChevronDown
                      className={cn(
                        'h-5 w-5 text-[#D4A574] transition-transform',
                        isOpen && 'rotate-180'
                      )}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 text-muted-foreground leading-relaxed text-sm">
                      {section.content}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

        </div>
      </div>

      <div className="mt-12 border-t pt-10 px-1">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <h2 className="text-2xl font-bold">Customer reviews</h2>

          <Button
            onClick={() => setIsReviewFormOpen(true)}
            className="bg-[#D4A574] text-white hover:bg-[#C69563] px-6 py-3 text-base font-semibold w-full sm:w-auto"
          >
            Write a review
          </Button>
        </div>

        {reviews.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No reviews yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {reviews.map((review: Review) => (
              <div key={review.id} className="border-b pb-5 last:border-b-0">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-[#F5E6D3] flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-[#D4A574]" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-foreground break-words">
                        {review.user?.name || review.user?.email?.split('@')[0]}
                      </span>

                      <p className="text-xs text-muted-foreground">
                        {new Date(review.createdAt).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                  </div>

                  {user && review.userId === user.id && (
                    <button
                      onClick={() => handleDeleteReview(review.id)}
                      disabled={deletingReviewId === review.id}
                      className="text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-all p-2 rounded-lg flex-shrink-0"
                      aria-label="Delete review"
                      title="Delete review"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="flex mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        'h-4 w-4',
                        i < review.rating
                          ? 'fill-[#D4A574] text-[#D4A574]'
                          : 'fill-muted text-muted'
                      )}
                    />
                  ))}
                </div>

                <p className="text-muted-foreground text-sm">
                  {review.reviewText}
                </p>
              </div>
            ))}
          </div>
        )}

        <ReviewForm
          productId={product.id}
          isOpen={isReviewFormOpen}
          onClose={() => setIsReviewFormOpen(false)}
          onReviewAdded={handleReviewAdded}
        />

        {deleteConfirmId && (
          <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-[560px] rounded-[36px] shadow-[0_25px_60px_rgba(0,0,0,0.18)] border border-[#EFE6DC] px-10 py-9 text-center">
              <h3 className="text-2xl font-bold mb-3">
                Delete review?
              </h3>

              <p className="text-muted-foreground mb-8">
                Are you sure you want to delete this review?
              </p>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 rounded-full hover:bg-[#F5E6D3] hover:border-[#D4A574]"
                >
                  Cancel
                </Button>

                <Button
                  onClick={confirmDeleteReview}
                  className="flex-1 rounded-full bg-[#D4A574] text-white hover:bg-[#C69563]"
                  disabled={deletingReviewId !== null}
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
