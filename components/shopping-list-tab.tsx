"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"

interface ShoppingItem {
  id: string
  product_name: string
  quantity: number
  unit: string
  is_purchased: boolean
}

export default function ShoppingListTab() {
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newItem, setNewItem] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [unit, setUnit] = useState("pcs")
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    fetchItems()
  }, [])

  const fetchItems = async () => {
    setIsLoading(true)
    try {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) return

      const { data, error } = await supabase
        .from("shopping_lists")
        .select("id")
        .eq("user_id", authData.user.id)
        .single()

      if (error && error.code !== "PGRST116") throw error

      let listId = data?.id

      if (!listId) {
        const { data: newList, error: createError } = await supabase
          .from("shopping_lists")
          .insert({
            user_id: authData.user.id,
            name: "Current Shopping List",
          })
          .select("id")
          .single()

        if (createError) throw createError
        listId = newList?.id
      }

      const { data: itemsData, error: itemsError } = await supabase
        .from("shopping_list_items")
        .select("*")
        .eq("shopping_list_id", listId)

      if (itemsError) throw itemsError
      setItems(itemsData || [])
    } catch (error) {
      console.error("Error fetching items:", error)
      toast({
        title: "Error",
        description: "Failed to load shopping list",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const addItem = async () => {
    if (!newItem.trim()) {
      toast({
        title: "Error",
        description: "Please enter an item name",
        variant: "destructive",
      })
      return
    }

    try {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) return

      const { data: list } = await supabase.from("shopping_lists").select("id").eq("user_id", authData.user.id).single()

      const { error } = await supabase.from("shopping_list_items").insert({
        shopping_list_id: list.id,
        product_name: newItem,
        quantity: Number.parseInt(quantity) || 1,
        unit: unit,
        is_purchased: false,
      })

      if (error) throw error

      setNewItem("")
      setQuantity("1")
      await fetchItems()

      toast({
        title: "Success",
        description: "Item added to shopping list",
      })
    } catch (error) {
      console.error("Error adding item:", error)
      toast({
        title: "Error",
        description: "Failed to add item",
        variant: "destructive",
      })
    }
  }

  const toggleItem = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from("shopping_list_items").update({ is_purchased: !currentStatus }).eq("id", id)

      if (error) throw error
      await fetchItems()
    } catch (error) {
      console.error("Error updating item:", error)
      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive",
      })
    }
  }

  const removeItem = async (id: string) => {
    try {
      const { error } = await supabase.from("shopping_list_items").delete().eq("id", id)

      if (error) throw error
      await fetchItems()

      toast({
        title: "Success",
        description: "Item removed",
      })
    } catch (error) {
      console.error("Error removing item:", error)
      toast({
        title: "Error",
        description: "Failed to remove item",
        variant: "destructive",
      })
    }
  }

  const purchasedCount = items.filter((i) => i.is_purchased).length

  if (isLoading) {
    return <div className="text-center py-12">Loading shopping list...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Shopping List</h2>
        <p className="text-muted-foreground">
          {purchasedCount} of {items.length} items purchased
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add Item</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Item name..."
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addItem()}
              className="flex-1"
            />
            <Input
              placeholder="Qty"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
              className="w-20"
            />
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="px-3 py-2 border border-input rounded-md bg-background text-foreground"
            >
              <option value="pcs">pcs</option>
              <option value="kg">kg</option>
              <option value="g">g</option>
              <option value="l">l</option>
              <option value="ml">ml</option>
              <option value="lbs">lbs</option>
              <option value="oz">oz</option>
            </select>
            <Button onClick={addItem} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {items.length === 0 ? (
          <Card className="text-center py-8">
            <p className="text-muted-foreground">No items in your shopping list</p>
          </Card>
        ) : (
          items.map((item) => (
            <Card key={item.id} className={item.is_purchased ? "bg-muted/50" : ""}>
              <CardContent className="flex items-center gap-4 py-4">
                <Checkbox
                  checked={item.is_purchased}
                  onCheckedChange={() => toggleItem(item.id, item.is_purchased)}
                  className="border-primary"
                />
                <div className="flex-1">
                  <p className={item.is_purchased ? "line-through text-muted-foreground" : "font-medium"}>
                    {item.product_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {item.quantity} {item.unit}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => removeItem(item.id)} className="text-destructive">
                  Remove
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
