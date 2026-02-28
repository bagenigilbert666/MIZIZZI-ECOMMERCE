"use server"

import { revalidateTag, updateTag } from "next/cache"
import { adminService } from "@/services/admin"

export async function updateProductAction(
  productId: string,
  data: any
) {
  try {
    // Call the admin service to update the product
    const result = await adminService.updateProduct(productId, data)

    // Instantly update the cache tag for this product
    updateTag(`product_${productId}`)
    
    // Revalidate the products list to reflect changes
    revalidateTag("products_list")

    return { 
      success: true, 
      data: result,
      message: "Product updated successfully and changes are live"
    }
  } catch (error: any) {
    console.error("[v0] Server Action Error:", error)
    return {
      success: false,
      error: error.message || "Failed to update product",
    }
  }
}

export async function deleteProductImageAction(
  productId: string,
  imageUrl: string
) {
  try {
    const result = await adminService.deleteProductImage(productId, imageUrl)
    
    // Instant cache update
    updateTag(`product_images_${productId}`)
    updateTag(`product_${productId}`)
    
    return { success: true, data: result }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to delete image",
    }
  }
}

export async function uploadProductImagesAction(
  productId: string,
  formData: FormData
) {
  try {
    const result = await adminService.uploadProductImages(productId, formData)
    
    // Instant cache update
    updateTag(`product_images_${productId}`)
    updateTag(`product_${productId}`)
    
    return { success: true, data: result }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to upload images",
    }
  }
}
