"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { collection, addDoc, query, getDocs, updateDoc, doc, deleteDoc } from "firebase/firestore"
import { getDb } from "@/lib/firebase-config"
import { useAuth } from "@/lib/auth-context"
import type { Menu, MenuOption } from "@/lib/types"
import { format } from "date-fns"
import { Plus, Trash2, Save, Eye, EyeOff, Calendar, Clock, UtensilsCrossed, ImageIcon, Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export function EnhancedMenuCreator() {
  const { user } = useAuth()
  const [menus, setMenus] = useState<Menu[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [menuForm, setMenuForm] = useState({
    title: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    cutoffTime: "14:00",
    imageUrl: "",
    isPublished: false,
  })

  const [options, setOptions] = useState<MenuOption[]>([
    {
      id: "1",
      name: "",
      description: "",
      dietary: "regular" as const,
      price: 0,
      calories: 0,
      allergens: [],
    },
  ])

  useEffect(() => {
    if (!user || user.role !== "admin") return

    const loadMenus = async () => {
      try {
        const db = await getDb()
        const menusQuery = query(collection(db, "menus"))
        const snapshot = await getDocs(menusQuery)

        const menusData = snapshot.docs.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            title: data.title || "Untitled",
            description: data.description || "",
            date: data.date || new Date().toISOString().split("T")[0],
            cutoffTime: data.cutoffTime || "14:00",
            options: data.options || [],
            isPublished: data.isPublished ?? false,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : undefined,
            createdBy: data.createdBy || "",
            imageUrl: data.imageUrl || "",
          }
        }) as Menu[]

        setMenus(menusData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))
        setLoading(false)
      } catch (error) {
        console.error("Error loading menus:", error)
        setLoading(false)
        toast({
          title: "Error",
          description: "Failed to load menus. Please refresh the page.",
          variant: "destructive",
        })
      }
    }

    loadMenus()
  }, [user])

  const addOption = () => {
    const newOption: MenuOption = {
      id: Date.now().toString(),
      name: "",
      description: "",
      dietary: "regular",
      price: 0,
      calories: 0,
      allergens: [],
    }
    setOptions([...options, newOption])
  }

  const updateOption = (index: number, field: keyof MenuOption, value: any) => {
    const updatedOptions = [...options]
    updatedOptions[index] = { ...updatedOptions[index], [field]: value }
    setOptions(updatedOptions)
  }

  const removeOption = (index: number) => {
    if (options.length > 1) {
      setOptions(options.filter((_, i) => i !== index))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!menuForm.title || !menuForm.description || options.some((opt) => !opt.name)) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const db = await getDb()
      const menuData: Omit<Menu, "id"> = {
        ...menuForm,
        options: options.filter((opt) => opt.name.trim() !== ""),
        createdAt: new Date(),
        createdBy: user!.uid,
      }

      await addDoc(collection(db, "menus"), menuData)

      toast({
        title: "Menu Created",
        description: `Menu for ${format(new Date(menuForm.date), "MMMM dd, yyyy")} has been created successfully`,
      })

      // Reset form
      setMenuForm({
        title: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
        cutoffTime: "14:00",
        imageUrl: "",
        isPublished: false,
      })
      setOptions([
        {
          id: "1",
          name: "",
          description: "",
          dietary: "regular",
          price: 0,
          calories: 0,
          allergens: [],
        },
      ])

      // Reload menus
      const menusQuery = query(collection(db, "menus"))
      const snapshot = await getDocs(menusQuery)
      const menusData = snapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          title: data.title || "Untitled",
          description: data.description || "",
          date: data.date || new Date().toISOString().split("T")[0],
          cutoffTime: data.cutoffTime || "14:00",
          options: data.options || [],
          isPublished: data.isPublished ?? false,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : undefined,
          createdBy: data.createdBy || "",
          imageUrl: data.imageUrl || "",
        }
      }) as Menu[]
      setMenus(menusData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))
    } catch (error) {
      console.error("Error creating menu:", error)
      toast({
        title: "Error",
        description: "Failed to create menu. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const toggleMenuPublished = async (menuId: string, currentStatus: boolean) => {
    try {
      const db = await getDb()
      await updateDoc(doc(db, "menus", menuId), {
        isPublished: !currentStatus,
        updatedAt: new Date(),
      })

      setMenus(
        menus.map((menu) =>
          menu.id === menuId ? { ...menu, isPublished: !currentStatus, updatedAt: new Date() } : menu,
        ),
      )

      toast({
        title: currentStatus ? "Menu Unpublished" : "Menu Published",
        description: `Menu has been ${currentStatus ? "unpublished" : "published"} successfully`,
      })
    } catch (error) {
      console.error("Error updating menu:", error)
      toast({
        title: "Error",
        description: "Failed to update menu status",
        variant: "destructive",
      })
    }
  }

  const deleteMenu = async (menuId: string) => {
    if (!confirm("Are you sure you want to delete this menu? This action cannot be undone.")) {
      return
    }

    try {
      const db = await getDb()
      await deleteDoc(doc(db, "menus", menuId))
      setMenus(menus.filter((menu) => menu.id !== menuId))

      toast({
        title: "Menu Deleted",
        description: "Menu has been deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting menu:", error)
      toast({
        title: "Error",
        description: "Failed to delete menu",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-4">Loading menus...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Create New Menu */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5" />
            Create New Menu
          </CardTitle>
          <CardDescription>Design and publish daily lunch menus for your team</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Menu Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Today's Special Menu"
                  value={menuForm.title}
                  onChange={(e) => setMenuForm({ ...menuForm, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="date"
                    type="date"
                    value={menuForm.date}
                    onChange={(e) => setMenuForm({ ...menuForm, date: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe today's menu offerings..."
                value={menuForm.description}
                onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })}
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cutoffTime">Order Cutoff Time</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="cutoffTime"
                    type="time"
                    value={menuForm.cutoffTime}
                    onChange={(e) => setMenuForm({ ...menuForm, cutoffTime: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="imageUrl">Menu Image URL (Optional)</Label>
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="imageUrl"
                    placeholder="https://example.com/menu-image.jpg"
                    value={menuForm.imageUrl}
                    onChange={(e) => setMenuForm({ ...menuForm, imageUrl: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Meal Options */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Meal Options</h3>
                <Button type="button" onClick={addOption} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Option
                </Button>
              </div>

              {options.map((option, index) => (
                <Card key={option.id} className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Option {index + 1}</h4>
                      {options.length > 1 && (
                        <Button
                          type="button"
                          onClick={() => removeOption(index)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Meal Name</Label>
                        <Input
                          placeholder="e.g., Grilled Chicken Salad"
                          value={option.name}
                          onChange={(e) => updateOption(index, "name", e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Dietary Type</Label>
                        <Select value={option.dietary} onValueChange={(value) => updateOption(index, "dietary", value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="regular">Regular</SelectItem>
                            <SelectItem value="vegetarian">Vegetarian</SelectItem>
                            <SelectItem value="vegan">Vegan</SelectItem>
                            <SelectItem value="gluten-free">Gluten-Free</SelectItem>
                            <SelectItem value="keto">Keto</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        placeholder="Describe the meal..."
                        value={option.description}
                        onChange={(e) => updateOption(index, "description", e.target.value)}
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Price ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={option.price || ""}
                          onChange={(e) => updateOption(index, "price", Number.parseFloat(e.target.value) || 0)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Calories</Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={option.calories || ""}
                          onChange={(e) => updateOption(index, "calories", Number.parseInt(e.target.value) || 0)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Allergens</Label>
                        <Input
                          placeholder="e.g., nuts, dairy, gluten"
                          value={option.allergens?.join(", ") || ""}
                          onChange={(e) =>
                            updateOption(
                              index,
                              "allergens",
                              e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isPublished"
                  checked={menuForm.isPublished}
                  onChange={(e) => setMenuForm({ ...menuForm, isPublished: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="isPublished">Publish immediately</Label>
              </div>

              <Button type="submit" disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Menu"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Existing Menus */}
      <Card>
        <CardHeader>
          <CardTitle>Existing Menus</CardTitle>
          <CardDescription>Manage your published and draft menus</CardDescription>
        </CardHeader>
        <CardContent>
          {menus.length === 0 ? (
            <div className="text-center py-8">
              <UtensilsCrossed className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No menus created yet</p>
              <p className="text-sm text-gray-400">Create your first menu using the form above</p>
            </div>
          ) : (
            <div className="space-y-4">
              {menus.map((menu) => (
                <Card key={menu.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{menu.title}</h3>
                        <Badge variant={menu.isPublished ? "default" : "secondary"}>
                          {menu.isPublished ? "Published" : "Draft"}
                        </Badge>
                        <Badge variant="outline">{format(new Date(menu.date), "MMM dd, yyyy")}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{menu.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{menu.options.length} options</span>
                        <span>Cutoff: {menu.cutoffTime}</span>
                        <span>Created: {format(menu.createdAt, "MMM dd, HH:mm")}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleMenuPublished(menu.id, menu.isPublished)}
                      >
                        {menu.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        {menu.isPublished ? "Unpublish" : "Publish"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => deleteMenu(menu.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
