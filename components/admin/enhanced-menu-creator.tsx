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
import { setActiveMenu, deactivateMenu } from "@/services/menus";
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
  Send,
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

async function sendTeamsNotification(menu: Menu) {
  try {
    await fetch('/api/teams-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(menu),
    });
  } catch (error) {
    console.error('Failed to send Teams notification:', error);
    // Don't throw - notification failure shouldn't block menu creation
  }
}

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
  const [notifyingMenuId, setNotifyingMenuId] = useState<string | null>(null);

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
          isActive: data.isActive ?? false,
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

  const toggleMenuActive = async (menuId: string, currentStatus: boolean, menuDate: string) => {
    try {
      if (currentStatus) {
        // Deactivate current menu
        await deactivateMenu(menuId)
        setMenus(
          menus.map((menu) =>
            menu.id === menuId
              ? { ...menu, isActive: false, updatedAt: new Date() }
              : menu
          )
        )
        toast({
          title: "Menu Deactivated",
          description: "Menu has been deactivated successfully",
        })
      } else {
        // Check if menu date is today
        const today = new Date().toISOString().split('T')[0]
        if (menuDate !== today) {
          toast({
            title: "Cannot Activate Menu",
            description: "Only today's menu can be set as active",
            variant: "destructive",
          })
          return
        }
        
        // Activate this menu (will deactivate all others)
        await setActiveMenu(menuId)
        setMenus(
          menus.map((menu) => ({
            ...menu,
            isActive: menu.id === menuId,
            updatedAt: new Date()
          }))
        )
        toast({
          title: "Menu Activated",
          description: "Menu is now active. All deliveries will use this menu.",
        })
      }
    } catch (error) {
      console.error("Error toggling menu active status:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update menu status",
        variant: "destructive",
      })
    }
  }

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

    // Check if publishing and another menu for same date is already published
    if (menuForm.isPublished) {
      const existingPublishedMenu = menus.find(
        (m) => m.id !== editingMenu?.id && m.date === menuForm.date && m.isPublished
      );
      
      if (existingPublishedMenu) {
        toast({
          title: "Cannot Publish Menu",
          description: `Another menu is already published for ${format(new Date(menuForm.date), "MMMM dd, yyyy")}. Please unpublish it first or save this as draft.`,
          variant: "destructive",
        });
        return;
      }
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
        const docRef = await addDoc(collection(db, "menus"), {
          ...menuData,
          createdAt: new Date(),
          createdBy: user!.uid,
        });
        
        // Send Teams notification if menu is published
        if (menuForm.isPublished) {
          const newMenu: Menu = {
            id: docRef.id,
            title: menuForm.title,
            description: menuForm.description,
            date: menuForm.date,
            cutoffTime: menuForm.cutoffTime,
            options: options.filter((opt) => opt.name.trim() !== ""),
            isPublished: true,
            isActive: false,
            createdAt: new Date(),
            createdBy: user!.uid,
            imageUrl: menuForm.imageUrl,
          };
          await sendTeamsNotification(newMenu);
        }
        
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
    currentStatus: boolean,
    menuDate: string
  ) => {
    try {
      // If publishing, check if another menu for the same date is already published
      if (!currentStatus) {
        const existingPublishedMenu = menus.find(
          (m) => m.id !== menuId && m.date === menuDate && m.isPublished
        );
        
        if (existingPublishedMenu) {
          toast({
            title: "Cannot Publish Menu",
            description: `Another menu is already published for ${format(new Date(menuDate), "MMMM dd, yyyy")}. Unpublish it first.`,
            variant: "destructive",
          });
          return;
        }
      }

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

  const handleNotifyTeams = async (menu: Menu) => {
    setNotifyingMenuId(menu.id);
    try {
      await sendTeamsNotification(menu);
      toast({
        title: "Notification Sent",
        description: "Teams notification sent successfully",
      });
    } catch (error) {
      console.error("Error sending Teams notification:", error);
      toast({
        title: "Error",
        description: "Failed to send Teams notification",
        variant: "destructive",
      });
    } finally {
      setNotifyingMenuId(null);
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
    <div className="space-y-3 sm:space-y-4 lg:space-y-6 p-2 sm:p-4 lg:p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
          Menu Management
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Create and manage daily lunch menus for your team
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "create" | "manage")}
      >
        <TabsList className="grid w-full grid-cols-2 h-auto">
          <TabsTrigger value="create" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
            <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Create Menu</span>
            <span className="xs:hidden">Create</span>
          </TabsTrigger>
          <TabsTrigger value="manage" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
            <UtensilsCrossed className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Manage ({menus.length})</span>
            <span className="xs:hidden">Manage</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-3 sm:space-y-4 lg:space-y-6">
          {/* Progress Bar */}
          {createStep !== "start" && (
            <Card className="shadow-sm">
              <CardContent className="p-3 sm:p-4 lg:pt-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs sm:text-sm">
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
            <Card className="shadow-sm">
              <CardHeader className="text-center p-3 sm:p-4 lg:p-6">
                <CardTitle className="flex items-center justify-center gap-2 text-base sm:text-lg lg:text-xl">
                  <UtensilsCrossed className="h-5 w-5 sm:h-6 sm:w-6" />
                  Create New Menu
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Choose how you'd like to start creating your menu
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4 lg:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <Card className="p-3 sm:p-4 hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-blue-200">
                    <div
                      className="text-center space-y-2 sm:space-y-3"
                      onClick={() => setCreateStep("basic")}
                    >
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                        <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                      </div>
                      <h3 className="font-semibold text-sm sm:text-base">Start from Scratch</h3>
                      <p className="text-xs sm:text-sm text-gray-600">
                        Create a completely new menu with custom options
                      </p>
                      <Button className="w-full h-9 sm:h-10 text-xs sm:text-sm">
                        Start Creating
                        <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-2" />
                      </Button>
                    </div>
                  </Card>

                  <Card className="p-3 sm:p-4 hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-green-200">
                    <div className="text-center space-y-2 sm:space-y-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                        <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                      </div>
                      <h3 className="font-semibold text-sm sm:text-base">Use Template</h3>
                      <p className="text-xs sm:text-sm text-gray-600">
                        Quick start with a saved template ({templates.length}{" "}
                        available)
                      </p>
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full bg-transparent h-9 sm:h-10 text-xs sm:text-sm"
                            disabled={templates.length === 0}
                          >
                            Browse Templates
                            <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-2" />
                          </Button>
                        </SheetTrigger>
                        <SheetContent className="w-[90vw] sm:w-[400px]">
                          <SheetHeader>
                            <SheetTitle className="text-base sm:text-lg">Choose a Template</SheetTitle>
                          </SheetHeader>
                          <div className="space-y-3 sm:space-y-4 mt-4 sm:mt-6">
                            {templates.map((template) => (
                              <Card key={template.id} className="p-3 sm:p-4">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-medium text-sm sm:text-base">
                                      {template.name}
                                    </h4>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        deleteTemplate(template.id)
                                      }
                                      className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                                    >
                                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                    </Button>
                                  </div>
                                  <p className="text-xs sm:text-sm text-gray-600">
                                    {template.description}
                                  </p>
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500">
                                      {template.options.length} options
                                    </span>
                                    <Button
                                      size="sm"
                                      onClick={() => loadTemplate(template.id)}
                                      className="h-8 text-xs sm:text-sm"
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
                  <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-start gap-2 text-blue-800">
                      <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 mt-0.5" />
                      <span className="font-medium text-sm sm:text-base">
                        Currently editing: {editingMenu.title}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-blue-600 mt-1">
                      Continue editing or start a new menu
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 mt-3">
                      <Button size="sm" onClick={() => setCreateStep("basic")} className="w-full sm:w-auto h-9">
                        Continue Editing
                      </Button>
                      <Button size="sm" variant="outline" onClick={resetForm} className="w-full sm:w-auto h-9">
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
            <Card className="shadow-sm">
              <CardHeader className="p-3 sm:p-4 lg:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                  Basic Information
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Set up the basic details for your menu
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4 lg:p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-xs sm:text-sm font-medium">
                      Menu Title *
                    </Label>
                    <Input
                      id="title"
                      placeholder="e.g., Today's Special Menu"
                      value={menuForm.title}
                      onChange={(e) =>
                        setMenuForm({ ...menuForm, title: e.target.value })
                      }
                      className="h-10 sm:h-11 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date" className="text-xs sm:text-sm font-medium">
                      Date *
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      value={menuForm.date}
                      onChange={(e) =>
                        setMenuForm({ ...menuForm, date: e.target.value })
                      }
                      className="h-10 sm:h-11 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-xs sm:text-sm font-medium">
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
                    className="resize-none text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cutoffTime" className="text-xs sm:text-sm font-medium">
                      Order Cutoff Time *
                    </Label>
                    <Input
                      id="cutoffTime"
                      type="time"
                      value={menuForm.cutoffTime}
                      onChange={(e) =>
                        setMenuForm({ ...menuForm, cutoffTime: e.target.value })
                      }
                      className="h-10 sm:h-11 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="imageUrl" className="text-xs sm:text-sm font-medium">
                      Menu Image URL (Optional)
                    </Label>
                    <Input
                      id="imageUrl"
                      placeholder="https://example.com/menu-image.jpg"
                      value={menuForm.imageUrl}
                      onChange={(e) =>
                        setMenuForm({ ...menuForm, imageUrl: e.target.value })
                      }
                      className="h-10 sm:h-11 text-sm"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 sm:pt-4 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCreateStep("start")}
                    className="h-9 sm:h-10 text-xs sm:text-sm"
                  >
                    <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden xs:inline">Back</span>
                    <span className="xs:hidden">←</span>
                  </Button>
                  <Button
                    onClick={() => setCreateStep("options")}
                    disabled={!canProceedToOptions()}
                    className="h-9 sm:h-10 text-xs sm:text-sm"
                  >
                    <span className="hidden xs:inline">Next: Add Options</span>
                    <span className="xs:hidden">Next</span>
                    <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1 sm:ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Options Step */}
          {createStep === "options" && (
            <Card className="shadow-sm">
              <CardHeader className="p-3 sm:p-4 lg:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <UtensilsCrossed className="h-4 w-4 sm:h-5 sm:w-5" />
                  Meal Options
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Add the meal options for this menu
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4 lg:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500 shrink-0" />
                    <span className="text-xs sm:text-sm text-gray-600">
                      Add at least one meal option
                    </span>
                  </div>
                  <Button onClick={addOption} variant="outline" size="sm" className="w-full sm:w-auto h-9">
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                    Add Option
                  </Button>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  {options.map((option, index) => (
                    <Card key={option.id} className="p-3 sm:p-4 shadow-sm">
                      <div className="space-y-3 sm:space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm sm:text-base">Option {index + 1}</h4>
                          {options.length > 1 && (
                            <Button
                              onClick={() => removeOption(index)}
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                            >
                              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs sm:text-sm font-medium">
                              Meal Name *
                            </Label>
                            <Input
                              placeholder="e.g., Grilled Chicken Salad"
                              value={option.name}
                              onChange={(e) =>
                                updateOption(index, "name", e.target.value)
                              }
                              className="h-9 sm:h-10 text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs sm:text-sm font-medium">
                              Price (D)
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
                              className="h-9 sm:h-10 text-sm"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs sm:text-sm font-medium">
                            Description
                          </Label>
                          <Textarea
                            placeholder="Describe the meal..."
                            value={option.description}
                            onChange={(e) =>
                              updateOption(index, "description", e.target.value)
                            }
                            rows={2}
                            className="resize-none text-sm"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs sm:text-sm font-medium">
                            Dietary Type
                          </Label>
                          <Select
                            value={option.dietary}
                            onValueChange={(value) =>
                              updateOption(index, "dietary", value)
                            }
                          >
                            <SelectTrigger className="h-9 sm:h-10 text-sm">
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

                <div className="flex items-center justify-between pt-3 sm:pt-4 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCreateStep("basic")}
                    className="h-9 sm:h-10 text-xs sm:text-sm"
                  >
                    <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden xs:inline">Back</span>
                    <span className="xs:hidden">←</span>
                  </Button>
                  <Button
                    onClick={() => setCreateStep("review")}
                    disabled={!canProceedToReview()}
                    className="h-9 sm:h-10 text-xs sm:text-sm"
                  >
                    <span className="hidden xs:inline">Review & Save</span>
                    <span className="xs:hidden">Review</span>
                    <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1 sm:ml-2" />
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
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-3">
                      <h4 className="font-medium text-sm sm:text-base">
                        Meal Options (
                        {options.filter((opt) => opt.name.trim()).length})
                      </h4>
                      <Dialog
                        open={showTemplateDialog}
                        onOpenChange={setShowTemplateDialog}
                      >
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full sm:w-auto h-9">
                            <Star className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
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
                            className="flex items-start justify-between p-2 sm:p-3 bg-gray-50 rounded-lg gap-2"
                          >
                            <div className="flex-1 min-w-0">
                              <span className="font-medium text-sm sm:text-base">{option.name}</span>
                              {option.description && (
                                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                                  {option.description}
                                </p>
                              )}
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {option.dietary}
                                </Badge>
                                {(option.price ?? 0) > 0 && (
                                  <span className="text-xs sm:text-sm font-medium">
                                    D{option.price ?? 0}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-2 p-3 sm:p-4 bg-blue-50 rounded-lg">
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
                    className="rounded mt-0.5 shrink-0"
                  />
                  <Label htmlFor="isPublished" className="text-xs sm:text-sm cursor-pointer">
                    Publish immediately (employees can start ordering)
                  </Label>
                </div>

                <div className="flex items-center justify-between pt-3 sm:pt-4 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCreateStep("options")}
                    className="h-9 sm:h-10 text-xs sm:text-sm"
                  >
                    <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden xs:inline">Back to Options</span>
                    <span className="xs:hidden">Back</span>
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="min-w-[100px] sm:min-w-[120px] h-9 sm:h-10 text-xs sm:text-sm"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                        {editingMenu ? "Update" : "Create"}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="manage" className="space-y-3 sm:space-y-4 lg:space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="p-3 sm:p-4 lg:p-6">
              <CardTitle className="text-base sm:text-lg">Your Menus</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Manage your published and draft menus
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 lg:p-6">
              {menus.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <UtensilsCrossed className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-gray-300 mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                    No menus yet
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">
                    Create your first menu to get started
                  </p>
                  <Button onClick={() => setActiveTab("create")} className="h-9 sm:h-10 text-xs sm:text-sm">
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                    Create First Menu
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {menus.map((menu) => (
                    <Card key={menu.id} className="p-3 sm:p-4 shadow-sm">
                      <div className="flex flex-col gap-3">
                        <div className="flex-1 space-y-1 sm:space-y-2">
                          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                            <h3 className="font-semibold text-sm sm:text-base">{menu.title}</h3>
                            <Badge
                              variant={
                                menu.isPublished ? "default" : "secondary"
                              }
                              className="text-xs"
                            >
                              {menu.isPublished ? "Published" : "Draft"}
                            </Badge>
                            {menu.isActive && (
                              <Badge variant="default" className="bg-green-600 text-xs">
                                Active
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {format(new Date(menu.date), "MMM dd")}
                            </Badge>
                          </div>
                          <p className="text-xs sm:text-sm text-gray-600 line-clamp-1 sm:line-clamp-2">
                            {menu.description}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-gray-500">
                            <span>{menu.options.length} options</span>
                            <span>Cutoff: {menu.cutoffTime}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => startEditingMenu(menu)}
                                className="h-8 w-8 sm:h-9 sm:w-9 p-0"
                              >
                                <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Edit</p>
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  toggleMenuPublished(menu.id, menu.isPublished, menu.date)
                                }
                                className="h-8 w-8 sm:h-9 sm:w-9 p-0"
                              >
                                {menu.isPublished ? (
                                  <EyeOff className="h-3 w-3 sm:h-4 sm:w-4" />
                                ) : (
                                  <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">{menu.isPublished ? "Unpublish" : "Publish"}</p>
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant={menu.isActive ? "default" : "outline"}
                                size="sm"
                                onClick={() =>
                                  toggleMenuActive(menu.id, menu.isActive, menu.date)
                                }
                                disabled={
                                  (!menu.isPublished && !menu.isActive) ||
                                  (!menu.isActive && menu.date !== new Date().toISOString().split('T')[0])
                                }
                                className="h-8 w-8 sm:h-9 sm:w-9 p-0"
                              >
                                <Zap className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">
                                {menu.isActive
                                  ? "Deactivate menu"
                                  : !menu.isPublished
                                  ? "Publish menu first to activate"
                                  : menu.date !== new Date().toISOString().split('T')[0]
                                  ? "Only today's menu can be activated"
                                  : "Set as active menu"}
                              </p>
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleNotifyTeams(menu)}
                                disabled={!menu.isPublished || notifyingMenuId === menu.id}
                                className="h-8 w-8 sm:h-9 sm:w-9 p-0"
                              >
                                {notifyingMenuId === menu.id ? (
                                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                                ) : (
                                  <Send className="h-3 w-3 sm:h-4 sm:w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">{!menu.isPublished ? "Publish menu first" : "Notify Teams"}</p>
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteMenu(menu.id)}
                            className="h-8 w-8 sm:h-9 sm:w-9 p-0"
                          >
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Delete</p>
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
