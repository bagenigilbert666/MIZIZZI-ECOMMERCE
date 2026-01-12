import { getFlashSaleProducts } from "@/lib/server/get-flash-sale-products"
import { getLuxuryProducts } from "@/lib/server/get-luxury-products"
import { HomeContent } from "@/components/home/home-content"

export default async function Home() {
  const [flashSaleProducts, luxuryProducts] = await Promise.all([getFlashSaleProducts(50), getLuxuryProducts(12)])

  return <HomeContent flashSaleProducts={flashSaleProducts} luxuryProducts={luxuryProducts} />
}
