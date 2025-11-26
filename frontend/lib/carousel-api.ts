export const carouselApi = {
  async getItems(position = "homepage") {
    const response = await fetch(`/api/carousel/items?position=${position}`)
    return response.json()
  },

  async getAdminItems(position = "homepage") {
    const token = localStorage.getItem("admin_token")
    const response = await fetch(`/api/carousel/admin/all?position=${position}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.json()
  },

  async createItem(data: any) {
    const token = localStorage.getItem("admin_token")
    const response = await fetch("/api/carousel/admin", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
    return response.json()
  },

  async updateItem(id: number, data: any) {
    const token = localStorage.getItem("admin_token")
    const response = await fetch(`/api/carousel/admin/${id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
    return response.json()
  },

  async deleteItem(id: number) {
    const token = localStorage.getItem("admin_token")
    const response = await fetch(`/api/carousel/admin/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.json()
  },
}
