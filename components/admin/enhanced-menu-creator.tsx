"use client";
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  collection,
  addDoc,
  query,
  getDocs,
  updateDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase-config";
import { useAuth } from "@/lib/auth-context";
import type { Menu, MenuOption } from "@/lib/types";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus,
  Trash2,
  Save,
  Eye,
  EyeOff,
  Calendar,
  UtensilsCrossed,
  Loader2,
  Edit,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  Zap,
  Star,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface MenuTemplate {
  id: string;
  name: string;
  description: string;
  options: MenuOption[];
  createdAt: Date;
  createdBy: string;
}

type CreateStep = "start" | "basic" | "options" | "review";

export function EnhancedMenuCreator() {
  const { user } = useAuth();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [templates, setTemplates] = useState<MenuTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [activeTab, setActiveTab] = useState<"create" | "manage">("create");
  const [createStep, setCreateStep] = useState<CreateStep>("start");

  const [menuForm, setMenuForm] = useState({
    title: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    cutoffTime: "11:00",
    imageUrl: "",
    isPublished: false,
  });

  const [options, setOptions] = useState<MenuOption[]>([
    {
      id: "1",
      name: "",
      description: "",
      dietary: "regular" as const,
      price: 0,
    },
  ]);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    loadMenusAndTemplates();
  }, [user]);

  const loadMenusAndTemplates = async () => {
    try {
      const db = await getDb();
      const menusQuery = query(collection(db, "menus"));
      const menusSnapshot = await getDocs(menusQuery);
      const menusData = menusSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || "Untitled",
          description: data.description || "",
          date: data.date || new Date().toISOString().split("T")[0],
          cutoffTime: data.cutoffTime || "11:00",
          options: data.options || [],
          isPublished: data.isPublished ?? false,
          createdAt: data.createdAt?.toDate
            ? data.createdAt.toDate()
            : new Date(),
          updatedAt: data.updatedAt?.toDate
            ? data.updatedAt.toDate()
            : undefined,
          createdBy: data.createdBy || "",
          imageUrl: data.imageUrl || "",
        };
      }) as Menu[];

      const templatesQuery = query(collection(db, "menuTemplates"));
      const templatesSnapshot = await getDocs(templatesQuery);
      const templatesData = templatesSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || "Untitled Template",
          description: data.description || "",
          options: data.options || [],
          createdAt: data.createdAt?.toDate
            ? data.createdAt.toDate()
            : new Date(),
          createdBy: data.createdBy || "",
        };
      }) as MenuTemplate[];

      setMenus(
        menusData.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )
      );
      setTemplates(
        templatesData.sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
        )
      );
      setLoading(false);
    } catch (error) {
      console.error("Error loading data:", error);
      setLoading(false);
      toast({
        title: "Error",
        description:
          "Failed to load menus and templates. Please refresh the page.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setMenuForm({
      title: "",
      description: "",
      date: new Date().toISOString().split("T")[0],
      cutoffTime: "11:00",
      imageUrl: "",
      isPublished: false,
    });
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
    ]);
    setEditingMenu(null);
    setCreateStep("start");
  };

  const startEditingMenu = (menu: Menu) => {
    setEditingMenu(menu);
    setMenuForm({
      title: menu.title,
      description: menu.description,
      date: menu.date,
      cutoffTime: menu.cutoffTime,
      imageUrl: menu.imageUrl || "",
      isPublished: menu.isPublished,
    });
    setOptions(menu.options.map((opt) => ({ ...opt })));
    setCreateStep("basic");
    setActiveTab("create");
  };

  const loadTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    setMenuForm({
      title: template.name,
      description: template.description,
      date: new Date().toISOString().split("T")[0],
      cutoffTime: "11:00",
      imageUrl: "",
      isPublished: false,
    });
    setOptions(
      template.options.map((opt) => ({
        ...opt,
        id: Date.now().toString() + Math.random(),
      }))
    );
    setCreateStep("basic");
    toast({
      title: "Template Loaded",
      description: `Template "${template.name}" has been loaded.`,
    });
  };

  const addOption = () => {
    const newOption: MenuOption = {
      id: Date.now().toString(),
      name: "",
      description: "",
      dietary: "regular",
      price: 0,
      calories: 0,
      allergens: [],
    };
    setOptions([...options, newOption]);
  };

  const updateOption = (index: number, field: keyof MenuOption, value: any) => {
    const updatedOptions = [...options];
    updatedOptions[index] = { ...updatedOptions[index], [field]: value };
    setOptions(updatedOptions);
  };

  const removeOption = (index: number) => {
    if (options.length > 1) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async () => {
    if (
      !menuForm.title ||
      !menuForm.description ||
      options.some((opt) => !opt.name)
    ) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const db = await getDb();
      const menuData = {
        ...menuForm,
        options: options.filter((opt) => opt.name.trim() !== ""),
        updatedAt: new Date(),
      };

      if (editingMenu) {
        await updateDoc(doc(db, "menus", editingMenu.id), menuData);
        toast({
          title: "Menu Updated",
          description: `Menu for ${format(
            new Date(menuForm.date),
            "MMMM dd, yyyy"
          )} has been updated successfully`,
        });
      } else {
        await addDoc(collection(db, "menus"), {
          ...menuData,
          createdAt: new Date(),
          createdBy: user!.uid,
        });
        toast({
          title: "Menu Created",
          description: `Menu for ${format(
            new Date(menuForm.date),
            "MMMM dd, yyyy"
          )} has been created successfully`,
        });
      }

      resetForm();
      await loadMenusAndTemplates();
      setActiveTab("manage");
    } catch (error) {
      console.error("Error saving menu:", error);
      toast({
        title: "Error",
        description: "Failed to save menu. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleMenuPublished = async (
    menuId: string,
    currentStatus: boolean
  ) => {
    try {
      const db = await getDb();
      await updateDoc(doc(db, "menus", menuId), {
        isPublished: !currentStatus,
        updatedAt: new Date(),
      });
      setMenus(
        menus.map((menu) =>
          menu.id === menuId
            ? { ...menu, isPublished: !currentStatus, updatedAt: new Date() }
            : menu
        )
      );
      toast({
        title: currentStatus ? "Menu Unpublished" : "Menu Published",
        description: `Menu has been ${
          currentStatus ? "unpublished" : "published"
        } successfully`,
      });
    } catch (error) {
      console.error("Error updating menu:", error);
      toast({
        title: "Error",
        description: "Failed to update menu status",
        variant: "destructive",
      });
    }
  };

  const deleteMenu = async (menuId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this menu? This action cannot be undone."
      )
    ) {
      return;
    }
    try {
      const db = await getDb();
      await deleteDoc(doc(db, "menus", menuId));
      setMenus(menus.filter((menu) => menu.id !== menuId));
      toast({
        title: "Menu Deleted",
        description: "Menu has been deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting menu:", error);
      toast({
        title: "Error",
        description: "Failed to delete menu",
        variant: "destructive",
      });
    }
  };

  const saveAsTemplate = async () => {
    if (!templateName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a template name",
        variant: "destructive",
      });
      return;
    }

    if (options.some((opt) => !opt.name.trim())) {
      toast({
        title: "Validation Error",
        description:
          "Please fill in all meal options before saving as template",
        variant: "destructive",
      });
      return;
    }

    try {
      const db = await getDb();
      const templateData: Omit<MenuTemplate, "id"> = {
        name: templateName,
        description: menuForm.description,
        options: options.filter((opt) => opt.name.trim() !== ""),
        createdAt: new Date(),
        createdBy: user!.uid,
      };

      await addDoc(collection(db, "menuTemplates"), templateData);
      await loadMenusAndTemplates();
      setShowTemplateDialog(false);
      setTemplateName("");

      toast({
        title: "Template Saved",
        description: `Template "${templateName}" has been saved successfully.`,
      });
    } catch (error) {
      console.error("Error saving template:", error);
      toast({
        title: "Error",
        description: "Failed to save template. Please try again.",
        variant: "destructive",
      });
    }
  };

  const deleteTemplate = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const db = await getDb();
      await deleteDoc(doc(db, "menuTemplates", templateId));
      await loadMenusAndTemplates();

      toast({
        title: "Template Deleted",
        description: "Template has been deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting template:", error);
      toast({
        title: "Error",
        description: "Failed to delete template.",
        variant: "destructive",
      });
    }
  };

  const getStepProgress = () => {
    switch (createStep) {
      case "start":
        return 0;
      case "basic":
        return 33;
      case "options":
        return 66;
      case "review":
        return 100;
      default:
        return 0;
    }
  };

  const canProceedToOptions = () => {
    return menuForm.title.trim() && menuForm.description.trim();
  };

  const canProceedToReview = () => {
    return options.some((opt) => opt.name.trim());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-4">Loading menus...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 lg:p-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            Menu Management
          </h1>
          <p className="text-gray-600 mt-1">
            Create and manage daily lunch menus for your team
          </p>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "create" | "manage")}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Menu
          </TabsTrigger>
          <TabsTrigger value="manage" className="flex items-center gap-2">
            <UtensilsCrossed className="h-4 w-4" />
            Manage Menus ({menus.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6">
          {/* Progress Bar */}
          {createStep !== "start" && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{getStepProgress()}%</span>
                  </div>
                  <Progress value={getStepProgress()} className="h-2" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Start Step */}
          {createStep === "start" && (
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2 text-xl">
                  <UtensilsCrossed className="h-6 w-6" />
                  Create New Menu
                </CardTitle>
                <CardDescription>
                  Choose how you'd like to start creating your menu
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-blue-200">
                    <div
                      className="text-center space-y-3"
                      onClick={() => setCreateStep("basic")}
                    >
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                        <Zap className="h-6 w-6 text-blue-600" />
                      </div>
                      <h3 className="font-semibold">Start from Scratch</h3>
                      <p className="text-sm text-gray-600">
                        Create a completely new menu with custom options
                      </p>
                      <Button className="w-full">
                        Start Creating
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </Card>

                  <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-green-200">
                    <div className="text-center space-y-3">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                        <BookOpen className="h-6 w-6 text-green-600" />
                      </div>
                      <h3 className="font-semibold">Use Template</h3>
                      <p className="text-sm text-gray-600">
                        Quick start with a saved template ({templates.length}{" "}
                        available)
                      </p>
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full bg-transparent"
                            disabled={templates.length === 0}
                          >
                            Browse Templates
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </SheetTrigger>
                        <SheetContent>
                          <SheetHeader>
                            <SheetTitle>Choose a Template</SheetTitle>
                          </SheetHeader>
                          <div className="space-y-4 mt-6">
                            {templates.map((template) => (
                              <Card key={template.id} className="p-4">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-medium">
                                      {template.name}
                                    </h4>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        deleteTemplate(template.id)
                                      }
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  <p className="text-sm text-gray-600">
                                    {template.description}
                                  </p>
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500">
                                      {template.options.length} options
                                    </span>
                                    <Button
                                      size="sm"
                                      onClick={() => loadTemplate(template.id)}
                                    >
                                      Use Template
                                    </Button>
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>
                        </SheetContent>
                      </Sheet>
                    </div>
                  </Card>
                </div>

                {editingMenu && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 text-blue-800">
                      <AlertCircle className="h-5 w-5" />
                      <span className="font-medium">
                        Currently editing: {editingMenu.title}
                      </span>
                    </div>
                    <p className="text-sm text-blue-600 mt-1">
                      Continue editing or start a new menu
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" onClick={() => setCreateStep("basic")}>
                        Continue Editing
                      </Button>
                      <Button size="sm" variant="outline" onClick={resetForm}>
                        Start New Menu
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Basic Info Step */}
          {createStep === "basic" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Basic Information
                </CardTitle>
                <CardDescription>
                  Set up the basic details for your menu
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-medium">
                      Menu Title *
                    </Label>
                    <Input
                      id="title"
                      placeholder="e.g., Today's Special Menu"
                      value={menuForm.title}
                      onChange={(e) =>
                        setMenuForm({ ...menuForm, title: e.target.value })
                      }
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date" className="text-sm font-medium">
                      Date *
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      value={menuForm.date}
                      onChange={(e) =>
                        setMenuForm({ ...menuForm, date: e.target.value })
                      }
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium">
                    Description *
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Describe today's menu offerings..."
                    value={menuForm.description}
                    onChange={(e) =>
                      setMenuForm({ ...menuForm, description: e.target.value })
                    }
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cutoffTime" className="text-sm font-medium">
                      Order Cutoff Time *
                    </Label>
                    <Input
                      id="cutoffTime"
                      type="time"
                      value={menuForm.cutoffTime}
                      onChange={(e) =>
                        setMenuForm({ ...menuForm, cutoffTime: e.target.value })
                      }
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="imageUrl" className="text-sm font-medium">
                      Menu Image URL (Optional)
                    </Label>
                    <Input
                      id="imageUrl"
                      placeholder="https://example.com/menu-image.jpg"
                      value={menuForm.imageUrl}
                      onChange={(e) =>
                        setMenuForm({ ...menuForm, imageUrl: e.target.value })
                      }
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setCreateStep("start")}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={() => setCreateStep("options")}
                    disabled={!canProceedToOptions()}
                  >
                    Next: Add Options
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Options Step */}
          {createStep === "options" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UtensilsCrossed className="h-5 w-5" />
                  Meal Options
                </CardTitle>
                <CardDescription>
                  Add the meal options for this menu
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm text-gray-600">
                      Add at least one meal option
                    </span>
                  </div>
                  <Button onClick={addOption} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Option
                  </Button>
                </div>

                <div className="space-y-4">
                  {options.map((option, index) => (
                    <Card key={option.id} className="p-4">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Option {index + 1}</h4>
                          {options.length > 1 && (
                            <Button
                              onClick={() => removeOption(index)}
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">
                              Meal Name *
                            </Label>
                            <Input
                              placeholder="e.g., Grilled Chicken Salad"
                              value={option.name}
                              onChange={(e) =>
                                updateOption(index, "name", e.target.value)
                              }
                              className="h-10"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">
                              Price ($)
                            </Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={option.price || ""}
                              onChange={(e) =>
                                updateOption(
                                  index,
                                  "price",
                                  Number.parseFloat(e.target.value) || 0
                                )
                              }
                              className="h-10"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            Description
                          </Label>
                          <Textarea
                            placeholder="Describe the meal..."
                            value={option.description}
                            onChange={(e) =>
                              updateOption(index, "description", e.target.value)
                            }
                            rows={2}
                            className="resize-none"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            Dietary Type
                          </Label>
                          <Select
                            value={option.dietary}
                            onValueChange={(value) =>
                              updateOption(index, "dietary", value)
                            }
                          >
                            <SelectTrigger className="h-10">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="regular">Regular</SelectItem>
                              <SelectItem value="vegetarian">
                                Vegetarian
                              </SelectItem>
                              <SelectItem value="vegan">Vegan</SelectItem>
                              <SelectItem value="gluten-free">
                                Gluten-Free
                              </SelectItem>
                              <SelectItem value="keto">Keto</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setCreateStep("basic")}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={() => setCreateStep("review")}
                    disabled={!canProceedToReview()}
                  >
                    Review & Save
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Review Step */}
          {createStep === "review" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Review & Publish
                </CardTitle>
                <CardDescription>
                  Review your menu before publishing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">{menuForm.title}</h3>
                    <p className="text-gray-600">{menuForm.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span>
                        📅 {format(new Date(menuForm.date), "MMMM dd, yyyy")}
                      </span>
                      <span>⏰ Cutoff: {menuForm.cutoffTime}</span>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">
                        Meal Options (
                        {options.filter((opt) => opt.name.trim()).length})
                      </h4>
                      <Dialog
                        open={showTemplateDialog}
                        onOpenChange={setShowTemplateDialog}
                      >
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Star className="h-4 w-4 mr-2" />
                            Save as Template
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="w-[95vw] max-w-md mx-auto">
                          <DialogHeader>
                            <DialogTitle>Save as Template</DialogTitle>
                            <DialogDescription>
                              Save this menu configuration as a reusable
                              template
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="templateName">
                                Template Name
                              </Label>
                              <Input
                                id="templateName"
                                placeholder="e.g., Weekly Special Menu"
                                value={templateName}
                                onChange={(e) =>
                                  setTemplateName(e.target.value)
                                }
                              />
                            </div>
                            <div className="flex flex-col sm:flex-row justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowTemplateDialog(false)}
                                className="w-full sm:w-auto"
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                onClick={saveAsTemplate}
                                className="w-full sm:w-auto"
                              >
                                Save Template
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>

                    <div className="space-y-2">
                      {options
                        .filter((opt) => opt.name.trim())
                        .map((option, index) => (
                          <div
                            key={option.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div>
                              <span className="font-medium">{option.name}</span>
                              {option.description && (
                                <p className="text-sm text-gray-600">
                                  {option.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {option.dietary}
                                </Badge>
                                {(option.price ?? 0) > 0 && (
                                  <span className="text-sm font-medium">
                                    ${option.price ?? 0}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 p-4 bg-blue-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="isPublished"
                    checked={menuForm.isPublished}
                    onChange={(e) =>
                      setMenuForm({
                        ...menuForm,
                        isPublished: e.target.checked,
                      })
                    }
                    className="rounded"
                  />
                  <Label htmlFor="isPublished" className="text-sm">
                    Publish immediately (employees can start ordering)
                  </Label>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setCreateStep("options")}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Options
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="min-w-[120px]"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {editingMenu ? "Update Menu" : "Create Menu"}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="manage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Menus</CardTitle>
              <CardDescription>
                Manage your published and draft menus
              </CardDescription>
            </CardHeader>
            <CardContent>
              {menus.length === 0 ? (
                <div className="text-center py-12">
                  <UtensilsCrossed className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No menus yet
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Create your first menu to get started
                  </p>
                  <Button onClick={() => setActiveTab("create")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Menu
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {menus.map((menu) => (
                    <Card key={menu.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{menu.title}</h3>
                            <Badge
                              variant={
                                menu.isPublished ? "default" : "secondary"
                              }
                            >
                              {menu.isPublished ? "Published" : "Draft"}
                            </Badge>
                            <Badge variant="outline">
                              {format(new Date(menu.date), "MMM dd")}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-1">
                            {menu.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>{menu.options.length} options</span>
                            <span>Cutoff: {menu.cutoffTime}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => startEditingMenu(menu)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Edit</p>
                            </TooltipContent>
                          </Tooltip>

                          

                          <Tooltip>
                            <TooltipTrigger asChild>
                               <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              toggleMenuPublished(menu.id, menu.isPublished)
                            }
                          >
                            {menu.isPublished ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Publish</p>
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteMenu(menu.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Delete</p>
                            </TooltipContent>
                          </Tooltip>
                         
                          
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
