import { redirect, notFound } from "next/navigation"

// This page redirects to the main product page
export default function ProductSlugPage(props: any) {
  const params = props?.params

  if (params && typeof params.slug === "string" && params.slug.length > 0) {
    // Redirect to the main product page for the given slug
    redirect(`/product/${params.slug}`)
  }

  // No slug provided — treat as not found to avoid redirect loops / invalid redirects
  notFound()
}