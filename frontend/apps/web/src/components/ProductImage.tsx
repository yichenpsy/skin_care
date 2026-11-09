import type { ImgHTMLAttributes } from 'react'
import productImages from '@/lib/product-images.json'

const images: Record<string, string> = productImages
const placeholder = '/images/products/placeholder.svg'

type ProductImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onError'> & {
  src?: string | null
}

/** Resolve original catalog URLs, including saved cart/order URLs, to bundled files. */
export function ProductImage({ src, ...props }: ProductImageProps) {
  const localSource = src
    ? images[src] || (src.startsWith('/images/products/') ? src : placeholder)
    : placeholder

  return (
    <img
      {...props}
      src={localSource}
      onError={(event) => {
        if (event.currentTarget.getAttribute('src') !== placeholder) {
          event.currentTarget.src = placeholder
        }
      }}
    />
  )
}
